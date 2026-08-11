import logging
from firebase_admin import messaging
from app.db.firestore import get_firebase_app

logger = logging.getLogger(__name__)

# Token rejection codes that mean the device token is no longer valid.
PRUNABLE_CODES = {"UNREGISTERED", "INVALID_ARGUMENT", "NOT_FOUND", "MISMATCH_SENDER_ID"}


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


def incomplete_tokens(device_tokens: list[str], batch_response) -> list[str]:
    """Return the device tokens that FCM rejected as permanently invalid."""
    invalid = []
    for index, result in enumerate(batch_response.responses):
        if index >= len(device_tokens):
            break
        if result.exception and result.exception.code in PRUNABLE_CODES:
            invalid.append(device_tokens[index])
    return invalid


def send_multicast_notification(
    device_tokens: list[str],
    title: str,
    body: str,
    data: dict[str, str] | None = None,
) -> dict:
    if not device_tokens:
        return {"success_count": 0, "failure_count": 0, "invalid_tokens": []}

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
    invalid_tokens = incomplete_tokens(device_tokens, batch_response)
    logger.info(
        "GCM multicast sent: %d succeeded, %d failed",
        batch_response.success_count,
        batch_response.failure_count,
    )
    return {
        "success_count": batch_response.success_count,
        "failure_count": batch_response.failure_count,
        "invalid_tokens": invalid_tokens,
    }
