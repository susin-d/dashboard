"""Shared workspace repository helpers: collection access, date serialization, and pagination."""

from datetime import date
from typing import Any
import base64

from firebase_admin import firestore
from google.cloud.firestore_v1 import Client


def user_collection(database: Client, user_id: str, collection_name: str):
    return database.collection("users").document(user_id).collection(collection_name)


def serialize_dates(values: dict[str, Any]) -> dict[str, Any]:
    return {
        key: value.isoformat() if isinstance(value, date) else value
        for key, value in values.items()
    }


def encode_cursor(document_id: str) -> str:
    return base64.urlsafe_b64encode(document_id.encode()).decode()


def decode_cursor(cursor: str | None) -> str | None:
    if not cursor:
        return None
    try:
        return base64.urlsafe_b64decode(cursor.encode()).decode()
    except Exception as error:
        raise ValueError("Invalid pagination cursor.") from error


def paginate_collection(collection, order_field: str, cursor: str | None, limit: int):
    query = collection.order_by(order_field, direction=firestore.Query.DESCENDING)
    cursor_id = decode_cursor(cursor)
    if cursor_id:
        query = query.start_after(collection.document(cursor_id).get())
    raw_documents = list(query.limit(limit * 3 + 1).stream())
    documents = [d for d in raw_documents if not (d.to_dict() or {}).get("deleted")]
    has_more = len(documents) > limit
    documents = documents[:limit]
    next_cursor = encode_cursor(documents[-1].id) if has_more and documents else None
    return ([{"id": item.id, **(item.to_dict() or {})} for item in documents], next_cursor, has_more)
