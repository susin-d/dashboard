from urllib.parse import urlencode

import asyncio
import httpx
from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from fastapi.responses import HTMLResponse
from google.cloud.firestore_v1 import Client
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
from pydantic import BaseModel, EmailStr

from app.core.auth import auth_serializer, create_user_token, get_current_user
from app.core.config import settings
from app.db import get_firestore
from app.services.email import send_account_combine_email, send_password_reset_email, send_welcome_email
from app.repositories.user_repository import (
    add_pending_combine_request,
    confirm_combine_accounts,
    create_user_with_password,
    get_combined_accounts_info,
    get_or_create_google_user,
    get_user_by_email,
    get_user_by_id,
    remove_combined_account,
    update_user_profile as update_profile_in_db,
    verify_password,
)


router = APIRouter(prefix="/auth")


def state_serializer() -> URLSafeTimedSerializer:
    return URLSafeTimedSerializer(
        settings.auth_secret_key,
        salt="starwaves-google-auth-state",
    )


class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    name: str | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ProfileUpdateRequest(BaseModel):
    displayName: str


@router.get("/google/login")
def google_login():
    if not settings.google_oauth_client_id:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google OAuth is not configured on the server.",
        )
    state = state_serializer().dumps({"action": "google-auth"})
    query = urlencode(
        {
            "client_id": settings.google_oauth_client_id,
            "redirect_uri": settings.auth_google_callback_url,
            "response_type": "code",
            "scope": "openid email profile",
            "access_type": "online",
            "state": state,
            "prompt": "select_account",
        },
    )
    return {"url": f"https://accounts.google.com/o/oauth2/v2/auth?{query}"}


@router.get("/google/callback", response_class=HTMLResponse)
async def google_callback(
    code: str = Query(...),
    state: str = Query(...),
    database: Client = Depends(get_firestore),
):
    try:
        state_serializer().loads(state, max_age=600)
    except (BadSignature, SignatureExpired):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google OAuth state token is invalid or expired.",
        ) from None

    if not settings.google_oauth_client_id or not settings.google_oauth_client_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google OAuth is not properly configured.",
        )

    async with httpx.AsyncClient() as client:
        token_response = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "client_id": settings.google_oauth_client_id,
                "client_secret": settings.google_oauth_client_secret,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": settings.auth_google_callback_url,
            },
        )
        if token_response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to exchange authorization code with Google.",
            )
        tokens = token_response.json()

        userinfo_response = await client.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {tokens['access_token']}"},
        )
        if userinfo_response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to fetch Google user profile.",
            )
        google_user = userinfo_response.json()

    email = google_user.get("email")
    name = google_user.get("name") or google_user.get("given_name") or (email.split("@")[0] if email else "")
    picture = google_user.get("picture")

    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google account did not return an email address.",
        )

    user_record = get_or_create_google_user(
        database=database,
        email=email,
        name=name,
        picture=picture,
    )

    if user_record.get("is_new"):
        await asyncio.to_thread(
            send_welcome_email,
            user_record["email"],
            user_record.get("display_name") or name,
        )

    token = create_user_token(
        {
            "uid": user_record["uid"],
            "email": user_record["email"],
            "name": user_record.get("display_name") or name,
        },
    )

    html_content = f"""
    <!DOCTYPE html>
    <html>
      <head><title>Authentication Successful</title></head>
      <body>
        <script>
          const authData = {{
            token: "{token}",
            user: {{
              uid: "{user_record['uid']}",
              email: "{user_record['email']}",
              displayName: "{user_record.get('display_name') or name}"
            }}
          }};
          if (window.opener) {{
            window.opener.postMessage({{ type: "STARWAVES_AUTH_SUCCESS", data: authData }}, "*");
            window.close();
          }} else {{
            window.location.href = "{settings.frontend_url}/#token=" + encodeURIComponent(token);
          }}
        </script>
        <p>Authentication successful. You can close this window.</p>
      </body>
    </html>
    """
    return HTMLResponse(content=html_content)


