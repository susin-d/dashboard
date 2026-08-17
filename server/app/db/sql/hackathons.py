"""SQL handlers for the 'users/{user_id}/hackathons' collection."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.sql._shared import coerce_model_value
from app.db.sql.query import SqlSnapshot
from app.models import Hackathon

if TYPE_CHECKING:
    from app.db.sql.query import SqlQuery


def hackathon_to_dict(h: Hackathon) -> dict[str, Any]:
    """Serialize Hackathon model to snapshot dictionary."""
    return {
        "id": h.id,
        "title": h.title,
        "organizer": h.organizer,
        "location": h.location,
        "dates": h.dates,
        "prize": h.prize,
        "status": h.status,
        "hackathon_url": h.hackathon_url,
        "source": h.source,
        "notes": h.notes,
        "deleted": h.deleted,
        "deleted_at": h.deleted_at.isoformat() if h.deleted_at else None,
        "created_at": h.created_at.isoformat() if h.created_at else "",
        "updated_at": h.updated_at.isoformat() if h.updated_at else "",
    }


def get_hackathon_doc(session: Session, user_id: str, doc_id: str) -> SqlSnapshot:
    """Fetch hackathon document by user ID and document ID."""
    h = session.get(Hackathon, doc_id)
    if not h or h.user_id != user_id:
        return SqlSnapshot(doc_id, None, exists=False)
    return SqlSnapshot(doc_id, hackathon_to_dict(h))


def set_hackathon_doc(
    session: Session,
    user_id: str,
    doc_id: str,
    data: dict[str, Any],
    merge: bool = False,
) -> None:
    """Create or update a hackathon document."""
    h = session.get(Hackathon, doc_id)
    if not h:
        h = Hackathon(
            id=doc_id,
            user_id=user_id,
            title=data.get("title", ""),
            organizer=data.get("organizer"),
            location=data.get("location"),
            dates=data.get("dates"),
            prize=data.get("prize"),
            status=data.get("status", "Registered"),
            hackathon_url=data.get("hackathon_url"),
            source=data.get("source"),
            notes=data.get("notes"),
        )
        session.add(h)
    else:
        for k, val in data.items():
            if hasattr(h, k):
                setattr(h, k, coerce_model_value(k, val))
    session.commit()


def delete_hackathon_doc(session: Session, doc_id: str) -> None:
    """Delete a hackathon document by ID."""
    h = session.get(Hackathon, doc_id)
    if h:
        session.delete(h)
        session.commit()


def query_hackathons(session: Session, user_id: str, query: SqlQuery) -> list[SqlSnapshot]:
    """Execute query on the user's hackathons collection."""
    stmt = select(Hackathon).where(Hackathon.user_id == user_id)
    if query._order_by == "created_at":
        stmt = stmt.order_by(Hackathon.created_at.desc() if query._direction == "DESC" else Hackathon.created_at.asc())
    if query._limit:
        stmt = stmt.limit(query._limit)
    hackathons = session.scalars(stmt).all()
    return [SqlSnapshot(h.id, hackathon_to_dict(h)) for h in hackathons]
