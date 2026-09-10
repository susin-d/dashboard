"""Eve workspace tool definitions — single responsibility: workspace domain."""

from app.services.eve.constants import SUPPORTED_RESOURCES, WRITABLE_RESOURCES
from app.services.prompts import WORKSPACE_DESCRIPTIONS as D

WORKSPACE_TOOLS = [
    {
        "type": "function",
        "name": "list_workspace_records",
        "description": D["list_workspace_records"],
        "parameters": {
            "type": "object",
            "properties": {"resource": {"type": "string", "enum": list(SUPPORTED_RESOURCES)}},
            "required": ["resource"],
            "additionalProperties": False,
        },
        "strict": True,
    },
    {
        "type": "function",
        "name": "create_workspace_record",
        "description": D["create_workspace_record"],
        "parameters": {
            "type": "object",
            "properties": {
                "resource": {"type": "string", "enum": list(WRITABLE_RESOURCES)},
                "data": {"type": "object", "additionalProperties": True},
            },
            "required": ["resource", "data"],
            "additionalProperties": False,
        },
        "strict": False,
    },
    {
        "type": "function",
        "name": "update_workspace_record",
        "description": D["update_workspace_record"],
        "parameters": {
            "type": "object",
            "properties": {
                "resource": {"type": "string", "enum": list(SUPPORTED_RESOURCES)},
                "record_id": {"type": "string", "minLength": 1},
                "changes": {"type": "object", "additionalProperties": True},
            },
            "required": ["resource", "record_id", "changes"],
            "additionalProperties": False,
        },
        "strict": False,
    },
    {
        "type": "function",
        "name": "delete_workspace_record",
        "description": D["delete_workspace_record"],
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
        "name": "restore_workspace_record",
        "description": D["restore_workspace_record"],
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
        "name": "bulk_update_records",
        "description": D["bulk_update_records"],
        "parameters": {
            "type": "object",
            "properties": {
                "resource": {"type": "string", "enum": ["todos", "projects", "jobs", "hackathons", "notifications"]},
                "updates": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "record_id": {"type": "string", "minLength": 1},
                            "changes": {"type": "object", "additionalProperties": True},
                        },
                        "required": ["record_id", "changes"],
                        "additionalProperties": False,
                    },
                    "minItems": 1,
                    "maxItems": 20,
                },
            },
            "required": ["resource", "updates"],
            "additionalProperties": False,
        },
        "strict": False,
    },
]
