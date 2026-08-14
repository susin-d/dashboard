from pydantic import BaseModel, Field


class AiModelPreferenceUpdate(BaseModel):
    provider: str = Field(min_length=1, max_length=64)
    model: str = Field(min_length=1, max_length=128)


class AiModelDescriptor(BaseModel):
    id: str
    label: str


class AiProviderDescriptor(BaseModel):
    id: str
    label: str
    available: bool
    models: list[AiModelDescriptor]


class AiModelsResponse(BaseModel):
    providers: list[AiProviderDescriptor]
    preference: AiModelPreferenceUpdate | None = None
