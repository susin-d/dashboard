from fastapi import APIRouter, Depends, HTTPException, status
from google.cloud.firestore_v1 import Client

from app.core.auth import get_current_user
from app.db import get_firestore
from app.schemas.eve import EveChatRequest, EveChatResponse, EveDeleteRequest, EveDeleteResponse
from app.services.eve import chat_with_eve, delete_workspace_record

router = APIRouter(prefix="/eve")


@router.post("/chat", response_model=EveChatResponse)
def chat(
    payload: EveChatRequest,
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    message, changed_resources, actions = chat_with_eve(
        database,
        user,
        [item.model_dump() for item in payload.messages],
    )
    return {"message": message, "changed_resources": changed_resources, "actions": actions}


@router.post("/delete", response_model=EveDeleteResponse)
def delete_record(
    payload: EveDeleteRequest,
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    try:
        message, changed_resources = delete_workspace_record(
            database,
            user,
            payload.resource,
            payload.record_id,
        )
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error
    return {"message": message, "changed_resources": changed_resources}
