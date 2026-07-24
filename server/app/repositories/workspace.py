from datetime import date
from typing import Any

from firebase_admin import firestore
from google.cloud.firestore_v1 import Client

from app.schemas.workspace import (
    JobCreate,
    NotificationUpdate,
    ProjectCreate,
)


def user_collection(database: Client, user_id: str, collection_name: str):
    return database.collection("users").document(user_id).collection(collection_name)


def serialize_dates(values: dict[str, Any]) -> dict[str, Any]:
    return {
        key: value.isoformat() if isinstance(value, date) else value
        for key, value in values.items()
    }


class JobRepository:
    def __init__(self, database: Client, user_id: str):
        self.database = database
        self.user_id = user_id
        self.collection = user_collection(database, user_id, "jobs")

    def list_all(self) -> list[dict[str, Any]]:
        query = self.collection.order_by(
            "created_at",
            direction=firestore.Query.DESCENDING,
        )
        return [{"id": item.id, **(item.to_dict() or {})} for item in query.stream()]

    def create(self, job: JobCreate) -> dict[str, Any]:
        reference = self.collection.document()
        reference.set(
            {
                **serialize_dates(job.model_dump(mode="python")),
                "created_at": firestore.SERVER_TIMESTAMP,
                "updated_at": firestore.SERVER_TIMESTAMP,
            },
        )
        return {"id": reference.id, **(reference.get().to_dict() or {})}

    def update(self, job_id: str, updates: dict[str, Any]) -> dict[str, Any] | None:
        reference = self.collection.document(job_id)
        if not reference.get().exists:
            return None
        cleaned_updates = serialize_dates(updates)
        reference.update(
            {
                **cleaned_updates,
                "updated_at": firestore.SERVER_TIMESTAMP,
            },
        )
        return {"id": reference.id, **(reference.get().to_dict() or {})}

    def delete(self, job_id: str) -> bool:
        reference = self.collection.document(job_id)
        if not reference.get().exists:
            return False
        reference.delete()
        return True


class ProjectRepository:
    def __init__(self, database: Client, user_id: str):
        self.database = database
        self.user_id = user_id
        self.collection = user_collection(database, user_id, "projects")

    def list_all(self) -> list[dict[str, Any]]:
        query = self.collection.order_by(
            "created_at",
            direction=firestore.Query.DESCENDING,
        )
        return [{"id": item.id, **(item.to_dict() or {})} for item in query.stream()]

    def create(self, project: ProjectCreate) -> dict[str, Any]:
        reference = self.collection.document()
        reference.set(
            {
                **serialize_dates(project.model_dump(mode="python")),
                "created_at": firestore.SERVER_TIMESTAMP,
                "updated_at": firestore.SERVER_TIMESTAMP,
            },
        )
        return {"id": reference.id, **(reference.get().to_dict() or {})}

    def update(self, project_id: str, project: ProjectCreate) -> dict[str, Any] | None:
        reference = self.collection.document(project_id)
        if not reference.get().exists:
            return None
        reference.update(
            {
                **serialize_dates(project.model_dump(mode="python")),
                "updated_at": firestore.SERVER_TIMESTAMP,
            },
        )
        return {"id": reference.id, **(reference.get().to_dict() or {})}

    def patch(self, project_id: str, updates: dict[str, Any]) -> dict[str, Any] | None:
        reference = self.collection.document(project_id)
        if not reference.get().exists:
            return None
        reference.update(
            {
                **serialize_dates(updates),
                "updated_at": firestore.SERVER_TIMESTAMP,
            },
        )
        return {"id": reference.id, **(reference.get().to_dict() or {})}

    def delete(self, project_id: str) -> bool:
        reference = self.collection.document(project_id)
        if not reference.get().exists:
            return False
        reference.delete()
        return True


class NotificationRepository:
    def __init__(self, database: Client, user_id: str):
        self.database = database
        self.user_id = user_id
        self.collection = user_collection(database, user_id, "notifications")

    def list_all(self) -> list[dict[str, Any]]:
        query = self.collection.order_by(
            "created_at",
            direction=firestore.Query.DESCENDING,
        )
        return [{"id": item.id, **(item.to_dict() or {})} for item in query.stream()]

    def update(
        self,
        notification_id: str,
        update_data: NotificationUpdate,
    ) -> dict[str, Any] | None:
        reference = self.collection.document(notification_id)
        if not reference.get().exists:
            return None
        reference.update(
            {
                **update_data.model_dump(exclude_unset=True),
                "updated_at": firestore.SERVER_TIMESTAMP,
            },
        )
        return {"id": reference.id, **(reference.get().to_dict() or {})}

    def delete(self, notification_id: str) -> bool:
        reference = self.collection.document(notification_id)
        if not reference.get().exists:
            return False
        reference.delete()
        return True

    def mark_all_read(self) -> int:
        count = 0
        for item in self.collection.where("unread", "==", True).stream():
            item.reference.update(
                {
                    "unread": False,
                    "updated_at": firestore.SERVER_TIMESTAMP,
                },
            )
            count += 1
        return count

