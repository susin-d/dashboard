"""SQLAlchemy-backed Firestore client adapter for Starwaves.

Emulates the subset of the google-cloud-firestore API (collections, documents,
queries, filters, timestamps, and transactions) used across Starwaves repositories,
persisting transparently to PostgreSQL / Supabase tables via SQLAlchemy models.
"""

from __future__ import annotations

import base64
import json
import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import delete, func, select, text, update
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import engine
from app.models import (
    Call,
    Contact,
    Document,
    EveMemory,
    EveSchedule,
    EveSession,
    Hackathon,
    Job,
    Notification,
    Project,
    Todo,
    User,
    UserSetting,
    WorkspaceFile,
)

SERVER_TIMESTAMP = "__SQL_SERVER_TIMESTAMP__"


class ArrayUnion:
    def __init__(self, values: list[Any]):
        self.values = values


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class SqlSnapshot:
    def __init__(self, doc_id: str, data: dict[str, Any] | None, exists: bool = True):
        self.id = doc_id
        self._data = data or {}
        self.exists = exists

    def to_dict(self) -> dict[str, Any]:
        return dict(self._data)


class SqlDocRef:
    def __init__(self, db: SqlClient, path_parts: list[str], doc_id: str):
        self.db = db
        self.path_parts = path_parts
        self.id = doc_id

    @property
    def reference(self) -> SqlDocRef:
        return self

    def collection(self, name: str) -> SqlCollectionRef:
        return SqlCollectionRef(self.db, [*self.path_parts, self.id, name])

    def get(self) -> SqlSnapshot:
        return self.db._get_doc(self.path_parts, self.id)

    def set(self, data: dict[str, Any], merge: bool = False) -> None:
        self.db._set_doc(self.path_parts, self.id, data, merge=merge)

    def update(self, updates: dict[str, Any]) -> None:
        self.db._update_doc(self.path_parts, self.id, updates)

    def delete(self) -> None:
        self.db._delete_doc(self.path_parts, self.id)


class SqlQuery:
    def __init__(self, coll: SqlCollectionRef):
        self.coll = coll
        self.filters: list[tuple[str, str, Any]] = []
        self._order_by: str | None = None
        self._direction: str = "ASC"
        self._limit: int | None = None
        self._start_after_doc_id: str | None = None

    def where(self, field_or_filter: Any = None, op: str | None = None, value: Any = None, filter: Any = None) -> SqlQuery:
        q = SqlQuery(self.coll)
        q.filters = list(self.filters)
        q._order_by = self._order_by
        q._direction = self._direction
        q._limit = self._limit
        q._start_after_doc_id = self._start_after_doc_id

        actual_filter = filter if filter is not None else field_or_filter
        if op is None and hasattr(actual_filter, "field_path"):
            q.filters.append((actual_filter.field_path, actual_filter.op_string, actual_filter.value))
        elif hasattr(actual_filter, "field_name"):
            q.filters.append((getattr(actual_filter, "field_name"), getattr(actual_filter, "operator", "=="), getattr(actual_filter, "value")))
        elif op is not None and actual_filter is not None:
            q.filters.append((str(actual_filter), op, value))
        return q

    def order_by(self, field: str, direction: Any = None) -> SqlQuery:
        q = SqlQuery(self.coll)
        q.filters = list(self.filters)
        q._order_by = field
        q._direction = "DESC" if str(direction).lower() in ("descending", "desc", "query.descending") or "DESC" in str(direction) else "ASC"
        q._limit = self._limit
        q._start_after_doc_id = self._start_after_doc_id
        return q

    def limit(self, count: int) -> SqlQuery:
        q = SqlQuery(self.coll)
        q.filters = list(self.filters)
        q._order_by = self._order_by
        q._direction = self._direction
        q._limit = count
        q._start_after_doc_id = self._start_after_doc_id
        return q

    def start_after(self, doc_or_snap: Any) -> SqlQuery:
        q = SqlQuery(self.coll)
        q.filters = list(self.filters)
        q._order_by = self._order_by
        q._direction = self._direction
        q._limit = self._limit
        q._start_after_doc_id = getattr(doc_or_snap, "id", str(doc_or_snap))
        return q

    def stream(self) -> list[SqlSnapshot]:
        return self.coll.db._query_coll(self.coll.path_parts, self)


