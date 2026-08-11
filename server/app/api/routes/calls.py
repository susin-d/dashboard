"""Call routes: create WebRTC calls and exchange signaling between users.

Signaling is polling-based so it works in the serverless Vercel deployment:
both participants read the call document on an interval and write signaling
messages to it through these endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from google.cloud.firestore_v1 import Client

from app.core.auth import get_current_user
from app.db import get_firestore
from app.repositories.calls import CallRepository
from app.repositories.users import get_user_by_email, get_user_by_id
from app.schemas.call import (
    CallCreate,
    CallResponse,
    CallStatusUpdate,
    CallUser,
    SignalCreate,
)

router = APIRouter(prefix="/calls")

RECENT_CALL_LIMIT = 30


def _resolve_callee(database: Client, identifier: str, current_user: dict) -> dict:
    cleaned = identifier.strip().lower()
    record = get_user_by_email(database, cleaned) or get_user_by_id(database, cleaned)
    if not record:
        raise HTTPException(status_code=404, detail="User not found.")
    if record["uid"] == current_user["uid"]:
        raise HTTPException(status_code=400, detail="You cannot call yourself.")
    return record


def _person(record: dict) -> CallUser:
    name = record.get("display_name") or record.get("name") or record.get("email") or ""
    return CallUser(uid=record["uid"], name=name, email=record.get("email") or "")


def _require_participant(call: dict | None, uid: str) -> dict:
    if not call:
        raise HTTPException(status_code=404, detail="Call not found.")
    if uid not in call.get("participants", []):
        raise HTTPException(status_code=403, detail="You are not part of this call.")
    return call


def _serialize(call: dict) -> dict:
    call["messages"] = call.get("messages") or []
    return call


def _newest_incoming(repository: CallRepository, uid: str) -> dict | None:
    incoming = repository.list_incoming(uid, limit=1)
    return incoming[0] if incoming else None


@router.get("/incoming", response_model=list[CallResponse])
def list_incoming_calls(
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    repository = CallRepository(database)
    repository.expire_stale_ringing(user["uid"])
    return [_serialize(call) for call in repository.list_incoming(user["uid"])]


@router.get("/recent", response_model=list[CallResponse])
def list_recent_calls(
    limit: int = Query(default=20, ge=1, le=RECENT_CALL_LIMIT),
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    repository = CallRepository(database)
    repository.expire_stale_ringing(user["uid"])
    return [_serialize(call) for call in repository.list_recent(user["uid"], limit)]


@router.post(
    "",
    response_model=CallResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_call(
    payload: CallCreate,
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    callee_record = _resolve_callee(database, payload.callee_identifier, user)
    repository = CallRepository(database)
    call = repository.create(
        caller=_person(user),
        callee=_person(callee_record),
        mode=payload.mode,
    )
    return _serialize(call)


@router.get("/{call_id}", response_model=CallResponse)
def get_call(
    call_id: str,
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    repository = CallRepository(database)
    call = _require_participant(repository.get(call_id), user["uid"])
    return _serialize(call)


@router.patch("/{call_id}/status", response_model=CallResponse)
def update_call_status(
    call_id: str,
    payload: CallStatusUpdate,
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    repository = CallRepository(database)
    _require_participant(repository.get(call_id), user["uid"])
    call = repository.update_status(call_id, payload.status)
    return _serialize(call)


@router.post("/{call_id}/signals", response_model=CallResponse)
def send_call_signal(
    call_id: str,
    payload: SignalCreate,
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    repository = CallRepository(database)
    _require_participant(repository.get(call_id), user["uid"])
    repository.append_signal(call_id, user["uid"], payload.type, payload.payload)
    return _serialize(repository.get(call_id))