"""Dashboard overview route: single aggregate for dashboard preview widgets."""

from fastapi import APIRouter, Depends, Query
from app.db import SqlClient, get_firestore

from app.api.routes.workspace._shared import invalidate_workspace_overview  # noqa: F401 (re-export for mutations)
from app.core.auth import get_current_user
from app.core.cache import CACHE_TTL_SHORT, cached
from app.schemas.workspace import DashboardOverviewResponse
from app.services.workspace_overview import (
    DASHBOARD_OVERVIEW_LIMIT_DEFAULT,
    DASHBOARD_OVERVIEW_LIMIT_MAX,
    get_dashboard_overview,
)

router = APIRouter()

_WS_OVERVIEW_PREFIX = "workspace:overview"


@router.get("/dashboard-overview", response_model=DashboardOverviewResponse)
@cached(ttl=CACHE_TTL_SHORT, prefix=_WS_OVERVIEW_PREFIX)
async def get_overview(
    limit: int = Query(DASHBOARD_OVERVIEW_LIMIT_DEFAULT, ge=1, le=DASHBOARD_OVERVIEW_LIMIT_MAX),
    database: SqlClient = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    return await get_dashboard_overview(database, user["uid"], limit)
