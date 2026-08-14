from datetime import datetime, timezone
from typing import Any

from firebase_admin import firestore
from google.cloud.firestore_v1 import Client

from app.schemas.contact import ContactCreate, ContactResponse, ContactUpdate


def collection(database: Client, user_id: str):
    return database.collection("users").document(user_id).collection("contacts")


def from_snapshot(snapshot) -> ContactResponse:
    data = snapshot.to_dict() or {}
    created_at = data.get("created_at")
    updated_at = data.get("updated_at")

    if isinstance(created_at, datetime):
        created_at = created_at.isoformat()
    elif created_at is not None:
        created_at = str(created_at)

    if isinstance(updated_at, datetime):
        updated_at = updated_at.isoformat()
    elif updated_at is not None:
        updated_at = str(updated_at)

    return ContactResponse(
        id=snapshot.id,
        name=data.get("name", ""),
        email=data.get("email"),
        phone=data.get("phone"),
        company=data.get("company"),
        role=data.get("role"),
        category=data.get("category", "general"),
        notes=data.get("notes"),
        avatar_url=data.get("avatar_url"),
        starred=bool(data.get("starred", False)),
        created_at=created_at,
        updated_at=updated_at,
    )


def list_contacts(database: Client, user_id: str) -> list[ContactResponse]:
    query = collection(database, user_id).order_by(
        "name",
        direction=firestore.Query.ASCENDING,
    )
    results = []
    for snapshot in query.stream():
        data = snapshot.to_dict() or {}
        if not data.get("deleted"):
            results.append(from_snapshot(snapshot))
    return results


def get_contact(
    database: Client,
    user_id: str,
    contact_id: str,
) -> ContactResponse | None:
    snapshot = collection(database, user_id).document(contact_id).get()
    if not snapshot.exists:
        return None
    data = snapshot.to_dict() or {}
    if data.get("deleted"):
        return None
    return from_snapshot(snapshot)


def create_contact(
    database: Client,
    user_id: str,
    contact: ContactCreate,
) -> ContactResponse:
    reference = collection(database, user_id).document()
    now = datetime.now(timezone.utc).isoformat()
    data = contact.model_dump(mode="python")
    reference.set(
        {
            **data,
            "created_at": firestore.SERVER_TIMESTAMP,
            "updated_at": firestore.SERVER_TIMESTAMP,
        },
    )
    return ContactResponse(id=reference.id, **data, created_at=now, updated_at=now)


def update_contact(
    database: Client,
    user_id: str,
    contact_id: str,
    changes: ContactUpdate,
) -> ContactResponse | None:
    reference = collection(database, user_id).document(contact_id)
    try:
        data = changes.model_dump(exclude_unset=True, mode="python")
        reference.update(
            {
                **data,
                "updated_at": firestore.SERVER_TIMESTAMP,
            },
        )
    except Exception:
        return None
    return from_snapshot(reference.get())


def delete_contact(database: Client, user_id: str, contact_id: str) -> bool:
    reference = collection(database, user_id).document(contact_id)
    if not reference.get().exists:
        return False
    reference.update({
        "deleted": True,
        "deleted_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": firestore.SERVER_TIMESTAMP,
    })
    return True


def restore_contact(database: Client, user_id: str, contact_id: str) -> bool:
    reference = collection(database, user_id).document(contact_id)
    if not reference.get().exists:
        return False
    reference.update({
        "deleted": False,
        "deleted_at": None,
        "updated_at": firestore.SERVER_TIMESTAMP,
    })
    return True
