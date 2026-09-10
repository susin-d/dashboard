"""Eve memory tool definitions — single responsibility: memory domain."""
from app.services.prompts import MEMORY_DESCRIPTIONS as D

MEMORY_TOOLS = [
    {
        "type": "function",
        "name": "remember_memory",
        "description": D["remember_memory"],
        "parameters": {
            "type": "object",
            "properties": {"content": {"type": "string", "minLength": 1, "maxLength": 500}},
            "required": ["content"],
            "additionalProperties": False,
        },
        "strict": True,
    },
    {
        "type": "function",
        "name": "recall_memories",
        "description": D["recall_memories"],
        "parameters": {
            "type": "object",
            "properties": {"query": {"type": "string"}},
            "required": [],
            "additionalProperties": False,
        },
        "strict": False,
    },
    {
        "type": "function",
        "name": "forget_memory",
        "description": D["forget_memory"],
        "parameters": {
            "type": "object",
            "properties": {"memory_id": {"type": "string", "minLength": 1}},
            "required": ["memory_id"],
            "additionalProperties": False,
        },
        "strict": True,
    },
]
