import asyncio
import hashlib
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
from app.services.google_calendar import (
    decrypt_google_token,
    encrypt_google_token,
    exchange_google_code,
    google_calendar_data,
    google_profile,
    google_state_serializer,
    refresh_google_token,
)

router = APIRouter(prefix="/integrations/google-calendar")


def accounts_collection(database: Client, user_id: str):
    return (
        database.collection("users")
        .document(user_id)
        .collection("integrations")
        .document("google_calendar")
        .collection("accounts")
    )


def account_document_id(subject: str) -> str:
    return hashlib.sha256(subject.encode()).hexdigest()


@router.get("/authorize")
def authorize_google_calendar(user: dict = Depends(get_current_user)):
    try:
        state = google_state_serializer().dumps({"uid": user["uid"]})
    except RuntimeError as error:
        raise HTTPException(status_code=503, detail=str(error)) from None
    query = urlencode(
        {
            "client_id": settings.google_oauth_client_id,
            "redirect_uri": settings.google_oauth_callback_url,
            "response_type": "code",
            "scope": (
                "openid email profile "
                "https://www.googleapis.com/auth/calendar.readonly"
            ),
            "access_type": "offline",
            "prompt": "consent select_account",
            "include_granted_scopes": "true",
            "state": state,
        },
    )
    return {"url": f"https://accounts.google.com/o/oauth2/v2/auth?{query}"}


@router.get("/callback")
async def google_calendar_callback(
    code: str = Query(),
    state: str = Query(),
    database: Client = Depends(get_firestore),
):
    try:
        user_id = google_state_serializer().loads(state, max_age=600)["uid"]
        token_data = await exchange_google_code(code)
        profile = await google_profile(token_data["access_token"])
        subject = profile["sub"]
        document = accounts_collection(database, user_id).document(
            account_document_id(subject),
        )
        existing = document.get().to_dict() or {}
        refresh_token = token_data.get("refresh_token")
        encrypted_refresh_token = (
            encrypt_google_token(refresh_token)
            if refresh_token
            else existing.get("refresh_token")
        )
        if not encrypted_refresh_token:
            raise ValueError("Google did not return durable Calendar access.")
        calendar_data = await google_calendar_data(token_data["access_token"])
        document.set(
            {
                "subject": subject,
                "email": profile["email"],
                "name": profile.get("name") or profile["email"],
                "picture": profile.get("picture", ""),
                "refresh_token": encrypted_refresh_token,
                "calendars": calendar_data["calendars"],
                "updated_at": firestore.SERVER_TIMESTAMP,
            },
            merge=True,
        )
    except (
        BadSignature,
        SignatureExpired,
        KeyError,
        ValueError,
        httpx.HTTPError,
    ):
        return RedirectResponse(
            f"{settings.frontend_url}/app/setting?calendar=error",
            status_code=302,
        )
    return RedirectResponse(
        f"{settings.frontend_url}/app/setting?calendar=connected",
        status_code=302,
    )


@router.get("/data")
async def get_google_calendar_data(
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    connections = []
    events = []
    snapshots = await asyncio.to_thread(
        lambda: list(accounts_collection(database, user["uid"]).stream()),
    )
    for snapshot in snapshots:
        account = snapshot.to_dict()
        try:
            access_token = await refresh_google_token(
                decrypt_google_token(account["refresh_token"]),
            )
            data = await google_calendar_data(access_token)
        except (KeyError, ValueError, httpx.HTTPError) as error:
            raise HTTPException(status_code=502, detail=str(error)) from None
        connections.append(
            {
                "id": snapshot.id,
                "email": account["email"],
                "name": account.get("name", account["email"]),
                "picture": account.get("picture", ""),
                "calendars": data["calendars"],
            },
        )
        events.extend(
            {
                **event,
                "id": f"{snapshot.id}:{event['id']}",
                "accountEmail": account["email"],
            }
            for event in data["events"]
        )
        await asyncio.to_thread(
            snapshot.reference.update,
            {
                "calendars": data["calendars"],
                "updated_at": firestore.SERVER_TIMESTAMP,
            },
        )
    return {"connections": connections, "events": events}


@router.delete("/accounts/{account_id}", status_code=204)
def disconnect_google_calendar(
    account_id: str,
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    accounts_collection(database, user["uid"]).document(account_id).delete()
