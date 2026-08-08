from fastapi import APIRouter, Depends, HTTPException, status
from google.cloud.firestore_v1 import Client

from app.core.auth import get_current_user
from app.db import get_firestore
from app.repositories import eve_sessions
from app.repositories.eve import add_memory, delete_memory, list_memories
from app.schemas.eve import (
    EveChatRequest,
    EveChatResponse,
    EveDeleteRequest,
    EveDeleteResponse,
    EveMemoriesResponse,
    EveMemoryCreate,
    EveMemoryDeleteResponse,
    EveRestoreRequest,
    EveRestoreResponse,
    EveSessionCreateRequest,
    EveSessionListResponse,
    EveSessionResponse,
)
from app.services.eve import chat_with_eve, delete_workspace_record, restore_workspace_record

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
        session_id=payload.session_id,
    )
    return {"message": message, "changed_resources": changed_resources, "actions": actions}


@router.get("/sessions", response_model=EveSessionListResponse)
def list_sessions(
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    return {"sessions": eve_sessions.list_sessions(database, user["uid"])}


@router.post("/sessions", response_model=EveSessionResponse, status_code=status.HTTP_201_CREATED)
def create_session(
    payload: EveSessionCreateRequest,
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    session = eve_sessions.create_session(
        database,
        user["uid"],
        [item.model_dump() for item in payload.messages],
    )
    return {"session": session}


@router.get("/sessions/{session_id}", response_model=EveSessionResponse)
def get_session(
    session_id: str,
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    try:
        session = eve_sessions.get_session(database, user["uid"], session_id)
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error
    return {"session": session}


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_session(
    session_id: str,
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    if not eve_sessions.delete_session(database, user["uid"], session_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")


@router.get("/memories", response_model=EveMemoriesResponse)
def get_memories(
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    return {"memories": list_memories(database, user["uid"])}


@router.post("/memories", response_model=EveMemoriesResponse, status_code=status.HTTP_201_CREATED)
def create_memory(
    payload: EveMemoryCreate,
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    memory = add_memory(database, user["uid"], payload.content)
    return {"memories": [memory, *list_memories(database, user["uid"])]}


@router.delete("/memories/{memory_id}", response_model=EveMemoryDeleteResponse)
def remove_memory(
    memory_id: str,
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    if not delete_memory(database, user["uid"], memory_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Memory not found.")
    return {"message": "Memory removed."}


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


@router.post("/restore", response_model=EveRestoreResponse)
def restore_record(
    payload: EveRestoreRequest,
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    try:
        message, changed_resources = restore_workspace_record(
            database,
            user,
            payload.resource,
            payload.record_id,
        )
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error
    return {"message": message, "changed_resources": changed_resources}
