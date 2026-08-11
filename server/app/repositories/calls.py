"""Call repository: WebRTC call records and signaling against Firestore.

Call documents are shared between exactly two participants, so they live in a
top-level ``calls`` collection (not under a single user). Signaling is
exchanged by appending short messages to the ``messages`` array on the call
document; both participants poll ``GET /calls/{call_id}`` for new messages.
"""

import uuid
from datetime import datetime, timezone

from firebase_admin import firestore
from google.cloud.firestore_v1 import Client

from app.schemas.call import CallUser

CALL_STATUSES = {"ringing", "active", "declined", "ended", "missed"}
SIGNAL_TYPES = {"offer", "answer", "ice-candidate"}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class CallRepository:
    def __init__(self, database: Client):
        self.database = database
        self.collection = database.collection("calls")

    def _document(self, call_id: str):
        return self.collection.document(call_id)

    def create(self, caller: CallUser, callee: CallUser, mode: str) -> dict:
        call_id = uuid.uuid4().hex
        data = {
            "caller": caller.model_dump(),
            "callee": callee.model_dump(),
            "participants": [caller.uid, callee.uid],
            "mode": mode,
            "status": "ringing",
            "messages": [],
            "created_at": _now_iso(),
            "updated_at": _now_iso(),
        }
        self._document(call_id).set(data)
        return {**data, "id": call_id}

    def get(self, call_id: str) -> dict | None:
        doc = self._document(call_id).get()
        if not doc.exists:
            return None
        data = doc.to_dict()
        data["id"] = doc.id
        return data

    def append_signal(
        self,
        call_id: str,
        from_uid: str,
        signal_type: str,
        payload: str,
    ) -> dict | None:
        if signal_type not in SIGNAL_TYPES:
            raise ValueError(f"Unknown signal type '{signal_type}'.")
        reference = self._document(call_id)
        if not reference.get().exists:
            return None
        message = {
            "id": uuid.uuid4().hex,
            "from_uid": from_uid,
            "type": signal_type,
            "payload": payload,
            "created_at": _now_iso(),
        }
        reference.update(
            {
                "messages": firestore.ArrayUnion([message]),
                "updated_at": _now_iso(),
            },
        )
        return message

    def update_status(self, call_id: str, status: str) -> dict | None:
        if status not in CALL_STATUSES:
            raise ValueError(f"Unknown call status '{status}'.")
        reference = self._document(call_id)
        if not reference.get().exists:
            return None
        reference.update({"status": status, "updated_at": _now_iso()})
        return self.get(call_id)

    def list_recent(self, uid: str, limit: int) -> list[dict]:
        calls = self._calls_for_user(uid, limit * 2)
        calls.sort(key=lambda call: call.get("updated_at") or "", reverse=True)
        return calls[:limit]

    def list_incoming(self, uid: str, limit: int = 10) -> list[dict]:
        calls = []
        for call in self._calls_for_user(uid, limit * 3):
            if call.get("status") == "ringing" and call.get("callee", {}).get("uid") == uid:
                calls.append(call)
        calls.sort(key=lambda call: call.get("updated_at") or "", reverse=True)
        return calls[:limit]

    def _calls_for_user(self, uid: str, limit: int) -> list[dict]:
        docs = self.collection.where(
            "participants",
            "array_contains",
            uid,
        ).limit(limit).stream()
        calls = []
        for doc in docs:
            data = doc.to_dict()
            data["id"] = doc.id
            calls.append(data)
        return calls