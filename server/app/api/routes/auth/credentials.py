"""Email/password credential authentication: signup and login."""

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from google.cloud.firestore_v1 import Client
from pydantic import BaseModel, EmailStr

from app.api.routes.auth._shared import _send_welcome_email_best_effort
from app.core.auth import create_user_token
from app.db import get_firestore
from app.repositories.password import verify_password
from app.repositories.users import create_user_with_password, get_user_by_email

router = APIRouter(prefix="/auth")
logger = logging.getLogger(__name__)


class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    name: str | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


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

    _send_welcome_email_best_effort(
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
            "emailVerified": bool(user_record.get("email_verified", False)),
        },
    }


@router.post("/login")
def login(payload: LoginRequest, database: Client = Depends(get_firestore)):
    clean_email = payload.email.lower().strip()
    try:
        user_record = get_user_by_email(database, clean_email)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database service unavailable. Could not verify account details.",
        ) from exc

    if not user_record or not user_record.get("password_hash") or not user_record.get("password_salt"):
        logger.warning("Login failed for %s: Account record or password credentials missing.", clean_email)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="The email or password is incorrect.",
        ) from None

    try:
        is_valid = verify_password(payload.password, user_record["password_hash"], user_record["password_salt"])
    except Exception as exc:
        logger.warning("Error verifying password for %s: %s", clean_email, exc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="The email or password is incorrect.",
        ) from None

    if not is_valid:
        logger.warning("Login failed for %s: Password mismatch.", clean_email)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="The email or password is incorrect.",
        ) from None

    try:
        token = create_user_token(
            {
                "uid": user_record["uid"],
                "email": user_record["email"],
                "name": user_record.get("display_name"),
            },
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate authentication token.",
        ) from exc

    return {
        "token": token,
        "user": {
            "uid": user_record["uid"],
            "email": user_record["email"],
            "displayName": user_record.get("display_name") or user_record["email"].split("@")[0],
            "emailVerified": bool(user_record.get("email_verified", False)),
        },
    }
