"""Unit tests for the canonical prompt catalog (ADR 0049)."""

from app.services import prompts
from app.services.eve import auto_memory
from app.services.eve import instructions as eve_instructions
from app.services.eve import voice_fast


def test_facade_identities():
    assert eve_instructions.EVE_INSTRUCTIONS is prompts.EVE_INSTRUCTIONS
    assert voice_fast.VOICE_INSTRUCTIONS is prompts.VOICE_INSTRUCTIONS


def test_extraction_builder_uses_memory_cap():
    rendered = prompts.build_extraction_instructions(auto_memory.MAX_EXTRACTED_MEMORIES)
    assert "at most 3 short strings" in rendered
    assert rendered.startswith("You extract long-term memories")


def test_whatsapp_templates():
    draft = prompts.whatsapp_draft_prompt("history", "Be nice")
    assert draft == (
        "Here is the recent WhatsApp chat history:\nhistory\n\n"
        "Instruction: Be nice\n\n"
        "Generate only the concise suggested reply message text to send. "
        "Do not include quotes or conversational preamble."
    )
    summary = prompts.whatsapp_summary_prompt("history")
    assert summary == (
        "Summarize the following WhatsApp conversation with key points and any action items:\n\nhistory"
    )


def test_call_greetings():
    assert prompts.DEFAULT_CALL_GREETING.startswith("Hello, this is Eve")
    assert prompts.DEFAULT_CALL_GREETING_SHORT == "Hello, this is Eve from StarWaves."
