"""SQL handlers for the 'users/{user_id}/projects' collection."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.sql._shared import coerce_model_value
from app.db.sql.query import SqlSnapshot
from app.models import Project

if TYPE_CHECKING:
    from app.db.sql.query import SqlQuery


def project_to_dict(p: Project) -> dict[str, Any]:
    """Serialize Project model to snapshot dictionary."""
    return {
        "id": p.id,
        "name": p.name,
        "description": p.description,
        "status": p.status,
        "progress": p.progress,
        "members": p.members,
        "technologies": p.technologies or [],
        "lifecycle_phase": p.lifecycle_phase,
        "deleted": p.deleted,
        "deleted_at": p.deleted_at.isoformat() if p.deleted_at else None,
        "created_at": p.created_at.isoformat() if p.created_at else "",
        "updated_at": p.updated_at.isoformat() if p.updated_at else "",
    }


def get_project_doc(session: Session, user_id: str, doc_id: str) -> SqlSnapshot:
    """Fetch project document by user ID and document ID."""
    p = session.get(Project, doc_id)
    if not p or p.user_id != user_id:
        return SqlSnapshot(doc_id, None, exists=False)
    return SqlSnapshot(doc_id, project_to_dict(p))


def set_project_doc(
    session: Session,
    user_id: str,
    doc_id: str,
    data: dict[str, Any],
    merge: bool = False,
) -> None:
    """Create or update a project document."""
    p = session.get(Project, doc_id)
    if not p:
        p = Project(
            id=doc_id,
            user_id=user_id,
            name=data.get("name", ""),
            description=data.get("description"),
            status=data.get("status", "Planning"),
            progress=data.get("progress", 0),
            members=data.get("members", 1),
            technologies=data.get("technologies") or [],
            lifecycle_phase=data.get("lifecycle_phase", "idea"),
        )
        session.add(p)
    else:
        for k, val in data.items():
            if hasattr(p, k):
                setattr(p, k, coerce_model_value(k, val))
    session.commit()


def delete_project_doc(session: Session, doc_id: str) -> None:
    """Delete a project document by ID."""
    p = session.get(Project, doc_id)
    if p:
        session.delete(p)
        session.commit()


def query_projects(session: Session, user_id: str, query: SqlQuery) -> list[SqlSnapshot]:
    """Execute query on the user's projects collection."""
    stmt = select(Project).where(Project.user_id == user_id)
    if query._order_by == "created_at":
        stmt = stmt.order_by(Project.created_at.desc() if query._direction == "DESC" else Project.created_at.asc())
    if query._limit:
        stmt = stmt.limit(query._limit)
    projects = session.scalars(stmt).all()
    return [SqlSnapshot(p.id, project_to_dict(p)) for p in projects]