class SqlCollectionRef:
    def __init__(self, db: SqlClient, path_parts: list[str]):
        self.db = db
        self.path_parts = path_parts

    def document(self, doc_id: str | None = None) -> SqlDocRef:
        target_id = doc_id or uuid.uuid4().hex
        return SqlDocRef(self.db, self.path_parts, target_id)

    def where(self, field_or_filter: Any = None, op: str | None = None, value: Any = None, filter: Any = None) -> SqlQuery:
        return SqlQuery(self).where(field_or_filter, op, value, filter=filter)

    def order_by(self, field: str, direction: Any = None) -> SqlQuery:
        return SqlQuery(self).order_by(field, direction)

    def limit(self, count: int) -> SqlQuery:
        return SqlQuery(self).limit(count)

    def stream(self) -> list[SqlSnapshot]:
        return SqlQuery(self).stream()


class SqlBatch:
    def __init__(self, db: SqlClient):
        self.db = db
        self.operations: list[tuple[str, SqlDocRef, dict[str, Any]]] = []

    def set(self, doc_ref: SqlDocRef, data: dict[str, Any], merge: bool = False) -> None:
        self.operations.append(("set", doc_ref, data))

    def update(self, doc_ref: SqlDocRef, updates: dict[str, Any]) -> None:
        self.operations.append(("update", doc_ref, updates))

    def delete(self, doc_ref: SqlDocRef) -> None:
        self.operations.append(("delete", doc_ref, {}))

    def commit(self) -> None:
        for op, doc_ref, data in self.operations:
            if op == "set":
                doc_ref.set(data)
            elif op == "update":
                doc_ref.update(data)
            elif op == "delete":
                doc_ref.delete()
        self.operations.clear()


