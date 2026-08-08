from datetime import datetime, timezone

from firebase_admin import firestore
from google.cloud.firestore_v1 import Client


def user_collection(database: Client, user_id: str, name: str):
    return database.collection("users").document(user_id).collection(name)


def list_memories(database: Client, user_id: str, limit: int = 100) -> list[dict]:
    query = (
        user_collection(database, user_id, "eve_memories")
        .order_by("created_at", direction=firestore.Query.DESCENDING)
        .limit(limit)
    )
    return [{"id": snapshot.id, **(snapshot.to_dict() or {})} for snapshot in query.stream()]


def add_memory(database: Client, user_id: str, content: str) -> dict:
    reference = user_collection(database, user_id, "eve_memories").document()
    now = datetime.now(timezone.utc).isoformat()
    reference.set(
        {
            "content": content,
            "created_at": firestore.SERVER_TIMESTAMP,
            "updated_at": firestore.SERVER_TIMESTAMP,
        },
    )
    return {"id": reference.id, "content": content, "created_at": now, "updated_at": now}


def delete_memory(database: Client, user_id: str, memory_id: str) -> bool:
    reference = user_collection(database, user_id, "eve_memories").document(memory_id)
    if not reference.get().exists:
        return False
    reference.delete()
    return True
