"""Eve system instructions — facade over the canonical prompt catalog.

The text lives in app.services.prompts (ADR 0049); this module re-exports it
so existing `from app.services.eve.instructions import EVE_INSTRUCTIONS`
call sites keep working.
"""

from app.services.prompts import EVE_INSTRUCTIONS

__all__ = ["EVE_INSTRUCTIONS"]
