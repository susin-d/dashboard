"""Notification repository: workspace notification CRUD against Firestore."""

from datetime import datetime, timezone
from typing import Any

from firebase_admin import firestore
from google.cloud.firestore_v1 import Client

from app.repositories.pagination import paginate_collection, user_collection
from app.schemas.workspace import NotificationUpdate


class NotificationRepository:
    def __init__(self, database: Client, user_id: str):
        self.database = database
        self.user_id = user_id
        self.collection = user_collection(database, user_id, "notifications")

    def list_page(self, cursor: str | None, limit: int):
        return paginate_collection(self.collection, "created_at", cursor, limit)

    def get(self, notification_id: str) -> dict[str, Any] | None:
        snapshot = self.collection.document(notification_id).get()
        if not snapshot.exists:
            return None
        data = snapshot.to_dict() or {}
        if data.get("deleted"):
            return None
        return {"id": snapshot.id, **data}

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
        reference.update({
            "deleted": True,
            "deleted_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": firestore.SERVER_TIMESTAMP,
        })
        return True

    def restore(self, notification_id: str) -> bool:
        reference = self.collection.document(notification_id)
        if not reference.get().exists:
            return False
        reference.update({
            "deleted": False,
            "deleted_at": None,
            "updated_at": firestore.SERVER_TIMESTAMP,
        })
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
