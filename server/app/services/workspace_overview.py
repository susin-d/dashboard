"""Dashboard overview service: single aggregate for dashboard preview widgets.

Orchestrates existing repositories and integration fetchers in parallel so
``GET /dashboard-overview`` replaces 7 workspace round-trips. No FastAPI
imports here — thin route in ``api/routes/workspace/overview.py`` owns HTTP.
"""

import asyncio
import hashlib
import time
from datetime import datetime, timezone
from typing import Any

import httpx

from app.core.cache import snapshot_read
from app.db import SqlClient
from app.repositories import (
    JobRepository,
    NotificationRepository,
    ProjectRepository,
    documents,
    todos,
)
from app.repositories.pagination import encode_cursor, user_collection
from app.services.contests import codechef_contests, codeforces_contests, leetcode_contests
from app.services.hackathon_sources import fetch_enabled_hackathons

CONTEST_REQUEST_TIMEOUT = httpx.Timeout(8.0, connect=2.0)
_CONTEST_CACHE: tuple[float, list[dict]] | None = None
_CONTEST_CACHE_TTL = 10 * 60

DASHBOARD_OVERVIEW_LIMIT_DEFAULT = 3
DASHBOARD_OVERVIEW_LIMIT_MAX = 20


def _page(items: list, next_cursor: str | None) -> dict:
    return {"items": items, "next_cursor": next_cursor, "has_more": next_cursor is not None}


def _to_jsonable(value: Any) -> Any:
    if isinstance(value, list):
        return [_to_jsonable(v) for v in value]
    if isinstance(value, dict):
        return {k: _to_jsonable(v) for k, v in value.items()}
    if hasattr(value, "model_dump"):
        try:
            return _to_jsonable(value.model_dump(mode="json"))  # type: ignore[attr-defined]
        except Exception:
            pass
    return value


def _list_jobs_page(database: SqlClient, user_id: str, limit: int) -> dict:
    items, next_cursor, _ = JobRepository(database, user_id).list_page(None, limit)
    return _page(_to_jsonable(items), next_cursor)


def _list_projects_page(database: SqlClient, user_id: str, limit: int) -> dict:
    items, next_cursor, _ = ProjectRepository(database, user_id).list_page(None, limit)
    return _page(_to_jsonable(items), next_cursor)


def _list_notifications_page(database: SqlClient, user_id: str, limit: int) -> dict:
    items, next_cursor, _ = NotificationRepository(database, user_id).list_page(None, limit)
    return _page(_to_jsonable(items), next_cursor)


def _list_todos_page(database: SqlClient, user_id: str, limit: int) -> dict:
    items, next_cursor, _ = todos.list_todos_page(database, user_id, None, limit)
    return _page(_to_jsonable(items), next_cursor)


def _list_documents_page(database: SqlClient, user_id: str, limit: int) -> dict:
    items, next_cursor, _ = documents.list_documents_page(database, user_id, None, limit)
    return _page(_to_jsonable(items), next_cursor)


def _list_hackathons_page(database: SqlClient, user_id: str, limit: int) -> dict:
    collection = user_collection(database, user_id, "hackathons")
    try:
        snapshots = list(collection.order_by("starts_at").stream())
    except Exception:
        snapshots = []
    try:
        settings_snap = (
            database.collection("users")
            .document(user_id)
            .collection("settings")
            .document("hackathon_sources")
            .get()
        )
        enabled = (settings_snap.to_dict() or {}).get("enabled", [])
    except Exception:
        enabled = []
    now = datetime.now(timezone.utc)
    manual: list[dict] = []
    for item in snapshots:
        try:
            record = item.to_dict() or {}
        except Exception:
            continue
        if record.get("deleted"):
            continue
        end = record.get("ends_at")
        if isinstance(end, str):
            try:
                end = datetime.fromisoformat(end)
            except ValueError:
                end = None
        if end is not None and end.astimezone(timezone.utc) >= now:
            manual.append({"id": item.id, **record, "source": "manual"})
    return {"manual": manual, "enabled": enabled}


async def _resolve_hackathons_page(database: SqlClient, user_id: str, limit: int) -> dict:
    loaded = await asyncio.to_thread(_list_hackathons_page, database, user_id, limit)
    source_key = hashlib.sha256(
        ",".join(sorted(loaded["enabled"])).encode(),
    ).hexdigest()[:16]
    connected = await snapshot_read(
        f"hackathons:enabled:{source_key}",
        lambda: fetch_enabled_hackathons(loaded["enabled"]),
        [],
        fresh_ttl=600,
        stale_ttl=3600,
    )
    records = sorted([*loaded["manual"], *connected], key=lambda item: item.get("starts_at", ""))
    page = records[:limit]
    has_more = len(records) > limit
    next_cursor = encode_cursor(str(limit)) if has_more else None
    return _page(page, next_cursor)


async def _resolve_contests_page(limit: int) -> dict:
    async def fetch_platforms() -> list[dict]:
        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 Chrome/126 Safari/537.36"
            ),
        }
        async with httpx.AsyncClient(
            timeout=CONTEST_REQUEST_TIMEOUT,
            follow_redirects=True,
            headers=headers,
        ) as client:
            fetched = await asyncio.gather(
                codeforces_contests(client),
                codechef_contests(client),
                leetcode_contests(client),
            )
        return [platform for platform in fetched if platform is not None]

    platforms = await snapshot_read(
        "contests:platforms",
        fetch_platforms,
        [],
        fresh_ttl=600,
        stale_ttl=3600,
    )
    records: list[dict] = []
    for platform in platforms or []:
        records.extend({**c, "platformId": platform["id"]} for c in platform.get("contests", []))
    records.sort(key=lambda c: (c.get("startsAt", ""), c.get("id", "")))
    page = records[:limit]
    next_cursor = None
    if len(records) > limit:
        final = page[-1]
        next_cursor = encode_cursor(f"{final.get('startsAt','')}\t{final.get('id','')}")
    return _page(page, next_cursor)


async def get_dashboard_overview(database: SqlClient, user_id: str, limit: int = 3) -> dict:
    """Fetch dashboard preview pages in parallel."""
    eff_limit = max(1, min(limit, DASHBOARD_OVERVIEW_LIMIT_MAX))
    jobs_t = asyncio.to_thread(_list_jobs_page, database, user_id, eff_limit)
    projects_t = asyncio.to_thread(_list_projects_page, database, user_id, eff_limit)
    notifications_t = asyncio.to_thread(_list_notifications_page, database, user_id, eff_limit)
    todos_t = asyncio.to_thread(_list_todos_page, database, user_id, eff_limit)
    documents_t = asyncio.to_thread(_list_documents_page, database, user_id, eff_limit)
    hackathons_t = _resolve_hackathons_page(database, user_id, eff_limit)
    contests_t = _resolve_contests_page(eff_limit)
    jobs, projects, notifications, todo_page, doc_page, hackathons, contests = await asyncio.gather(
        jobs_t, projects_t, notifications_t, todos_t, documents_t, hackathons_t, contests_t
    )
    return {
        "jobs": jobs,
        "projects": projects,
        "hackathons": hackathons,
        "notifications": notifications,
        "contests": contests,
        "todos": todo_page,
        "documents": doc_page,
    }
