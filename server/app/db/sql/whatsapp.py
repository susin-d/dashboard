"""SQL handlers for WhatsApp collections ('whatsapp_chats' and 'messages')."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.sql._shared import json_safe
from app.db.sql.query import SqlSnapshot
from app.models import WhatsAppChat, WhatsAppMessage

if TYPE_CHECKING:
    from app.db.sql.query import SqlQuery


def whatsapp_chat_to_dict(c: WhatsAppChat) -> dict[str, Any]:
    """Serialize WhatsAppChat model to snapshot dictionary."""
    return {
        "id": c.id,
        "name": c.name,
        "phone_number": c.phone_number,
        "avatar_url": c.avatar_url,
        "is_group": c.is_group,
        "participants": c.participants or [],
        "description": c.description,
        "unread_count": c.unread_count,
        "last_message": c.last_message,
        "is_pinned": c.is_pinned,
        "is_muted": c.is_muted,
        "is_archived": c.is_archived,
        "eve_auto_reply": c.eve_auto_reply,
        "created_at": c.created_at.isoformat() if c.created_at else "",
        "updated_at": c.updated_at.isoformat() if c.updated_at else "",
    }


def whatsapp_message_to_dict(m: WhatsAppMessage) -> dict[str, Any]:
    """Serialize WhatsAppMessage model to snapshot dictionary."""
    return {
        "id": m.id,
        "chat_id": m.chat_id,
        "sender_id": m.sender_id,
        "sender_name": m.sender_name,
        "is_from_me": m.is_from_me,
        "is_eve": m.is_eve,
        "content": m.content,
        "timestamp": m.timestamp.isoformat() if m.timestamp else "",
        "status": m.status,
        "media": m.media,
        "reply_to_message_id": m.reply_to_message_id,
        "reactions": m.reactions or [],
        "is_forwarded": m.is_forwarded,
        "is_starred": m.is_starred,
        "is_pinned": m.is_pinned,
        "sender_avatar_url": m.sender_avatar_url,
        "created_at": m.created_at.isoformat() if m.created_at else "",
        "updated_at": m.updated_at.isoformat() if m.updated_at else "",
    }


def get_whatsapp_chat_doc(session: Session, user_id: str, doc_id: str) -> SqlSnapshot:
    """Fetch WhatsApp chat document by user ID and chat ID."""
    c = session.get(WhatsAppChat, doc_id)
    if not c or c.user_id != user_id:
        return SqlSnapshot(doc_id, None, exists=False)
    return SqlSnapshot(doc_id, whatsapp_chat_to_dict(c))


def set_whatsapp_chat_doc(
    session: Session,
    user_id: str,
    doc_id: str,
    data: dict[str, Any],
    merge: bool = False,
) -> None:
    """Create or update a WhatsApp chat document."""
    c = session.get(WhatsAppChat, doc_id)
    if not c:
        c = WhatsAppChat(
            id=doc_id,
            user_id=user_id,
            name=data.get("name") or doc_id,
            phone_number=data.get("phone_number"),
            avatar_url=data.get("avatar_url"),
            is_group=bool(data.get("is_group", False)),
            participants=json_safe(data.get("participants") or []),
            description=data.get("description"),
            unread_count=int(data.get("unread_count", 0)),
            last_message=json_safe(data.get("last_message")),
            is_pinned=bool(data.get("is_pinned", False)),
            is_muted=bool(data.get("is_muted", False)),
            is_archived=bool(data.get("is_archived", False)),
            eve_auto_reply=bool(data.get("eve_auto_reply", False)),
        )
        session.add(c)
    else:
        if "name" in data:
            c.name = data["name"]
        if "phone_number" in data:
            c.phone_number = data["phone_number"]
        if "avatar_url" in data:
            c.avatar_url = data["avatar_url"]
        if "is_group" in data:
            c.is_group = bool(data["is_group"])
        if "participants" in data:
            c.participants = json_safe(data["participants"])
        if "description" in data:
            c.description = data["description"]
        if "unread_count" in data:
            c.unread_count = int(data["unread_count"])
        if "last_message" in data:
            c.last_message = json_safe(data["last_message"])
        if "is_pinned" in data:
            c.is_pinned = bool(data["is_pinned"])
        if "is_muted" in data:
            c.is_muted = bool(data["is_muted"])
        if "is_archived" in data:
            c.is_archived = bool(data["is_archived"])
        if "eve_auto_reply" in data:
            c.eve_auto_reply = bool(data["eve_auto_reply"])
    session.commit()


def delete_whatsapp_chat_doc(session: Session, doc_id: str) -> None:
    """Delete a WhatsApp chat document by ID."""
    c = session.get(WhatsAppChat, doc_id)
    if c:
        session.delete(c)
        session.commit()


def query_whatsapp_chats(session: Session, user_id: str, query: SqlQuery) -> list[SqlSnapshot]:
    """Execute query on the user's whatsapp_chats collection."""
    stmt = select(WhatsAppChat).where(WhatsAppChat.user_id == user_id)
    if query._order_by == "updated_at":
        stmt = stmt.order_by(WhatsAppChat.updated_at.desc() if query._direction == "DESC" else WhatsAppChat.updated_at.asc())
    elif query._order_by == "created_at":
        stmt = stmt.order_by(WhatsAppChat.created_at.desc() if query._direction == "DESC" else WhatsAppChat.created_at.asc())
    else:
        stmt = stmt.order_by(WhatsAppChat.updated_at.desc())
    if query._limit:
        stmt = stmt.limit(query._limit)
    chats = session.scalars(stmt).all()
    return [SqlSnapshot(c.id, whatsapp_chat_to_dict(c)) for c in chats]


