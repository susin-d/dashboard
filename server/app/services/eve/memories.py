"""Eve memory helpers — single responsibility: persistent memory cache and instructions builder."""

from google.cloud.firestore_v1 import Client

from app.repositories.eve import list_memories
from app.services.eve.instructions import EVE_INSTRUCTIONS

_memories_cache: dict[str, tuple[float, list[dict]]] = {}
_MEM_TTL = 60  # seconds

def _get_cached_memories(database: Client, user_id: str) -> list[dict] | None:
    import time
    entry = _memories_cache.get(user_id)
    if entry and entry[0] > time.monotonic():
        return entry[1]
    return None

def _set_cached_memories(user_id: str, memories: list[dict]) -> None:
    import time
    _memories_cache[user_id] = (time.monotonic() + _MEM_TTL, memories)

def invalidate_memories_cache(user_id: str) -> None:
    _memories_cache.pop(user_id, None)


def _build_instructions(database: Client, user_id: str) -> str:
    cached = _get_cached_memories(database, user_id)
    if cached is not None:
        memories = cached
    else:
        memories = list_memories(database, user_id)
        _set_cached_memories(user_id, memories)
    if not memories:
        return EVE_INSTRUCTIONS
    memory_lines = "\n".join(f"- {memory['content']}" for memory in memories[:40])
    return (
        EVE_INSTRUCTIONS
        + "\n\nCurrent saved memories about this user:\n"
        + memory_lines
        + "\nReference these memories when relevant, and remember new important facts the user shares."
    )

