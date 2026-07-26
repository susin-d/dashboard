import hmac
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Header, HTTPException, status
from firebase_admin import firestore
from google.cloud.firestore_v1 import Client

from app.core.config import settings
from app.db import get_firestore
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
        except Exception:
            failed += 1

    return {"processed": processed, "sent": sent, "failed": failed}
