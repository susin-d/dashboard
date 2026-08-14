from fastapi import APIRouter, Depends, HTTPException, status
from firebase_admin import firestore
from google.cloud.firestore_v1 import Client

from app.core.auth import get_current_user
from app.db import get_firestore
from app.core.config import settings
from app.schemas.ai_models import AiModelsResponse, AiModelPreferenceUpdate
from app.services.ai_models import (
    AI_MODELS_SETTINGS_DOC,
    AI_PROVIDERS,
    DEFAULT_PROVIDER,
    _provider_key_set,
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


def _extract_user_keys(preference: dict | None) -> dict[str, str]:
    if not preference:
        return {}
    keys: dict[str, str] = {}
    saved_keys = preference.get("api_keys")
    if isinstance(saved_keys, dict):
        keys.update({k: str(v) for k, v in saved_keys.items() if v})
    legacy_key = preference.get("api_key")
    saved_provider = preference.get("provider")
    if legacy_key and saved_provider and saved_provider not in keys:
        keys[saved_provider] = str(legacy_key)
    return keys


def _preference_payload(preference: dict | None, user_keys: dict[str, str]) -> dict | None:
    if not preference:
        return None
    provider = preference.get("provider") or DEFAULT_PROVIDER
    model = preference.get("model") or ""
    return {
        "provider": provider,
        "model": model,
        "has_api_key": bool(user_keys.get(provider)),
    }


@router.get("", response_model=AiModelsResponse)
def get_ai_models(
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    preference = load_ai_preference(database, user["uid"])
    user_keys = _extract_user_keys(preference)
    default_model = AI_PROVIDERS.get(DEFAULT_PROVIDER, {}).get("default_model", settings.openai_model)
    return {
        "providers": provider_catalog(user_keys),
        "preference": _preference_payload(preference, user_keys),
        "default_provider": DEFAULT_PROVIDER,
        "default_model": default_model,
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

    current_pref = load_ai_preference(database, user["uid"])
    user_keys = _extract_user_keys(current_pref)
    provider_descriptor = AI_PROVIDERS.get(payload.provider, {})
    provider_label = provider_descriptor.get("label", payload.provider)
    has_env = _provider_key_set(payload.provider)

    api_key_to_save = payload.api_key.strip() if payload.api_key else None

    # If provider is not configured in env, require user API key (either in payload or existing saved key)
    if not has_env and not api_key_to_save and not user_keys.get(payload.provider):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"API key is required for {provider_label}.",
        )

    if api_key_to_save:
        user_keys[payload.provider] = api_key_to_save

    update_payload = {
        "provider": payload.provider,
        "model": payload.model,
        "api_keys": user_keys,
        "updated_at": firestore.SERVER_TIMESTAMP,
    }

    reference = _reference(database, user["uid"])
    reference.set(update_payload, merge=True)

    default_model = AI_PROVIDERS.get(DEFAULT_PROVIDER, {}).get("default_model", settings.openai_model)
    return {
        "providers": provider_catalog(user_keys),
        "preference": {
            "provider": payload.provider,
            "model": payload.model,
            "has_api_key": bool(user_keys.get(payload.provider)),
        },
        "default_provider": DEFAULT_PROVIDER,
        "default_model": default_model,
    }
