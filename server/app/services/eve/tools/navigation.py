"""Eve navigation tool definitions — single responsibility: navigation domain."""

from app.services.eve.constants import WORKSPACE_PAGES
from app.services.prompts import NAVIGATION_DESCRIPTIONS as D

NAVIGATION_TOOLS = [
    {
        "type": "function",
        "name": "navigate_page",
        "description": D["navigate_page"],
        "parameters": {
            "type": "object",
            "properties": {"page": {"type": "string", "enum": list(WORKSPACE_PAGES)}},
            "required": ["page"],
            "additionalProperties": False,
        },
        "strict": True,
    },
    {
        "type": "function",
        "name": "open_record",
        "description": D["open_record"],
        "parameters": {
            "type": "object",
            "properties": {
                "resource": {"type": "string", "enum": ["projects", "documents"]},
                "record_id": {"type": "string", "minLength": 1},
            },
            "required": ["resource", "record_id"],
            "additionalProperties": False,
        },
        "strict": True,
    },
    {
        "type": "function",
        "name": "refresh_workspace_data",
        "description": D["refresh_workspace_data"],
        "parameters": {"type": "object", "properties": {}, "additionalProperties": False},
        "strict": True,
    },
]
