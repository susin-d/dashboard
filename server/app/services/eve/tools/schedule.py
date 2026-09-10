"""Eve schedule tool definitions — single responsibility: schedule domain."""
from app.services.prompts import SCHEDULE_DESCRIPTIONS as D

SCHEDULE_TOOLS = [
    {
        "type": "function",
        "name": "trigger_eve_call",
        "description": D["trigger_eve_call"],
        "parameters": {
            "type": "object",
            "properties": {
                "mode": {"type": "string", "enum": ["audio", "video"]},
                "provider": {"type": "string", "enum": ["in_app", "twilio"], "description": D["trigger_eve_call.provider"]},
                "phone_number": {"type": "string", "description": D["trigger_eve_call.phone_number"]},
            },
            "required": [],
            "additionalProperties": False,
        },
        "strict": False,
    },
    {
        "type": "function",
        "name": "make_twilio_call",
        "description": D["make_twilio_call"],
        "parameters": {
            "type": "object",
            "properties": {
                "phone_number": {"type": "string", "description": D["make_twilio_call.phone_number"]},
                "message": {"type": "string", "description": D["make_twilio_call.message"]},
                "mode": {"type": "string", "enum": ["audio", "video"]},
            },
            "required": ["phone_number"],
            "additionalProperties": False,
        },
        "strict": False,
    },
    {
        "type": "function",
        "name": "create_eve_schedule",
        "description": D["create_eve_schedule"],
        "parameters": {
            "type": "object",
            "properties": {
                "title": {"type": "string", "minLength": 1, "maxLength": 120},
                "prompt": {"type": "string", "minLength": 1, "maxLength": 2000},
                "schedule_type": {"type": "string", "enum": ["one_time", "recurring"]},
                "action_type": {"type": "string", "enum": ["chat_prompt", "voice_call"]},
                "execute_at": {"type": "string"},
                "cron_expression": {"type": "string"},
            },
            "required": ["title", "prompt"],
            "additionalProperties": False,
        },
        "strict": False,
    },
    {
        "type": "function",
        "name": "list_eve_schedules",
        "description": D["list_eve_schedules"],
        "parameters": {"type": "object", "properties": {}, "additionalProperties": False},
        "strict": True,
    },
    {
        "type": "function",
        "name": "delete_eve_schedule",
        "description": D["delete_eve_schedule"],
        "parameters": {
            "type": "object",
            "properties": {"schedule_id": {"type": "string", "minLength": 1}},
            "required": ["schedule_id"],
            "additionalProperties": False,
        },
        "strict": True,
    },
]
