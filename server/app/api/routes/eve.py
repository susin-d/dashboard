from fastapi import APIRouter, Depends
from google.cloud.firestore_v1 import Client

from app.core.auth import get_current_user
from app.db import get_firestore
from app.schemas.eve import EveChatRequest, EveChatResponse
from app.services.eve import chat_with_eve

router = APIRouter(prefix="/eve")


@router.post("/chat", response_model=EveChatResponse)
def chat(
    payload: EveChatRequest,
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    message, changed_resources = chat_with_eve(
        database,
        user,
        [item.model_dump() for item in payload.messages],
    )
    return {"message": message, "changed_resources": changed_resources}
