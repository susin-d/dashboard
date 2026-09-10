"""Eve utility tool definitions — single responsibility: QR, chart, PDF, and OCR helpers."""
from app.services.prompts import UTILITY_DESCRIPTIONS as D

UTILITY_TOOLS = [
    {
        "type": "function",
        "name": "generate_qr_code",
        "description": D["generate_qr_code"],
        "parameters": {
            "type": "object",
            "properties": {
                "data": {"type": "string", "minLength": 1, "description": D["generate_qr_code.data"]},
            },
            "required": ["data"],
            "additionalProperties": False,
        },
        "strict": False,
    },
    {
        "type": "function",
        "name": "create_chart",
        "description": D["create_chart"],
        "parameters": {
            "type": "object",
            "properties": {
                "chart_type": {"type": "string", "enum": ["bar", "line", "pie"], "description": D["create_chart.chart_type"]},
                "labels": {
                    "type": "array",
                    "items": {"type": "string"},
                    "minItems": 1,
                    "description": D["create_chart.labels"],
                },
                "values": {
                    "type": "array",
                    "items": {"type": "number"},
                    "minItems": 1,
                    "description": D["create_chart.values"],
                },
                "title": {"type": "string", "description": D["create_chart.title"]},
            },
            "required": ["chart_type", "labels", "values"],
            "additionalProperties": False,
        },
        "strict": False,
    },
    {
        "type": "function",
        "name": "read_pdf_file",
        "description": D["read_pdf_file"],
        "parameters": {
            "type": "object",
            "properties": {
                "source": {"type": "string", "minLength": 1, "description": D["read_pdf_file.source"]},
            },
            "required": ["source"],
            "additionalProperties": False,
        },
        "strict": False,
    },
    {
        "type": "function",
        "name": "extract_text_from_image",
        "description": D["extract_text_from_image"],
        "parameters": {
            "type": "object",
            "properties": {
                "source": {"type": "string", "minLength": 1, "description": D["extract_text_from_image.source"]},
            },
            "required": ["source"],
            "additionalProperties": False,
        },
        "strict": False,
    },
]
