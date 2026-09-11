"""Health probe with dependency statuses and no endpoint inventory."""

import logging

from fastapi import APIRouter

from app.schemas.health import HealthResponse

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """Return service statuses without the expensive endpoint inventory walk."""
    from app.services.health import collect_health

    payload = await collect_health(detailed=False)
    logger.info("GET /api/v1/health -> %s (%s)", payload["status"], payload["summary"])
    return HealthResponse(**payload)
