"""UI prompt catalog — serves the canonical prompts file to the frontend.

The frontend holds no prompt content (ADR 0049); it fetches this cached read.
"""

from fastapi import APIRouter, Depends

from app.core.auth import get_current_user
from app.core.cache import CACHE_TTL_LONG, cached
from app.schemas.prompts import (
    PresetPrompt,
    PromptsResponse,
    PromptToolItem,
    StarterMessages,
    StudioTemplateSuggestion,
)
from app.services import prompts as prompt_catalog

router = APIRouter(prefix="/prompts")

_PROMPTS_PREFIX = "prompts"


@router.get("", response_model=PromptsResponse)
@cached(ttl=CACHE_TTL_LONG, prefix=_PROMPTS_PREFIX)
async def get_prompts(
    user: dict = Depends(get_current_user),
):
    return {
        "presets": [PresetPrompt(**item) for item in prompt_catalog.PRESET_PROMPTS],
        "tools": [PromptToolItem(**item) for item in prompt_catalog.TOOLS_LIST],
        "starters": StarterMessages(
            page=prompt_catalog.EVE_STARTER_MESSAGE,
            modal=prompt_catalog.EVE_MODAL_STARTER_MESSAGE,
        ),
        "studio_templates": [StudioTemplateSuggestion(**item) for item in prompt_catalog.STUDIO_TEMPLATES],
    }
