"""Contest route: aggregated upcoming contests across platforms, with caching."""

import asyncio
from typing import Any

import httpx
from fastapi import APIRouter, Query

from app.api.routes.workspace._shared import DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE
from app.core.cache import CACHE_TTL_LONG, snapshot_read
from app.repositories.pagination import decode_cursor, encode_cursor
from app.schemas.workspace import PageResponse
from app.services.contests import codechef_contests, codeforces_contests, leetcode_contests

router = APIRouter()

CONTEST_REQUEST_TIMEOUT = httpx.Timeout(8.0, connect=2.0)


def _contest_sort_key(contest: dict[str, Any]) -> tuple[str, str]:
    """Stable sort key: starts at first, then a tiebreaker per contest id."""
    return (contest["startsAt"], contest["id"])


@router.get("/contests", response_model=PageResponse)
async def list_contests(
    cursor: str | None = None,
    limit: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
):
    async def load_platforms():
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
            loaded = await asyncio.gather(
                codeforces_contests(client),
                codechef_contests(client),
                leetcode_contests(client),
            )
        return [platform for platform in loaded if platform is not None]

    platforms = await snapshot_read(
        "contests:platforms",
        load_platforms,
        [],
        fresh_ttl=600,
        stale_ttl=CACHE_TTL_LONG,
    )

    records = []
    for platform in platforms:
        records.extend(
            {**contest, "platformId": platform["id"]} for contest in platform["contests"]
        )
    records.sort(key=_contest_sort_key)

    # Stable keyset pagination: the cursor stores the last delivered sort key,
    # so newly inserted contests do not shift previously-returned pages.
    page = records
    if cursor:
        last_start, last_id = (decode_cursor(cursor) or "\x00").split("\t", 1)
        page = [
            contest
            for contest in records
            if (contest["startsAt"], contest["id"]) > (last_start, last_id)
        ]

    items = page[:limit]
    next_cursor = None
    if len(page) > limit:
        final = items[-1]
        next_cursor = encode_cursor(f"{final['startsAt']}\t{final['id']}")
    return {"items": items, "next_cursor": next_cursor, "has_more": next_cursor is not None}
