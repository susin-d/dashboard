from datetime import datetime, timezone
import logging
from typing import List
from uuid import uuid4
from fastapi import APIRouter, Depends, Query, status
from google.cloud.firestore_v1 import Client

from app.core.auth import get_current_user
from app.core.whatsapp_ws_manager import whatsapp_ws_manager
from app.db import get_firestore
from app.repositories import whatsapp as whatsapp_repo
from app.schemas.whatsapp import (
    WhatsAppChatResponse,
    WhatsAppEveDraftRequest,
    WhatsAppMessageCreate,
    WhatsAppMessageResponse,
    WhatsAppPairRequest,
    WhatsAppPairResponse,
    WhatsAppSettings,
    WhatsAppSettingsUpdate,
    WhatsAppStatusResponse,
)
from app.services.whatsapp import WhatsAppService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/whatsapp", tags=["whatsapp"])


@router.get("/status", response_model=WhatsAppStatusResponse)
def get_whatsapp_status(
    current_user: dict = Depends(get_current_user),
    database: Client = Depends(get_firestore),
):
    return WhatsAppService.get_status(database, current_user["uid"])


@router.post("/pair", response_model=WhatsAppPairResponse)
async def initiate_whatsapp_pairing(
    payload: WhatsAppPairRequest = WhatsAppPairRequest(),
    current_user: dict = Depends(get_current_user),
    database: Client = Depends(get_firestore),
):
    return await WhatsAppService.initiate_pairing(
        database=database,
        user_id=current_user["uid"],
        phone_number=payload.phone_number,
    )


@router.post("/confirm-pairing", response_model=WhatsAppStatusResponse)
async def confirm_whatsapp_pairing(
    phone_number: str = Query(default="+1 (555) 019-2834"),
    push_name: str = Query(default="Starwaves User"),
    current_user: dict = Depends(get_current_user),
    database: Client = Depends(get_firestore),
):
    return await WhatsAppService.confirm_connection(
        database=database,
        user_id=current_user["uid"],
        phone_number=phone_number,
        push_name=push_name,
    )


@router.post("/disconnect")
async def disconnect_whatsapp(
    current_user: dict = Depends(get_current_user),
    database: Client = Depends(get_firestore),
):
    return await WhatsAppService.disconnect(database, current_user["uid"])


@router.get("/chats", response_model=List[WhatsAppChatResponse])
def list_whatsapp_chats(
    current_user: dict = Depends(get_current_user),
    database: Client = Depends(get_firestore),
):
    return WhatsAppService.list_chats(database, current_user["uid"])


@router.get("/chats/{chat_id}/messages", response_model=List[WhatsAppMessageResponse])
def get_whatsapp_messages(
    chat_id: str,
    limit: int = Query(default=50, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
    database: Client = Depends(get_firestore),
):
    return WhatsAppService.get_messages(database, current_user["uid"], chat_id, limit=limit)


@router.post("/send", response_model=WhatsAppMessageResponse, status_code=status.HTTP_201_CREATED)
async def send_whatsapp_message(
    payload: WhatsAppMessageCreate,
    current_user: dict = Depends(get_current_user),
    database: Client = Depends(get_firestore),
):
    return await WhatsAppService.send_message(
        database=database,
        user_id=current_user["uid"],
        chat_id=payload.chat_id,
        content=payload.content,
        media=payload.media,
        reply_to_message_id=payload.reply_to_message_id,
    )


@router.post("/webhook")
async def whatsapp_incoming_webhook(
    payload: dict,
    database: Client = Depends(get_firestore),
):
    """
    Webhook endpoint called by whatsmeow worker when an incoming message is received.
    If the message mentions @eve, @Eve, or eve (case-insensitive) or comes from another user,
    Eve generates an AI reply and dispatches it back to the WhatsApp chat.
    """
    user_id = payload.get("userId")
    chat_id = payload.get("chatId")
    content = payload.get("content", "")
    sender_id = payload.get("senderId", "")
    sender_name = payload.get("senderName") or "Contact"
    is_from_me = payload.get("isFromMe", False)

    if not user_id or not chat_id:
        return {"status": "ignored", "reason": "missing user or chat id"}

    # Process and save incoming message into repository
    now = datetime.now(timezone.utc)
    incoming_msg = WhatsAppMessageResponse(
        id=payload.get("messageId") or f"msg-{uuid4().hex[:12]}",
        chat_id=chat_id,
        sender_id=sender_id,
        sender_name=sender_name,
        is_from_me=is_from_me,
        is_eve=False,
        content=content,
        timestamp=now,
        status="delivered",
    )
    whatsapp_repo.save_whatsapp_message(database, user_id, chat_id, incoming_msg)

    # Broadcast incoming message via WebSocket
    await whatsapp_ws_manager.broadcast_to_user(
        user_id,
        {
            "type": "new_message",
            "message": incoming_msg.model_dump(mode="json"),
        },
    )

    # Check if Eve should reply (mentions @eve, eve, or if in eve chat or auto-reply enabled for chat)
    text_lower = content.lower()
    should_reply = (
        not is_from_me
        and (
            "@eve" in text_lower
            or "eve" in text_lower
            or chat_id == "eve"
        )
    )

    if should_reply:
        logger.info(f"Eve triggered for inbound WhatsApp message from {sender_name} in {chat_id}")
        await WhatsAppService._handle_eve_response(database, user_id, chat_id, content)

    return {"status": "processed"}


@router.post("/chats/{chat_id}/read")
def mark_chat_read(
    chat_id: str,
    current_user: dict = Depends(get_current_user),
    database: Client = Depends(get_firestore),
):
    whatsapp_repo.mark_chat_as_read(database, current_user["uid"], chat_id)
    return {"status": "ok"}


@router.get("/settings", response_model=WhatsAppSettings)
def get_whatsapp_settings(
    current_user: dict = Depends(get_current_user),
    database: Client = Depends(get_firestore),
):
    return whatsapp_repo.get_whatsapp_settings(database, current_user["uid"])


@router.put("/settings", response_model=WhatsAppSettings)
def update_whatsapp_settings(
    payload: WhatsAppSettingsUpdate,
    current_user: dict = Depends(get_current_user),
    database: Client = Depends(get_firestore),
):
    settings = whatsapp_repo.get_whatsapp_settings(database, current_user["uid"])
    update_data = payload.model_dump(exclude_unset=True)
    updated = settings.model_copy(update=update_data)
    whatsapp_repo.save_whatsapp_settings(database, current_user["uid"], updated)
    return updated


@router.post("/eve-draft")
async def generate_eve_draft(
    payload: WhatsAppEveDraftRequest,
    current_user: dict = Depends(get_current_user),
    database: Client = Depends(get_firestore),
):
    draft = await WhatsAppService.generate_draft(
        database=database,
        user_id=current_user["uid"],
        chat_id=payload.chat_id,
        instruction=payload.instruction or "Draft a friendly reply",
    )
    return {"draft": draft}


@router.post("/chats/{chat_id}/summarize")
async def summarize_whatsapp_chat(
    chat_id: str,
    current_user: dict = Depends(get_current_user),
    database: Client = Depends(get_firestore),
):
    summary = await WhatsAppService.summarize_chat(database, current_user["uid"], chat_id)
    return {"summary": summary}
