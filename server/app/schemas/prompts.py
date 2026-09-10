from pydantic import BaseModel


class PresetPrompt(BaseModel):
    command: str
    label: str
    prompt: str
    description: str


class PromptToolItem(BaseModel):
    command: str
    name: str
    label: str
    description: str


class StarterMessages(BaseModel):
    page: str
    modal: str


class StudioTemplateSuggestion(BaseModel):
    label: str
    prompt: str


class PromptsResponse(BaseModel):
    presets: list[PresetPrompt]
    tools: list[PromptToolItem]
    starters: StarterMessages
    studio_templates: list[StudioTemplateSuggestion]
