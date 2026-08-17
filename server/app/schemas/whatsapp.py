from datetime import datetime, timezone
from typing import Any, List, Optional
from pydantic import BaseModel, Field


class WhatsAppPairRequest(BaseModel):
    phone_number: Optional[str] = Field(default=None, description="Optional phone number for pairing code")


class WhatsAppPairResponse(BaseModel):
    status: str = Field(description="Pairing status: 'qr_ready', 'connecting', 'connected', or 'error'")
    qr_code: Optional[str] = Field(default=None, description="Base64 or data URL for QR code")
    pairing_code: Optional[str] = Field(default=None, description="Optional 8-digit pairing code if phone provided")
    expires_at: Optional[datetime] = Field(default=None, description="Expiration time of QR code")
    message: Optional[str] = None


class WhatsAppStatusResponse(BaseModel):
    connected: bool = False
    phone_number: Optional[str] = None
    push_name: Optional[str] = None
    platform: Optional[str] = "web"
    last_sync_at: Optional[datetime] = None
    auto_reply_enabled: bool = False
    battery_level: Optional[int] = None


class WhatsAppMediaAttachment(BaseModel):
    type: str = Field(description="Media type: 'image', 'audio', 'document', 'video'")
    url: str
    mimetype: Optional[str] = None
    filename: Optional[str] = None
    file_size_bytes: Optional[int] = None
    duration_seconds: Optional[float] = None


class WhatsAppMessageCreate(BaseModel):
    chat_id: str = Field(description="WhatsApp JID or phone number (e.g. 1234567890@s.whatsapp.net)")
    content: str = Field(default="", description="Message text content")
    media: Optional[WhatsAppMediaAttachment] = None
    reply_to_message_id: Optional[str] = None


class WhatsAppMessageResponse(BaseModel):
    id: str
    chat_id: str
    sender_id: str
    sender_name: Optional[str] = None
    is_from_me: bool = False
    is_eve: bool = False
    content: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    status: str = Field(default="sent", description="'pending', 'sent', 'delivered', 'read'")
    media: Optional[WhatsAppMediaAttachment] = None
    reply_to_message_id: Optional[str] = None
    reactions: Optional[List[dict]] = Field(default_factory=list, description="List of emoji reactions [{emoji, sender}]")
    is_forwarded: bool = False
    is_starred: bool = False
    is_pinned: bool = False


class WhatsAppChatResponse(BaseModel):
    id: str
    name: str
    phone_number: Optional[str] = None
    avatar_url: Optional[str] = None
    is_group: bool = False
    is_eve: bool = False
    participants: Optional[List[str]] = Field(default_factory=list, description="List of group participant names or JIDs")
    description: Optional[str] = None
    unread_count: int = 0
    pinned: bool = False
    last_message: Optional[WhatsAppMessageResponse] = None
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    eve_auto_reply: bool = False


class WhatsAppSettings(BaseModel):
    auto_reply_enabled: bool = False
    auto_reply_prompt: Optional[str] = "You are Eve, answering incoming WhatsApp messages concisely on behalf of the user."
    auto_reply_contacts: List[str] = Field(default_factory=list, description="List of JIDs with auto-reply enabled")
    notifications_enabled: bool = True
    desktop_alerts_enabled: bool = True


class WhatsAppSettingsUpdate(BaseModel):
    auto_reply_enabled: Optional[bool] = None
    auto_reply_prompt: Optional[str] = None
    auto_reply_contacts: Optional[List[str]] = None
    notifications_enabled: Optional[bool] = None
    desktop_alerts_enabled: Optional[bool] = None


class WhatsAppEveDraftRequest(BaseModel):
    chat_id: str
    instruction: Optional[str] = "Draft a friendly and concise reply to the recent conversation."
