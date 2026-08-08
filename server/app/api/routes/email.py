import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from google.cloud.firestore_v1 import Client
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
from pydantic import BaseModel, EmailStr

from app.core.auth import get_current_user
from app.core.config import settings
from app.db import get_firestore
from app.repositories.user_repository import get_user_by_id, mark_email_verified
from app.services.email import (
    send_announcement_email,
    send_email,
    send_reminder_email,
    send_verification_email,
    send_welcome_email,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/email")


def email_token_serializer() -> URLSafeTimedSerializer:
    return URLSafeTimedSerializer(
        settings.auth_secret_key,
        salt="starwaves-email-verification",
    )


class VerifyEmailRequest(BaseModel):
    token: str


class AnnouncementRequest(BaseModel):
    title: str
    message: str
    to_email: EmailStr | None = None


class ReminderEmailRequest(BaseModel):
    reminder_title: str
    reminder_type: str = "Task Reminder"
    due_time: str | None = "Today"
    description: str | None = None
    to_email: EmailStr | None = None


class TestEmailRequest(BaseModel):
    to_email: EmailStr | None = None


@router.get("/status")
def get_email_status(user: dict = Depends(get_current_user)):
    return {
        "smtp_configured": bool(settings.smtp_host),
        "from_email": settings.smtp_from_email,
        "host": settings.smtp_host or "Not Configured",
        "port": settings.smtp_port,
        "tls_enabled": settings.smtp_use_tls,
    }


@router.post("/send-test")
def send_test_email(
    payload: TestEmailRequest | None = None,
    user: dict = Depends(get_current_user),
):
    target_email = (payload.to_email if payload and payload.to_email else user.get("email")) or ""
    if not target_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No valid recipient email address specified.",
        )

    user_name = user.get("name") or target_email.split("@")[0]
    subject = "StarWaves Mail Service Test"
    body_html = f"""
    <div style="background-color:#09090b; color:#fafafa; font-family:sans-serif; padding:32px; border-radius:8px;">
      <h2 style="color:#ffffff;">StarWaves Email System Test</h2>
      <p style="color:#a1a1aa;">Hello {user_name},</p>
      <p style="color:#a1a1aa;">This is a test email sent from your StarWaves platform to verify SMTP configuration and background delivery.</p>
      <div style="background-color:#18181b; border:1px solid #27272a; padding:12px; border-radius:4px; font-size:12px; color:#e4e4e7;">
        Status: Operating Normally • Time: Server UTC
      </div>
    </div>
    """
    body_text = f"StarWaves Mail Test for {user_name}. SMTP service operating normally."

    sent = send_email(target_email, subject, body_html, body_text)
    return {"message": f"Test email sent to {target_email}.", "sent": sent}


@router.post("/resend-welcome")
def resend_welcome(
    user: dict = Depends(get_current_user),
):
    target_email = user.get("email")
    if not target_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User does not have a valid email address.",
        )
    display_name = user.get("name") or target_email.split("@")[0]

    sent = send_welcome_email(target_email, display_name)
    return {"message": f"Welcome email sent to {target_email}.", "sent": sent}


@router.post("/send-verification")
def request_email_verification(
    user: dict = Depends(get_current_user),
):
    target_email = user.get("email")
    if not target_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User does not have a valid email address.",
        )
    display_name = user.get("name") or target_email.split("@")[0]

    token = email_token_serializer().dumps({
        "uid": user["uid"],
        "email": target_email,
        "action": "verify_email",
    })

    sent = send_verification_email(
        to_email=target_email,
        user_name=display_name,
        verification_token=token,
    )
    return {"message": f"Verification link email sent to {target_email}.", "sent": sent}


@router.post("/verify-email/confirm")
def confirm_email_verification(
    payload: VerifyEmailRequest,
    database: Client = Depends(get_firestore),
):
    try:
        data = email_token_serializer().loads(payload.token, max_age=86400)
    except SignatureExpired:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification token has expired. Please request a new verification email.",
        ) from None
    except BadSignature:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification token.",
        ) from None

    if data.get("action") != "verify_email" or not data.get("uid"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid token payload.",
        )

    uid = data["uid"]
    success = mark_email_verified(database, uid)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User record not found.",
        )

    return {"message": "Email address verified successfully."}


@router.post("/send-announcement")
def send_announcement(
    payload: AnnouncementRequest,
    user: dict = Depends(get_current_user),
):
    target_email = payload.to_email or user.get("email") or ""
    if not target_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Recipient email address is required.",
        )

    display_name = user.get("name") or target_email.split("@")[0]

    sent = send_announcement_email(
        to_email=target_email,
        user_name=display_name,
        title=payload.title,
        message=payload.message,
    )
    return {"message": f"Announcement email sent to {target_email}.", "sent": sent}


@router.post("/send-reminder")
def send_reminder(
    payload: ReminderEmailRequest,
    user: dict = Depends(get_current_user),
):
    target_email = payload.to_email or user.get("email") or ""
    if not target_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Recipient email address is required.",
        )

    display_name = user.get("name") or target_email.split("@")[0]

    sent = send_reminder_email(
        to_email=target_email,
        user_name=display_name,
        reminder_title=payload.reminder_title,
        reminder_type=payload.reminder_type,
        due_time=payload.due_time or "Today",
        description=payload.description or "",
    )
    return {"message": f"Reminder email sent to {target_email}.", "sent": sent}


class CalendarReminderTestRequest(BaseModel):
    window: str = "1h"  # "1h" or "next_day"
    event_title: str = "Team Sync & Code Review"
    to_email: EmailStr | None = None


@router.post("/send-calendar-reminder-test")
def send_calendar_reminder_test(
    payload: CalendarReminderTestRequest | None = None,
    user: dict = Depends(get_current_user),
):
    target_email = (payload.to_email if payload and payload.to_email else user.get("email")) or ""
    if not target_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Recipient email address is required.",
        )

    display_name = user.get("name") or target_email.split("@")[0]
    window = payload.window if payload else "1h"
    event_title = payload.event_title if payload else "Team Sync & Code Review"

    if window == "next_day":
        reminder_type = "Calendar Reminder - Next Day"
        due_time = "Tomorrow at 10:00 AM UTC"
    else:
        reminder_type = "Calendar Reminder - 1 Hour Away"
        due_time = "In 60 minutes (10:00 AM UTC)"

    description = "Test calendar reminder notification from StarWaves."

    sent = send_reminder_email(
        to_email=target_email,
        user_name=display_name,
        reminder_title=event_title,
        reminder_type=reminder_type,
        due_time=due_time,
        description=description,
    )
    return {"message": f"Calendar reminder test email sent to {target_email}.", "sent": sent}


