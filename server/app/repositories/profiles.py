from datetime import datetime, timezone

from firebase_admin import firestore
from google.cloud.firestore_v1 import Client

from app.schemas.profile import ProfileCreate, ProfileResponse, ProfileUpdate

COLLECTION = "profiles"


def _profile_from_snapshot(snapshot) -> ProfileResponse:
    data = dict(snapshot.to_dict() or {})
    data.setdefault("id", snapshot.id)
    return ProfileResponse(**data)


def create_profile(database: Client, profile: ProfileCreate) -> ProfileResponse:
    document = database.collection(COLLECTION).document()
    now = datetime.now(timezone.utc).isoformat()
    data = profile.model_dump(mode="json")
    document.set(
        {
            **data,
            "created_at": firestore.SERVER_TIMESTAMP,
            "updated_at": firestore.SERVER_TIMESTAMP,
        },
    )
    return ProfileResponse(id=document.id, **data, created_at=now, updated_at=now)


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
    try:
        document.update(
            {
                **changes.model_dump(exclude_unset=True, mode="json"),
                "updated_at": firestore.SERVER_TIMESTAMP,
            },
        )
    except Exception:
        return None
    return _profile_from_snapshot(document.get())


def delete_profile(database: Client, profile_id: str) -> bool:
    snapshot = database.collection(COLLECTION).document(profile_id).get()
    if not snapshot.exists:
        return False
    snapshot.reference.delete()
    return True

