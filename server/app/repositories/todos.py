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
    return [from_snapshot(snapshot) for snapshot in query.stream()]


def create_todo(
    database: Client,
    user_id: str,
    todo: TodoCreate,
) -> TodoResponse:
    reference = collection(database, user_id).document()
    reference.set(
        {
            **values_for_firestore(todo.model_dump(mode="python")),
            "created_at": firestore.SERVER_TIMESTAMP,
            "updated_at": firestore.SERVER_TIMESTAMP,
        },
    )
    return from_snapshot(reference.get())


def update_todo(
    database: Client,
    user_id: str,
    todo_id: str,
    changes: TodoUpdate,
) -> TodoResponse | None:
    reference = collection(database, user_id).document(todo_id)
    if not reference.get().exists:
        return None
    reference.update(
        {
            **values_for_firestore(
                changes.model_dump(exclude_unset=True, mode="python"),
            ),
            "updated_at": firestore.SERVER_TIMESTAMP,
        },
    )
    return from_snapshot(reference.get())


def delete_todo(database: Client, user_id: str, todo_id: str) -> bool:
    reference = collection(database, user_id).document(todo_id)
    if not reference.get().exists:
        return False
    reference.delete()
    return True
