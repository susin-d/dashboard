from functools import lru_cache

import firebase_admin
from firebase_admin import firestore
from google.cloud.firestore_v1 import Client

from app.core.config import settings


def get_firebase_app() -> firebase_admin.App:
    try:
        return firebase_admin.get_app()
    except ValueError:
        options = (
            {"projectId": settings.firebase_project_id}
            if settings.firebase_project_id
            else None
        )
        return firebase_admin.initialize_app(options=options)


@lru_cache(maxsize=1)
def get_firestore() -> Client:
    """Return the shared Cloud Firestore client.

    Initialization is lazy so local development and API documentation can
    start before Firebase credentials are configured.
    """

    return firestore.client(
        app=get_firebase_app(),
        database_id=settings.firestore_database_id,
    )
