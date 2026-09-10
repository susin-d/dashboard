"""Eve AI models — chat sessions, memories (pgvector RAG), schedules."""

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, JSON, String, Text
from sqlalchemy.orm import relationship

from app.db.session import Base
from app.models._shared import Vector, generate_uuid, utc_now


class EveSession(Base):
    __tablename__ = "eve_sessions"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    user_id = Column(String(64), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    title = Column(String(255), default="New chat", nullable=False)
    messages = Column(JSON, default=list, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    user = relationship("User", back_populates="eve_sessions")


class EveMemory(Base):
    __tablename__ = "eve_memories"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    user_id = Column(String(64), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    content = Column(Text, nullable=False)
    # pgvector 1536-dim (text-embedding-3-small) for semantic recall; falls back to JSON on SQLite/tests
    embedding = Column(Vector(1536) if Vector else JSON, nullable=True)  # type: ignore
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    user = relationship("User", back_populates="eve_memories")


class EveSchedule(Base):
    __tablename__ = "eve_schedules"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    user_id = Column(String(64), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    action_type = Column(String(64), default="prompt", nullable=False)  # prompt, voice_call
    cron_expression = Column(String(128), nullable=True)
    scheduled_time = Column(DateTime(timezone=True), nullable=True)
    prompt = Column(Text, nullable=True)
    # Firestore-shaped scheduling fields persisted since the SQL migration
    title = Column(String(255), nullable=True)
    schedule_type = Column(String(32), nullable=True)  # one_time, recurring
    execute_at = Column(DateTime(timezone=True), nullable=True)
    next_run_at = Column(DateTime(timezone=True), nullable=True)
    enabled = Column(Boolean, default=True, nullable=False)
    last_run_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    user = relationship("User", back_populates="eve_schedules")
