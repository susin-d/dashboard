"""Eve HTTP tool definitions — single responsibility: arbitrary API requests."""
from app.services.prompts import HTTP_DESCRIPTIONS as D

HTTP_TOOLS = [
    {
        "type": "function",
        "name": "http_request",
        "description": D["http_request"],
        "parameters": {
            "type": "object",
            "properties": {
                "method": {"type": "string", "enum": ["GET", "POST", "PUT", "PATCH", "DELETE"], "description": D["http_request.method"]},
                "url": {"type": "string", "minLength": 1, "description": D["http_request.url"]},
                "body": {"type": "object", "description": D["http_request.body"]},
                "headers": {"type": "object", "description": D["http_request.headers"]},
            },
            "required": ["url"],
            "additionalProperties": False,
        },
        "strict": False,
    },
]
