"""Shared helpers used across the workspace feature-group routes."""

from app.core.cache import cache_invalidate_prefix
from app.db import SqlClient

DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 50

_WS_OVERVIEW_PREFIX = "workspace:overview"


def invalidate_workspace_overview(user_id: str) -> None:
    cache_invalidate_prefix(f"{_WS_OVERVIEW_PREFIX}:{user_id}")


def user_collection(database: SqlClient, user_id: str, name: str):
    return database.collection("users").document(user_id).collection(name)


def hackathon_settings_reference(database: SqlClient, user_id: str):
    return (
        database.collection("users")
        .document(user_id)
        .collection("settings")
        .document("hackathon_sources")
    )
