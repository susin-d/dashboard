"""File logging with 7-day daily rotation (ADR 0050).

Stdlib only (no loguru — AGENTS.md §7.5). Single writer of log files; every
other module keeps using ``logging.getLogger(__name__)`` and automatically
gains file output once :func:`setup_logging` runs in ``app.main.create_app``.

Files (under ``LOG_DIR``, default ``server/logs/``):

- ``starwaves.log`` — INFO+ (app logs + one access line per request).
- ``starwaves-error.log`` — WARNING+ (errors with tracebacks).

Both rotate at midnight keeping ``LOG_RETENTION_DAYS`` (default 7) backups.
Stdout is always kept so ``docker logs`` / Vercel log drains keep working.
Serverless (``settings.is_serverless``) skips file handlers — ephemeral FS.
"""

import contextvars
import logging
import re
import sys
from logging.handlers import TimedRotatingFileHandler
from pathlib import Path

APP_LOG_NAME = "starwaves.log"
ERROR_LOG_NAME = "starwaves-error.log"

_LOG_FORMAT = "%(asctime)s | %(levelname)-8s | %(name)s | req=%(request_id)s | %(message)s"
_LOG_DATEFMT = "%Y-%m-%d %H:%M:%S"

_request_id: contextvars.ContextVar[str] = contextvars.ContextVar("request_id", default="-")

_configured = False

_SECRET_PATTERNS = (
    re.compile(r"(?i)(bearer\s+)[A-Za-z0-9\-._~+/=]+"),
    re.compile(r"(?i)((?:api[_-]?key|secret|token|password)\s*[:=]\s*)(['\"]?)([^\s'\";,]+)(\2)"),
)


def get_request_id() -> str:
    """Return the current request correlation id (``-`` outside requests)."""
    return _request_id.get()


def set_request_id(value: str) -> None:
    """Bind a correlation id for the current request context."""
    _request_id.set(value or "-")


def redact_secrets(text: str) -> str:
    """Mask bearer tokens and key/secret/token/password values in log text."""
    if not text:
        return text
    redacted = _SECRET_PATTERNS[0].sub(r"\1***", text)
    redacted = _SECRET_PATTERNS[1].sub(r"\1\2***\4", redacted)
    return redacted


class _RequestIdFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        if not hasattr(record, "request_id"):
            record.request_id = get_request_id()  # type: ignore[attr-defined]
        if isinstance(record.msg, str):
            record.msg = redact_secrets(record.msg)
        return True


def resolve_log_dir(configured: str | None = None) -> Path:
    """Resolve LOG_DIR to an absolute path (relative → ``server/`` root)."""
    raw = configured if configured is not None else "logs"
    candidate = Path(raw)
    if candidate.is_absolute():
        return candidate
    server_root = Path(__file__).resolve().parents[2]
    return server_root / raw


def _level_from_name(name: str) -> int:
    return getattr(logging, (name or "INFO").upper(), logging.INFO)


def _has_file_handler(logger: logging.Logger, filename: str) -> bool:
    for handler in logger.handlers:
        if isinstance(handler, TimedRotatingFileHandler) and handler.baseFilename == filename:
            return True
    return False


def setup_logging(
    log_dir: str | Path | None = None,
    level: str | None = None,
    retention_days: int | None = None,
    *,
    force: bool = False,
) -> logging.Logger:
    """Configure root logging once; safe to call repeatedly (tests use ``force``)."""
    global _configured
    if _configured and not force:
        return logging.getLogger()

    from app.core.config import settings

    resolved_level = _level_from_name(level or settings.log_level)
    resolved_retention = retention_days or settings.log_retention_days or 7
    if resolved_retention < 1:
        resolved_retention = 1

    formatter = logging.Formatter(_LOG_FORMAT, datefmt=_LOG_DATEFMT)
    request_filter = _RequestIdFilter()

    root = logging.getLogger()
    root.setLevel(resolved_level)

    stdout_handler = None
    for handler in root.handlers:
        if isinstance(handler, logging.StreamHandler) and not isinstance(
            handler, TimedRotatingFileHandler
        ):
            stdout_handler = handler
            break
    if stdout_handler is None:
        stdout_handler = logging.StreamHandler(sys.stdout)
        root.addHandler(stdout_handler)
    stdout_handler.setLevel(resolved_level)
    stdout_handler.setFormatter(formatter)
    stdout_handler.addFilter(request_filter)

    is_serverless = bool(getattr(settings, "is_serverless", False))
    if not is_serverless:
        try:
            target_dir = (
                Path(log_dir) if isinstance(log_dir, Path) else resolve_log_dir(
                    str(log_dir) if log_dir is not None else settings.log_dir
                )
            )
            target_dir.mkdir(parents=True, exist_ok=True)
            app_file = str(target_dir / APP_LOG_NAME)
            error_file = str(target_dir / ERROR_LOG_NAME)

            if not _has_file_handler(root, app_file):
                app_handler = TimedRotatingFileHandler(
                    app_file,
                    when="midnight",
                    interval=1,
                    backupCount=resolved_retention,
                    encoding="utf-8",
                )
                app_handler.setLevel(logging.INFO)
                app_handler.setFormatter(formatter)
                app_handler.addFilter(request_filter)
                root.addHandler(app_handler)

            if not _has_file_handler(root, error_file):
                error_handler = TimedRotatingFileHandler(
                    error_file,
                    when="midnight",
                    interval=1,
                    backupCount=resolved_retention,
                    encoding="utf-8",
                )
                error_handler.setLevel(logging.WARNING)
                error_handler.setFormatter(formatter)
                error_handler.addFilter(request_filter)
                root.addHandler(error_handler)
        except Exception as exc:  # pragma: no cover — logging must never crash boot
            root.warning("File logging disabled (cannot write %s): %s", log_dir, exc)

    for noisy in ("uvicorn", "uvicorn.error", "uvicorn.access"):
        adapter = logging.getLogger(noisy)
        adapter.setLevel(resolved_level)
        adapter.propagate = True

    # Quiet chatty third-party loggers unless debugging; our records stay detailed.
    if resolved_level > logging.DEBUG:
        for quiet in ("httpx", "httpcore", "asyncio"):
            logging.getLogger(quiet).setLevel(logging.WARNING)

    _configured = True
    return root
