"""SQL handlers for Eve AI Assistant collections ('eve_sessions' and 'eve_memories')."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.sql._shared import coerce_model_value
from app.db.sql.query import SqlSnapshot
from app.models import EveMemory, EveSession

if TYPE_CHECKING:
    from app.db.sql.query import SqlQuery


def eve_session_to_dict(s: EveSession) -> dict[str, Any]:
    """Serialize EveSession model to snapshot dictionary."""
    return {
        "id": s.id,
        "title": s.title,
        "messages": s.messages or [],
        "created_at": s.created_at.isoformat() if s.created_at else "",
        "updated_at": s.updated_at.isoformat() if s.updated_at else "",
    }


def eve_memory_to_dict(m: EveMemory) -> dict[str, Any]:
    """Serialize EveMemory model to snapshot dictionary."""
    return {
        "id": m.id,
        "content": m.content,
        "created_at": m.created_at.isoformat() if m.created_at else "",
        "updated_at": m.updated_at.isoformat() if m.updated_at else "",
    }


def get_eve_session_doc(session: Session, user_id: str, doc_id: str) -> SqlSnapshot:
    """Fetch Eve chat session by user ID and session ID."""
    s = session.get(EveSession, doc_id)
    if not s or s.user_id != user_id:
        return SqlSnapshot(doc_id, None, exists=False)
    return SqlSnapshot(doc_id, eve_session_to_dict(s))


def set_eve_session_doc(
    session: Session,
    user_id: str,
    doc_id: str,
    data: dict[str, Any],
    merge: bool = False,
) -> None:
    """Create or update an Eve chat session."""
    s = session.get(EveSession, doc_id)
    if not s:
        s = EveSession(
            id=doc_id,
            user_id=user_id,
            title=data.get("title", "New chat"),
            messages=data.get("messages") or [],
        )
        session.add(s)
    else:
        for k, val in data.items():
            if hasattr(s, k):
                setattr(s, k, coerce_model_value(k, val))
    session.commit()


def delete_eve_session_doc(session: Session, doc_id: str) -> None:
    """Delete an Eve chat session by ID."""
    s = session.get(EveSession, doc_id)
    if s:
        session.delete(s)
        session.commit()


def query_eve_sessions(session: Session, user_id: str, query: SqlQuery) -> list[SqlSnapshot]:
    """Execute query on the user's eve_sessions collection."""
    stmt = select(EveSession).where(EveSession.user_id == user_id)
    if query._order_by == "updated_at":
        stmt = stmt.order_by(EveSession.updated_at.desc() if query._direction == "DESC" else EveSession.updated_at.asc())
    elif query._order_by == "created_at":
        stmt = stmt.order_by(EveSession.created_at.desc() if query._direction == "DESC" else EveSession.created_at.asc())
    if query._limit:
        stmt = stmt.limit(query._limit)
    sessions = session.scalars(stmt).all()
    return [SqlSnapshot(s.id, eve_session_to_dict(s)) for s in sessions]


def get_eve_memory_doc(session: Session, user_id: str, doc_id: str) -> SqlSnapshot:
    """Fetch Eve memory entry by user ID and memory ID."""
    m = session.get(EveMemory, doc_id)
    if not m or m.user_id != user_id:
        return SqlSnapshot(doc_id, None, exists=False)
    return SqlSnapshot(doc_id, eve_memory_to_dict(m))


def set_eve_memory_doc(
    session: Session,
    user_id: str,
    doc_id: str,
    data: dict[str, Any],
    merge: bool = False,
) -> None:
    """Create or update an Eve persistent memory."""
    m = session.get(EveMemory, doc_id)
    if not m:
        m = EveMemory(
            id=doc_id,
            user_id=user_id,
            content=data.get("content", ""),
        )
        session.add(m)
    else:
        for k, val in data.items():
            if hasattr(m, k):
                setattr(m, k, coerce_model_value(k, val))
    session.commit()


def delete_eve_memory_doc(session: Session, doc_id: str) -> None:
    """Delete an Eve memory entry by ID."""
    m = session.get(EveMemory, doc_id)
    if m:
        session.delete(m)
        session.commit()


def query_eve_memories(session: Session, user_id: str, query: SqlQuery) -> list[SqlSnapshot]:
    """Execute query on the user's eve_memories collection."""
    stmt = select(EveMemory).where(EveMemory.user_id == user_id)
    if query._order_by == "created_at":
        stmt = stmt.order_by(EveMemory.created_at.desc() if query._direction == "DESC" else EveMemory.created_at.asc())
    if query._limit:
        stmt = stmt.limit(query._limit)
    memories = session.scalars(stmt).all()
    return [SqlSnapshot(m.id, eve_memory_to_dict(m)) for m in memories]
