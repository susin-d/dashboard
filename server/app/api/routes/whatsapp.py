from datetime import datetime, timezone
import logging
from typing import List, Optional
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
    before: Optional[str] = Query(default=None, description="ISO timestamp to fetch messages prior to"),
    current_user: dict = Depends(get_current_user),
    database: Client = Depends(get_firestore),
):
    return WhatsAppService.get_messages(database, current_user["uid"], chat_id, limit=limit, before=before)


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
    Webhook endpoint called by whatsmeow worker when an incoming message or QR code is received.
    """
    # Handle real-time QR update broadcast
    if payload.get("type") == "qr_update":
        user_id = payload.get("userId")
        qr_code = payload.get("qrCode")
        if user_id and qr_code:
            await whatsapp_ws_manager.broadcast_to_user(
                user_id,
                {
                    "type": "qr_update",
                    "status": "qr_ready",
                    "qr_code": qr_code,
                    "pairing_code": payload.get("pairingCode"),
                },
            )
        return {"status": "qr_broadcasted"}

    # Handle device connection status update
    if payload.get("type") == "status_update":
        user_id = payload.get("userId")
        connected = bool(payload.get("connected", False))
        if user_id:
            whatsapp_repo.save_whatsapp_session(
                database,
                user_id,
                connected=connected,
                phone_number=payload.get("phoneNumber"),
                push_name=payload.get("pushName"),
            )
            await whatsapp_ws_manager.broadcast_to_user(
                user_id,
                {
                    "type": "status_update",
                    "connected": connected,
                    "phone_number": payload.get("phoneNumber"),
                    "push_name": payload.get("pushName"),
                },
            )
        return {"status": "status_updated"}

    # Handle incoming message reaction
    if payload.get("type") == "message_reaction":
        user_id = payload.get("userId")
        chat_id = payload.get("chatId")
        message_id = payload.get("messageId")
        sender_id = payload.get("senderId") or "other"
        emoji = payload.get("emoji")
        if user_id and chat_id and message_id:
            whatsapp_repo.add_message_reaction(
                database, user_id, chat_id, message_id, emoji=emoji or "", sender=sender_id
            )
            await whatsapp_ws_manager.broadcast_to_user(
                user_id,
                {
                    "type": "message_reaction",
                    "chatId": chat_id,
                    "messageId": message_id,
                    "senderId": sender_id,
                    "emoji": emoji,
                },
            )
        return {"status": "reaction_updated"}

    # Handle message delivery / read receipts
    if payload.get("type") == "receipt_update":
        user_id = payload.get("userId")
        chat_id = payload.get("chatId")
        message_ids = payload.get("messageIds") or []
        status = payload.get("status", "delivered")
        timestamp = payload.get("timestamp")
        if user_id and chat_id and message_ids:
            for mid in message_ids:
                whatsapp_repo.update_message_status(database, user_id, chat_id, mid, status)
            await whatsapp_ws_manager.broadcast_to_user(
                user_id,
                {
                    "type": "receipt_update",
                    "chatId": chat_id,
                    "messageIds": message_ids,
                    "status": status,
                    "timestamp": timestamp,
                },
            )
        return {"status": "receipt_updated"}

    # Handle bulk history sync from whatsmeow pairing
    if payload.get("type") == "history_sync":
        user_id = payload.get("userId")
        chats_data = payload.get("chats") or []
        msgs_data = payload.get("messages") or []

        if user_id:
            for c in chats_data:
                c_id = c.get("id")
                if not c_id:
                    continue
                is_group = bool(c.get("isGroup", False)) or c_id.endswith("@g.us")
                name = c.get("name")
                if not name or (is_group and name == "Contact"):
                    name = "Group conversation" if is_group else c_id

                existing_chat = whatsapp_repo.get_whatsapp_chat(database, user_id, c_id)
                if (
                    existing_chat
                    and existing_chat.name
                    and existing_chat.name not in ("Contact", "Group conversation", c_id, "You")
                    and (not name or name in ("Contact", "Group conversation", c_id, "You") or name.startswith("+"))
                ):
                    name = existing_chat.name

                whatsapp_repo.upsert_whatsapp_chat(
                    database,
                    user_id,
                    chat_id=c_id,
                    name=name,
                    phone_number=c.get("phoneNumber"),
                    avatar_url=c.get("avatarUrl"),
                    is_group=is_group,
                    participants=c.get("participants"),
                    unread_count=int(c.get("unreadCount", 0)),
                )

            for m in msgs_data:
                media_data = m.get("media")
                media_obj = WhatsAppMediaAttachment(**media_data) if media_data else None
                reactions_data = m.get("reactions") or []
                msg_obj = WhatsAppMessageResponse(
                    id=m.get("id") or f"msg-{uuid4().hex[:12]}",
                    chat_id=m.get("chatId"),
                    sender_id=m.get("senderId") or "me",
                    sender_name=m.get("senderName"),
                    is_from_me=bool(m.get("isFromMe", False)),
                    is_eve=False,
                    is_forwarded=bool(m.get("isForwarded", False)),
                    content=m.get("content") or "",
                    media=media_obj,
                    reply_to_message_id=m.get("replyToMessageId"),
                    reactions=reactions_data,
                    sender_avatar_url=m.get("senderAvatarUrl") or m.get("sender_avatar_url"),
                    timestamp=datetime.fromisoformat(m["timestamp"].replace("Z", "+00:00")) if isinstance(m.get("timestamp"), str) else datetime.now(timezone.utc),
                    status=m.get("status", "delivered"),
                )
                whatsapp_repo.save_whatsapp_message(database, user_id, m.get("chatId"), msg_obj)

            await whatsapp_ws_manager.broadcast_to_user(
                user_id,
                {
                    "type": "chats_synced",
                    "count": len(chats_data),
                },
            )
        return {"status": "synced", "chats": len(chats_data), "messages": len(msgs_data)}

    user_id = payload.get("userId")
    chat_id = payload.get("chatId")
    content = payload.get("content", "")
    sender_id = payload.get("senderId", "")
    sender_name = payload.get("senderName") or "Contact"
    sender_avatar_url = payload.get("senderAvatarUrl") or payload.get("sender_avatar_url")
    is_from_me = payload.get("isFromMe", False)
    is_forwarded = bool(payload.get("isForwarded", False))
    media_data = payload.get("media")
    media_obj = WhatsAppMediaAttachment(**media_data) if media_data else None
    reply_to_id = payload.get("replyToMessageId")
    is_group = bool(payload.get("isGroup", False)) or (bool(chat_id) and chat_id.endswith("@g.us"))
    chat_name = payload.get("chatName")

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
        is_forwarded=is_forwarded,
        content=content,
        media=media_obj,
        reply_to_message_id=reply_to_id,
        sender_avatar_url=sender_avatar_url,
        timestamp=now,
        status="delivered",
    )
    whatsapp_repo.save_whatsapp_message(database, user_id, chat_id, incoming_msg)

    # Upsert chat with last_message without overwriting contact name with user's sender name
    existing_chat = whatsapp_repo.get_whatsapp_chat(database, user_id, chat_id)
    resolved_name = chat_name
    if not resolved_name or resolved_name in ("Contact", "Group conversation", chat_id, "You"):
        if is_group:
            resolved_name = (
                existing_chat.name
                if (existing_chat and existing_chat.name and existing_chat.name not in ("Contact", chat_id))
                else "Group conversation"
            )
        else:
            if not is_from_me and sender_name and sender_name not in ("You", "Contact"):
                resolved_name = sender_name
            elif existing_chat and existing_chat.name and existing_chat.name not in ("Contact", "Group conversation", chat_id, "You"):
                resolved_name = existing_chat.name
            else:
                clean_num = chat_id.replace("@s.whatsapp.net", "").replace("@g.us", "")
                resolved_name = f"+{clean_num}" if clean_num.isdigit() else clean_num

    if (
        existing_chat
        and existing_chat.name
        and existing_chat.name not in ("Contact", "Group conversation", chat_id, "You")
        and (not chat_name or chat_name in ("Contact", "Group conversation", chat_id, "You"))
    ):
        resolved_name = existing_chat.name

    whatsapp_repo.upsert_whatsapp_chat(
        database,
        user_id,
        chat_id=chat_id,
        name=resolved_name,
        is_group=is_group,
        last_message=incoming_msg.model_dump(mode="json"),
    )

    # Broadcast incoming message via WebSocket
    await whatsapp_ws_manager.broadcast_to_user(
        user_id,
        {
            "type": "new_message",
            "message": incoming_msg.model_dump(mode="json"),
        },
    )

    # Check if Eve should reply (mentions @eve, eve, or if in eve chat)
    text_lower = content.lower()
    is_eve_chat = chat_id == "eve"
    has_eve_mention = "@eve" in text_lower or text_lower.startswith("eve ") or text_lower == "eve"
    not_from_eve = sender_id != "eve" and not sender_name.lower().startswith("eve")

    should_reply = not_from_eve and (has_eve_mention or (is_eve_chat and not is_from_me))

    if should_reply:
        logger.info(f"Eve triggered for WhatsApp message from {sender_name} (from_me={is_from_me}) in {chat_id}")
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


@router.post("/chats/{chat_id}/messages/{message_id}/react")
async def react_to_message(
    chat_id: str,
    message_id: str,
    payload: dict,
    current_user: dict = Depends(get_current_user),
    database: Client = Depends(get_firestore),
):
    emoji = payload.get("emoji", "")
    whatsapp_repo.add_message_reaction(
        database, current_user["uid"], chat_id, message_id, emoji=emoji, sender="me"
    )
    # Forward reaction to whatsmeow worker if external WhatsApp chat
    if chat_id != "eve":
        try:
            worker_url = settings.whatsapp_gateway_url
            async with httpx.AsyncClient(timeout=4.0) as client:
                await client.post(
                    f"{worker_url}/session/react",
                    json={
                        "userId": current_user["uid"],
                        "chatId": chat_id,
                        "messageId": message_id,
                        "reaction": emoji,
                    },
                )
        except Exception:
            pass

    # Broadcast reaction event over WebSocket
    await whatsapp_ws_manager.broadcast_to_user(
        current_user["uid"],
        {
            "type": "message_reaction",
            "chat_id": chat_id,
            "message_id": message_id,
            "emoji": emoji,
            "sender": "me",
        },
    )
    return {"status": "ok"}


@router.post("/chats/{chat_id}/messages/{message_id}/star")
async def star_message_endpoint(
    chat_id: str,
    message_id: str,
    payload: dict,
    current_user: dict = Depends(get_current_user),
    database: Client = Depends(get_firestore),
):
    is_starred = bool(payload.get("is_starred", True))
    whatsapp_repo.star_whatsapp_message(
        database, current_user["uid"], chat_id, message_id, is_starred=is_starred
    )
    return {"status": "ok", "is_starred": is_starred}


@router.delete("/chats/{chat_id}/messages/{message_id}")
async def delete_message_endpoint(
    chat_id: str,
    message_id: str,
    current_user: dict = Depends(get_current_user),
    database: Client = Depends(get_firestore),
):
    whatsapp_repo.delete_whatsapp_message(
        database, current_user["uid"], chat_id, message_id
    )
    await whatsapp_ws_manager.broadcast_to_user(
        current_user["uid"],
        {
            "type": "message_deleted",
            "chat_id": chat_id,
            "message_id": message_id,
        },
    )
    return {"status": "ok"}
