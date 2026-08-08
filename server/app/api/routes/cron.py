import hmac
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Header, HTTPException, status
from firebase_admin import firestore
from google.cloud.firestore_v1 import Client

from app.core.config import settings
from app.db import get_firestore
from app.services.email import send_activity_digest_email, send_reminder_email
from app.services.notifications import send_multicast_notification

router = APIRouter(prefix="/cron")


def verify_cron_secret(x_cron_secret: str | None = Header(default=None)) -> None:
    if not settings.cron_secret or not x_cron_secret or not hmac.compare_digest(
        x_cron_secret, settings.cron_secret
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid cron authorization.",
        )


def _is_due(value: object, now: datetime) -> bool:
    if not isinstance(value, datetime):
        return False
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value <= now


@router.post("/send-notifications", dependencies=[Depends(verify_cron_secret)])
def send_due_notifications(
    database: Client = Depends(get_firestore),
):
    now = datetime.now(timezone.utc)
    processed = sent = failed = 0

    for document in database.collection_group("notifications").stream():
        notification = document.to_dict() or {}
        if notification.get("sent") is True or not _is_due(notification.get("scheduled_at"), now):
            continue

        processed += 1
        user_reference = document.reference.parent.parent
        if user_reference is None:
            failed += 1
            continue

        try:
            device_documents = user_reference.collection("devices").stream()
            device_tokens = [
                device.to_dict().get("token")
                for device in device_documents
                if device.to_dict().get("token")
            ]
            if not device_tokens:
                raise ValueError("No registered device tokens found.")

            result = send_multicast_notification(
                device_tokens=device_tokens,
                title=notification.get("title", "StarWaves notification"),
                body=notification.get("body", notification.get("message", "")),
                data=notification.get("data"),
            )
            if result["success_count"] == 0:
                raise ValueError("Notification delivery failed for all devices.")

            document.reference.update({
                "sent": True,
                "sent_at": firestore.SERVER_TIMESTAMP,
                "updated_at": firestore.SERVER_TIMESTAMP,
            })
            sent += 1

            # Dispatch fallback email reminder
            user_doc = user_reference.get()
            if user_doc.exists:
                user_data = user_doc.to_dict() or {}
                user_email = user_data.get("email")
                if user_email:
                    send_reminder_email(
                        to_email=user_email,
                        user_name=user_data.get("display_name") or user_email.split("@")[0],
                        reminder_title=notification.get("title", "StarWaves Reminder"),
                        reminder_type="Scheduled Reminder",
                        due_time="Now",
                        description=notification.get("body", notification.get("message", "")),
                    )
        except Exception:
            failed += 1

    return {"processed": processed, "sent": sent, "failed": failed}


@router.post("/send-email-digests", dependencies=[Depends(verify_cron_secret)])
def send_due_email_digests(
    database: Client = Depends(get_firestore),
):
    processed = sent = failed = 0
    user_docs = database.collection("users").limit(50).stream()

    for doc in user_docs:
        data = doc.to_dict() or {}
        email = data.get("email")
        if not email:
            continue

        processed += 1
        name = data.get("display_name") or email.split("@")[0]
        summary_text = (
            "Keep up your coding streak! Track your LeetCode, Codeforces, and GitHub stats "
            "directly in your StarWaves dashboard."
        )
        upcoming_events = (
            "Check your StarWaves Calendar and Dashboard for upcoming competitive coding "
            "contests and hackathons this week."
        )

        try:
            success = send_activity_digest_email(
                to_email=email,
                user_name=name,
                summary_text=summary_text,
                upcoming_events=upcoming_events,
            )
            if success:
                sent += 1
            else:
                failed += 1
        except Exception:
            failed += 1

    return {"processed": processed, "sent": sent, "failed": failed}

