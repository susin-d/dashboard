import asyncio
import logging
from urllib.parse import quote, unquote, urlencode

import httpx
from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from firebase_admin import firestore
from google.cloud.firestore_v1 import Client
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

from app.core.auth import get_current_user
from app.core.config import settings
from app.db import get_firestore
from app.services.google_calendar import (
    decrypt_google_token,
    encrypt_google_token,
    google_profile,
    refresh_google_token,
    require_google_oauth_config,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/integrations/google-drive")


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


def drive_reference(database: Client, user_id: str):
    return (
        database.collection("users")
        .document(user_id)
        .collection("integrations")
        .document("google_drive")
    )


def drive_state_serializer() -> URLSafeTimedSerializer:
    require_google_oauth_config()
    return URLSafeTimedSerializer(
        settings.google_oauth_state_secret,
        salt="starwaves-google-drive-oauth",
    )


async def exchange_drive_code(code: str) -> dict:
    require_google_oauth_config()
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "client_id": settings.google_oauth_client_id,
                "client_secret": settings.google_oauth_client_secret,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": settings.google_drive_oauth_callback_url,
            },
        )
        response.raise_for_status()
        payload = response.json()
        if not payload.get("access_token"):
            raise ValueError("Google did not return Drive access.")
        return payload


async def access_token(database: Client, user_id: str) -> str:
    snapshot = await asyncio.to_thread(drive_reference(database, user_id).get)
    if not snapshot.exists:
        raise HTTPException(status_code=409, detail="Connect Google Drive first.")
    try:
        refresh_token = decrypt_google_token(snapshot.to_dict()["refresh_token"])
        return await refresh_google_token(refresh_token)
    except (KeyError, ValueError, httpx.HTTPError) as error:
        raise HTTPException(status_code=502, detail=str(error)) from None


@router.get("/authorize")
def authorize_google_drive(user: dict = Depends(get_current_user)):
    try:
        state = drive_state_serializer().dumps({"uid": user["uid"]})
    except RuntimeError as error:
        raise HTTPException(status_code=503, detail=str(error)) from None
    query = urlencode(
        {
            "client_id": settings.google_oauth_client_id,
            "redirect_uri": settings.google_drive_oauth_callback_url,
            "response_type": "code",
            "scope": (
                "openid email profile "
                "https://www.googleapis.com/auth/drive.metadata.readonly "
                "https://www.googleapis.com/auth/drive.file"
            ),
            "access_type": "offline",
            "prompt": "consent select_account",
            "include_granted_scopes": "true",
            "state": state,
        },
    )
    return {"url": f"https://accounts.google.com/o/oauth2/v2/auth?{query}"}


@router.get("/callback")
async def google_drive_callback(
    code: str = Query(),
    state: str = Query(),
    database: Client = Depends(get_firestore),
):
    try:
        user_id = drive_state_serializer().loads(state, max_age=600)["uid"]
        token_data = await exchange_drive_code(code)
        profile = await google_profile(token_data["access_token"])
        existing = (await asyncio.to_thread(drive_reference(database, user_id).get)).to_dict() or {}
        refresh_token = token_data.get("refresh_token")
        encrypted_refresh_token = (
            encrypt_google_token(refresh_token)
            if refresh_token
            else existing.get("refresh_token")
        )
        if not encrypted_refresh_token:
            raise ValueError("Google did not return durable Drive access.")
        await asyncio.to_thread(
            lambda: drive_reference(database, user_id).set(
                {
                    "subject": profile["sub"],
                    "email": profile["email"],
                    "name": profile.get("name") or profile["email"],
                    "picture": profile.get("picture", ""),
                    "refresh_token": encrypted_refresh_token,
                    "updated_at": firestore.SERVER_TIMESTAMP,
                },
                merge=True,
            ),
        )
    except Exception as error:
        logger.error("Google Drive OAuth callback error: %s", error, exc_info=True)
        reason = quote(format_oauth_error(error))
        return HTMLResponse(
            f"""<!DOCTYPE html><html><body><script>
            if (window.opener) {{ window.close(); }}
            else {{ window.location.href = "{settings.frontend_url}/app/setting?drive=error&reason={reason}"; }}
            </script></body></html>"""
        )
    return HTMLResponse(
        f"""<!DOCTYPE html><html><body><script>
        if (window.opener) {{ window.close(); }}
        else {{ window.location.href = "{settings.frontend_url}/app/setting?drive=connected"; }}
        </script></body></html>"""
    )