def get_whatsapp_message_doc(session: Session, user_id: str, chat_id: str, doc_id: str) -> SqlSnapshot:
    """Fetch WhatsApp message document by user ID, chat ID, and message ID."""
    m = session.get(WhatsAppMessage, doc_id)
    if not m or m.user_id != user_id or m.chat_id != chat_id:
        return SqlSnapshot(doc_id, None, exists=False)
    return SqlSnapshot(doc_id, whatsapp_message_to_dict(m))


def set_whatsapp_message_doc(
    session: Session,
    user_id: str,
    chat_id: str,
    doc_id: str,
    data: dict[str, Any],
    merge: bool = False,
) -> None:
    """Create or update a WhatsApp message document."""
    m = session.get(WhatsAppMessage, doc_id)
    ts = data.get("timestamp")
    if isinstance(ts, str):
        try:
            ts_dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
        except Exception:
            ts_dt = datetime.now(timezone.utc)
    elif isinstance(ts, datetime):
        ts_dt = ts
    else:
        ts_dt = datetime.now(timezone.utc)

    if not m:
        m = WhatsAppMessage(
            id=doc_id,
            user_id=user_id,
            chat_id=chat_id,
            sender_id=data.get("sender_id", ""),
            sender_name=data.get("sender_name"),
            is_from_me=bool(data.get("is_from_me", False)),
            is_eve=bool(data.get("is_eve", False)),
            content=data.get("content", ""),
            timestamp=ts_dt,
            status=data.get("status", "delivered"),
            media=json_safe(data.get("media")),
            reply_to_message_id=data.get("reply_to_message_id"),
            reactions=json_safe(data.get("reactions") or []),
            is_forwarded=bool(data.get("is_forwarded", False)),
            is_starred=bool(data.get("is_starred", False)),
            is_pinned=bool(data.get("is_pinned", False)),
            sender_avatar_url=data.get("sender_avatar_url"),
        )
        session.add(m)
    else:
        if "content" in data:
            m.content = data["content"]
        if "status" in data:
            m.status = data["status"]
        if "reactions" in data:
            m.reactions = json_safe(data["reactions"])
        if "is_starred" in data:
            m.is_starred = bool(data["is_starred"])
        if "is_pinned" in data:
            m.is_pinned = bool(data["is_pinned"])
        if "media" in data:
            m.media = json_safe(data["media"])
        if "sender_avatar_url" in data and data["sender_avatar_url"]:
            m.sender_avatar_url = data["sender_avatar_url"]
    session.commit()


def delete_whatsapp_message_doc(session: Session, doc_id: str) -> None:
    """Delete a WhatsApp message document by ID."""
    m = session.get(WhatsAppMessage, doc_id)
    if m:
        session.delete(m)
        session.commit()


def query_whatsapp_messages(session: Session, user_id: str, chat_id: str, query: SqlQuery) -> list[SqlSnapshot]:
    """Execute query on the chat's messages collection."""
    stmt = select(WhatsAppMessage).where(WhatsAppMessage.user_id == user_id, WhatsAppMessage.chat_id == chat_id)
    for field, op, val in query.filters:
        if field == "timestamp":
            val_dt = val
            if isinstance(val, str):
                try:
                    val_dt = datetime.fromisoformat(val.replace("Z", "+00:00"))
                except Exception:
                    pass
            if isinstance(val_dt, datetime):
                if op == "<":
                    stmt = stmt.where(WhatsAppMessage.timestamp < val_dt)
                elif op == "<=":
                    stmt = stmt.where(WhatsAppMessage.timestamp <= val_dt)
                elif op == ">":
                    stmt = stmt.where(WhatsAppMessage.timestamp > val_dt)
                elif op == ">=":
                    stmt = stmt.where(WhatsAppMessage.timestamp >= val_dt)
    if query._order_by == "timestamp":
        stmt = stmt.order_by(WhatsAppMessage.timestamp.desc() if query._direction == "DESC" else WhatsAppMessage.timestamp.asc())
    else:
        stmt = stmt.order_by(WhatsAppMessage.timestamp.desc())
    if query._limit:
        stmt = stmt.limit(query._limit)
    messages = session.scalars(stmt).all()
    return [SqlSnapshot(m.id, whatsapp_message_to_dict(m)) for m in messages]
