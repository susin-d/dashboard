import os
from functools import lru_cache

import firebase_admin
from firebase_admin import credentials, firestore
from google.cloud.firestore_v1 import Client

from app.core.config import settings


def get_firebase_app() -> firebase_admin.App:
    try:
        return firebase_admin.get_app()
    except ValueError:
        if settings.firebase_client_email and settings.firebase_private_key:
            private_key = settings.firebase_private_key.replace("\\n", "\n")
            cred_dict = {
                "type": settings.firebase_type,
                "project_id": settings.firebase_project_id,
                "private_key_id": settings.firebase_private_key_id,
                "private_key": private_key,
                "client_email": settings.firebase_client_email,
                "client_id": settings.firebase_client_id,
                "auth_uri": settings.firebase_auth_uri,
                "token_uri": settings.firebase_token_uri,
                "auth_provider_x509_cert_url": settings.firebase_auth_provider_cert_url,
                "client_x509_cert_url": settings.firebase_client_cert_url,
            }
            cred = credentials.Certificate(cred_dict)
            return firebase_admin.initialize_app(cred)

        g_creds_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
        if g_creds_path and os.path.exists(g_creds_path):
            cred = credentials.Certificate(g_creds_path)
            return firebase_admin.initialize_app(cred)

        options = (
            {"projectId": settings.firebase_project_id}
            if settings.firebase_project_id
            else None
        )
        return firebase_admin.initialize_app(options=options)



@lru_cache(maxsize=1)
def get_firestore() -> Client:
    """Return the active database client.

    Uses PostgreSQL / Supabase adapter via SQLAlchemy when direct Firebase
    credentials are absent or configured for relational storage.
    """
    try:
        app = get_firebase_app()
        return firestore.client(
            app=app,
            database_id=settings.firestore_database_id,
        )
    except Exception:
        from app.db.compat import SqlClient
        return SqlClient()
