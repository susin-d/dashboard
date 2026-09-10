"""WhatsApp bridge models — chats and messages."""

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Index, Integer, JSON, String, Text

from app.db.session import Base
from app.models._shared import utc_now


class WhatsAppChat(Base):
    __tablename__ = "whatsapp_chats"

    id = Column(String(128), primary_key=True)
    user_id = Column(String(64), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    name = Column(String(255), nullable=False)
    phone_number = Column(String(64), nullable=True)
    avatar_url = Column(Text, nullable=True)
    is_group = Column(Boolean, default=False, nullable=False)
    participants = Column(JSON, default=list, nullable=True)
    description = Column(Text, nullable=True)
    unread_count = Column(Integer, default=0, nullable=False)
    last_message = Column(JSON, nullable=True)
    is_pinned = Column(Boolean, default=False, nullable=False)
    is_muted = Column(Boolean, default=False, nullable=False)
    is_archived = Column(Boolean, default=False, nullable=False)
    eve_auto_reply = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)


class WhatsAppMessage(Base):
    __tablename__ = "whatsapp_messages"

    id = Column(String(128), primary_key=True)
    user_id = Column(String(64), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    chat_id = Column(String(128), index=True, nullable=False)
    sender_id = Column(String(128), nullable=False)
    sender_name = Column(String(255), nullable=True)
    is_from_me = Column(Boolean, default=False, nullable=False)
    is_eve = Column(Boolean, default=False, nullable=False)
    content = Column(Text, default="", nullable=False)
    timestamp = Column(DateTime(timezone=True), index=True, nullable=False)
    status = Column(String(64), default="delivered", nullable=False)
    media = Column(JSON, nullable=True)
    reply_to_message_id = Column(String(128), nullable=True)
    reactions = Column(JSON, default=list, nullable=True)
    is_forwarded = Column(Boolean, default=False, nullable=False)
    is_starred = Column(Boolean, default=False, nullable=False)
    is_pinned = Column(Boolean, default=False, nullable=False)
    sender_avatar_url = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    __table_args__ = (
        Index("ix_whatsapp_messages_chat_ts", "chat_id", "timestamp"),
    )
