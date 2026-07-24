from firebase_admin import firestore
from google.cloud.firestore_v1 import Client

from app.schemas.profile import ProfileCreate, ProfileResponse, ProfileUpdate

COLLECTION = "profiles"


def _profile_from_snapshot(snapshot) -> ProfileResponse:
    return ProfileResponse(id=snapshot.id, **(snapshot.to_dict() or {}))


def create_profile(database: Client, profile: ProfileCreate) -> ProfileResponse:
    document = database.collection(COLLECTION).document()
    document.set(
        {
            **profile.model_dump(mode="json"),
            "created_at": firestore.SERVER_TIMESTAMP,
            "updated_at": firestore.SERVER_TIMESTAMP,
        },
    )
    return _profile_from_snapshot(document.get())


def get_profile(database: Client, profile_id: str) -> ProfileResponse | None:
    snapshot = database.collection(COLLECTION).document(profile_id).get()
    return _profile_from_snapshot(snapshot) if snapshot.exists else None


def list_profiles(database: Client, limit: int) -> list[ProfileResponse]:
    query = database.collection(COLLECTION).limit(limit)
    return [_profile_from_snapshot(snapshot) for snapshot in query.stream()]


def update_profile(
    database: Client,
    profile_id: str,
    changes: ProfileUpdate,
) -> ProfileResponse | None:
    document = database.collection(COLLECTION).document(profile_id)
    if not document.get().exists:
        return None

    document.update(
        {
            **changes.model_dump(exclude_unset=True, mode="json"),
            "updated_at": firestore.SERVER_TIMESTAMP,
        },
    )
    return _profile_from_snapshot(document.get())


def delete_profile(database: Client, profile_id: str) -> bool:
    document = database.collection(COLLECTION).document(profile_id)
    if not document.get().exists:
        return False
    document.delete()
    return True

