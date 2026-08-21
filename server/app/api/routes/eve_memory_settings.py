from fastapi import APIRouter, Depends
from firebase_admin import firestore
from google.cloud.firestore_v1 import Client

from app.core.auth import get_current_user
from app.db import get_firestore
from app.schemas.eve import EveMemorySettingsResponse, EveMemorySettingsUpdate
from app.services.eve.memory_settings import (
    EVE_MEMORY_SETTINGS_DOC,
    resolve_auto_remember,
)

router = APIRouter(prefix="/settings/eve-memory")


def _reference(database: Client, user_id: str):
    return (
        database.collection("users")
        .document(user_id)
        .collection("settings")
        .document(EVE_MEMORY_SETTINGS_DOC)
    )


@router.get("", response_model=EveMemorySettingsResponse)
def get_eve_memory_settings(
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    return {"auto_remember": resolve_auto_remember(database, user["uid"])}


@router.put("", response_model=EveMemorySettingsResponse)
def save_eve_memory_settings(
    payload: EveMemorySettingsUpdate,
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    reference = _reference(database, user["uid"])
    reference.set(
        {
            "auto_remember": payload.auto_remember,
            "updated_at": firestore.SERVER_TIMESTAMP,
        },
        merge=True,
    )
    return {"auto_remember": payload.auto_remember}
