"""SQL handlers for the 'users/{user_id}/todos' collection."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.sql._shared import coerce_model_value
from app.db.sql.query import SqlSnapshot
from app.models import Todo

if TYPE_CHECKING:
    from app.db.sql.query import SqlQuery


def todo_to_dict(t: Todo) -> dict[str, Any]:
    """Serialize Todo model to snapshot dictionary."""
    return {
        "id": t.id,
        "title": t.title,
        "completed": t.completed,
        "due_date": t.due_date,
        "priority": t.priority,
        "deleted": t.deleted,
        "deleted_at": t.deleted_at.isoformat() if t.deleted_at else None,
        "created_at": t.created_at.isoformat() if t.created_at else "",
        "updated_at": t.updated_at.isoformat() if t.updated_at else "",
    }


def get_todo_doc(session: Session, user_id: str, doc_id: str) -> SqlSnapshot:
    """Fetch todo document by user ID and document ID."""
    t = session.get(Todo, doc_id)
    if not t or t.user_id != user_id:
        return SqlSnapshot(doc_id, None, exists=False)
    return SqlSnapshot(doc_id, todo_to_dict(t))


def set_todo_doc(
    session: Session,
    user_id: str,
    doc_id: str,
    data: dict[str, Any],
    merge: bool = False,
) -> None:
    """Create or update a todo document."""
    t = session.get(Todo, doc_id)
    if not t:
        t = Todo(
            id=doc_id,
            user_id=user_id,
            title=data.get("title", ""),
            completed=bool(data.get("completed", False)),
            due_date=data.get("due_date"),
            priority=data.get("priority", "medium"),
        )
        session.add(t)
    else:
        for k, val in data.items():
            if hasattr(t, k):
                setattr(t, k, coerce_model_value(k, val))
    session.commit()


def delete_todo_doc(session: Session, doc_id: str) -> None:
    """Delete a todo document by ID."""
    t = session.get(Todo, doc_id)
    if t:
        session.delete(t)
        session.commit()


def query_todos(session: Session, user_id: str, query: SqlQuery) -> list[SqlSnapshot]:
    """Execute query on the user's todos collection."""
    stmt = select(Todo).where(Todo.user_id == user_id)
    if query._order_by == "created_at":
        stmt = stmt.order_by(Todo.created_at.desc() if query._direction == "DESC" else Todo.created_at.asc())
    if query._limit:
        stmt = stmt.limit(query._limit)
    todos = session.scalars(stmt).all()
    return [SqlSnapshot(t.id, todo_to_dict(t)) for t in todos]
