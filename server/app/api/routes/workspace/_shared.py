"""Shared helpers used across the workspace feature-group routes."""

from google.cloud.firestore_v1 import Client

DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 50


def user_collection(database: Client, user_id: str, name: str):
    return database.collection("users").document(user_id).collection(name)


def hackathon_settings_reference(database: Client, user_id: str):
    return (
        database.collection("users")
        .document(user_id)
        .collection("settings")
        .document("hackathon_sources")
    )
