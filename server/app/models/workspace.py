"""Workspace domain models — jobs, projects, hackathons, todos, documents, contacts, notifications."""

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import relationship

from app.db.session import Base
from app.models._shared import generate_uuid, utc_now


class Job(Base):
    __tablename__ = "jobs"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    user_id = Column(String(64), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    company = Column(String(255), nullable=False)
    role = Column(String(255), nullable=False)
    status = Column(String(64), default="Applied", nullable=False)
    location = Column(String(255), nullable=True)
    work_type = Column(String(64), nullable=True)
    salary = Column(String(128), nullable=True)
    applied_date = Column(String(64), nullable=True)
    resume_id = Column(String(64), nullable=True)
    job_url = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    deleted = Column(Boolean, default=False, nullable=False)
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    user = relationship("User", back_populates="jobs")


class Project(Base):
    __tablename__ = "projects"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    user_id = Column(String(64), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(64), default="Planning", nullable=False)
    progress = Column(Integer, default=0, nullable=False)
    members = Column(Integer, default=1, nullable=False)
    technologies = Column(JSON, default=list, nullable=False)
    lifecycle_phase = Column(String(64), default="idea", nullable=False)
    deleted = Column(Boolean, default=False, nullable=False)
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    user = relationship("User", back_populates="projects")


class Hackathon(Base):
    __tablename__ = "hackathons"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    user_id = Column(String(64), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    title = Column(String(255), nullable=False)
    organizer = Column(String(255), nullable=True)
    location = Column(String(255), nullable=True)
    dates = Column(String(255), nullable=True)
    prize = Column(String(128), nullable=True)
    status = Column(String(64), default="Registered", nullable=False)
    hackathon_url = Column(Text, nullable=True)
    source = Column(String(128), nullable=True)
    notes = Column(Text, nullable=True)
    # Structured schedule/details persisted since the SQL migration (required by
    # HackathonResponse; previously dropped silently on write).
    starts_at = Column(DateTime(timezone=True), nullable=True)
    ends_at = Column(DateTime(timezone=True), nullable=True)
    mode = Column(String(64), nullable=True)
    team_size = Column(String(32), nullable=True)
    tags = Column(JSON, default=list, nullable=False)
    deleted = Column(Boolean, default=False, nullable=False)
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    user = relationship("User", back_populates="hackathons")


class Todo(Base):
    __tablename__ = "todos"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    user_id = Column(String(64), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    title = Column(String(255), nullable=False)
    completed = Column(Boolean, default=False, nullable=False)
    due_date = Column(String(64), nullable=True)
    priority = Column(String(32), default="medium", nullable=False)
    deleted = Column(Boolean, default=False, nullable=False)
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    user = relationship("User", back_populates="todos")


class Document(Base):
    __tablename__ = "documents"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    user_id = Column(String(64), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    title = Column(String(255), nullable=False)
    content = Column(Text, default="", nullable=False)
    folder = Column(String(255), default="General", nullable=False)
    tags = Column(JSON, default=list, nullable=False)
    # Drive/document metadata persisted since the SQL migration (previously
    # dropped silently when coming from the schema-shaped DocumentUpsert).
    url = Column(Text, nullable=True)
    doc_type = Column(String(80), nullable=True)
    size_label = Column(String(80), nullable=True)
    drive_file_id = Column(String(255), nullable=True)
    deleted = Column(Boolean, default=False, nullable=False)
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    user = relationship("User", back_populates="documents")


class Contact(Base):
    __tablename__ = "contacts"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    user_id = Column(String(64), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=True)
    phone = Column(String(64), nullable=True)
    role = Column(String(128), nullable=True)
    company = Column(String(128), nullable=True)
    notes = Column(Text, nullable=True)
    deleted = Column(Boolean, default=False, nullable=False)
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    user = relationship("User", back_populates="contacts")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    user_id = Column(String(64), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    title = Column(String(255), nullable=False)
    body = Column(Text, nullable=False)
    type = Column(String(64), default="system", nullable=False)
    read = Column(Boolean, default=False, nullable=False)
    data = Column(JSON, default=dict, nullable=False)
    # Display timestamp label (e.g. "3:45 PM") persisted from Firestore-shaped docs
    notification_time = Column(String(32), name="notification_time", nullable=True)
    deleted = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    user = relationship("User", back_populates="notifications")
