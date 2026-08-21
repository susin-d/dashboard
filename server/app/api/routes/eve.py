import asyncio
import logging

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import Response
from google.cloud.firestore_v1 import Client

logger = logging.getLogger(__name__)

from app.core.auth import get_current_user
from app.db import get_firestore
from app.repositories import eve_sessions
from app.repositories.eve import add_memory, delete_memory, list_memories, search_memories
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
from app.schemas.eve_speech import (
    EveSynthesizeRequest,
    EveTranscribeResponse,
)
from app.services.eve import chat_with_eve, delete_workspace_record, restore_workspace_record
from app.services.speech import (
    SpeechServiceError,
    resolve_stt_engine,
    resolve_tts_engine,
    synthesize_speech,
    transcribe_audio,
)

router = APIRouter(prefix="/eve")


@router.post("/transcribe", response_model=EveTranscribeResponse)
async def transcribe(
    file: UploadFile = File(...),
    language: str | None = Form(default=None),
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    engine, model = await asyncio.to_thread(resolve_stt_engine, database, user["uid"])
    if engine != "groq":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Groq speech-to-text is not configured.",
        )
    audio_bytes = await file.read()
    try:
        text = await asyncio.to_thread(
            transcribe_audio,
            audio_bytes,
            file.content_type,
            language,
            model,
        )
    except SpeechServiceError as error:
        logger.error(f"[Eve Transcribe] Transcription failed for user {user.get('uid')}: {error}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Speech transcription failed: {error}",
        ) from error
    return {"text": text}


@router.post("/synthesize")
async def synthesize(
    payload: EveSynthesizeRequest,
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    engine, voice = await asyncio.to_thread(resolve_tts_engine, database, user["uid"])
    if engine != "google":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Google Cloud text-to-speech is not configured.",
        )
    try:
        audio_bytes, media_type = await asyncio.to_thread(
            synthesize_speech,
            payload.text,
            payload.language,
            payload.voice or voice,
            payload.rate,
            payload.pitch,
        )
    except SpeechServiceError as error:
        logger.error(f"[Eve Synthesize] Speech synthesis failed for user {user.get('uid')}: {error}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Speech synthesis failed: {error}",
        ) from error
    return Response(content=audio_bytes, media_type=media_type)


@router.post("/chat", response_model=EveChatResponse)
async def chat(
    payload: EveChatRequest,
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    # Offload heavy LLM + tool loop to thread to keep event loop responsive; LLM calls are sync httpx
    message, changed_resources, actions = await asyncio.to_thread(
        chat_with_eve,
        database,
        user,
        [item.model_dump() for item in payload.messages],
        payload.session_id,
    )
    return {"message": message, "changed_resources": changed_resources, "actions": actions}


@router.get("/sessions", response_model=EveSessionListResponse)
async def list_sessions(
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    sessions = await asyncio.to_thread(eve_sessions.list_sessions, database, user["uid"])
    return {"sessions": sessions}


@router.post("/sessions", response_model=EveSessionResponse, status_code=status.HTTP_201_CREATED)
async def create_session(
    payload: EveSessionCreateRequest,
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    session = await asyncio.to_thread(
        eve_sessions.create_session,
        database,
        user["uid"],
        [item.model_dump() for item in payload.messages],
    )
    return {"session": session}


@router.get("/sessions/{session_id}", response_model=EveSessionResponse)
async def get_session(
    session_id: str,
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    try:
        session = await asyncio.to_thread(eve_sessions.get_session, database, user["uid"], session_id)
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error
    return {"session": session}


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(
    session_id: str,
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    ok = await asyncio.to_thread(eve_sessions.delete_session, database, user["uid"], session_id)
    if not ok:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")


@router.get("/memories", response_model=EveMemoriesResponse)
async def get_memories(
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    memories = await asyncio.to_thread(list_memories, database, user["uid"])
    return {"memories": memories}


@router.get("/memories/search", response_model=EveMemoriesResponse)
async def search_eve_memories_route(
    q: str,
    limit: int = 5,
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    if limit < 1 or limit > 20:
        raise HTTPException(status_code=400, detail="limit must be 1..20")
    memories = await asyncio.to_thread(search_memories, database, user["uid"], q, limit)
    return {"memories": memories}


@router.post("/memories", response_model=EveMemoriesResponse, status_code=status.HTTP_201_CREATED)
async def create_memory(
    payload: EveMemoryCreate,
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    memory = await asyncio.to_thread(add_memory, database, user["uid"], payload.content)
    # Invalidate handled inside service, but also refresh list via thread
    memories = await asyncio.to_thread(list_memories, database, user["uid"])
    return {"memories": [memory, *memories]}


@router.delete("/memories/{memory_id}", response_model=EveMemoryDeleteResponse)
async def remove_memory(
    memory_id: str,
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    ok = await asyncio.to_thread(delete_memory, database, user["uid"], memory_id)
    if not ok:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Memory not found.")
    return {"message": "Memory removed."}


@router.post("/delete", response_model=EveDeleteResponse)
async def delete_record(
    payload: EveDeleteRequest,
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    try:
        message, changed_resources = await asyncio.to_thread(
            delete_workspace_record,
            database,
            user,
            payload.resource,
            payload.record_id,
        )
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error
    return {"message": message, "changed_resources": changed_resources}


@router.post("/restore", response_model=EveRestoreResponse)
async def restore_record(
    payload: EveRestoreRequest,
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    try:
        message, changed_resources = await asyncio.to_thread(
            restore_workspace_record,
            database,
            user,
            payload.resource,
            payload.record_id,
        )
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error
    return {"message": message, "changed_resources": changed_resources}
