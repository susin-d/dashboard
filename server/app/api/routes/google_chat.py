import hashlib
import logging
from urllib.parse import quote, urlencode

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

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/integrations/google-chat")


def format_oauth_error(error: Exception) -> str:
    if isinstance(error, httpx.HTTPStatusError):
        try:
            data = error.response.json()
            desc = data.get("error_description") or data.get("error") or str(error)
            return f"Google HTTP {error.response.status_code}: {desc}"
        except Exception:
            return f"Google HTTP {error.response.status_code}: {error.response.text[:100]}"
    elif isinstance(error, httpx.HTTPError):
        return f"Network error connecting to Google: {error}"
    return str(error) or error.__class__.__name__


class GoogleChatConnection(BaseModel):
    access_token: str = Field(min_length=1)


class GoogleChatMessageSend(BaseModel):
    space_id: str = Field(min_length=1)
    text: str = Field(min_length=1)
    account_email: str | None = None


def chat_accounts_collection(database: Client, user_id: str):
    return (
        database.collection("users")
        .document(user_id)
        .collection("integrations")
        .document("google_chat")
        .collection("accounts")
    )


def account_document_id(email: str) -> str:
    return hashlib.sha256(email.lower().strip().encode()).hexdigest()


def chat_state_serializer() -> URLSafeTimedSerializer:
    require_google_oauth_config()
    return URLSafeTimedSerializer(
        settings.google_oauth_state_secret,
        salt="starwaves-google-chat-oauth",
    )


@router.get("/authorize")
def authorize_google_chat(user: dict = Depends(get_current_user)):
    try:
        state = chat_state_serializer().dumps({"uid": user["uid"]})
    except RuntimeError as error:
        raise HTTPException(status_code=503, detail=str(error)) from None
    query = urlencode(
        {
            "client_id": settings.google_oauth_client_id,
            "redirect_uri": settings.google_chat_oauth_callback_url,
            "response_type": "code",
            "scope": (
                "openid email profile "
                "https://www.googleapis.com/auth/chat.spaces.readonly "
                "https://www.googleapis.com/auth/chat.messages "
                "https://www.googleapis.com/auth/chat.memberships.readonly"
            ),
            "access_type": "offline",
            "prompt": "consent select_account",
            "include_granted_scopes": "true",
            "state": state,
        },
    )
    return {"url": f"https://accounts.google.com/o/oauth2/v2/auth?{query}"}


@router.get("/callback")
async def google_chat_callback(
    code: str = Query(...),
    state: str = Query(...),
    database: Client = Depends(get_firestore),
):
    try:
        user_id = chat_state_serializer().loads(state, max_age=600)["uid"]
        async with httpx.AsyncClient(timeout=20) as client:
            token_res = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "client_id": settings.google_oauth_client_id,
                    "client_secret": settings.google_oauth_client_secret,
                    "code": code,
                    "grant_type": "authorization_code",
                    "redirect_uri": settings.google_chat_oauth_callback_url,
                },
            )
            token_res.raise_for_status()
            token_data = token_res.json()

            userinfo_res = await client.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {token_data['access_token']}"},
            )
            userinfo_res.raise_for_status()
            userinfo = userinfo_res.json()
            email = userinfo.get("email")
            display_name = userinfo.get("name", email)
            picture = userinfo.get("picture")

        if not email:
            raise ValueError("Google account email could not be retrieved.")

        doc_id = account_document_id(email)
        doc_ref = chat_accounts_collection(database, user_id).document(doc_id)
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
                "display_name": display_name,
                "picture": picture,
                "connected": True,
                "access_token": token_data["access_token"],
                "refresh_token": encrypted_refresh_token,
                "updated_at": firestore.SERVER_TIMESTAMP,
            },
            merge=True,
        )
    except Exception as error:
        logger.error("Google Chat OAuth callback error: %s", error, exc_info=True)
        reason = quote(format_oauth_error(error))
        return RedirectResponse(
            f"{settings.frontend_url}/app/setting?chat=error&reason={reason}",
            status_code=302,
        )
    return RedirectResponse(
        f"{settings.frontend_url}/app/setting?chat=connected",
        status_code=302,
    )


@router.get("/accounts")
def get_google_chat_accounts(
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    docs = chat_accounts_collection(database, user["uid"]).stream()
    accounts = []
    for doc in docs:
        data = doc.to_dict() or {}
        if data.get("connected"):
            accounts.append(
                {
                    "id": data.get("id", doc.id),
                    "email": data.get("email"),
                    "display_name": data.get("display_name"),
                    "picture": data.get("picture"),
                    "connected": True,
                }
            )
    return {"accounts": accounts}


@router.post("/accounts")
async def connect_google_chat_account(
    connection: GoogleChatConnection,
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {connection.access_token}"},
        )
    if response.status_code in (401, 403):
        raise HTTPException(
            status_code=400,
            detail="Google rejected the Google Chat authorization.",
        )
    try:
        response.raise_for_status()
        userinfo = response.json()
        email = userinfo["email"]
        display_name = userinfo.get("name", email)
        picture = userinfo.get("picture")
    except (httpx.HTTPError, KeyError, ValueError) as error:
        raise HTTPException(
            status_code=502,
            detail="Google Chat account verification failed.",
        ) from error

    doc_id = account_document_id(email)
    doc_ref = chat_accounts_collection(database, user["uid"]).document(doc_id)
    doc_ref.set(
        {
            "id": doc_id,
            "email": email,
            "display_name": display_name,
            "picture": picture,
            "connected": True,
            "access_token": connection.access_token,
            "updated_at": firestore.SERVER_TIMESTAMP,
        },
        merge=True,
    )
    return {
        "connected": True,
        "account": {
            "id": doc_id,
            "email": email,
            "display_name": display_name,
            "picture": picture,
        },
    }


@router.delete("/accounts/{account_id}")
def disconnect_google_chat_account(
    account_id: str,
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    doc_ref = chat_accounts_collection(database, user["uid"]).document(account_id)
    if not doc_ref.get().exists:
        raise HTTPException(status_code=404, detail="Account connection not found.")
    doc_ref.delete()
    return {"disconnected": True}


@router.get("/spaces")
async def get_google_chat_spaces(
    account_email: str | None = None,
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    docs = chat_accounts_collection(database, user["uid"]).stream()
    accounts = [doc.to_dict() for doc in docs if doc.to_dict().get("connected")]
    if account_email:
        accounts = [a for a in accounts if a.get("email") == account_email]
    
    # Structure space responses or fallback
    return {
        "accounts": [
            {
                "id": a.get("id"),
                "email": a.get("email"),
                "display_name": a.get("display_name"),
            }
            for a in accounts
        ],
        "spaces": [],
    }
