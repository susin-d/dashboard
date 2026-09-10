"""Eve Studio tool definitions — single responsibility: builder domain."""
from app.services.prompts import STUDIO_DESCRIPTIONS as D

STUDIO_TOOLS = [
    {
        "type": "function",
        "name": "create_studio_project",
        "description": (
            D["create_studio_project"]
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "name": {"type": "string", "minLength": 1},
                "description": {"type": "string"},
                "template_id": {
                    "type": "string",
                    "description": (
                        D["create_studio_project.template_id"]
                    ),
                },
                "stack": {"type": "string"},
                "db_preference": {
                    "type": "string",
                    "enum": ["sqlite", "postgres", "supabase", "mongodb", "none"],
                },
                "auth_enabled": {"type": "boolean"},
            },
            "required": ["name"],
            "additionalProperties": False,
        },
        "strict": False,
    },
    {
        "type": "function",
        "name": "list_studio_projects",
        "description": D["list_studio_projects"],
        "parameters": {
            "type": "object",
            "properties": {},
            "required": [],
            "additionalProperties": False,
        },
        "strict": True,
    },
    {
        "type": "function",
        "name": "get_studio_project",
        "description": (
            D["get_studio_project"]
        ),
        "parameters": {
            "type": "object",
            "properties": {"workspace_id": {"type": "string", "minLength": 1}},
            "required": ["workspace_id"],
            "additionalProperties": False,
        },
        "strict": True,
    },
    {
        "type": "function",
        "name": "submit_build_plan",
        "description": (
            D["submit_build_plan"]
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "workspace_id": {"type": "string", "minLength": 1},
                "title": {"type": "string", "minLength": 1},
                "summary": {"type": "string"},
                "stack": {"type": "string"},
                "db_preference": {
                    "type": "string",
                    "enum": ["sqlite", "postgres", "supabase", "mongodb", "none"],
                },
                "needs_auth": {"type": "boolean"},
                "files": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "path": {"type": "string", "minLength": 1},
                            "purpose": {"type": "string"},
                        },
                        "required": ["path"],
                        "additionalProperties": False,
                    },
                },
            },
            "required": ["workspace_id", "title"],
            "additionalProperties": False,
        },
        "strict": False,
    },
    {
        "type": "function",
        "name": "write_studio_files",
        "description": (
            D["write_studio_files"]
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "workspace_id": {"type": "string", "minLength": 1},
                "files": {
                    "type": "array",
                    "minItems": 1,
                    "maxItems": 50,
                    "items": {
                        "type": "object",
                        "properties": {
                            "path": {"type": "string", "minLength": 1},
                            "content": {"type": "string"},
                        },
                        "required": ["path", "content"],
                        "additionalProperties": False,
                    },
                },
            },
            "required": ["workspace_id", "files"],
            "additionalProperties": False,
        },
        "strict": True,
    },
    {
        "type": "function",
        "name": "run_studio_command",
        "description": (
            D["run_studio_command"]
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "workspace_id": {"type": "string", "minLength": 1},
                "command": {"type": "string", "minLength": 1},
                "timeout_seconds": {"type": "integer", "minimum": 5, "maximum": 600},
            },
            "required": ["workspace_id", "command"],
            "additionalProperties": False,
        },
        "strict": False,
    },
    {
        "type": "function",
        "name": "publish_studio_template",
        "description": (
            D["publish_studio_template"]
        ),
        "parameters": {
            "type": "object",
            "properties": {"workspace_id": {"type": "string", "minLength": 1}},
            "required": ["workspace_id"],
            "additionalProperties": False,
        },
        "strict": True,
    },
]
