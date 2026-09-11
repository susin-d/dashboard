import asyncio
import hashlib

from fastapi import APIRouter, Depends
from app.db import SqlClient, get_firestore

from app.core.auth import get_current_user
from app.core.cache import CACHE_TTL_LONG, snapshot_read
from app.services.coding_stats import (
    load_coding_stats,
    load_platform_coding_stats,
)

router = APIRouter(prefix="/stats/competitive-coding")


def coding_settings(database: SqlClient, user_id: str) -> dict:
    settings_collection = (
        database.collection("users")
        .document(user_id)
        .collection("settings")
    )
    snapshot = settings_collection.document("competitive-coding").get()
    if not snapshot.exists:
        snapshot = settings_collection.document("competitive-programming").get()
    return snapshot.to_dict() if snapshot.exists else {}


@router.get("")
async def get_coding_stats(
    database: SqlClient = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    settings = await asyncio.to_thread(coding_settings, database, user["uid"])
    key = hashlib.sha256(repr(sorted(settings.items())).encode()).hexdigest()[:16]
    return await snapshot_read(
        f"coding-stats:{user['uid']}:{key}",
        lambda: load_coding_stats(settings),
        {platform: {"configured": False, "status": "missing"} for platform in ("codeforces", "codechef", "leetcode")},
        fresh_ttl=300,
        stale_ttl=CACHE_TTL_LONG,
    )


@router.get("/codeforces")
async def get_codeforces_stats(
    database: SqlClient = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    settings = await asyncio.to_thread(coding_settings, database, user["uid"])
    value = settings.get("codeforces", "")
    return await snapshot_read(
        f"coding-stats:{user['uid']}:codeforces:{hashlib.sha256(value.encode()).hexdigest()[:16]}",
        lambda: load_platform_coding_stats("codeforces", value),
        {"configured": bool(value.strip()), "status": "missing" if not value.strip() else "refreshing"},
        fresh_ttl=300,
        stale_ttl=CACHE_TTL_LONG,
    )


@router.get("/codechef")
async def get_codechef_stats(
    database: SqlClient = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    settings = await asyncio.to_thread(coding_settings, database, user["uid"])
    value = settings.get("codechef", "")
    return await snapshot_read(
        f"coding-stats:{user['uid']}:codechef:{hashlib.sha256(value.encode()).hexdigest()[:16]}",
        lambda: load_platform_coding_stats("codechef", value),
        {"configured": bool(value.strip()), "status": "missing" if not value.strip() else "refreshing"},
        fresh_ttl=300,
        stale_ttl=CACHE_TTL_LONG,
    )


@router.get("/leetcode")
async def get_leetcode_stats(
    database: SqlClient = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    settings = await asyncio.to_thread(coding_settings, database, user["uid"])
    value = settings.get("leetcode", "")
    return await snapshot_read(
        f"coding-stats:{user['uid']}:leetcode:{hashlib.sha256(value.encode()).hexdigest()[:16]}",
        lambda: load_platform_coding_stats("leetcode", value),
        {"configured": bool(value.strip()), "status": "missing" if not value.strip() else "refreshing"},
        fresh_ttl=300,
        stale_ttl=CACHE_TTL_LONG,
    )