@router.get("/status")
def google_drive_status(
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    snapshot = drive_reference(database, user["uid"]).get()
    if not snapshot.exists:
        return {"connected": False, "account": None}
    account = snapshot.to_dict()
    return {
        "connected": True,
        "account": {
            "email": account["email"],
            "name": account.get("name", account["email"]),
            "picture": account.get("picture", ""),
        },
    }


@router.get("/files")
async def google_drive_files(
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    token = await access_token(database, user["uid"])
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.get(
            "https://www.googleapis.com/drive/v3/files",
            headers={"Authorization": f"Bearer {token}"},
            params={
                "pageSize": "100",
                "orderBy": "modifiedTime desc",
                "q": "trashed = false",
                "fields": "files(id,name,mimeType,size,modifiedTime,webViewLink)",
            },
        )
        try:
            response.raise_for_status()
        except httpx.HTTPStatusError as error:
            raise HTTPException(status_code=502, detail=response.text) from error
        return response.json()


@router.get("/editor-url/{document_id}")
async def google_drive_editor_url(
    document_id: str,
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    if "/" in document_id or not document_id.strip():
        raise HTTPException(status_code=400, detail="Invalid document ID.")

    document_reference = database.collection("users").document(user["uid"]).collection("documents").document(document_id)
    snapshot = await asyncio.to_thread(document_reference.get)
    if not snapshot.exists:
        raise HTTPException(status_code=404, detail="Document not found.")
    document = snapshot.to_dict() or {}
    drive_file_id = document.get("drive_file_id")
    if not drive_file_id:
        raise HTTPException(status_code=409, detail="This document is not linked to Google Drive.")

    token = await access_token(database, user["uid"])
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.get(
            f"https://www.googleapis.com/drive/v3/files/{quote(drive_file_id, safe='')}",
            headers={"Authorization": f"Bearer {token}"},
            params={"fields": "id,name,mimeType,webViewLink"},
        )
    if response.status_code == 404:
        raise HTTPException(status_code=404, detail="The Google Drive file no longer exists.")
    try:
        response.raise_for_status()
    except httpx.HTTPStatusError as error:
        raise HTTPException(status_code=502, detail="Google Drive could not open this file.") from error

    file = response.json()
    editor_hosts = {
        "application/vnd.google-apps.document": "https://docs.google.com/document/d/{id}/edit",
        "application/vnd.google-apps.spreadsheet": "https://docs.google.com/spreadsheets/d/{id}/edit",
        "application/vnd.google-apps.presentation": "https://docs.google.com/presentation/d/{id}/edit",
    }
    editor_template = editor_hosts.get(file.get("mimeType"))
    if not editor_template:
        raise HTTPException(status_code=409, detail="This file type does not have a Google Workspace editor.")
    return {
        "id": file["id"],
        "name": file.get("name", document.get("name", "Untitled document")),
        "mime_type": file.get("mimeType"),
        "editor_url": editor_template.format(id=quote(file["id"], safe="")),
    }


@router.post("/upload")
async def upload_google_drive_file(
    request: Request,
    x_file_name: str = Header(),
    x_file_type: str = Header(default="application/octet-stream"),
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    token = await access_token(database, user["uid"])
    content = await request.body()
    headers = {"Authorization": f"Bearer {token}"}
    async with httpx.AsyncClient(timeout=120) as client:
        metadata_response = await client.post(
            "https://www.googleapis.com/upload/drive/v3/files",
            headers={
                **headers,
                "Content-Type": "application/json; charset=UTF-8",
                "X-Upload-Content-Type": x_file_type,
                "X-Upload-Content-Length": str(len(content)),
            },
            params={
                "uploadType": "resumable",
                "fields": "id,name,mimeType,size,modifiedTime,webViewLink",
            },
            json={"name": unquote(x_file_name)},
        )
        try:
            metadata_response.raise_for_status()
            upload_url = metadata_response.headers["Location"]
            upload_response = await client.put(
                upload_url,
                headers={"Content-Type": x_file_type},
                content=content,
            )
            upload_response.raise_for_status()
        except (httpx.HTTPStatusError, KeyError) as error:
            raise HTTPException(
                status_code=502,
                detail="Google Drive upload failed.",
            ) from error
        return upload_response.json()


@router.delete("", status_code=204)
def disconnect_google_drive(
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    drive_reference(database, user["uid"]).delete()
