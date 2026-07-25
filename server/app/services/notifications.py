import logging
from firebase_admin import messaging
from app.db.firestore import get_firebase_app

logger = logging.getLogger(__name__)


def send_push_notification(
    device_token: str,
    title: str,
    body: str,
    data: dict[str, str] | None = None,
) -> str:
    app = get_firebase_app()
    message = messaging.Message(
        notification=messaging.Notification(
            title=title,
            body=body,
        ),
        data=data or {},
        token=device_token,
    )
    response = messaging.send(message, app=app)
    logger.info("Successfully sent GCM push notification ID: %s", response)
    return response


def send_multicast_notification(
    device_tokens: list[str],
    title: str,
    body: str,
    data: dict[str, str] | None = None,
) -> dict:
    if not device_tokens:
        return {"success_count": 0, "failure_count": 0}

    app = get_firebase_app()
    message = messaging.MulticastMessage(
        notification=messaging.Notification(
            title=title,
            body=body,
        ),
        data=data or {},
        tokens=device_tokens,
    )
    batch_response = messaging.send_each_for_multicast(message, app=app)
    logger.info(
        "GCM multicast sent: %d succeeded, %d failed",
        batch_response.success_count,
        batch_response.failure_count,
    )
    return {
        "success_count": batch_response.success_count,
        "failure_count": batch_response.failure_count,
    }
