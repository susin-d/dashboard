"""Project repository: workspace project CRUD against Firestore."""

from datetime import datetime, timezone
from typing import Any

from firebase_admin import firestore
from google.cloud.firestore_v1 import Client

from app.repositories.pagination import paginate_collection, serialize_dates, user_collection
from app.schemas.workspace import ProjectCreate


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
        reference.update({
            "deleted": True,
            "deleted_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": firestore.SERVER_TIMESTAMP,
        })
        return True

    def restore(self, project_id: str) -> bool:
        reference = self.collection.document(project_id)
        if not reference.get().exists:
            return False
        reference.update({
            "deleted": False,
            "deleted_at": None,
            "updated_at": firestore.SERVER_TIMESTAMP,
        })
        return True
