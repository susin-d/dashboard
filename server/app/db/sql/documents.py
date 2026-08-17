"""SQL handlers for the 'users/{user_id}/documents' collection."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.sql._shared import coerce_model_value
from app.db.sql.query import SqlSnapshot
from app.models import Document

if TYPE_CHECKING:
    from app.db.sql.query import SqlQuery


def document_to_dict(d: Document) -> dict[str, Any]:
    """Serialize Document model to snapshot dictionary."""
    return {
        "id": d.id,
        "title": d.title,
        "name": d.title or "Untitled",
        "content": d.content,
        "description": d.content or "",
        "folder": d.folder,
        "category": d.folder or "General",
        "url": "",
        "type": "FILE",
        "size": "Unknown",
        "tags": d.tags or [],
        "deleted": d.deleted,
        "deleted_at": d.deleted_at.isoformat() if d.deleted_at else None,
        "created_at": d.created_at.isoformat() if d.created_at else "",
        "updated_at": d.updated_at.isoformat() if d.updated_at else "",
        "modified_at": d.updated_at.isoformat() if d.updated_at else "",
    }


def get_document_doc(session: Session, user_id: str, doc_id: str) -> SqlSnapshot:
    """Fetch document by user ID and document ID."""
    d = session.get(Document, doc_id)
    if not d or d.user_id != user_id:
        return SqlSnapshot(doc_id, None, exists=False)
    return SqlSnapshot(doc_id, document_to_dict(d))


def set_document_doc(
    session: Session,
    user_id: str,
    doc_id: str,
    data: dict[str, Any],
    merge: bool = False,
) -> None:
    """Create or update a document record."""
    d = session.get(Document, doc_id)
    if not d:
        d = Document(
            id=doc_id,
            user_id=user_id,
            title=data.get("title", ""),
            content=data.get("content", ""),
            folder=data.get("folder", "General"),
            tags=data.get("tags") or [],
        )
        session.add(d)
    else:
        for k, val in data.items():
            if hasattr(d, k):
                setattr(d, k, coerce_model_value(k, val))
    session.commit()


def delete_document_doc(session: Session, doc_id: str) -> None:
    """Delete a document record by ID."""
    d = session.get(Document, doc_id)
    if d:
        session.delete(d)
        session.commit()


def query_documents(session: Session, user_id: str, query: SqlQuery) -> list[SqlSnapshot]:
    """Execute query on the user's documents collection."""
    stmt = select(Document).where(Document.user_id == user_id)
    if query._order_by == "created_at":
        stmt = stmt.order_by(Document.created_at.desc() if query._direction == "DESC" else Document.created_at.asc())
    elif query._order_by == "modified_at":
        stmt = stmt.order_by(Document.updated_at.desc() if query._direction == "DESC" else Document.updated_at.asc())
    if query._limit:
        stmt = stmt.limit(query._limit)
    docs = session.scalars(stmt).all()
    return [SqlSnapshot(d.id, document_to_dict(d)) for d in docs]
