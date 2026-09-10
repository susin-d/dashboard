"""Eve web tool definitions — single responsibility: web domain."""
from app.services.prompts import WEB_DESCRIPTIONS as D

WEB_TOOLS = [
    {
        "type": "function",
        "name": "browse_web",
        "description": D["browse_web"],
        "parameters": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": D["browse_web.query"]},
                "url": {"type": "string", "description": D["browse_web.url"]},
                "num_results": {"type": "integer", "description": D["browse_web.num_results"]},
                "max_chars": {"type": "integer", "description": D["browse_web.max_chars"]},
            },
            "required": [],
            "additionalProperties": False,
        },
        "strict": False,
    },
    {
        "type": "function",
        "name": "search_web",
        "description": D["search_web"],
        "parameters": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "minLength": 1, "description": D["search_web.query"]},
                "num_results": {"type": "integer", "description": D["search_web.num_results"]},
            },
            "required": ["query"],
            "additionalProperties": False,
        },
        "strict": False,
    },
    {
        "type": "function",
        "name": "fetch_web_page",
        "description": D["fetch_web_page"],
        "parameters": {
            "type": "object",
            "properties": {
                "url": {"type": "string", "minLength": 1, "description": D["fetch_web_page.url"]},
                "max_chars": {"type": "integer", "description": D["fetch_web_page.max_chars"]},
            },
            "required": ["url"],
            "additionalProperties": False,
        },
        "strict": False,
    },
]
