"""Call schemas: WebRTC call records and signaling between StarWaves users."""

from datetime import datetime

from pydantic import BaseModel, Field


class CallUser(BaseModel):
    uid: str = Field(min_length=1, max_length=200)
    name: str = Field(default="")
    email: str = Field(default="")


class SignalMessage(BaseModel):
    id: str
    from_uid: str
    type: str
    payload: str
    created_at: str


class CallCreate(BaseModel):
    callee_identifier: str = Field(min_length=1, max_length=320)
    mode: str = Field(default="video", pattern="^(audio|video)$")


class CallStatusUpdate(BaseModel):
    status: str = Field(pattern="^(ringing|active|declined|ended|missed)$")


class SignalCreate(BaseModel):
    type: str = Field(pattern="^(offer|answer|ice-candidate)$")
    payload: str = Field(min_length=1, max_length=20000)


class CallResponse(BaseModel):
    id: str
    caller: CallUser
    callee: CallUser
    mode: str
    status: str
    messages: list[SignalMessage] = Field(default_factory=list)
    created_at: datetime | None = None
    updated_at: datetime | None = None