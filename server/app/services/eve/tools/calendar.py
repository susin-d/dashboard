"""Eve calendar tool definitions — single responsibility: calendar events and reminders."""
from app.services.prompts import CALENDAR_DESCRIPTIONS as D

CALENDAR_TOOLS = [
    {
        "type": "function",
        "name": "create_calendar_event",
        "description": D["create_calendar_event"],
        "parameters": {
            "type": "object",
            "properties": {
                "title": {"type": "string", "minLength": 1, "description": D["create_calendar_event.title"]},
                "date": {"type": "string", "description": D["create_calendar_event.date"]},
                "time": {"type": "string", "description": D["create_calendar_event.time"]},
                "end_date": {"type": "string", "description": D["create_calendar_event.end_date"]},
                "notes": {"type": "string", "description": D["create_calendar_event.notes"]},
            },
            "required": ["title", "date"],
            "additionalProperties": False,
        },
        "strict": False,
    },
    {
        "type": "function",
        "name": "list_calendar_events",
        "description": D["list_calendar_events"],
        "parameters": {
            "type": "object",
            "properties": {},
            "required": [],
            "additionalProperties": False,
        },
        "strict": False,
    },
    {
        "type": "function",
        "name": "delete_calendar_event",
        "description": D["delete_calendar_event"],
        "parameters": {
            "type": "object",
            "properties": {
                "event_id": {"type": "string", "minLength": 1, "description": D["delete_calendar_event.event_id"]},
            },
            "required": ["event_id"],
            "additionalProperties": False,
        },
        "strict": False,
    },
]
