"""Memory handlers — single responsibility: persistent memory tools."""

from google.cloud.firestore_v1 import Client

from app.repositories.eve import add_memory, delete_memory, list_memories
from app.services.eve.memories import _get_cached_memories, _set_cached_memories, invalidate_memories_cache


def handle_remember_memory(database: Client, user_id: str, arguments: dict) -> tuple[dict, None, None]:
    memory = add_memory(database, user_id, arguments["content"])
    invalidate_memories_cache(user_id)
    return {"memory": memory, "message": "Memory saved."}, None, None


def handle_recall_memories(database: Client, user_id: str, arguments: dict) -> tuple[dict, None, None]:
    cached = _get_cached_memories(database, user_id)
    memories = cached if cached is not None else list_memories(database, user_id)
    if cached is None:
        _set_cached_memories(user_id, memories)
    query = (arguments.get("query") or "").strip().lower()
    if query:
        memories = [m for m in memories if query in m.get("content", "").lower()]
    return {"memories": memories, "total": len(memories)}, None, None


def handle_forget_memory(database: Client, user_id: str, arguments: dict) -> tuple[dict, None, None]:
    removed = delete_memory(database, user_id, arguments["memory_id"])
    if not removed:
        raise ValueError("Memory not found.")
    invalidate_memories_cache(user_id)
    return {"message": "Memory removed."}, None, None
