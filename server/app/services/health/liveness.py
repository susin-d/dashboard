"""Liveness probe — zero-I/O fast path for load balancers and docker healthcheck.

Deep dependency probes (database/cache/whatsapp/workspace) live behind
`/health/detailed` and `/health/checks*` (readiness). Liveness answers from
process state only, so a slow downstream can never slow or fail the probe.
"""

import time
from datetime import datetime, timezone

from app.services.health.constants import _START_TS, elapsed_ms


def build_liveness() -> dict:
    """Return the liveness payload — no DB, HTTP, disk, or endpoint I/O."""
    t0 = time.monotonic()
    from app.core.config import settings

    return {
        "status": "ok",
        "service": settings.app_name,
        "environment": settings.app_env,
        "version": "0.1.0",
        "uptime_seconds": round(time.monotonic() - _START_TS, 1),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "checks": None,
        "summary": "liveness: ok",
        "took_ms": elapsed_ms(t0),
        "endpoint_count": None,
    }