@router.post("/signup")
def signup(
    payload: SignupRequest,
    database: Client = Depends(get_firestore),
):
    try:
        user_record = create_user_with_password(
            database=database,
            email=payload.email,
            password=payload.password,
            name=payload.name,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from None
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from None

    send_welcome_email(
        to_email=user_record["email"],
        user_name=user_record["display_name"],
    )

    token = create_user_token(
        {
            "uid": user_record["uid"],
            "email": user_record["email"],
            "name": user_record["display_name"],
        },
    )
    return {
        "token": token,
        "user": {
            "uid": user_record["uid"],
            "email": user_record["email"],
            "displayName": user_record["display_name"],
        },
    }


@router.post("/login")
def login(payload: LoginRequest, database: Client = Depends(get_firestore)):
    user_record = get_user_by_email(database, payload.email)
    if not user_record or not user_record.get("password_hash") or not user_record.get("password_salt"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="The email or password is incorrect.",
        ) from None

    if not verify_password(payload.password, user_record["password_hash"], user_record["password_salt"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="The email or password is incorrect.",
        ) from None

    token = create_user_token(
        {
            "uid": user_record["uid"],
            "email": user_record["email"],
            "name": user_record.get("display_name"),
        },
    )
    return {
        "token": token,
        "user": {
            "uid": user_record["uid"],
            "email": user_record["email"],
            "displayName": user_record.get("display_name") or user_record["email"].split("@")[0],
        },
    }

@router.post("/forgot-password")
def forgot_password(
    payload: ForgotPasswordRequest,
    database: Client = Depends(get_firestore),
):
    user_record = get_user_by_email(database, payload.email)
    if user_record:
        token = state_serializer().dumps({"uid": user_record["uid"], "action": "reset_password"})
        send_password_reset_email(user_record["email"], token)
    return {"message": "If an account exists with that email, a password reset link has been sent via email."}


@router.get("/me")
def get_me(
    user: dict = Depends(get_current_user),
    database: Client = Depends(get_firestore),
):
    user_record = get_user_by_id(database, user["uid"])
    if user_record:
        display_name = user_record.get("display_name")
        email = user_record.get("email")
    else:
        display_name = user.get("name")
        email = user.get("email")

    return {
        "uid": user["uid"],
        "email": email,
        "displayName": display_name or (email.split("@")[0] if email else "User"),
    }


@router.patch("/profile")
def update_user_profile(
    payload: ProfileUpdateRequest,
    user: dict = Depends(get_current_user),
    database: Client = Depends(get_firestore),
):
    try:
        user_record = update_profile_in_db(
            database=database,
            uid=user["uid"],
            display_name=payload.displayName,
        )
        return {
            "uid": user_record["uid"],
            "email": user_record["email"],
            "displayName": user_record["display_name"],
        }
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from None


class CombineAccountRequest(BaseModel):
    target_email: EmailStr


class VerifyCombineTokenRequest(BaseModel):
    token: str


def combine_token_serializer() -> URLSafeTimedSerializer:
    return URLSafeTimedSerializer(
        settings.auth_secret_key,
        salt="starwaves-combine-account-token",
    )


def get_current_user_optional(
    authorization: str | None = Header(default=None),
) -> dict | None:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.removeprefix("Bearer ").strip()
    try:
        data = auth_serializer().loads(token, max_age=86400 * 30)
        if isinstance(data, dict) and "uid" in data:
            return data
    except (BadSignature, SignatureExpired):
        pass
    return None


@router.post("/combine-account/request")
def request_combine_account(
    payload: CombineAccountRequest,
    user: dict = Depends(get_current_user),
    database: Client = Depends(get_firestore),
):
    owner_email = user.get("email")
    if not owner_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current user email is not available.",
        )

    target_email = payload.target_email.lower().strip()
    if target_email == owner_email.lower().strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot combine an account with its own email address.",
        )

    try:
        add_pending_combine_request(database, user["uid"], target_email)
        token = combine_token_serializer().dumps({
            "owner_uid": user["uid"],
            "owner_email": owner_email,
            "target_email": target_email,
        })
        send_account_combine_email(target_email, owner_email, token)
        return {"message": f"Verification email sent to {target_email} via SMTP."}
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from None


@router.post("/combine-account/verify")
def verify_combine_account(
    payload: VerifyCombineTokenRequest,
    user: dict | None = Depends(get_current_user_optional),
    database: Client = Depends(get_firestore),
):
    try:
        data = combine_token_serializer().loads(payload.token, max_age=86400)
    except (BadSignature, SignatureExpired):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The verification link is invalid or has expired.",
        ) from None

    owner_uid = data["owner_uid"]
    target_email = data["target_email"]
    target_uid = user.get("uid") if user else None

    try:
        result = confirm_combine_accounts(
            database=database,
            owner_uid=owner_uid,
            target_email=target_email,
            target_uid=target_uid,
        )
        return {
            "message": f"Accounts successfully combined for {target_email}!",
            "owner_uid": result["owner_uid"],
            "target_email": result["target_email"],
        }
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from None


@router.get("/combine-account/list")
def list_combined_accounts(
    user: dict = Depends(get_current_user),
    database: Client = Depends(get_firestore),
):
    return get_combined_accounts_info(database, user["uid"])


@router.delete("/combine-account/unlink")
def unlink_combined_account(
    target_identifier: str = Query(...),
    user: dict = Depends(get_current_user),
    database: Client = Depends(get_firestore),
):
    try:
        remove_combined_account(database, user["uid"], target_identifier)
        return {"message": "Account unlinked successfully."}
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from None

