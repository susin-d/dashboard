import asyncio
from urllib.parse import urlencode

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

router = APIRouter(prefix="/integrations/github")


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
    except (BadSignature, SignatureExpired, KeyError, ValueError, httpx.HTTPError) as error:
        return RedirectResponse(
            f"{settings.frontend_url}/app/setting?github=error",
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
