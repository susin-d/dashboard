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
    return [_from_snapshot(snapshot) for snapshot in query.stream()]


def upsert_document(
    database: Client,
    user_id: str,
    document_id: str,
    document: DocumentUpsert,
) -> DocumentResponse:
    reference = _collection(database, user_id).document(document_id)
    existing = reference.get()
    values = {
        **document.model_dump(mode="python"),
        "updated_at": firestore.SERVER_TIMESTAMP,
    }
    if not existing.exists:
        values["created_at"] = firestore.SERVER_TIMESTAMP
    reference.set(values, merge=True)
    return _from_snapshot(reference.get())


def delete_document(database: Client, user_id: str, document_id: str) -> bool:
    reference = _collection(database, user_id).document(document_id)
    if not reference.get().exists:
        return False
    reference.delete()
    return True
