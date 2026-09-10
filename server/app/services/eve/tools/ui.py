"""Eve UI tools — single responsibility: UI customization domain."""

from app.services.eve.constants import WORKSPACE_PAGES
from app.services.prompts import UI_DESCRIPTIONS as D

_WORKSPACE_PAGES_LIST = list(WORKSPACE_PAGES)

UI_TOOLS = [
    {
        "type": "function",
        "name": "get_ui_state",
        "description": D["get_ui_state"],
        "parameters": {
            "type": "object",
            "properties": {
                "page": {
                    "type": "string",
                    "description": f"Optional page to inspect. One of: {', '.join(_WORKSPACE_PAGES_LIST)} or custom:<slug>",
                }
            },
            "required": [],
            "additionalProperties": False,
        },
        "strict": False,
    },
    {
        "type": "function",
        "name": "update_ui_theme",
        "description": D["update_ui_theme"],
        "parameters": {
            "type": "object",
            "properties": {
                "tokens": {
                    "type": "object",
                    "description": D["update_ui_theme.tokens"],
                    "additionalProperties": {"type": "string"},
                },
                "page": {"type": "string", "description": D["update_ui_theme.page"]},
                "reason": {"type": "string", "description": D["update_ui_theme.reason"]},
            },
            "required": ["tokens"],
            "additionalProperties": False,
        },
        "strict": False,
    },
    {
        "type": "function",
        "name": "update_ui_styles",
        "description": D["update_ui_styles"],
        "parameters": {
            "type": "object",
            "properties": {
                "css": {"type": "string", "minLength": 1, "maxLength": 5000, "description": D["update_ui_styles.css"]},
                "page": {"type": "string", "description": D["update_ui_styles.page"]},
            },
            "required": ["css"],
            "additionalProperties": False,
        },
        "strict": False,
    },
    {
        "type": "function",
        "name": "manage_ui_visibility",
        "description": D["manage_ui_visibility"],
        "parameters": {
            "type": "object",
            "properties": {
                "target": {"type": "string", "minLength": 1, "description": D["manage_ui_visibility.target"]},
                "visible": {"type": "boolean", "description": D["manage_ui_visibility.visible"]},
                "page": {"type": "string", "description": D["manage_ui_visibility.page"]},
            },
            "required": ["target", "visible"],
            "additionalProperties": False,
        },
        "strict": False,
    },
    {
        "type": "function",
        "name": "reset_ui",
        "description": D["reset_ui"],
        "parameters": {
            "type": "object",
            "properties": {
                "page": {"type": "string", "description": D["reset_ui.page"]},
                "version": {"type": "integer", "minimum": 1, "description": D["reset_ui.version"]},
            },
            "required": [],
            "additionalProperties": False,
        },
        "strict": False,
    },
    {
        "type": "function",
        "name": "list_ui_history",
        "description": D["list_ui_history"],
        "parameters": {"type": "object", "properties": {}, "required": [], "additionalProperties": False},
        "strict": False,
    },
    {
        "type": "function",
        "name": "create_custom_page",
        "description": D["create_custom_page"],
        "parameters": {
            "type": "object",
            "properties": {
                "slug": {"type": "string", "pattern": "^[a-z0-9-]+$", "description": D["create_custom_page.slug"]},
                "title": {"type": "string", "minLength": 1, "maxLength": 80, "description": D["create_custom_page.title"]},
                "description": {"type": "string", "minLength": 1, "maxLength": 500, "description": D["create_custom_page.description"]},
                "code": {"type": "string", "description": D["create_custom_page.code"]},
            },
            "required": ["slug", "title", "description"],
            "additionalProperties": False,
        },
        "strict": False,
    },
]