class SqlClient:
    """PostgreSQL-backed Firestore Client adapter."""

    def __init__(self):
        from app.db.session import sync_engine
        self._sync_engine = sync_engine

    def collection(self, name: str) -> SqlCollectionRef:
        return SqlCollectionRef(self, [name])

    def collection_group(self, name: str) -> SqlCollectionRef:
        return SqlCollectionRef(self, ["__group__", name])

    def batch(self) -> SqlBatch:
        return SqlBatch(self)

    def _clean_data(self, data: dict[str, Any]) -> dict[str, Any]:
        cleaned = {}
        now = _utc_now_iso()
        for k, v in data.items():
            if v == SERVER_TIMESTAMP or str(v).startswith("__SQL_SERVER_TIMESTAMP"):
                cleaned[k] = now
            elif isinstance(v, ArrayUnion):
                cleaned[k] = v.values
            else:
                cleaned[k] = v
        return cleaned

    def _get_doc(self, path_parts: list[str], doc_id: str) -> SqlSnapshot:
        with Session(self._sync_engine) as session:
            # users/
            if len(path_parts) == 1 and path_parts[0] == "users":
                u = session.get(User, doc_id)
                if not u:
                    return SqlSnapshot(doc_id, None, exists=False)
                return SqlSnapshot(doc_id, {
                    "uid": u.id,
                    "email": u.email,
                    "name": u.name,
                    "display_name": u.display_name,
                    "avatar_url": u.avatar_url,
                    "password_hash": u.password_hash,
                    "password_salt": u.password_salt,
                    "google_auth": u.google_auth,
                    "combined_accounts": u.combined_accounts or [],
                    "created_at": u.created_at.isoformat() if u.created_at else "",
                    "updated_at": u.updated_at.isoformat() if u.updated_at else "",
                })

            # calls/
            if len(path_parts) == 1 and path_parts[0] == "calls":
                c = session.get(Call, doc_id)
                if not c:
                    return SqlSnapshot(doc_id, None, exists=False)
                # Load JSON from data if available or columns
                return SqlSnapshot(doc_id, {
                    "id": c.id,
                    "caller_id": c.caller_id,
                    "receiver_id": c.receiver_id,
                    "status": c.status,
                    "call_type": c.call_type,
                    "mode": c.call_type,
                    "duration": c.duration,
                    "messages": [],
                    "participants": [c.caller_id, c.receiver_id],
                    "created_at": c.created_at.isoformat() if c.created_at else "",
                    "updated_at": c.updated_at.isoformat() if c.updated_at else "",
                })

            # users/{user_id}/todos
            if len(path_parts) == 3 and path_parts[0] == "users" and path_parts[2] == "todos":
                t = session.get(Todo, doc_id)
                if not t or t.user_id != path_parts[1]:
                    return SqlSnapshot(doc_id, None, exists=False)
                return SqlSnapshot(doc_id, {
                    "id": t.id,
                    "title": t.title,
                    "completed": t.completed,
                    "due_date": t.due_date,
                    "priority": t.priority,
                    "deleted": t.deleted,
                    "deleted_at": t.deleted_at.isoformat() if t.deleted_at else None,
                    "created_at": t.created_at.isoformat() if t.created_at else "",
                    "updated_at": t.updated_at.isoformat() if t.updated_at else "",
                })

            # users/{user_id}/jobs
            if len(path_parts) == 3 and path_parts[0] == "users" and path_parts[2] == "jobs":
                j = session.get(Job, doc_id)
                if not j or j.user_id != path_parts[1]:
                    return SqlSnapshot(doc_id, None, exists=False)
                return SqlSnapshot(doc_id, {
                    "id": j.id,
                    "company": j.company,
                    "role": j.role,
                    "status": j.status,
                    "location": j.location,
                    "work_type": j.work_type,
                    "salary": j.salary,
                    "applied_date": j.applied_date,
                    "resume_id": j.resume_id,
                    "job_url": j.job_url,
                    "notes": j.notes,
                    "deleted": j.deleted,
                    "deleted_at": j.deleted_at.isoformat() if j.deleted_at else None,
                    "created_at": j.created_at.isoformat() if j.created_at else "",
                    "updated_at": j.updated_at.isoformat() if j.updated_at else "",
                })

            # users/{user_id}/projects
            if len(path_parts) == 3 and path_parts[0] == "users" and path_parts[2] == "projects":
                p = session.get(Project, doc_id)
                if not p or p.user_id != path_parts[1]:
                    return SqlSnapshot(doc_id, None, exists=False)
                return SqlSnapshot(doc_id, {
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
                })

            # users/{user_id}/hackathons
            if len(path_parts) == 3 and path_parts[0] == "users" and path_parts[2] == "hackathons":
                h = session.get(Hackathon, doc_id)
                if not h or h.user_id != path_parts[1]:
                    return SqlSnapshot(doc_id, None, exists=False)
                return SqlSnapshot(doc_id, {
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
                })

            # users/{user_id}/documents
            if len(path_parts) == 3 and path_parts[0] == "users" and path_parts[2] == "documents":
                d = session.get(Document, doc_id)
                if not d or d.user_id != path_parts[1]:
                    return SqlSnapshot(doc_id, None, exists=False)
                return SqlSnapshot(doc_id, {
                    "id": d.id,
                    "title": d.title,
                    "content": d.content,
                    "folder": d.folder,
                    "tags": d.tags or [],
                    "deleted": d.deleted,
                    "deleted_at": d.deleted_at.isoformat() if d.deleted_at else None,
                    "created_at": d.created_at.isoformat() if d.created_at else "",
                    "updated_at": d.updated_at.isoformat() if d.updated_at else "",
                    "modified_at": d.updated_at.isoformat() if d.updated_at else "",
                })

            # users/{user_id}/contacts
            if len(path_parts) == 3 and path_parts[0] == "users" and path_parts[2] == "contacts":
                c = session.get(Contact, doc_id)
                if not c or c.user_id != path_parts[1]:
                    return SqlSnapshot(doc_id, None, exists=False)
                return SqlSnapshot(doc_id, {
                    "id": c.id,
                    "name": c.name,
                    "email": c.email,
                    "phone": c.phone,
                    "company": c.company,
                    "role": c.role,
                    "notes": c.notes,
                    "deleted": c.deleted,
                    "deleted_at": c.deleted_at.isoformat() if c.deleted_at else None,
                    "created_at": c.created_at.isoformat() if c.created_at else "",
                    "updated_at": c.updated_at.isoformat() if c.updated_at else "",
                })

            # users/{user_id}/notifications
            if len(path_parts) == 3 and path_parts[0] == "users" and path_parts[2] == "notifications":
                n = session.get(Notification, doc_id)
                if not n or n.user_id != path_parts[1]:
                    return SqlSnapshot(doc_id, None, exists=False)
                return SqlSnapshot(doc_id, {
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
                })

            # users/{user_id}/eve_sessions
            if len(path_parts) == 3 and path_parts[0] == "users" and path_parts[2] == "eve_sessions":
                s = session.get(EveSession, doc_id)
                if not s or s.user_id != path_parts[1]:
                    return SqlSnapshot(doc_id, None, exists=False)
                return SqlSnapshot(doc_id, {
                    "id": s.id,
                    "title": s.title,
                    "messages": s.messages or [],
                    "created_at": s.created_at.isoformat() if s.created_at else "",
                    "updated_at": s.updated_at.isoformat() if s.updated_at else "",
                })

            # users/{user_id}/eve_memories
            if len(path_parts) == 3 and path_parts[0] == "users" and path_parts[2] == "eve_memories":
                m = session.get(EveMemory, doc_id)
                if not m or m.user_id != path_parts[1]:
                    return SqlSnapshot(doc_id, None, exists=False)
                return SqlSnapshot(doc_id, {
                    "id": m.id,
                    "content": m.content,
                    "created_at": m.created_at.isoformat() if m.created_at else "",
                    "updated_at": m.updated_at.isoformat() if m.updated_at else "",
                })

            # users/{user_id}/settings/{category}
            if len(path_parts) == 3 and path_parts[0] == "users" and path_parts[2] == "settings":
                user_id = path_parts[1]
                stmt = select(UserSetting).where(UserSetting.user_id == user_id, UserSetting.category == doc_id)
                setting = session.scalar(stmt)
                if not setting:
                    return SqlSnapshot(doc_id, None, exists=False)
                return SqlSnapshot(doc_id, setting.settings or {})

        return SqlSnapshot(doc_id, None, exists=False)

    def _set_doc(self, path_parts: list[str], doc_id: str, data: dict[str, Any], merge: bool = False) -> None:
        data = self._clean_data(data)
        with Session(self._sync_engine) as session:
            # users/
            if len(path_parts) == 1 and path_parts[0] == "users":
                u = session.get(User, doc_id)
                if not u:
                    u = User(
                        id=doc_id,
                        email=data.get("email", ""),
                        name=data.get("name"),
                        display_name=data.get("display_name"),
                        avatar_url=data.get("avatar_url") or data.get("picture"),
                        password_hash=data.get("password_hash"),
                        password_salt=data.get("password_salt"),
                        google_auth=data.get("google_auth"),
                        combined_accounts=data.get("combined_accounts") or [],
                    )
                    session.add(u)
                else:
                    for k, val in data.items():
                        if hasattr(u, k):
                            setattr(u, k, val)
                session.commit()
                return

            # calls/
            if len(path_parts) == 1 and path_parts[0] == "calls":
                c = session.get(Call, doc_id)
                caller = data.get("caller") or {}
                callee = data.get("callee") or {}
                if not c:
                    c = Call(
                        id=doc_id,
                        caller_id=caller.get("uid") or data.get("caller_id", ""),
                        receiver_id=callee.get("uid") or data.get("receiver_id", ""),
                        status=data.get("status", "ringing"),
                        call_type=data.get("mode") or data.get("call_type", "voice"),
                    )
                    session.add(c)
                else:
                    if "status" in data:
                        c.status = data["status"]
                session.commit()
                return

            # users/{user_id}/todos
            if len(path_parts) == 3 and path_parts[0] == "users" and path_parts[2] == "todos":
                user_id = path_parts[1]
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
                            setattr(t, k, val)
                session.commit()
                return

            # users/{user_id}/jobs
            if len(path_parts) == 3 and path_parts[0] == "users" and path_parts[2] == "jobs":
                user_id = path_parts[1]
                j = session.get(Job, doc_id)
                if not j:
                    j = Job(
                        id=doc_id,
                        user_id=user_id,
                        company=data.get("company", ""),
                        role=data.get("role", ""),
                        status=data.get("status", "Applied"),
                        location=data.get("location"),
                        work_type=data.get("work_type"),
                        salary=data.get("salary"),
                        applied_date=data.get("applied_date"),
                        resume_id=data.get("resume_id"),
                        job_url=data.get("job_url"),
                        notes=data.get("notes"),
                    )
                    session.add(j)
                else:
                    for k, val in data.items():
                        if hasattr(j, k):
                            setattr(j, k, val)
                session.commit()
                return

            # users/{user_id}/projects
            if len(path_parts) == 3 and path_parts[0] == "users" and path_parts[2] == "projects":
                user_id = path_parts[1]
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
                            setattr(p, k, val)
                session.commit()
                return

            # users/{user_id}/hackathons
            if len(path_parts) == 3 and path_parts[0] == "users" and path_parts[2] == "hackathons":
                user_id = path_parts[1]
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
                            setattr(h, k, val)
                session.commit()
                return

            # users/{user_id}/documents
            if len(path_parts) == 3 and path_parts[0] == "users" and path_parts[2] == "documents":
                user_id = path_parts[1]
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
                            setattr(d, k, val)
                session.commit()
                return

            # users/{user_id}/contacts
            if len(path_parts) == 3 and path_parts[0] == "users" and path_parts[2] == "contacts":
                user_id = path_parts[1]
                c = session.get(Contact, doc_id)
                if not c:
                    c = Contact(
                        id=doc_id,
                        user_id=user_id,
                        name=data.get("name", ""),
                        email=data.get("email"),
                        phone=data.get("phone"),
                        company=data.get("company"),
                        role=data.get("role"),
                        notes=data.get("notes"),
                    )
                    session.add(c)
                else:
                    for k, val in data.items():
                        if hasattr(c, k):
                            setattr(c, k, val)
                session.commit()
                return

            # users/{user_id}/notifications
            if len(path_parts) == 3 and path_parts[0] == "users" and path_parts[2] == "notifications":
                user_id = path_parts[1]
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
                            setattr(n, k, val)
                session.commit()
                return

            # users/{user_id}/eve_sessions
            if len(path_parts) == 3 and path_parts[0] == "users" and path_parts[2] == "eve_sessions":
                user_id = path_parts[1]
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
                            setattr(s, k, val)
                session.commit()
                return

            # users/{user_id}/eve_memories
            if len(path_parts) == 3 and path_parts[0] == "users" and path_parts[2] == "eve_memories":
                user_id = path_parts[1]
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
                            setattr(m, k, val)
                session.commit()
                return

            # users/{user_id}/settings/{category}
            if len(path_parts) == 3 and path_parts[0] == "users" and path_parts[2] == "settings":
                user_id = path_parts[1]
                stmt = select(UserSetting).where(UserSetting.user_id == user_id, UserSetting.category == doc_id)
                setting = session.scalar(stmt)
                if not setting:
                    setting = UserSetting(user_id=user_id, category=doc_id, settings=data)
                    session.add(setting)
                else:
                    setting.settings = data
                session.commit()
                return

    def _update_doc(self, path_parts: list[str], doc_id: str, updates: dict[str, Any]) -> None:
        self._set_doc(path_parts, doc_id, updates, merge=True)

    def _delete_doc(self, path_parts: list[str], doc_id: str) -> None:
        with Session(self._sync_engine) as session:
            if len(path_parts) == 1 and path_parts[0] == "users":
                u = session.get(User, doc_id)
                if u:
                    session.delete(u)
            elif len(path_parts) == 1 and path_parts[0] == "calls":
                c = session.get(Call, doc_id)
                if c:
                    session.delete(c)
            elif len(path_parts) == 3 and path_parts[0] == "users" and path_parts[2] == "todos":
                t = session.get(Todo, doc_id)
                if t:
                    session.delete(t)
            elif len(path_parts) == 3 and path_parts[0] == "users" and path_parts[2] == "jobs":
                j = session.get(Job, doc_id)
                if j:
                    session.delete(j)
            elif len(path_parts) == 3 and path_parts[0] == "users" and path_parts[2] == "projects":
                p = session.get(Project, doc_id)
                if p:
                    session.delete(p)
            elif len(path_parts) == 3 and path_parts[0] == "users" and path_parts[2] == "hackathons":
                h = session.get(Hackathon, doc_id)
                if h:
                    session.delete(h)
            elif len(path_parts) == 3 and path_parts[0] == "users" and path_parts[2] == "documents":
                d = session.get(Document, doc_id)
                if d:
                    session.delete(d)
            elif len(path_parts) == 3 and path_parts[0] == "users" and path_parts[2] == "contacts":
                c = session.get(Contact, doc_id)
                if c:
                    session.delete(c)
            elif len(path_parts) == 3 and path_parts[0] == "users" and path_parts[2] == "notifications":
                n = session.get(Notification, doc_id)
                if n:
                    session.delete(n)
            elif len(path_parts) == 3 and path_parts[0] == "users" and path_parts[2] == "eve_sessions":
                s = session.get(EveSession, doc_id)
                if s:
                    session.delete(s)
            elif len(path_parts) == 3 and path_parts[0] == "users" and path_parts[2] == "eve_memories":
                m = session.get(EveMemory, doc_id)
                if m:
                    session.delete(m)
            session.commit()

    def _query_coll(self, path_parts: list[str], query: SqlQuery) -> list[SqlSnapshot]:
        with Session(self._sync_engine) as session:
            # users
            if len(path_parts) == 1 and path_parts[0] == "users":
                stmt = select(User)
                for field, op, val in query.filters:
                    if field == "email" and op in ("==", "="):
                        stmt = stmt.where(func.lower(User.email) == str(val).lower().strip())
                if query._limit:
                    stmt = stmt.limit(query._limit)
                users = session.scalars(stmt).all()
                return [
                    SqlSnapshot(u.id, {
                        "uid": u.id,
                        "email": u.email,
                        "name": u.name,
                        "display_name": u.display_name,
                        "avatar_url": u.avatar_url,
                        "password_hash": u.password_hash,
                        "password_salt": u.password_salt,
                        "google_auth": u.google_auth,
                        "combined_accounts": u.combined_accounts or [],
                    })
                    for u in users
                ]

            # users/{user_id}/todos
            if len(path_parts) == 3 and path_parts[0] == "users" and path_parts[2] == "todos":
                user_id = path_parts[1]
                stmt = select(Todo).where(Todo.user_id == user_id)
                if query._order_by == "created_at":
                    stmt = stmt.order_by(Todo.created_at.desc() if query._direction == "DESC" else Todo.created_at.asc())
                if query._limit:
                    stmt = stmt.limit(query._limit)
                todos = session.scalars(stmt).all()
                return [
                    SqlSnapshot(t.id, {
                        "id": t.id,
                        "title": t.title,
                        "completed": t.completed,
                        "due_date": t.due_date,
                        "priority": t.priority,
                        "deleted": t.deleted,
                        "created_at": t.created_at.isoformat() if t.created_at else "",
                        "updated_at": t.updated_at.isoformat() if t.updated_at else "",
                    })
                    for t in todos
                ]

            # users/{user_id}/jobs
            if len(path_parts) == 3 and path_parts[0] == "users" and path_parts[2] == "jobs":
                user_id = path_parts[1]
                stmt = select(Job).where(Job.user_id == user_id)
                if query._order_by == "created_at":
                    stmt = stmt.order_by(Job.created_at.desc() if query._direction == "DESC" else Job.created_at.asc())
                if query._limit:
                    stmt = stmt.limit(query._limit)
                jobs = session.scalars(stmt).all()
                return [
                    SqlSnapshot(j.id, {
                        "id": j.id,
                        "company": j.company,
                        "role": j.role,
                        "status": j.status,
                        "location": j.location,
                        "work_type": j.work_type,
                        "salary": j.salary,
                        "applied_date": j.applied_date,
                        "resume_id": j.resume_id,
                        "job_url": j.job_url,
                        "notes": j.notes,
                        "deleted": j.deleted,
                        "created_at": j.created_at.isoformat() if j.created_at else "",
                        "updated_at": j.updated_at.isoformat() if j.updated_at else "",
                    })
                    for j in jobs
                ]

            # users/{user_id}/projects
            if len(path_parts) == 3 and path_parts[0] == "users" and path_parts[2] == "projects":
                user_id = path_parts[1]
                stmt = select(Project).where(Project.user_id == user_id)
                if query._order_by == "created_at":
                    stmt = stmt.order_by(Project.created_at.desc() if query._direction == "DESC" else Project.created_at.asc())
                if query._limit:
                    stmt = stmt.limit(query._limit)
                projects = session.scalars(stmt).all()
                return [
                    SqlSnapshot(p.id, {
                        "id": p.id,
                        "name": p.name,
                        "description": p.description,
                        "status": p.status,
                        "progress": p.progress,
                        "members": p.members,
                        "technologies": p.technologies or [],
                        "lifecycle_phase": p.lifecycle_phase,
                        "deleted": p.deleted,
                        "created_at": p.created_at.isoformat() if p.created_at else "",
                        "updated_at": p.updated_at.isoformat() if p.updated_at else "",
                    })
                    for p in projects
                ]

            # users/{user_id}/hackathons
            if len(path_parts) == 3 and path_parts[0] == "users" and path_parts[2] == "hackathons":
                user_id = path_parts[1]
                stmt = select(Hackathon).where(Hackathon.user_id == user_id)
                if query._order_by == "created_at":
                    stmt = stmt.order_by(Hackathon.created_at.desc() if query._direction == "DESC" else Hackathon.created_at.asc())
                if query._limit:
                    stmt = stmt.limit(query._limit)
                hackathons = session.scalars(stmt).all()
                return [
                    SqlSnapshot(h.id, {
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
                        "created_at": h.created_at.isoformat() if h.created_at else "",
                        "updated_at": h.updated_at.isoformat() if h.updated_at else "",
                    })
                    for h in hackathons
                ]

            # users/{user_id}/documents
            if len(path_parts) == 3 and path_parts[0] == "users" and path_parts[2] == "documents":
                user_id = path_parts[1]
                stmt = select(Document).where(Document.user_id == user_id)
                if query._order_by in ("modified_at", "updated_at"):
                    stmt = stmt.order_by(Document.updated_at.desc() if query._direction == "DESC" else Document.updated_at.asc())
                if query._limit:
                    stmt = stmt.limit(query._limit)
                documents = session.scalars(stmt).all()
                return [
                    SqlSnapshot(d.id, {
                        "id": d.id,
                        "title": d.title,
                        "content": d.content,
                        "folder": d.folder,
                        "tags": d.tags or [],
                        "deleted": d.deleted,
                        "created_at": d.created_at.isoformat() if d.created_at else "",
                        "updated_at": d.updated_at.isoformat() if d.updated_at else "",
                        "modified_at": d.updated_at.isoformat() if d.updated_at else "",
                    })
                    for d in documents
                ]

            # users/{user_id}/contacts
            if len(path_parts) == 3 and path_parts[0] == "users" and path_parts[2] == "contacts":
                user_id = path_parts[1]
                stmt = select(Contact).where(Contact.user_id == user_id)
                if query._order_by == "name":
                    stmt = stmt.order_by(Contact.name.desc() if query._direction == "DESC" else Contact.name.asc())
                if query._limit:
                    stmt = stmt.limit(query._limit)
                contacts = session.scalars(stmt).all()
                return [
                    SqlSnapshot(c.id, {
                        "id": c.id,
                        "name": c.name,
                        "email": c.email,
                        "phone": c.phone,
                        "company": c.company,
                        "role": c.role,
                        "notes": c.notes,
                        "deleted": c.deleted,
                        "created_at": c.created_at.isoformat() if c.created_at else "",
                        "updated_at": c.updated_at.isoformat() if c.updated_at else "",
                    })
                    for c in contacts
                ]

            # users/{user_id}/notifications
            if len(path_parts) == 3 and path_parts[0] == "users" and path_parts[2] == "notifications":
                user_id = path_parts[1]
                stmt = select(Notification).where(Notification.user_id == user_id)
                for field, op, val in query.filters:
                    if field == "unread":
                        stmt = stmt.where(Notification.read == (not bool(val)))
                if query._order_by == "created_at":
                    stmt = stmt.order_by(Notification.created_at.desc() if query._direction == "DESC" else Notification.created_at.asc())
                if query._limit:
                    stmt = stmt.limit(query._limit)
                notifications = session.scalars(stmt).all()
                return [
                    SqlSnapshot(n.id, {
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
                    })
                    for n in notifications
                ]

            # users/{user_id}/eve_sessions
            if len(path_parts) == 3 and path_parts[0] == "users" and path_parts[2] == "eve_sessions":
                user_id = path_parts[1]
                stmt = select(EveSession).where(EveSession.user_id == user_id)
                if query._order_by in ("updated_at", "created_at"):
                    stmt = stmt.order_by(EveSession.updated_at.desc() if query._direction == "DESC" else EveSession.updated_at.asc())
                if query._limit:
                    stmt = stmt.limit(query._limit)
                sessions = session.scalars(stmt).all()
                return [
                    SqlSnapshot(s.id, {
                        "id": s.id,
                        "title": s.title,
                        "messages": s.messages or [],
                        "created_at": s.created_at.isoformat() if s.created_at else "",
                        "updated_at": s.updated_at.isoformat() if s.updated_at else "",
                    })
                    for s in sessions
                ]

            # users/{user_id}/eve_memories
            if len(path_parts) == 3 and path_parts[0] == "users" and path_parts[2] == "eve_memories":
                user_id = path_parts[1]
                stmt = select(EveMemory).where(EveMemory.user_id == user_id)
                if query._order_by == "created_at":
                    stmt = stmt.order_by(EveMemory.created_at.desc() if query._direction == "DESC" else EveMemory.created_at.asc())
                if query._limit:
                    stmt = stmt.limit(query._limit)
                memories = session.scalars(stmt).all()
                return [
                    SqlSnapshot(m.id, {
                        "id": m.id,
                        "content": m.content,
                        "created_at": m.created_at.isoformat() if m.created_at else "",
                        "updated_at": m.updated_at.isoformat() if m.updated_at else "",
                    })
                    for m in memories
                ]

        return []


_sql_client_instance: SqlClient | None = None


def get_db_client() -> SqlClient:
    global _sql_client_instance
    if _sql_client_instance is None:
        _sql_client_instance = SqlClient()
    return _sql_client_instance


def get_firestore() -> SqlClient:
    """Alias for get_db_client for backward compatibility across existing routes."""
    return get_db_client()
