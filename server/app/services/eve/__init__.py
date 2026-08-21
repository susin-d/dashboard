"""Eve service package — facade re-exporting public API for backward compatibility.

Implementation is split into single-responsibility modules:
- constants, instructions, tools/*, workspace_records, workspace_insights, memories, dispatcher, chat, handlers/*
"""

from app.services.eve.chat import chat_with_eve
from app.services.eve.constants import (
    MAX_RECORDS_PER_READ,
    SUPPORTED_RESOURCES,
    WORKSPACE_PAGES,
    WRITABLE_RESOURCES,
)
from app.services.eve.dispatcher import _run_tool
from app.services.eve.instructions import EVE_INSTRUCTIONS
from app.services.eve.memories import (
    _build_instructions,
    _get_cached_memories,
    _set_cached_memories,
    invalidate_memories_cache,
)
from app.services.ai_models import (
    AIServiceError,
    PROVIDER_CLIENTS,
    any_provider_available,
    run_tool_loop,
)

from app.services.eve.tools import EVE_TOOLS
from app.services.eve.workspace_insights import _deadline_entries, _parse_date, _workspace_insight
from app.services.eve.workspace_records import (
    _all_records,
    _bulk_update_records,
    _clean_record_id,
    _create_record,
    _explain_record,
    _generate_text_artifact,
    _list_records,
    _record_text,
    _search_records,
    _update_record,
    delete_workspace_record,
    restore_workspace_record,
)

__all__ = [
    "AIServiceError",
    "EVE_INSTRUCTIONS",
    "EVE_TOOLS",
    "MAX_RECORDS_PER_READ",
    "PROVIDER_CLIENTS",
    "SUPPORTED_RESOURCES",
    "WRITABLE_RESOURCES",
    "WORKSPACE_PAGES",
    "_all_records",
    "_build_instructions",
    "_bulk_update_records",
    "_clean_record_id",
    "_create_record",
    "_deadline_entries",
    "_explain_record",
    "_generate_text_artifact",
    "_get_cached_memories",
    "_list_records",
    "_parse_date",
    "_record_text",
    "_run_tool",
    "_search_records",
    "_set_cached_memories",
    "_update_record",
    "_workspace_insight",
    "any_provider_available",
    "chat_with_eve",
    "delete_workspace_record",
    "invalidate_memories_cache",
    "restore_workspace_record",
    "run_tool_loop",
]
