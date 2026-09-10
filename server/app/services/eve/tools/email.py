"""Eve email tool definitions — single responsibility: reading and sending email."""
from app.services.prompts import EMAIL_DESCRIPTIONS as D

EMAIL_TOOLS = [
    {
        "type": "function",
        "name": "send_email",
        "description": D["send_email"],
        "parameters": {
            "type": "object",
            "properties": {
                "to": {"type": "string", "minLength": 3, "description": D["send_email.to"]},
                "subject": {"type": "string", "description": D["send_email.subject"]},
                "body": {"type": "string", "minLength": 1, "description": D["send_email.body"]},
                "from_account": {"type": "string", "description": D["send_email.from_account"]},
            },
            "required": ["to", "subject", "body"],
            "additionalProperties": False,
        },
        "strict": False,
    },
    {
        "type": "function",
        "name": "list_emails",
        "description": D["list_emails"],
        "parameters": {
            "type": "object",
            "properties": {
                "max_results": {"type": "integer", "description": D["list_emails.max_results"]},
                "account": {"type": "string", "description": D["list_emails.account"]},
            },
            "required": [],
            "additionalProperties": False,
        },
        "strict": False,
    },
    {
        "type": "function",
        "name": "search_emails",
        "description": D["search_emails"],
        "parameters": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "minLength": 1, "description": D["search_emails.query"]},
                "max_results": {"type": "integer", "description": D["search_emails.max_results"]},
                "account": {"type": "string", "description": D["search_emails.account"]},
            },
            "required": ["query"],
            "additionalProperties": False,
        },
        "strict": False,
    },
]
