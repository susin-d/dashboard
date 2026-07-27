from fastapi import APIRouter

from app.api.routes import (
    auth,
    coding_stats,
    competitive_coding_profile,
    cron,
    documents,
    eve,
    gmail,
    google_calendar,
    google_drive,
    github,
    google_chat,
    health,
    notifications,
    profiles,
    todos,
    workspace,
)

api_router = APIRouter()
api_router.include_router(auth.router, tags=["auth"])
api_router.include_router(health.router, tags=["health"])
api_router.include_router(cron.router, tags=["cron"])
api_router.include_router(notifications.router, tags=["notifications"])
api_router.include_router(profiles.router, tags=["profiles"])
api_router.include_router(documents.router, tags=["documents"])
api_router.include_router(eve.router, tags=["Eve AI assistant"])
api_router.include_router(gmail.router, tags=["Gmail integration"])
api_router.include_router(
    competitive_coding_profile.router,
    tags=["competitive coding settings"],
)
api_router.include_router(google_drive.router, tags=["Google Drive integration"])
api_router.include_router(coding_stats.router, tags=["competitive coding stats"])
api_router.include_router(github.router, tags=["GitHub integration"])
api_router.include_router(
    google_calendar.router,
    tags=["Google Calendar integration"],
)
api_router.include_router(
    google_chat.router,
    tags=["Google Chat integration"],
)
api_router.include_router(todos.router, tags=["todos"])
api_router.include_router(workspace.router, tags=["workspace data"])
