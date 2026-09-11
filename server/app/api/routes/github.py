import asyncio
import logging
from urllib.parse import quote

import httpx
from fastapi import APIRouter, Depends, Query
from fastapi.responses import RedirectResponse
from app.db import ArrayUnion, SERVER_TIMESTAMP, SqlClient, get_firestore

from app.core.auth import get_current_user
from app.core.cache import CACHE_TTL_LONG, cache_invalidate_prefix, snapshot_read
from app.core.config import settings
from app.core.errors import service_unavailable
from app.services.github import fetch_github_data, state_serializer
from app.services.oauth import (
    build_github_authorize_url,
    decrypt_token,
    encrypt_token,
    exchange_code,
    format_oauth_error,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/integrations/github")

GITHUB_SCOPES = "read:user repo"


def reference(database: SqlClient, user_id: str):
    return (
        database.collection("users")
        .document(user_id)
        .collection("integrations")
        .document("github")
    )


@router.get("/authorize")
def authorize_github(user: dict = Depends(get_current_user)):
    try:
        state = state_serializer().dumps({"uid": user["uid"]})
    except RuntimeError as error:
        raise service_unavailable(str(error)) from None
    url = build_github_authorize_url(
        settings.github_oauth_callback_url,
        GITHUB_SCOPES,
        state,
    )
    return {"url": url}


@router.get("/callback")
async def github_callback(
    code: str = Query(),
    state: str = Query(),
    database: SqlClient = Depends(get_firestore),
):
    try:
        user_id = state_serializer().loads(state, max_age=600)["uid"]
        token_data = await exchange_code(code)
        await asyncio.to_thread(
            lambda: reference(database, user_id).set(
                {
                    "access_token": encrypt_token(token_data["access_token"]),
                    "scope": token_data.get("scope", ""),
                    "updated_at": SERVER_TIMESTAMP,
                },
                merge=True,
            ),
        )
        _github_status_invalidate(user_id)
    except Exception as error:
        logger.error("GitHub OAuth callback error: %s", error, exc_info=True)
        reason = quote(format_oauth_error(error, "GitHub"))
        return RedirectResponse(
            f"{settings.frontend_url}/app/setting?github=error&reason={reason}",
            status_code=302,
        )
    return RedirectResponse(
        f"{settings.frontend_url}/app/setting?github=connected",
        status_code=302,
    )


_github_status_cache: dict[str, tuple[float, dict]] = {}
_GITHUB_STATUS_TTL = 30

def _github_status_get(uid: str):
    import time
    e = _github_status_cache.get(uid)
    if e and e[0] > time.monotonic():
        return e[1]
    return None

def _github_status_set(uid: str, data: dict):
    import time
    _github_status_cache[uid] = (time.monotonic() + _GITHUB_STATUS_TTL, data)

def _github_status_invalidate(uid: str):
    _github_status_cache.pop(uid, None)
    cache_invalidate_prefix(f"github:data:{uid}")


@router.get("/status")
async def github_status(
    database: SqlClient = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    cached = _github_status_get(user["uid"])
    if cached is not None:
        return cached
    snapshot = await asyncio.to_thread(reference(database, user["uid"]).get)
    result = {"connected": snapshot.exists}
    _github_status_set(user["uid"], result)
    return result


@router.get("/data")
async def github_data(
    database: SqlClient = Depends(get_firestore),
    user: dict = Depends(get_current_user),
    repository_limit: int = Query(default=100, ge=1, le=100),
    include_stats: bool = Query(default=True),
):
    try:
        snapshot_key = f"github:data:{user['uid']}:{repository_limit}:{include_stats}"

        async def load_snapshot():
            integration = await asyncio.to_thread(reference(database, user["uid"]).get)
            if not integration.exists:
                return {"connected": False, "github": None, "repositories": []}
            access_token_enc = (integration.to_dict() or {}).get("access_token")
            if not access_token_enc:
                return {"connected": False, "github": None, "repositories": []}
            token = decrypt_token(access_token_enc)
            data = await fetch_github_data(token, repository_limit, include_stats)
            return {"connected": True, **data}

        snapshot = await snapshot_read(
            snapshot_key,
            load_snapshot,
            {"connected": False, "github": None, "repositories": []},
            fresh_ttl=60,
            stale_ttl=CACHE_TTL_LONG,
        )
        return snapshot
    except Exception as error:
        logger.warning("GitHub data fetch failed or disabled: %s", error)
        return {"connected": False, "github": None, "repositories": []}


@router.delete("", status_code=204)
def disconnect_github(
    database: SqlClient = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    reference(database, user["uid"]).delete()
    _github_status_invalidate(user["uid"])
