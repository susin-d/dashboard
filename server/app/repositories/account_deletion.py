"""Account deletion: recursive removal of a user document and all subcollections."""

from google.cloud.firestore_v1 import Client

from app.repositories.users import get_users_collection


def _delete_document_recursively(database: Client, document_ref) -> None:
    for subcollection in document_ref.collections():
        _delete_collection_recursively(database, subcollection)
    document_ref.delete()


def _delete_collection_recursively(database: Client, collection_ref) -> None:
    for doc in collection_ref.stream():
        _delete_document_recursively(database, doc.reference)


def delete_user_account(database: Client, uid: str) -> bool:
    document_ref = get_users_collection(database).document(uid)
    if not document_ref.get().exists:
        return False
    _delete_document_recursively(database, document_ref)
    return True
