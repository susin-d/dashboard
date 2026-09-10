"""Per-user settings document model (ai-models, eve-speech, github, google, ...)."""

from sqlalchemy import Column, DateTime, ForeignKey, Index, JSON, String
from sqlalchemy.orm import relationship

from app.db.session import Base
from app.models._shared import generate_uuid, utc_now


class UserSetting(Base):
    __tablename__ = "user_settings"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    user_id = Column(String(64), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    category = Column(String(128), nullable=False)  # e.g., "ai-models", "eve-speech", "github", "google"
    settings = Column(JSON, default=dict, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    __table_args__ = (
        Index("ix_user_settings_user_cat", "user_id", "category", unique=True),
    )

    user = relationship("User", back_populates="settings")
