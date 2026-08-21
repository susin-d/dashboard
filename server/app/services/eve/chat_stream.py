"""Eve chat streaming orchestrator — single responsibility: SSE event generator
over the provider tool loop with session persistence."""

import logging
from collections.abc import Iterator
from typing import Any

from google.cloud.firestore_v1 import Client

from app.repositories import eve_sessions
from app.services.ai_models import (
    PROVIDER_CLIENTS,
    any_provider_available,
    resolve_ai_config,
    run_tool_loop_stream,
)
from app.services.eve.auto_memory import extract_and_save_memories
from app.services.eve.dispatcher import _run_tool
from app.services.eve.instructions import EVE_INSTRUCTIONS
from app.services.eve.memories import _build_instructions
from app.services.eve.tools import EVE_TOOLS

logger = logging.getLogger(__name__)


def stream_chat_with_eve(
    database: Client,
    user: dict,
    messages: list[dict[str, str]],
    session_id: str | None = None,
) -> Iterator[dict[str, Any]]:
    """Yield streaming events for an Eve chat turn.

    Event contract (JSON-serializable dicts):
    - {"type": "delta", "text": str}
    - {"type": "tool_start", "name": str} / {"type": "tool_end", "name": str}
    - {"type": "done", "message": str, "changed_resources": [...], "actions": [...], "session_id": str}
    - {"type": "error", "detail": str}

    The session is persisted only after a successful completion; when the
    request carries no session_id a new session is created and its id is
    returned inside the done event.
    """
    user_id = user.get("uid")
    if not any_provider_available():
        logger.error(f"[Eve Chat Stream] Chat request rejected: No AI provider configured on server or in user settings for user {user_id}")
        yield {
            "type": "error",
            "detail": "Eve is not configured. Add an AI provider API key (OPENAI_API_KEY, ANTHROPIC_API_KEY, or GEMINI_API_KEY) on the server, or configure a provider key in Settings > AI Models.",
        }
        return

    if session_id:
        try:
            eve_sessions.get_session(database, user_id, session_id)
        except ValueError as error:
            logger.warning(f"[Eve Chat Stream] Session '{session_id}' not found for user {user_id}: {error}")
            yield {"type": "error", "detail": str(error)}
            return

    # RAG: last user message as query for pgvector semantic recall (top 5)
    last_query = next((m["content"] for m in reversed(messages) if m.get("role") == "user"), None)
    instructions = _build_instructions(database, user_id, query=last_query)
    config = resolve_ai_config(database, user_id)
    client_class = PROVIDER_CLIENTS[config.provider]
    client = client_class(config.client_options)
    conversation: list[Any] = [{"role": message["role"], "content": message["content"]} for message in messages]

    def run_tool(name: str, arguments: dict[str, Any]):
        return _run_tool(database, user_id, name, arguments)

    done_event: dict[str, Any] | None = None
    try:
        for event in run_tool_loop_stream(client, config, instructions, conversation, EVE_TOOLS, run_tool):
            if event.get("type") == "done":
                done_event = dict(event)
            else:
                yield event
    except Exception as error:
        logger.error(
            f"[Eve Chat Stream] Stream failed with provider='{config.provider}', model='{config.model}' for user {user_id}: {type(error).__name__}: {error}",
            exc_info=True,
        )
        yield {
            "type": "error",
            "detail": f"Eve AI service error ({config.provider}/{config.model}): {error}",
        }
        return

    if done_event is None:
        return

    # Persist session AFTER success; auto-create when the request had no session.
    assistant_reply = done_event["message"]
    history = [
        {"role": message["role"], "content": message["content"]}
        for message in messages
    ] + [{"role": "assistant", "content": assistant_reply}]
    persisted_session_id = session_id
    try:
        if session_id:
            eve_sessions.save_messages(database, user_id, session_id, history)
        else:
            created = eve_sessions.create_session(database, user_id, history)
            persisted_session_id = created["id"]
    except Exception as persist_error:
        logger.error(f"[Eve Chat Stream] Session persistence failed for user {user_id}: {persist_error}", exc_info=True)

    # Auto-remember before the done event so extraction always runs (the route
    # consumes the generator fully, but this keeps it deterministic).
    extract_and_save_memories(database, user, messages, assistant_reply)

    done_event["session_id"] = persisted_session_id
    yield done_event
