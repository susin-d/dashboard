"""Liveness probe — zero-I/O fast path for docker healthcheck and load balancers."""

import logging

from fastapi import APIRouter

from app.schemas.health import HealthResponse

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """Liveness — process state only. Deep probes live on /health/detailed + /health/checks."""
    from app.services.health import build_liveness

    payload = build_liveness()
    logger.debug("GET /api/v1/health -> %s", payload["status"])
    return HealthResponse(**payload)
