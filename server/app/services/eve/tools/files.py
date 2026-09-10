"""Eve files tool definitions — single responsibility: files domain."""
from app.services.prompts import FILES_DESCRIPTIONS as D

_WORKSPACE_ID_PARAM = {
    "type": "string",
    "minLength": 1,
    "description": D["workspace_id"],
}

FILES_TOOLS = [
    {
        "type": "function",
        "name": "read_workspace_file",
        "description": D["read_workspace_file"],
        "parameters": {
            "type": "object",
            "properties": {"path": {"type": "string", "minLength": 1}, "workspace_id": _WORKSPACE_ID_PARAM},
            "required": ["path", "workspace_id"],
            "additionalProperties": False,
        },
        "strict": True,
    },
    {
        "type": "function",
        "name": "write_workspace_file",
        "description": D["write_workspace_file"],
        "parameters": {
            "type": "object",
            "properties": {
                "path": {"type": "string", "minLength": 1},
                "content": {"type": "string"},
                "workspace_id": _WORKSPACE_ID_PARAM,
            },
            "required": ["path", "content", "workspace_id"],
            "additionalProperties": False,
        },
        "strict": True,
    },
    {
        "type": "function",
        "name": "list_workspace_files",
        "description": D["list_workspace_files"],
        "parameters": {
            "type": "object",
            "properties": {"directory": {"type": "string"}, "workspace_id": _WORKSPACE_ID_PARAM},
            "required": ["workspace_id"],
            "additionalProperties": False,
        },
        "strict": False,
    },
    {
        "type": "function",
        "name": "search_workspace_files",
        "description": D["search_workspace_files"],
        "parameters": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "minLength": 1},
                "file_glob": {"type": "string"},
                "workspace_id": _WORKSPACE_ID_PARAM,
            },
            "required": ["query", "workspace_id"],
            "additionalProperties": False,
        },
        "strict": False,
    },
    {
        "type": "function",
        "name": "run_workspace_command",
        "description": D["run_workspace_command"],
        "parameters": {
            "type": "object",
            "properties": {"command": {"type": "string", "minLength": 1}, "workspace_id": _WORKSPACE_ID_PARAM},
            "required": ["command", "workspace_id"],
            "additionalProperties": False,
        },
        "strict": True,
    },
    {
        "type": "function",
        "name": "open_workspace_browser",
        "description": (
            D["open_workspace_browser"]
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "url": {
                    "type": "string",
                    "minLength": 1,
                    "description": D["open_workspace_browser.url"],
                },
            },
            "required": ["url"],
            "additionalProperties": False,
        },
        "strict": True,
    },
]
