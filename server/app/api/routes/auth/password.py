"""Password recovery: forgot-password and reset-password."""

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from google.cloud.firestore_v1 import Client
from itsdangerous import BadSignature, SignatureExpired
from pydantic import BaseModel, EmailStr

from app.api.routes.auth._shared import state_serializer
from app.db import get_firestore
from app.repositories.users import get_user_by_email, update_user_password
from app.services.email import EmailDeliveryError, send_password_reset_email

router = APIRouter(prefix="/auth")

logger = logging.getLogger(__name__)


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    password: str


@router.post("/forgot-password")
def forgot_password(
    payload: ForgotPasswordRequest,
    database: Client = Depends(get_firestore),
):
    user_record = get_user_by_email(database, payload.email)
    if user_record:
        token = state_serializer().dumps({"uid": user_record["uid"], "action": "reset_password"})
        try:
            send_password_reset_email(user_record["email"], token)
        except EmailDeliveryError as exc:
            logger.warning("Password reset email to %s could not be delivered: %s", user_record["email"], exc)
    return {"message": "If an account exists with that email, a password reset link has been sent via email."}


@router.post("/reset-password")
def reset_password(
    payload: ResetPasswordRequest,
    database: Client = Depends(get_firestore),
):
    if len(payload.password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters long.",
        )

    try:
        data = state_serializer().loads(payload.token, max_age=3600)
    except SignatureExpired:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This password reset link has expired. Please request a new one.",
        ) from None
    except BadSignature:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This password reset link is invalid.",
        ) from None

    if data.get("action") != "reset_password" or not data.get("uid"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid reset token payload.",
        )

    updated = update_user_password(database, data["uid"], payload.password)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User record not found.",
        )
    return {"message": "Your password has been reset successfully. You can now log in with your new password."}
