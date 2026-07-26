from datetime import date, datetime, timezone
from typing import Any
import base64

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


def encode_cursor(document_id: str) -> str:
    return base64.urlsafe_b64encode(document_id.encode()).decode()


def decode_cursor(cursor: str | None) -> str | None:
    if not cursor:
        return None
    try:
        return base64.urlsafe_b64decode(cursor.encode()).decode()
    except Exception as error:
        raise ValueError("Invalid pagination cursor.") from error


def paginate_collection(collection, order_field: str, cursor: str | None, limit: int):
    query = collection.order_by(order_field, direction=firestore.Query.DESCENDING)
    cursor_id = decode_cursor(cursor)
    if cursor_id:
        query = query.start_after(collection.document(cursor_id).get())
    documents = list(query.limit(limit + 1).stream())
    has_more = len(documents) > limit
    documents = documents[:limit]
    next_cursor = encode_cursor(documents[-1].id) if has_more and documents else None
    return ([{"id": item.id, **(item.to_dict() or {})} for item in documents], next_cursor, has_more)


class JobRepository:
    def __init__(self, database: Client, user_id: str):
        self.database = database
        self.user_id = user_id
        self.collection = user_collection(database, user_id, "jobs")

    def list_page(self, cursor: str | None, limit: int):
        return paginate_collection(self.collection, "created_at", cursor, limit)

    def create(self, job: JobCreate) -> dict[str, Any]:
        reference = self.collection.document()
        now = datetime.now(timezone.utc).isoformat()
        data = serialize_dates(job.model_dump(mode="python"))
        reference.set(
            {
                **data,
                "created_at": firestore.SERVER_TIMESTAMP,
                "updated_at": firestore.SERVER_TIMESTAMP,
            },
        )
        return {"id": reference.id, **data, "created_at": now, "updated_at": now}

    def update(self, job_id: str, updates: dict[str, Any]) -> dict[str, Any] | None:
        reference = self.collection.document(job_id)
        cleaned_updates = serialize_dates(updates)
        try:
            reference.update(
                {
                    **cleaned_updates,
                    "updated_at": firestore.SERVER_TIMESTAMP,
                },
            )
        except Exception:
            return None
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

    def list_page(self, cursor: str | None, limit: int):
        return paginate_collection(self.collection, "created_at", cursor, limit)

    def create(self, project: ProjectCreate) -> dict[str, Any]:
        reference = self.collection.document()
        now = datetime.now(timezone.utc).isoformat()
        data = serialize_dates(project.model_dump(mode="python"))
        reference.set(
            {
                **data,
                "created_at": firestore.SERVER_TIMESTAMP,
                "updated_at": firestore.SERVER_TIMESTAMP,
            },
        )
        return {"id": reference.id, **data, "created_at": now, "updated_at": now}

    def update(self, project_id: str, project: ProjectCreate) -> dict[str, Any] | None:
        reference = self.collection.document(project_id)
        try:
            reference.update(
                {
                    **serialize_dates(project.model_dump(mode="python")),
                    "updated_at": firestore.SERVER_TIMESTAMP,
                },
            )
        except Exception:
            return None
        return {"id": reference.id, **(reference.get().to_dict() or {})}

    def patch(self, project_id: str, updates: dict[str, Any]) -> dict[str, Any] | None:
        reference = self.collection.document(project_id)
        try:
            reference.update(
                {
                    **serialize_dates(updates),
                    "updated_at": firestore.SERVER_TIMESTAMP,
                },
            )
        except Exception:
            return None
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

    def list_page(self, cursor: str | None, limit: int):
        return paginate_collection(self.collection, "created_at", cursor, limit)

    def update(
        self,
        notification_id: str,
        update_data: NotificationUpdate,
    ) -> dict[str, Any] | None:
        reference = self.collection.document(notification_id)
        try:
            reference.update(
                {
                    **update_data.model_dump(exclude_unset=True),
                    "updated_at": firestore.SERVER_TIMESTAMP,
                },
            )
        except Exception:
            return None
        return {"id": reference.id, **(reference.get().to_dict() or {})}

    def delete(self, notification_id: str) -> bool:
        reference = self.collection.document(notification_id)
        if not reference.get().exists:
            return False
        reference.delete()
        return True

    def mark_all_read(self) -> int:
        batch = self.database.batch()
        count = 0
        for item in self.collection.where("unread", "==", True).stream():
            batch.update(item.reference, {
                "unread": False,
                "updated_at": firestore.SERVER_TIMESTAMP,
            })
            count += 1
        if count:
            batch.commit()
        return count
