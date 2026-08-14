import asyncio
import logging
from urllib.parse import quote

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from firebase_admin import firestore
from google.cloud.firestore_v1 import Client

from app.core.auth import get_current_user
from app.core.config import settings
from app.db import get_firestore
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
    database: Client = Depends(get_firestore),
):
    try:
        user_id = state_serializer().loads(state, max_age=600)["uid"]
        token_data = await exchange_code(code)
        await asyncio.to_thread(
            lambda: reference(database, user_id).set(
                {
                    "access_token": encrypt_token(token_data["access_token"]),
                    "scope": token_data.get("scope", ""),
                    "updated_at": firestore.SERVER_TIMESTAMP,
                },
                merge=True,
            ),
        )
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
    try:
        snapshot = await asyncio.to_thread(reference(database, user["uid"]).get)
        if not snapshot.exists:
            return {"connected": False, "github": None, "repositories": []}
        data_dict = snapshot.to_dict() or {}
        access_token_enc = data_dict.get("access_token")
        if not access_token_enc:
            return {"connected": False, "github": None, "repositories": []}
        token = decrypt_token(access_token_enc)
        return {"connected": True, **(await fetch_github_data(token))}
    except Exception as error:
        logger.warning("GitHub data fetch failed or disabled: %s", error)
        return {"connected": False, "github": None, "repositories": []}


@router.delete("", status_code=204)
def disconnect_github(
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    reference(database, user["uid"]).delete()
