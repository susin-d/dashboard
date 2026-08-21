"""Eve chat orchestrator — single responsibility: LLM tool loop and session management."""

import logging
from typing import Any

from fastapi import HTTPException, status
from google.cloud.firestore_v1 import Client

from app.repositories import eve_sessions
from app.services.ai_models import AIServiceError, PROVIDER_CLIENTS, any_provider_available, resolve_ai_config, run_tool_loop
from app.services.eve.dispatcher import _run_tool
from app.services.eve.instructions import EVE_INSTRUCTIONS
from app.services.eve.memories import _build_instructions, _get_cached_memories, _set_cached_memories
from app.services.eve.tools import EVE_TOOLS

logger = logging.getLogger(__name__)

def chat_with_eve(
    database: Client,
    user: dict,
    messages: list[dict[str, str]],
    session_id: str | None = None,
) -> tuple[str, list[str], list[dict[str, Any]]]:
    user_id = user.get("uid")
    if not any_provider_available():
        logger.error(f"[Eve Chat] Chat request rejected: No AI provider configured on server or in user settings for user {user_id}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Eve is not configured. Add an AI provider API key (OPENAI_API_KEY, ANTHROPIC_API_KEY, or GEMINI_API_KEY) on the server, or configure a provider key in Settings > AI Models.",
        )

    if session_id:
        try:
            eve_sessions.get_session(database, user_id, session_id)
        except ValueError as error:
            logger.warning(f"[Eve Chat] Session '{session_id}' not found for user {user_id}: {error}")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error

    # RAG: last user message as query for pgvector semantic recall (top 5)
    last_query = next((m["content"] for m in reversed(messages) if m.get("role") == "user"), None)
    instructions = _build_instructions(database, user_id, query=last_query)
    config = resolve_ai_config(database, user_id)
    client_class = PROVIDER_CLIENTS[config.provider]
    client = client_class(config.client_options)
    conversation: list[Any] = [{"role": message["role"], "content": message["content"]} for message in messages]

    def run_tool(name: str, arguments: dict[str, Any]):
        return _run_tool(database, user_id, name, arguments)

    try:
        message, changed_resources, actions = run_tool_loop(
            client,
            config,
            instructions,
            conversation,
            EVE_TOOLS,
            run_tool,
        )
    except AIServiceError as error:
        logger.error(
            f"[Eve Chat] AI service error with provider='{config.provider}', model='{config.model}' for user {user_id}: {error}",
            exc_info=True,
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Eve AI service error ({config.provider}/{config.model}): {error}",
        ) from error
    except Exception as error:
        logger.error(
            f"[Eve Chat] Unexpected execution error with provider='{config.provider}', model='{config.model}' for user {user_id}: {type(error).__name__}: {error}",
            exc_info=True,
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Eve chat error ({config.provider}/{config.model}): {type(error).__name__}: {error}",
        ) from error

    if session_id:
        eve_sessions.save_messages(
            database,
            user["uid"],
            session_id,
            [
                {"role": message["role"], "content": message["content"]}
                for message in messages
            ]
            + [{"role": "assistant", "content": message}],
        )
    return message, changed_resources, actions
