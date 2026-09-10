"""Workspace IDE file-metadata model."""

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Index, String, Text

from app.db.session import Base
from app.models._shared import generate_uuid, utc_now


class WorkspaceFile(Base):
    __tablename__ = "workspace_files"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    user_id = Column(String(64), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    path = Column(String(1024), nullable=False)
    content = Column(Text, default="", nullable=False)
    is_directory = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    __table_args__ = (
        Index("ix_workspace_files_user_path", "user_id", "path", unique=True),
    )
