"""Eve whatsapp tool definitions — single responsibility: whatsapp domain."""
from app.services.prompts import WHATSAPP_DESCRIPTIONS as D

WHATSAPP_TOOLS = [
    {
        "type": "function",
        "name": "list_whatsapp_chats",
        "description": D["list_whatsapp_chats"],
        "parameters": {
            "type": "object",
            "properties": {},
            "additionalProperties": False,
        },
        "strict": True,
    },
    {
        "type": "function",
        "name": "read_whatsapp_messages",
        "description": D["read_whatsapp_messages"],
        "parameters": {
            "type": "object",
            "properties": {
                "chat_id": {"type": "string", "description": D["read_whatsapp_messages.chat_id"]},
                "limit": {"type": "integer", "description": D["read_whatsapp_messages.limit"]},
            },
            "required": ["chat_id"],
            "additionalProperties": False,
        },
        "strict": False,
    },
    {
        "type": "function",
        "name": "send_whatsapp_message",
        "description": D["send_whatsapp_message"],
        "parameters": {
            "type": "object",
            "properties": {
                "chat_id": {"type": "string", "description": D["send_whatsapp_message.chat_id"]},
                "content": {"type": "string", "description": D["send_whatsapp_message.content"]},
            },
            "required": ["chat_id", "content"],
            "additionalProperties": False,
        },
        "strict": True,
    },
    {
        "type": "function",
        "name": "summarize_whatsapp_chat",
        "description": D["summarize_whatsapp_chat"],
        "parameters": {
            "type": "object",
            "properties": {
                "chat_id": {"type": "string", "description": D["summarize_whatsapp_chat.chat_id"]},
            },
            "required": ["chat_id"],
            "additionalProperties": False,
        },
        "strict": True,
    },
]
