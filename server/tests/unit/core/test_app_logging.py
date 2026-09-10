"""Unit tests for 7-day file logging (ADR 0049) — stdlib rotation, no new deps."""

import logging

import pytest

from app.core import app_logging


@pytest.fixture()
def _reset_logging():
    root = logging.getLogger()
    saved_handlers = list(root.handlers)
    saved_level = root.level
    app_logging._configured = False
    yield root
    for handler in list(root.handlers):
        try:
            root.removeHandler(handler)
            handler.close()
        except Exception:
            pass
    for handler in saved_handlers:
        try:
            root.addHandler(handler)
        except Exception:
            pass
    root.setLevel(saved_level)
    app_logging._configured = False


class TestSetupLogging:
    def test_creates_app_and_error_logs(self, tmp_path, _reset_logging):
        app_logging.setup_logging(log_dir=tmp_path, level="INFO", retention_days=7, force=True)
        logger = logging.getLogger("test.seven.day")
        logger.info("hello seven day")
        logger.error("boom seven day")
        app_text = (tmp_path / app_logging.APP_LOG_NAME).read_text(encoding="utf-8")
        error_text = (tmp_path / app_logging.ERROR_LOG_NAME).read_text(encoding="utf-8")
        assert "hello seven day" in app_text
        assert "boom seven day" in app_text
        assert "boom seven day" in error_text
        assert "hello seven day" not in error_text

    def test_retention_days_sets_backup_count(self, tmp_path, _reset_logging):
        app_logging.setup_logging(log_dir=tmp_path, level="INFO", retention_days=7, force=True)
        from logging.handlers import TimedRotatingFileHandler

        counts = {
            handler.backupCount
            for handler in logging.getLogger().handlers
            if isinstance(handler, TimedRotatingFileHandler)
        }
        assert counts == {7}

    def test_serverless_skips_file_handlers(self, tmp_path, _reset_logging):
        from app.core.config import settings

        original = settings.is_serverless
        object.__setattr__(settings, "is_serverless", True)
        try:
            app_logging.setup_logging(log_dir=tmp_path, level="INFO", retention_days=7, force=True)
            assert list(tmp_path.iterdir()) == []
        finally:
            object.__setattr__(settings, "is_serverless", original)

    def test_idempotent_without_force(self, tmp_path, _reset_logging):
        app_logging.setup_logging(log_dir=tmp_path, level="INFO", retention_days=7, force=True)
        before = len(logging.getLogger().handlers)
        app_logging.setup_logging(log_dir=tmp_path, level="INFO", retention_days=7)
        assert len(logging.getLogger().handlers) == before


class TestRedaction:
    def test_bearer_token_masked(self):
        assert "sk-123" not in app_logging.redact_secrets("Authorization Bearer sk-123")

    def test_secret_assignment_masked(self):
        out = app_logging.redact_secrets("api_key=super-secret-value")
        assert "super-secret-value" not in out
        assert "***" in out

    def test_plain_message_untouched(self):
        assert app_logging.redact_secrets("GET /api/v1/health -> ok") == "GET /api/v1/health -> ok"


class TestRequestId:
    def test_default_dash(self):
        app_logging.set_request_id("-")
        assert app_logging.get_request_id() == "-"

    def test_round_trip(self):
        app_logging.set_request_id("abc123")
        assert app_logging.get_request_id() == "abc123"
        app_logging.set_request_id("-")


class TestResolveLogDir:
    def test_absolute_passthrough(self, tmp_path):
        assert app_logging.resolve_log_dir(str(tmp_path)) == tmp_path

    def test_relative_resolves_under_server(self):
        resolved = app_logging.resolve_log_dir("logs")
        assert resolved.name == "logs"
        assert resolved.parent.name == "server"


class TestRequestLoggingMiddleware:
    def _mini_app(self):
        from fastapi import FastAPI
        from fastapi.testclient import TestClient

        from app.core.request_log import RequestLoggingMiddleware

        app = FastAPI()
        app.add_middleware(RequestLoggingMiddleware)

        @app.get("/ping")
        def ping():
            return {"ok": True}

        @app.get("/health")
        def health():
            return {"ok": True}

        return TestClient(app)

    def test_sets_request_id_header(self, caplog):
        client = self._mini_app()
        with caplog.at_level(logging.INFO, logger="app.core.request_log"):
            response = client.get("/ping")
        assert response.status_code == 200
        assert response.headers.get("X-Request-ID")

    def test_access_line_has_status_and_path(self, caplog):
        client = self._mini_app()
        with caplog.at_level(logging.INFO, logger="app.core.request_log"):
            client.get("/ping")
        assert any("GET /ping -> 200" in record.getMessage() for record in caplog.records)

    def test_health_logs_at_debug_not_info(self, caplog):
        client = self._mini_app()
        with caplog.at_level(logging.INFO, logger="app.core.request_log"):
            client.get("/health")
        assert all("/health" not in record.getMessage() for record in caplog.records)
