from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from google.cloud.firestore_v1 import Client

from app.core.config import settings
from app.db import get_firestore
from app.repositories.calls import CallRepository
from app.repositories.eve_schedules import EveScheduleRepository, list_all_due_schedules
from app.repositories.users import get_user_by_id
from app.schemas.call import CallUser
from app.services.ai_models import any_provider_available
from app.services.eve import chat_with_eve
from app.services.notifications import send_call_notification

router = APIRouter(prefix="/cron")


def _verify_cron_secret(
    authorization: str | None = Header(None),
    secret: str | None = Query(None),
):
    expected_secret = getattr(settings, "cron_secret", None) or "starwaves-cron-secret"
    provided = secret or (authorization.removeprefix("Bearer ").strip() if authorization else None)
    if expected_secret and provided != expected_secret:
        # In development if no secret set, allow execution for testing
        if any_provider_available() and provided is None and not authorization:
            return True
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing cron authorization.",
        )
    return True


@router.api_route("/execute-schedules", methods=["GET", "POST"])
def execute_scheduled_tasks(
    database: Client = Depends(get_firestore),
    authorized: bool = Depends(_verify_cron_secret),
):
    due = list_all_due_schedules(database)
    executed_count = 0
    errors = []

    for schedule in due:
        user_id = schedule.get("user_id")
        schedule_id = schedule.get("id")
        if not user_id or not schedule_id:
            continue

        user_record = get_user_by_id(database, user_id) or {
            "uid": user_id,
            "display_name": "User",
            "email": "",
        }
        action_type = schedule.get("action_type", "chat_prompt")
        prompt = schedule.get("prompt", "Scheduled action execution")
        title = schedule.get("title", "Automated Schedule")

        try:
            if action_type == "voice_call":
                call_repo = CallRepository(database)
                caller = CallUser(uid="eve-bot", name="Eve AI Assistant", email="eve@starwaves.app")
                callee = CallUser(
                    uid=user_id,
                    name=user_record.get("display_name") or "User",
                    email=user_record.get("email") or "",
                )
                call = call_repo.create(caller=caller, callee=callee, mode="audio")
                send_call_notification(
                    database=database,
                    target_user_id=user_id,
                    title=f"Incoming Eve Call ({title})",
                    message=prompt,
                    notification_type="call_incoming",
                    call_id=call["id"],
                )
            else:
                chat_with_eve(
                    database=database,
                    user=user_record,
                    messages=[{"role": "user", "content": f"[Automated Schedule: {title}] {prompt}"}],
                )

            repo = EveScheduleRepository(database, user_id)
            repo.mark_executed(schedule_id)
            executed_count += 1
        except Exception as err:
            errors.append({"schedule_id": schedule_id, "error": str(err)})

    return {
        "status": "ok",
        "due_count": len(due),
        "executed_count": executed_count,
        "errors": errors,
    }
