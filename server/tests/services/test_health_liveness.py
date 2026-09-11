"""Health probe: GET /health reports dependency statuses without inventory data."""

from fastapi.testclient import TestClient

from app.main import app
from app.services.health import build_liveness


class TestLivenessPayload:
    def test_status_ok_without_dependency_probes(self):
        payload = build_liveness()
        assert payload["status"] == "ok"
        assert payload["checks"] is None
        assert payload["endpoint_count"] is None
        assert payload["service"]
        assert isinstance(payload["took_ms"], int)

    def test_root_health_exposes_service_check_aliases(self, monkeypatch):
        async def fake_checks():
            return {"database": {"status": "ok", "latency_ms": 1, "detail": "ok"}}

        monkeypatch.setattr("app.services.health.collect_checks", fake_checks)
        response = TestClient(app).get("/health/checks")

        assert response.status_code == 200
        assert response.json()["database"]["status"] == "ok"


class TestLivenessRoute:
    def test_health_carries_dependency_checks(self):
        response = TestClient(app).get("/api/v1/health")
        assert response.status_code == 200
        body = response.json()
        assert body["checks"] is not None
        assert {"database", "cache", "whatsapp_worker"}.issubset(body["checks"])

    def test_root_health_alias(self):
        response = TestClient(app).get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"
