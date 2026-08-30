import logging

from fastapi import APIRouter, Request

from app.schemas.health import HealthResponse

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health_check(request: Request) -> HealthResponse:
    """Liveness + detailed dependency inventory.

    Keeps the simple `status/service/environment` contract for docker
    healthchecks, but enriches the body with timed checks for database,
    cache, whatsapp-worker, workspace storage, and a full endpoint listing.
    Each check is isolated so a down whatsapp-worker surfaces as degraded
    rather than 500.
    """
    from app.services.health import collect_health

    payload = await collect_health(app=request.app)
    # Structured access log for tailing (INFO goes to uvicorn)
    logger.info("GET /api/v1/health -> %s (%s) %s", payload["status"], payload["summary"], payload["checks"])
    return HealthResponse(**payload)
