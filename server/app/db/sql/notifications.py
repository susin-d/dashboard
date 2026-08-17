"""SQL handlers for the 'users/{user_id}/notifications' collection."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.sql._shared import coerce_model_value
from app.db.sql.query import SqlSnapshot
from app.models import Notification

if TYPE_CHECKING:
    from app.db.sql.query import SqlQuery


def notification_to_dict(n: Notification) -> dict[str, Any]:
    """Serialize Notification model to snapshot dictionary."""
    return {
        "id": n.id,
        "title": n.title,
        "body": n.body,
        "message": n.body,
        "type": n.type,
        "unread": not n.read,
        "read": n.read,
        "data": n.data or {},
        "deleted": n.deleted,
        "created_at": n.created_at.isoformat() if n.created_at else "",
        "updated_at": n.updated_at.isoformat() if n.updated_at else "",
    }


def get_notification_doc(session: Session, user_id: str, doc_id: str) -> SqlSnapshot:
    """Fetch notification document by user ID and document ID."""
    n = session.get(Notification, doc_id)
    if not n or n.user_id != user_id:
        return SqlSnapshot(doc_id, None, exists=False)
    return SqlSnapshot(doc_id, notification_to_dict(n))


def set_notification_doc(
    session: Session,
    user_id: str,
    doc_id: str,
    data: dict[str, Any],
    merge: bool = False,
) -> None:
    """Create or update a notification document."""
    n = session.get(Notification, doc_id)
    if not n:
        n = Notification(
            id=doc_id,
            user_id=user_id,
            title=data.get("title", ""),
            body=data.get("body") or data.get("message", ""),
            type=data.get("type", "system"),
            read=data.get("read") if "read" in data else not bool(data.get("unread", True)),
            data=data.get("data") or {},
        )
        session.add(n)
    else:
        for k, val in data.items():
            if hasattr(n, k):
                setattr(n, k, coerce_model_value(k, val))
    session.commit()


def delete_notification_doc(session: Session, doc_id: str) -> None:
    """Delete a notification document by ID."""
    n = session.get(Notification, doc_id)
    if n:
        session.delete(n)
        session.commit()


def query_notifications(session: Session, user_id: str, query: SqlQuery) -> list[SqlSnapshot]:
    """Execute query on the user's notifications collection."""
    stmt = select(Notification).where(Notification.user_id == user_id)
    for field, op, val in query.filters:
        if field == "unread" and op in ("==", "="):
            stmt = stmt.where(Notification.read != val)
        elif field == "read" and op in ("==", "="):
            stmt = stmt.where(Notification.read == val)
    if query._order_by == "created_at":
        stmt = stmt.order_by(Notification.created_at.desc() if query._direction == "DESC" else Notification.created_at.asc())
    if query._limit:
        stmt = stmt.limit(query._limit)
    notifs = session.scalars(stmt).all()
    return [SqlSnapshot(n.id, notification_to_dict(n)) for n in notifs]
