"""Dashboard overview route: single aggregate for dashboard preview widgets."""

from fastapi import APIRouter, Depends, Query
from app.db import SqlClient, get_firestore

from app.api.routes.workspace._shared import invalidate_workspace_overview  # noqa: F401 (re-export for mutations)
from app.core.auth import get_current_user
from app.core.cache import CACHE_TTL_LONG, snapshot_read
from app.schemas.workspace import DashboardOverviewResponse
from app.services.workspace_overview import (
    DASHBOARD_OVERVIEW_LIMIT_DEFAULT,
    DASHBOARD_OVERVIEW_LIMIT_MAX,
    get_dashboard_overview,
)

router = APIRouter()

_WS_OVERVIEW_PREFIX = "workspace:overview"


@router.get("/dashboard-overview", response_model=DashboardOverviewResponse)
async def get_overview(
    limit: int = Query(DASHBOARD_OVERVIEW_LIMIT_DEFAULT, ge=1, le=DASHBOARD_OVERVIEW_LIMIT_MAX),
    database: SqlClient = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    empty_page = {"items": [], "next_cursor": None, "has_more": False}
    empty = {
        "jobs": empty_page,
        "projects": empty_page,
        "hackathons": empty_page,
        "notifications": empty_page,
        "contests": empty_page,
        "todos": empty_page,
        "documents": empty_page,
    }
    return await snapshot_read(
        f"{_WS_OVERVIEW_PREFIX}:{user['uid']}:{limit}",
        lambda: get_dashboard_overview(database, user["uid"], limit),
        empty,
        fresh_ttl=30,
        stale_ttl=CACHE_TTL_LONG,
    )
