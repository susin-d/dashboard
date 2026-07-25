import hashlib
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from firebase_admin import firestore
from google.cloud.firestore_v1 import Client
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
from pydantic import BaseModel, Field

from app.core.auth import get_current_user
from app.core.config import settings
from app.db import get_firestore
from app.services.google_calendar import (
    encrypt_google_token,
    require_google_oauth_config,
)

router = APIRouter(prefix="/integrations/gmail")


class GmailConnection(BaseModel):
    access_token: str = Field(min_length=1)


def gmail_accounts_collection(database: Client, user_id: str):
    return (
        database.collection("users")
        .document(user_id)
        .collection("integrations")
        .document("gmail")
        .collection("accounts")
    )


def account_document_id(email: str) -> str:
    return hashlib.sha256(email.lower().strip().encode()).hexdigest()


def gmail_state_serializer() -> URLSafeTimedSerializer:
    require_google_oauth_config()
    return URLSafeTimedSerializer(
        settings.google_oauth_state_secret,
        salt="starwaves-gmail-oauth",
    )


@router.get("/authorize")
def authorize_gmail(user: dict = Depends(get_current_user)):
    try:
        state = gmail_state_serializer().dumps({"uid": user["uid"]})
    except RuntimeError as error:
        raise HTTPException(status_code=503, detail=str(error)) from None
    query = urlencode(
        {
            "client_id": settings.google_oauth_client_id,
            "redirect_uri": settings.gmail_oauth_callback_url,
            "response_type": "code",
            "scope": (
                "openid email profile "
                "https://www.googleapis.com/auth/gmail.modify "
                "https://www.googleapis.com/auth/gmail.readonly "
                "https://www.googleapis.com/auth/gmail.send"
            ),
            "access_type": "offline",
            "prompt": "consent select_account",
            "include_granted_scopes": "true",
            "state": state,
        },
    )
    return {"url": f"https://accounts.google.com/o/oauth2/v2/auth?{query}"}


@router.get("/callback")
async def gmail_callback(
    code: str = Query(...),
    state: str = Query(...),
    database: Client = Depends(get_firestore),
):
    try:
        user_id = gmail_state_serializer().loads(state, max_age=600)["uid"]
        async with httpx.AsyncClient(timeout=20) as client:
            token_res = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "client_id": settings.google_oauth_client_id,
                    "client_secret": settings.google_oauth_client_secret,
                    "code": code,
                    "grant_type": "authorization_code",
                    "redirect_uri": settings.gmail_oauth_callback_url,
                },
            )
            token_res.raise_for_status()
            token_data = token_res.json()

            profile_res = await client.get(
                "https://gmail.googleapis.com/gmail/v1/users/me/profile",
                headers={"Authorization": f"Bearer {token_data['access_token']}"},
            )
            profile_res.raise_for_status()
            email = profile_res.json()["emailAddress"]

        doc_id = account_document_id(email)
        doc_ref = gmail_accounts_collection(database, user_id).document(doc_id)
        existing = doc_ref.get().to_dict() or {}
        refresh_token = token_data.get("refresh_token")
        encrypted_refresh_token = (
            encrypt_google_token(refresh_token)
            if refresh_token
            else existing.get("refresh_token")
        )

        doc_ref.set(
            {
                "id": doc_id,
                "email": email,
                "connected": True,
                "access_token": token_data["access_token"],
                "refresh_token": encrypted_refresh_token,
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
            f"{settings.frontend_url}/app/setting?gmail=error",
            status_code=302,
        )
    return RedirectResponse(
        f"{settings.frontend_url}/app/setting?gmail=connected",
        status_code=302,
    )


@router.post("")
@router.post("/accounts")
async def connect_gmail(
    connection: GmailConnection,
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.get(
            "https://gmail.googleapis.com/gmail/v1/users/me/profile",
            headers={"Authorization": f"Bearer {connection.access_token}"},
        )
    if response.status_code in (401, 403):
        raise HTTPException(
            status_code=400,
            detail="Google rejected the Gmail authorization.",
        )
    try:
        response.raise_for_status()
        profile = response.json()
        email = profile["emailAddress"]
    except (httpx.HTTPError, KeyError, ValueError) as error:
        raise HTTPException(
            status_code=502,
            detail="Gmail account verification failed.",
        ) from error

    doc_id = account_document_id(email)
    doc_ref = gmail_accounts_collection(database, user["uid"]).document(doc_id)
    doc_ref.set(
        {
            "id": doc_id,
            "email": email,
            "connected": True,
            "access_token": connection.access_token,
            "updated_at": firestore.SERVER_TIMESTAMP,
        },
        merge=True,
    )
    return {
        "connected": True,
        "account": {"id": doc_id, "email": email},
    }


@router.get("/accounts")
def get_gmail_accounts(
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    snapshots = list(gmail_accounts_collection(database, user["uid"]).stream())
    accounts = []
    for snapshot in snapshots:
        data = snapshot.to_dict()
        accounts.append({
            "id": snapshot.id,
            "email": data.get("email", ""),
            "connected": bool(data.get("connected", True)),
        })
    return {"accounts": accounts}


@router.get("/status")
def gmail_status(
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    snapshots = list(gmail_accounts_collection(database, user["uid"]).stream())
    accounts = []
    for snapshot in snapshots:
        data = snapshot.to_dict()
        accounts.append({
            "id": snapshot.id,
            "email": data.get("email", ""),
            "connected": bool(data.get("connected", True)),
        })

    connected = len(accounts) > 0
    primary_account = accounts[0] if accounts else None
    return {
        "connected": connected,
        "account": primary_account,
        "accounts": accounts,
    }


@router.delete("/accounts/{account_id}", status_code=204)
def disconnect_gmail_account(
    account_id: str,
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    gmail_accounts_collection(database, user["uid"]).document(account_id).delete()


@router.delete("", status_code=204)
def disconnect_all_gmail(
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    snapshots = list(gmail_accounts_collection(database, user["uid"]).stream())
    for snapshot in snapshots:
        snapshot.reference.delete()
