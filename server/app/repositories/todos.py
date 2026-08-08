from datetime import datetime, timezone

from firebase_admin import firestore
from google.cloud.firestore_v1 import Client

from app.schemas.todo import TodoCreate, TodoResponse, TodoUpdate


def collection(database: Client, user_id: str):
    return database.collection("users").document(user_id).collection("todos")


def from_snapshot(snapshot) -> TodoResponse:
    return TodoResponse(id=snapshot.id, **(snapshot.to_dict() or {}))


def values_for_firestore(values: dict) -> dict:
    if values.get("due_date") is not None:
        values["due_date"] = values["due_date"].isoformat()
    return values


def list_todos(database: Client, user_id: str) -> list[TodoResponse]:
    query = collection(database, user_id).order_by(
        "created_at",
        direction=firestore.Query.DESCENDING,
    )
    results = []
    for snapshot in query.stream():
        data = snapshot.to_dict() or {}
        if not data.get("deleted"):
            results.append(from_snapshot(snapshot))
    return results


def create_todo(
    database: Client,
    user_id: str,
    todo: TodoCreate,
) -> TodoResponse:
    reference = collection(database, user_id).document()
    now = datetime.now(timezone.utc).isoformat()
    data = values_for_firestore(todo.model_dump(mode="python"))
    reference.set(
        {
            **data,
            "created_at": firestore.SERVER_TIMESTAMP,
            "updated_at": firestore.SERVER_TIMESTAMP,
        },
    )
    return TodoResponse(id=reference.id, **data, created_at=now, updated_at=now)


def update_todo(
    database: Client,
    user_id: str,
    todo_id: str,
    changes: TodoUpdate,
) -> TodoResponse | None:
    reference = collection(database, user_id).document(todo_id)
    try:
        reference.update(
            {
                **values_for_firestore(
                    changes.model_dump(exclude_unset=True, mode="python"),
                ),
                "updated_at": firestore.SERVER_TIMESTAMP,
            },
        )
    except Exception:
        return None
    return from_snapshot(reference.get())


def delete_todo(database: Client, user_id: str, todo_id: str) -> bool:
    reference = collection(database, user_id).document(todo_id)
    if not reference.get().exists:
        return False
    reference.update({
        "deleted": True,
        "deleted_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": firestore.SERVER_TIMESTAMP,
    })
    return True


def restore_todo(database: Client, user_id: str, todo_id: str) -> bool:
    reference = collection(database, user_id).document(todo_id)
    if not reference.get().exists:
        return False
    reference.update({
        "deleted": False,
        "deleted_at": None,
        "updated_at": firestore.SERVER_TIMESTAMP,
    })
    return True

