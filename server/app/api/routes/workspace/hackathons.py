"""Hackathon routes: sources settings, list, create, update, and delete."""

import asyncio
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query, Response
from app.db import ArrayUnion, SERVER_TIMESTAMP, SqlClient, get_firestore

from app.api.routes.workspace._shared import (
    DEFAULT_PAGE_SIZE,
    MAX_PAGE_SIZE,
    hackathon_settings_reference,
    invalidate_workspace_overview,
    user_collection,
)
from app.core.auth import get_current_user
from app.core.cache import CACHE_TTL_LONG, cache_invalidate_prefix, snapshot_read
from app.core.errors import not_found
from app.repositories.pagination import decode_cursor, encode_cursor
from app.schemas.workspace import (
    HackathonCreate,
    HackathonResponse,
    HackathonUpdate,
    PageResponse,
)
from app.services.hackathon_sources import (
    SOURCE_CATALOG,
    SOURCE_IDS,
    fetch_enabled_hackathons,
)

router = APIRouter()


def _invalidate_hackathon_snapshots(user_id: str) -> None:
    cache_invalidate_prefix(f"hackathons:list:{user_id}")
    invalidate_workspace_overview(user_id)


@router.get("/hackathon-sources")
async def list_hackathon_sources(
    database: SqlClient = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    snapshot = await asyncio.to_thread(hackathon_settings_reference(database, user["uid"]).get)
    enabled = (snapshot.to_dict() or {}).get("enabled", [])
    return {
        "sources": [
            {**source, "enabled": source["id"] in enabled}
            for source in SOURCE_CATALOG
        ],
    }


@router.put("/hackathon-sources/{source_id}")
async def update_hackathon_source(
    source_id: str,
    enabled: bool,
    database: SqlClient = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    if source_id not in SOURCE_IDS:
        raise not_found("Unknown hackathon source.")
    reference = hackathon_settings_reference(database, user["uid"])
    snap = await asyncio.to_thread(reference.get)
    current = set((snap.to_dict() or {}).get("enabled", []))
    if enabled:
        current.add(source_id)
    else:
        current.discard(source_id)
    await asyncio.to_thread(
        lambda: reference.set(
            {
                "enabled": sorted(current),
                "updated_at": SERVER_TIMESTAMP,
            },
            merge=True,
        )
    )
    _invalidate_hackathon_snapshots(user["uid"])
    return {"source_id": source_id, "enabled": enabled}


@router.get("/hackathons", response_model=PageResponse)
async def list_hackathons(
    cursor: str | None = None,
    limit: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
    database: SqlClient = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    def load_saved_data():
        query = user_collection(
            database,
            user["uid"],
            "hackathons",
        ).order_by("starts_at")
        settings_snapshot = hackathon_settings_reference(
            database,
            user["uid"],
        ).get()
        return list(query.stream()), (
            (settings_snapshot.to_dict() or {}).get("enabled", [])
        )

    async def load_records():
        snapshots, enabled = await asyncio.to_thread(load_saved_data)
        now = datetime.now(timezone.utc)
        manual = []
        for item in snapshots:
            record = item.to_dict() or {}
            if record.get("deleted"):
                continue
            end = record.get("ends_at")
            if isinstance(end, str):
                end = datetime.fromisoformat(end)
            if end and end.astimezone(timezone.utc) >= now:
                manual.append({"id": item.id, **record, "source": "manual"})
        connected = await fetch_enabled_hackathons(enabled)
        return sorted([*manual, *connected], key=lambda item: item["starts_at"])

    records = await snapshot_read(
        f"hackathons:list:{user['uid']}",
        load_records,
        [],
        fresh_ttl=600,
        stale_ttl=CACHE_TTL_LONG,
    )
    offset = int(decode_cursor(cursor) or 0)
    page = records[offset : offset + limit]
    next_cursor = encode_cursor(str(offset + limit)) if offset + limit < len(records) else None
    return {"items": page, "next_cursor": next_cursor, "has_more": next_cursor is not None}


@router.post("/hackathons", response_model=HackathonResponse, status_code=201)
async def create_hackathon(
    hackathon: HackathonCreate,
    database: SqlClient = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    reference = user_collection(database, user["uid"], "hackathons").document()
    await asyncio.to_thread(
        lambda: reference.set(
            {
                **hackathon.model_dump(mode="python"),
                "deleted": False,
                "created_at": SERVER_TIMESTAMP,
                "updated_at": SERVER_TIMESTAMP,
            },
        )
    )
    snap = await asyncio.to_thread(reference.get)
    _invalidate_hackathon_snapshots(user["uid"])
    return {"id": reference.id, **(snap.to_dict() or {})}


@router.get("/hackathons/{hackathon_id}", response_model=HackathonResponse)
async def get_hackathon(
    hackathon_id: str,
    database: SqlClient = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    reference = user_collection(database, user["uid"], "hackathons").document(hackathon_id)
    snapshot = await asyncio.to_thread(reference.get)
    if not snapshot.exists:
        raise not_found("Hackathon not found.")
    data = snapshot.to_dict() or {}
    if data.get("deleted"):
        raise not_found("Hackathon not found.")
    return {"id": reference.id, **data}


@router.patch("/hackathons/{hackathon_id}", response_model=HackathonResponse)
async def update_hackathon(
    hackathon_id: str,
    changes: HackathonUpdate,
    database: SqlClient = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    reference = user_collection(database, user["uid"], "hackathons").document(hackathon_id)
    exists = await asyncio.to_thread(lambda: reference.get().exists)
    if not exists:
        raise not_found("Hackathon not found.")
    updates = changes.model_dump(exclude_unset=True, mode="python")
    await asyncio.to_thread(
        lambda: reference.update(
            {
                **updates,
                "updated_at": SERVER_TIMESTAMP,
            },
        )
    )
    snap = await asyncio.to_thread(reference.get)
    _invalidate_hackathon_snapshots(user["uid"])
    return {"id": reference.id, **(snap.to_dict() or {})}


@router.delete("/hackathons/{hackathon_id}", status_code=204)
async def delete_hackathon(
    hackathon_id: str,
    database: SqlClient = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    reference = user_collection(database, user["uid"], "hackathons").document(hackathon_id)
    exists = await asyncio.to_thread(lambda: reference.get().exists)
    if not exists:
        raise not_found("Hackathon not found.")
    now = datetime.now(timezone.utc)
    await asyncio.to_thread(
        lambda: reference.update(
            {
                "deleted": True,
                "deleted_at": now.isoformat(),
                "updated_at": SERVER_TIMESTAMP,
            },
        )
    )
    _invalidate_hackathon_snapshots(user["uid"])
    return Response(status_code=204)


@router.post("/hackathons/{hackathon_id}/restore", response_model=HackathonResponse)
async def restore_hackathon(
    hackathon_id: str,
    database: SqlClient = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    reference = user_collection(database, user["uid"], "hackathons").document(hackathon_id)
    exists = await asyncio.to_thread(lambda: reference.get().exists)
    if not exists:
        raise not_found("Hackathon not found.")
    await asyncio.to_thread(
        lambda: reference.update(
            {
                "deleted": False,
                "deleted_at": None,
                "updated_at": SERVER_TIMESTAMP,
            },
        )
    )
    snap = await asyncio.to_thread(reference.get)
    _invalidate_hackathon_snapshots(user["uid"])
    return {"id": reference.id, **(snap.to_dict() or {})}
