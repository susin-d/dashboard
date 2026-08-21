"""Eve dispatcher — single responsibility: routing tool calls to domain handlers."""

from typing import Any

from google.cloud.firestore_v1 import Client

from app.services.eve.handlers.call import handle_trigger_eve_call
from app.services.eve.handlers.memory import (
    handle_forget_memory,
    handle_recall_memories,
    handle_remember_memory,
)
from app.services.eve.handlers.navigation import (
    handle_navigate_page,
    handle_open_record,
    handle_open_studio_project,
    handle_refresh_workspace_data,
)
from app.services.eve.handlers.schedule import (
    handle_create_eve_schedule,
    handle_delete_eve_schedule,
    handle_list_eve_schedules,
)
from app.services.eve.handlers.studio import (
    handle_create_studio_project,
    handle_get_studio_project,
    handle_list_studio_projects,
    handle_publish_studio_template,
    handle_run_studio_command,
    handle_submit_build_plan,
    handle_write_studio_files,
)
from app.services.eve.handlers.web import (
    handle_browse_web,
    handle_fetch_web_page,
    handle_search_web,
)
from app.services.eve.handlers.whatsapp import (
    handle_list_whatsapp_chats,
    handle_read_whatsapp_messages,
    handle_send_whatsapp_message,
    handle_summarize_whatsapp_chat,
)
from app.services.eve.handlers.workspace import (
    handle_bulk_update_records,
    handle_create_workspace_record,
    handle_delete_workspace_record,
    handle_explain_record,
    handle_generate_text_artifact,
    handle_list_workspace_records,
    handle_restore_workspace_record,
    handle_search_workspace,
    handle_update_workspace_record,
    handle_workspace_insight,
)
from app.services.eve.handlers.workspace_files import (
    handle_list_workspace_files,
    handle_read_workspace_file,
    handle_run_workspace_command,
    handle_search_workspace_files,
    handle_write_workspace_file,
)

# Registry maps tool name to its dedicated handler — one function per tool avoids mode-flag branching.
_TOOL_HANDLERS: dict[str, Any] = {
    "remember_memory": handle_remember_memory,
    "recall_memories": handle_recall_memories,
    "forget_memory": handle_forget_memory,
    "create_eve_schedule": handle_create_eve_schedule,
    "list_eve_schedules": handle_list_eve_schedules,
    "delete_eve_schedule": handle_delete_eve_schedule,
    "trigger_eve_call": handle_trigger_eve_call,
    "read_workspace_file": handle_read_workspace_file,
    "write_workspace_file": handle_write_workspace_file,
    "list_workspace_files": handle_list_workspace_files,
    "search_workspace_files": handle_search_workspace_files,
    "run_workspace_command": handle_run_workspace_command,
    "list_whatsapp_chats": handle_list_whatsapp_chats,
    "read_whatsapp_messages": handle_read_whatsapp_messages,
    "send_whatsapp_message": handle_send_whatsapp_message,
    "summarize_whatsapp_chat": handle_summarize_whatsapp_chat,
    "navigate_page": handle_navigate_page,
    "open_record": handle_open_record,
    "open_studio_project": handle_open_studio_project,
    "refresh_workspace_data": handle_refresh_workspace_data,
    "search_workspace": handle_search_workspace,
    "workspace_insight": handle_workspace_insight,
    "explain_record": handle_explain_record,
    "generate_text_artifact": handle_generate_text_artifact,
    "bulk_update_records": handle_bulk_update_records,
    "delete_workspace_record": handle_delete_workspace_record,
    "restore_workspace_record": handle_restore_workspace_record,
    "list_workspace_records": handle_list_workspace_records,
    "create_workspace_record": handle_create_workspace_record,
    "update_workspace_record": handle_update_workspace_record,
    "browse_web": handle_browse_web,
    "search_web": handle_search_web,
    "web_search": handle_search_web,
    "fetch_web_page": handle_fetch_web_page,
    "read_web_page": handle_fetch_web_page,
    "create_studio_project": handle_create_studio_project,
    "list_studio_projects": handle_list_studio_projects,
    "get_studio_project": handle_get_studio_project,
    "submit_build_plan": handle_submit_build_plan,
    "write_studio_files": handle_write_studio_files,
    "run_studio_command": handle_run_studio_command,
    "publish_studio_template": handle_publish_studio_template,
}


def _run_tool(
    database: Client, user_id: str, name: str, arguments: dict[str, Any]
) -> tuple[dict[str, Any], str | None, dict[str, Any] | None]:
    """Route a tool call to its single-responsibility handler."""
    handler = _TOOL_HANDLERS.get(name)
    if handler:
        return handler(database, user_id, arguments)
    raise ValueError("Unsupported Eve tool.")
