"""Eve search tool definitions — single responsibility: search domain."""

from app.services.eve.constants import SUPPORTED_RESOURCES
from app.services.prompts import SEARCH_DESCRIPTIONS as D

SEARCH_TOOLS = [
    {
        "type": "function",
        "name": "search_workspace",
        "description": D["search_workspace"],
        "parameters": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "minLength": 1},
                "resources": {
                    "type": "array",
                    "items": {"type": "string", "enum": list(SUPPORTED_RESOURCES)},
                },
            },
            "required": ["query"],
            "additionalProperties": False,
        },
        "strict": False,
    },
    {
        "type": "function",
        "name": "workspace_insight",
        "description": D["workspace_insight"],
        "parameters": {
            "type": "object",
            "properties": {
                "kind": {
                    "type": "string",
                    "enum": [
                        "summarize_dashboard",
                        "summarize_upcoming_deadlines",
                        "find_overdue_tasks",
                        "find_stale_projects",
                        "suggest_next_actions",
                        "export_workspace_summary",
                        "summarize_calendar_day",
                        "filter_calendar_events",
                    ],
                },
                "date": {"type": "string"},
                "query": {"type": "string"},
            },
            "required": ["kind"],
            "additionalProperties": False,
        },
        "strict": False,
    },
    {
        "type": "function",
        "name": "explain_record",
        "description": D["explain_record"],
        "parameters": {
            "type": "object",
            "properties": {
                "resource": {"type": "string", "enum": list(SUPPORTED_RESOURCES)},
                "record_id": {"type": "string", "minLength": 1},
            },
            "required": ["resource", "record_id"],
            "additionalProperties": False,
        },
        "strict": True,
    },
    {
        "type": "function",
        "name": "generate_text_artifact",
        "description": D["generate_text_artifact"],
        "parameters": {
            "type": "object",
            "properties": {
                "kind": {
                    "type": "string",
                    "enum": ["generate_project_plan", "generate_job_followup_note", "draft_email", "draft_chat_message", "generate_document_summary"],
                },
                "resource": {"type": "string", "enum": list(SUPPORTED_RESOURCES)},
                "record_id": {"type": "string"},
                "prompt": {"type": "string"},
            },
            "required": ["kind"],
            "additionalProperties": False,
        },
        "strict": False,
    },
]
