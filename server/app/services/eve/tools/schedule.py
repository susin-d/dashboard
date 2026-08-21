"""Eve schedule tool definitions — single responsibility: schedule domain."""

SCHEDULE_TOOLS = [
    {
        "type": "function",
        "name": "trigger_eve_call",
        "description": "Trigger an immediate incoming voice call from Eve AI Assistant to the user.",
        "parameters": {
            "type": "object",
            "properties": {"mode": {"type": "string", "enum": ["audio", "video"]}},
            "required": [],
            "additionalProperties": False,
        },
        "strict": False,
    },
    {
        "type": "function",
        "name": "create_eve_schedule",
        "description": "Create an automated scheduled task or reminder that auto-prompts Eve or triggers an incoming voice call from Eve at a specified time or interval.",
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
        "description": "List the user's active automated Eve schedules and reminders.",
        "parameters": {"type": "object", "properties": {}, "additionalProperties": False},
        "strict": True,
    },
    {
        "type": "function",
        "name": "delete_eve_schedule",
        "description": "Delete or cancel an automated Eve schedule/reminder by its id.",
        "parameters": {
            "type": "object",
            "properties": {"schedule_id": {"type": "string", "minLength": 1}},
            "required": ["schedule_id"],
            "additionalProperties": False,
        },
        "strict": True,
    },
]
