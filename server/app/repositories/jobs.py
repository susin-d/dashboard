"""Job repository: workspace job CRUD against Firestore."""

from datetime import datetime, timezone
from typing import Any

from firebase_admin import firestore
from google.cloud.firestore_v1 import Client

from app.repositories.pagination import paginate_collection, serialize_dates, user_collection
from app.schemas.workspace import JobCreate


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
        reference.update({
            "deleted": True,
            "deleted_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": firestore.SERVER_TIMESTAMP,
        })
        return True

    def restore(self, job_id: str) -> bool:
        reference = self.collection.document(job_id)
        if not reference.get().exists:
            return False
        reference.update({
            "deleted": False,
            "deleted_at": None,
            "updated_at": firestore.SERVER_TIMESTAMP,
        })
        return True
