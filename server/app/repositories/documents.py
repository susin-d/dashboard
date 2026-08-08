from datetime import datetime, timezone

from firebase_admin import firestore
from google.cloud.firestore_v1 import Client

from app.schemas.document import DocumentResponse, DocumentUpsert


def _collection(database: Client, user_id: str):
    return database.collection("users").document(user_id).collection("documents")


def _from_snapshot(snapshot) -> DocumentResponse:
    return DocumentResponse(id=snapshot.id, **(snapshot.to_dict() or {}))


def list_documents(database: Client, user_id: str) -> list[DocumentResponse]:
    query = _collection(database, user_id).order_by(
        "modified_at",
        direction=firestore.Query.DESCENDING,
    )
    results = []
    for snapshot in query.stream():
        data = snapshot.to_dict() or {}
        if not data.get("deleted"):
            results.append(_from_snapshot(snapshot))
    return results


def upsert_document(
    database: Client,
    user_id: str,
    document_id: str,
    document: DocumentUpsert,
) -> DocumentResponse:
    reference = _collection(database, user_id).document(document_id)
    existing = reference.get()
    now = datetime.now(timezone.utc).isoformat()
    data = document.model_dump(mode="python")
    values = {
        **data,
        "updated_at": firestore.SERVER_TIMESTAMP,
    }
    if not existing.exists:
        values["created_at"] = firestore.SERVER_TIMESTAMP
    reference.set(values, merge=True)
    return DocumentResponse(
        id=document_id,
        **data,
        updated_at=now,
        created_at=existing.to_dict().get("created_at", now) if existing.exists else now,
    )


def delete_document(database: Client, user_id: str, document_id: str) -> bool:
    reference = _collection(database, user_id).document(document_id)
    if not reference.get().exists:
        return False
    reference.update({
        "deleted": True,
        "deleted_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": firestore.SERVER_TIMESTAMP,
    })
    return True


def restore_document(database: Client, user_id: str, document_id: str) -> bool:
    reference = _collection(database, user_id).document(document_id)
    if not reference.get().exists:
        return False
    reference.update({
        "deleted": False,
        "deleted_at": None,
        "updated_at": firestore.SERVER_TIMESTAMP,
    })
    return True

