"""Contest route: aggregated upcoming contests across platforms, with caching."""

import asyncio
import time

import httpx
from fastapi import APIRouter, Query

from app.api.routes.workspace._shared import DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE
from app.repositories.pagination import decode_cursor, encode_cursor
from app.schemas.workspace import PageResponse
from app.services.contests import codechef_contests, codeforces_contests, leetcode_contests

router = APIRouter()

CONTEST_CACHE_TTL = 10 * 60
_contest_cache: tuple[float, list[dict]] | None = None
CONTEST_REQUEST_TIMEOUT = httpx.Timeout(8.0, connect=2.0)


@router.get("/contests", response_model=PageResponse)
async def list_contests(
    cursor: str | None = None,
    limit: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
):
    global _contest_cache
    if _contest_cache and _contest_cache[0] > time.monotonic():
        platforms = _contest_cache[1]
    else:
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
            platforms = await asyncio.gather(
                codeforces_contests(client),
                codechef_contests(client),
                leetcode_contests(client),
            )
        platforms = [platform for platform in platforms if platform is not None]
        if platforms:
            _contest_cache = (time.monotonic() + CONTEST_CACHE_TTL, platforms)
    offset = int(decode_cursor(cursor) or 0)
    records = []
    for platform in platforms:
        records.extend({**contest, "platformId": platform["id"]} for contest in platform["contests"])
    records.sort(key=lambda contest: contest["startsAt"])
    page = records[offset : offset + limit]
    next_cursor = encode_cursor(str(offset + limit)) if offset + limit < len(records) else None
    return {"items": page, "next_cursor": next_cursor, "has_more": next_cursor is not None}
