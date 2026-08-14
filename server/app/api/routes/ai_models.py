from fastapi import APIRouter, Depends, HTTPException, status
from firebase_admin import firestore
from google.cloud.firestore_v1 import Client

from app.core.auth import get_current_user
from app.db import get_firestore
from app.schemas.ai_models import AiModelsResponse, AiModelPreferenceUpdate
from app.services.ai_models import (
    AI_MODELS_SETTINGS_DOC,
    load_ai_preference,
    provider_catalog,
    validate_preference,
)

router = APIRouter(prefix="/settings/ai-models")


def _reference(database: Client, user_id: str):
    return (
        database.collection("users")
        .document(user_id)
        .collection("settings")
        .document(AI_MODELS_SETTINGS_DOC)
    )


def _preference_payload(database: Client, user_id: str) -> dict | None:
    preference = load_ai_preference(database, user_id)
    if not preference:
        return None
    return {
        "provider": preference.get("provider") or "openai",
        "model": preference.get("model") or "",
    }


@router.get("", response_model=AiModelsResponse)
def get_ai_models(
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    return {
        "providers": provider_catalog(),
        "preference": _preference_payload(database, user["uid"]),
    }


@router.put("", response_model=AiModelsResponse)
def save_ai_models(
    payload: AiModelPreferenceUpdate,
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    if not validate_preference(payload.provider, payload.model):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Unknown AI provider or model.",
        )
    reference = _reference(database, user["uid"])
    reference.set(
        {
            "provider": payload.provider,
            "model": payload.model,
            "updated_at": firestore.SERVER_TIMESTAMP,
        },
        merge=True,
    )
    return {
        "providers": provider_catalog(),
        "preference": {
            "provider": payload.provider,
            "model": payload.model,
        },
    }
