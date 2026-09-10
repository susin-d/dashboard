"""Eve media tool definitions — single responsibility: image, video, and audio generation."""
from app.services.prompts import MEDIA_DESCRIPTIONS as D

MEDIA_TOOLS = [
    {
        "type": "function",
        "name": "generate_image",
        "description": D["generate_image"],
        "parameters": {
            "type": "object",
            "properties": {
                "prompt": {"type": "string", "minLength": 1, "description": D["generate_image.prompt"]},
                "size": {
                    "type": "string",
                    "enum": ["1024x1024", "1024x1536", "1536x1024"],
                    "description": D["generate_image.size"],
                },
            },
            "required": ["prompt"],
            "additionalProperties": False,
        },
        "strict": False,
    },
    {
        "type": "function",
        "name": "generate_video",
        "description": D["generate_video"],
        "parameters": {
            "type": "object",
            "properties": {
                "prompt": {"type": "string", "minLength": 1, "description": D["generate_video.prompt"]},
            },
            "required": ["prompt"],
            "additionalProperties": False,
        },
        "strict": False,
    },
    {
        "type": "function",
        "name": "text_to_speech",
        "description": D["text_to_speech"],
        "parameters": {
            "type": "object",
            "properties": {
                "text": {"type": "string", "minLength": 1, "description": D["text_to_speech.text"]},
            },
            "required": ["text"],
            "additionalProperties": False,
        },
        "strict": False,
    },
    {
        "type": "function",
        "name": "speech_to_text",
        "description": D["speech_to_text"],
        "parameters": {
            "type": "object",
            "properties": {
                "source": {
                    "type": "string",
                    "minLength": 1,
                    "description": D["speech_to_text.source"],
                },
            },
            "required": ["source"],
            "additionalProperties": False,
        },
        "strict": False,
    },
]
