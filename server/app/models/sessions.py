"""Multi-device session model (30d expiry, 10-cap LRU per user)."""

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Index, String, Text
from sqlalchemy.orm import relationship

from app.db.session import Base
from app.models._shared import generate_uuid, utc_now


class UserSession(Base):
    __tablename__ = "user_sessions"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    user_id = Column(String(64), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    device_id = Column(String(64), nullable=False)
    device_name = Column(String(255), default="Unknown device", nullable=False)
    user_agent = Column(Text, nullable=True)
    ip_address = Column(String(64), nullable=True)
    token_jti = Column(String(64), unique=True, index=True, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    revoked = Column(Boolean, default=False, nullable=False)
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    last_seen_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    user = relationship("User", back_populates="user_sessions")

    __table_args__ = (
        Index("ix_user_sessions_user_created", "user_id", "created_at", "id"),
        Index("ix_user_sessions_user_last_seen", "user_id", "last_seen_at"),
        Index("ix_user_sessions_jti", "token_jti", unique=True),
        Index("ix_user_sessions_user_device", "user_id", "device_id"),
    )
