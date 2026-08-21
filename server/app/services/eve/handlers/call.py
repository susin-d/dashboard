"""Call handlers — single responsibility: Eve voice call trigger."""

from google.cloud.firestore_v1 import Client


def handle_trigger_eve_call(database: Client, user_id: str, arguments: dict) -> tuple[dict, None, dict]:
    from app.repositories.calls import CallRepository
    from app.repositories.users import get_user_by_id
    from app.schemas.call import CallUser
    from app.services.notifications import send_call_notification

    user_record = get_user_by_id(database, user_id) or {"uid": user_id, "display_name": "User", "email": ""}
    callee_user = CallUser(
        uid=user_id,
        name=user_record.get("display_name") or "User",
        email=user_record.get("email") or "",
    )
    repo = CallRepository(database)
    call = repo.create(
        caller=CallUser(uid="eve-bot", name="Eve AI Assistant", email="eve@starwaves.app"),
        callee=callee_user,
        mode=arguments.get("mode", "audio"),
    )
    send_call_notification(
        database=database,
        target_user_id=user_id,
        title="Incoming Eve Call",
        message="Incoming voice call from Eve AI Assistant",
        notification_type="call_incoming",
        call_id=call["id"],
    )
    return {
        "call_id": call["id"],
        "status": "ringing",
        "message": "Eve is initiating a voice call to you now.",
    }, None, {"type": "trigger_eve_call", "call_id": call["id"]}
