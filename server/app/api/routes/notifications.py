import hashlib
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from firebase_admin import firestore
from google.cloud.firestore_v1 import Client
from pydantic import BaseModel, Field

from app.core.auth import get_current_user
from app.db import get_firestore
from app.services.notifications import send_multicast_notification, send_push_notification

router = APIRouter(prefix="/notifications")


class RegisterDeviceTokenRequest(BaseModel):
    token: str = Field(min_length=1)
    device_name: str | None = None


class SendNotificationRequest(BaseModel):
    title: str
    body: str
    data: dict[str, str] | None = None
    target_device_token: str | None = None


class QueueNotificationRequest(BaseModel):
    title: str = Field(min_length=1)
    body: str = Field(min_length=1)
    scheduled_at: datetime
    data: dict[str, str] | None = None


def devices_collection(database: Client, user_id: str):
    return database.collection("users").document(user_id).collection("devices")


@router.post("/device-token", status_code=status.HTTP_201_CREATED)
def register_device_token(
    payload: RegisterDeviceTokenRequest,
    user: dict = Depends(get_current_user),
    database: Client = Depends(get_firestore),
):
    token_id = hashlib.sha256(payload.token.encode()).hexdigest()
    doc_ref = devices_collection(database, user["uid"]).document(token_id)
    doc_ref.set(
        {
            "token": payload.token,
            "device_name": payload.device_name or "Unknown Device",
            "updated_at": firestore.SERVER_TIMESTAMP,
        },
        merge=True,
    )
    return {"message": "Device token registered successfully.", "token_id": token_id}


@router.delete("/device-token/{token_id}", status_code=status.HTTP_204_NO_CONTENT)
def unregister_device_token(
    token_id: str,
    user: dict = Depends(get_current_user),
    database: Client = Depends(get_firestore),
):
    devices_collection(database, user["uid"]).document(token_id).delete()


@router.get("/devices")
def get_registered_devices(
    user: dict = Depends(get_current_user),
    database: Client = Depends(get_firestore),
):
    docs = devices_collection(database, user["uid"]).stream()
    devices = []
    for doc in docs:
        data = doc.to_dict()
        devices.append({
            "token_id": doc.id,
            "device_name": data.get("device_name", "Unknown Device"),
            "token_preview": data.get("token", "")[:10] + "...",
        })
    return {"devices": devices}


@router.post("/queue", status_code=status.HTTP_201_CREATED)
def queue_notification(
    payload: QueueNotificationRequest,
    user: dict = Depends(get_current_user),
    database: Client = Depends(get_firestore),
):
    scheduled_at = payload.scheduled_at
    if scheduled_at.tzinfo is None:
        scheduled_at = scheduled_at.replace(tzinfo=timezone.utc)

    reference = database.collection("users").document(user["uid"]).collection(
        "notifications"
    ).document()
    reference.set(
        {
            "type": "push",
            "title": payload.title,
            "body": payload.body,
            "message": payload.body,
            "data": payload.data or {},
            "scheduled_at": scheduled_at,
            "sent": False,
            "unread": True,
            "created_at": firestore.SERVER_TIMESTAMP,
            "updated_at": firestore.SERVER_TIMESTAMP,
        }
    )
    return {
        "id": reference.id,
        "status": "queued",
        "scheduled_at": scheduled_at.isoformat(),
    }


@router.post("/send")
def send_notification_to_user(
    payload: SendNotificationRequest,
    user: dict = Depends(get_current_user),
    database: Client = Depends(get_firestore),
):
    if payload.target_device_token:
        try:
            msg_id = send_push_notification(
                device_token=payload.target_device_token,
                title=payload.title,
                body=payload.body,
                data=payload.data,
            )
            return {"status": "sent", "message_id": msg_id}
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to send push notification: {exc}",
            ) from None

    docs = list(devices_collection(database, user["uid"]).stream())
    tokens = [doc.to_dict().get("token") for doc in docs if doc.to_dict().get("token")]

    if not tokens:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No registered device tokens found for this user.",
        )

    try:
        res = send_multicast_notification(
            device_tokens=tokens,
            title=payload.title,
            body=payload.body,
            data=payload.data,
        )
        return {"status": "multicast_sent", "result": res}
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send multicast notification: {exc}",
        ) from None
