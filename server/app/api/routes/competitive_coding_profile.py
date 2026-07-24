from fastapi import APIRouter, Depends
from firebase_admin import firestore
from google.cloud.firestore_v1 import Client

from app.core.auth import get_current_user
from app.db import get_firestore
from app.schemas.competitive_coding_profile import (
    CompetitiveCodingProfileResponse,
    CompetitiveCodingProfileUpdate,
)

router = APIRouter(prefix="/settings/competitive-coding")


def _reference(database: Client, user_id: str):
    return (
        database.collection("users")
        .document(user_id)
        .collection("settings")
        .document("competitive-coding")
    )


@router.get("", response_model=CompetitiveCodingProfileResponse)
def get_competitive_coding_profile(
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    snapshot = _reference(database, user["uid"]).get()
    if not snapshot.exists:
        snapshot = (
            database.collection("users")
            .document(user["uid"])
            .collection("settings")
            .document("competitive-programming")
            .get()
        )
    return (
        snapshot.to_dict()
        if snapshot.exists
        else CompetitiveCodingProfileResponse()
    )


@router.put("", response_model=CompetitiveCodingProfileResponse)
def save_competitive_coding_profile(
    profile: CompetitiveCodingProfileUpdate,
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    reference = _reference(database, user["uid"])
    reference.set(
        {
            **profile.model_dump(mode="python"),
            "updated_at": firestore.SERVER_TIMESTAMP,
        },
        merge=True,
    )
    return reference.get().to_dict()
