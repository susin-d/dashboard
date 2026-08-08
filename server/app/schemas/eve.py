from pydantic import BaseModel, Field


class EveMessage(BaseModel):
    role: str = Field(pattern="^(user|assistant)$")
    content: str = Field(min_length=1, max_length=4000)


class EveChatRequest(BaseModel):
    messages: list[EveMessage] = Field(min_length=1, max_length=12)


class EveChatResponse(BaseModel):
    message: str
    changed_resources: list[str] = Field(default_factory=list)
    actions: list[dict] = Field(default_factory=list)


class EveDeleteRequest(BaseModel):
    resource: str = Field(
        pattern="^(todos|projects|jobs|hackathons|documents|notifications)$",
    )
    record_id: str = Field(min_length=1, max_length=300)


class EveDeleteResponse(BaseModel):
    message: str
    changed_resources: list[str] = Field(default_factory=list)


class EveRestoreRequest(BaseModel):
    resource: str = Field(
        pattern="^(todos|projects|jobs|hackathons|documents|notifications)$",
    )
    record_id: str = Field(min_length=1, max_length=300)


class EveRestoreResponse(BaseModel):
    message: str
    changed_resources: list[str] = Field(default_factory=list)

