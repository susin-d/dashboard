import asyncio
import logging
from urllib.parse import quote, urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from firebase_admin import firestore
from google.cloud.firestore_v1 import Client
from itsdangerous import BadSignature, SignatureExpired

from app.core.auth import get_current_user
from app.core.config import settings
from app.db import get_firestore
from app.services.github import (
    decrypt_token,
    encrypt_token,
    exchange_code,
    fetch_github_data,
    require_oauth_config,
    state_serializer,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/integrations/github")


def format_oauth_error(error: Exception) -> str:
    if isinstance(error, httpx.HTTPStatusError):
        try:
            data = error.response.json()
            desc = data.get("error_description") or data.get("error") or str(error)
            return f"GitHub HTTP {error.response.status_code}: {desc}"
        except Exception:
            return f"GitHub HTTP {error.response.status_code}: {error.response.text[:100]}"
    elif isinstance(error, httpx.HTTPError):
        return f"Network error connecting to GitHub: {error}"
    return str(error) or error.__class__.__name__


def reference(database: Client, user_id: str):
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
        raise HTTPException(status_code=503, detail=str(error)) from None
    query = urlencode(
        {
            "client_id": settings.github_oauth_client_id,
            "redirect_uri": settings.github_oauth_callback_url,
            "scope": "read:user repo",
            "state": state,
        },
    )
    return {"url": f"https://github.com/login/oauth/authorize?{query}"}


@router.get("/callback")
async def github_callback(
    code: str = Query(),
    state: str = Query(),
    database: Client = Depends(get_firestore),
):
    try:
        user_id = state_serializer().loads(state, max_age=600)["uid"]
        token_data = await exchange_code(code)
        reference(database, user_id).set(
            {
                "access_token": encrypt_token(token_data["access_token"]),
                "scope": token_data.get("scope", ""),
                "updated_at": firestore.SERVER_TIMESTAMP,
            },
            merge=True,
        )
    except Exception as error:
        logger.error("GitHub OAuth callback error: %s", error, exc_info=True)
        reason = quote(format_oauth_error(error))
        return RedirectResponse(
            f"{settings.frontend_url}/app/setting?github=error&reason={reason}",
            status_code=302,
        )
    return RedirectResponse(
        f"{settings.frontend_url}/app/setting?github=connected",
        status_code=302,
    )


@router.get("/status")
def github_status(
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    snapshot = reference(database, user["uid"]).get()
    return {"connected": snapshot.exists}


@router.get("/data")
async def github_data(
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    snapshot = await asyncio.to_thread(reference(database, user["uid"]).get)
    if not snapshot.exists:
        return {"connected": False, "github": None, "repositories": []}
    try:
        token = decrypt_token(snapshot.to_dict()["access_token"])
        return {"connected": True, **(await fetch_github_data(token))}
    except (KeyError, ValueError, httpx.HTTPError) as error:
        raise HTTPException(status_code=502, detail=str(error)) from None


@router.delete("", status_code=204)
def disconnect_github(
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    reference(database, user["uid"]).delete()
