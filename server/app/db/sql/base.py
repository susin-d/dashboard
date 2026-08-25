"""Generic SQL crud helpers — reusable for all user-scoped entities.

Centralizes the ~90% duplicated template:
  X_to_dict / get_X_doc / set_X_doc / delete_X_doc / query_Xs

Usage for new entities: define to_dict + Model, then use helpers below
or keep per-entity thin wrappers delegating to these.
"""

from typing import Any, Callable

from sqlalchemy import and_, or_, select
from sqlalchemy.orm import Session

from app.db.sql._shared import coerce_model_value
from app.db.sql.query import SqlQuery, SqlSnapshot


def generic_get_doc(
    session: Session,
    model_cls,
    user_id: str,
    doc_id: str,
    to_dict: Callable[[Any], dict[str, Any]],
) -> SqlSnapshot:
    obj = session.get(model_cls, doc_id)
    if not obj or getattr(obj, "user_id", None) != user_id:
        return SqlSnapshot(doc_id, None, exists=False)
    return SqlSnapshot(doc_id, to_dict(obj))


def generic_set_doc(
    session: Session,
    model_cls,
    user_id: str,
    doc_id: str,
    data: dict[str, Any],
    merge: bool,
    defaults: dict[str, Any] | None = None,
) -> None:
    obj = session.get(model_cls, doc_id)
    if not obj:
        payload = {"id": doc_id, "user_id": user_id}
        if defaults:
            payload.update(defaults)
        # only take fields that exist on model + provided data
        for k, v in data.items():
            if hasattr(model_cls, k):
                payload[k] = coerce_model_value(k, v)
        obj = model_cls(**payload)
        session.add(obj)
    else:
        for k, val in data.items():
            if hasattr(obj, k):
                setattr(obj, k, coerce_model_value(k, val))
    session.commit()


def generic_delete_doc(session: Session, model_cls, doc_id: str) -> None:
    obj = session.get(model_cls, doc_id)
    if obj:
        session.delete(obj)
        session.commit()


def generic_query(
    session: Session,
    model_cls,
    user_id: str,
    query: SqlQuery,
    to_dict: Callable[[Any], dict[str, Any]],
    *,
    filter_map: dict[str, Callable] | None = None,
    order_field: str = "created_at",
) -> list[SqlSnapshot]:
    stmt = select(model_cls).where(model_cls.user_id == user_id)  # type: ignore[attr-defined]
    has_deleted_filter = any(f[0] == "deleted" for f in query.filters)
    if not has_deleted_filter and hasattr(model_cls, "deleted"):
        stmt = stmt.where(model_cls.deleted == False)  # noqa: E712
    for field, op, val in query.filters:
        if field == "deleted" and op in ("==", "=") and hasattr(model_cls, "deleted"):
            stmt = stmt.where(model_cls.deleted == val) if val else stmt.where(model_cls.deleted == False)  # noqa: E712
        elif filter_map and field in filter_map:
            stmt = filter_map[field](stmt, val, op)
        elif hasattr(model_cls, field):
            col = getattr(model_cls, field)
            if op in ("==", "="):
                stmt = stmt.where(col == val)
            elif op == "array_contains" and hasattr(col, "contains"):
                stmt = stmt.where(col.contains(val))
    if query._start_after_doc_id:
        cursor = session.get(model_cls, query._start_after_doc_id)
        if cursor and getattr(cursor, order_field, None) is not None:
            cursor_val = getattr(cursor, order_field)
            if query._order_by == order_field and query._direction == "DESC":
                stmt = stmt.where(or_(getattr(model_cls, order_field) < cursor_val, and_(getattr(model_cls, order_field) == cursor_val, model_cls.id < cursor.id)))  # type: ignore
            elif query._order_by == order_field:
                stmt = stmt.where(or_(getattr(model_cls, order_field) > cursor_val, and_(getattr(model_cls, order_field) == cursor_val, model_cls.id > cursor.id)))  # type: ignore
    if query._order_by == order_field and hasattr(model_cls, order_field):
        col = getattr(model_cls, order_field)
        stmt = stmt.order_by(col.desc() if query._direction == "DESC" else col.asc())
        stmt = stmt.order_by(model_cls.id.desc() if query._direction == "DESC" else model_cls.id.asc())  # type: ignore
    elif query._order_by and hasattr(model_cls, query._order_by):
        col = getattr(model_cls, query._order_by)
        stmt = stmt.order_by(col.desc() if query._direction == "DESC" else col.asc())
    if query._limit:
        stmt = stmt.limit(query._limit)
    rows = session.scalars(stmt).all()
    return [SqlSnapshot(r.id, to_dict(r)) for r in rows]
