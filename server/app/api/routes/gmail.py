import hashlib
import logging
from urllib.parse import quote, urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import HTMLResponse, RedirectResponse
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

router = APIRouter(prefix="/integrations/gmail")


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
    except Exception as error:
        logger.error("Gmail OAuth callback error: %s", error, exc_info=True)
        reason = quote(format_oauth_error(error))
        return HTMLResponse(
            f"""<!DOCTYPE html><html><body><script>
            if (window.opener) {{ window.close(); }}
            else {{ window.location.href = "{settings.frontend_url}/app/setting?gmail=error&reason={reason}"; }}
            </script></body></html>"""
        )
    return HTMLResponse(
        f"""<!DOCTYPE html><html><body><script>
        if (window.opener) {{ window.close(); }}
        else {{ window.location.href = "{settings.frontend_url}/app/setting?gmail=connected"; }}
        </script></body></html>"""
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


@router.get("/token")
async def get_gmail_token(
    email: str | None = Query(default=None),
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    """Return a fresh Gmail access token for the given account (or first account)."""
    collection = gmail_accounts_collection(database, user["uid"])
    if email:
        doc_id = account_document_id(email)
        snapshot = collection.document(doc_id).get()
        if not snapshot.exists:
            raise HTTPException(status_code=404, detail="Gmail account not found.")
        data = snapshot.to_dict()
    else:
        snapshots = list(collection.stream())
        if not snapshots:
            raise HTTPException(status_code=404, detail="No Gmail accounts connected.")
        data = snapshots[0].to_dict()

    encrypted_refresh_token = data.get("refresh_token")
    if not encrypted_refresh_token:
        raise HTTPException(
            status_code=400,
            detail="No refresh token stored for this Gmail account. Please reconnect.",
        )

    try:
        from app.services.google_calendar import decrypt_google_token, refresh_google_token
        refresh_token = decrypt_google_token(encrypted_refresh_token)
        access_token = await refresh_google_token(refresh_token)
    except Exception as error:
        logger.error("Gmail token refresh failed: %s", error, exc_info=True)
        raise HTTPException(
            status_code=502,
            detail="Could not refresh Gmail access token. Please reconnect your account.",
        ) from error

    return {
        "email": data.get("email", ""),
        "access_token": access_token,
        "expires_in": 3599,
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
