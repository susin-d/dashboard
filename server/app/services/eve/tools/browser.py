"""Eve browser-control tool definitions — single responsibility: interactive web automation."""
from app.services.prompts import BROWSER_DESCRIPTIONS as D

BROWSER_TOOLS = [
    {
        "type": "function",
        "name": "browser_navigate",
        "description": D["browser_navigate"],
        "parameters": {
            "type": "object",
            "properties": {
                "url": {"type": "string", "minLength": 1, "description": D["browser_navigate.url"]},
            },
            "required": ["url"],
            "additionalProperties": False,
        },
        "strict": False,
    },
    {
        "type": "function",
        "name": "browser_click",
        "description": D["browser_click"],
        "parameters": {
            "type": "object",
            "properties": {
                "selector": {"type": "string", "minLength": 1, "description": D["browser_click.selector"]},
            },
            "required": ["selector"],
            "additionalProperties": False,
        },
        "strict": False,
    },
    {
        "type": "function",
        "name": "browser_type",
        "description": D["browser_type"],
        "parameters": {
            "type": "object",
            "properties": {
                "selector": {"type": "string", "minLength": 1, "description": D["browser_type.selector"]},
                "text": {"type": "string", "description": D["browser_type.text"]},
                "submit": {"type": "boolean", "description": D["browser_type.submit"]},
            },
            "required": ["selector", "text"],
            "additionalProperties": False,
        },
        "strict": False,
    },
    {
        "type": "function",
        "name": "browser_extract_text",
        "description": D["browser_extract_text"],
        "parameters": {
            "type": "object",
            "properties": {
                "selector": {"type": "string", "description": D["browser_extract_text.selector"]},
            },
            "required": [],
            "additionalProperties": False,
        },
        "strict": False,
    },
    {
        "type": "function",
        "name": "browser_screenshot",
        "description": D["browser_screenshot"],
        "parameters": {
            "type": "object",
            "properties": {
                "full_page": {"type": "boolean", "description": D["browser_screenshot.full_page"]},
            },
            "required": [],
            "additionalProperties": False,
        },
        "strict": False,
    },
]
