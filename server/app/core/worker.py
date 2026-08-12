import logging
import threading
import time
from datetime import datetime, timezone
from typing import Any

from google.cloud.firestore_v1 import Client
from google.cloud.firestore_v1.base_query import FieldFilter

from app.db import get_firestore
from app.repositories.calls import CallRepository
from app.repositories.eve_schedules import EveScheduleRepository, list_all_due_schedules
from app.repositories.users import get_user_by_id
from app.schemas.call import CallUser
from app.services.eve import chat_with_eve
from app.services.notifications import send_call_notification

logger = logging.getLogger(__name__)


class ServerBackgroundWorker:
    """Persistent background daemon worker for long-running server deployments.

    Executes scheduled Eve tasks, triggers voice calls, and cleans up stale call
    sessions periodically without requiring external HTTP cron invocations.
    """

    def __init__(self, interval_seconds: int = 30):
        self.interval_seconds = interval_seconds
        self._stop_event = threading.Event()
        self._thread: threading.Thread | None = None
        self.database: Client | None = None

    def start(self):
        if self._thread and self._thread.is_alive():
            return
        self._stop_event.clear()
        self._thread = threading.Thread(
            target=self._run_loop,
            name="StarWavesBackgroundWorker",
            daemon=True,
        )
        self._thread.start()
        logger.info("StarWaves background worker thread started (interval=%ds).", self.interval_seconds)

    def stop(self, timeout: float = 5.0):
        if not self._thread or not self._thread.is_alive():
            return
        self._stop_event.set()
        self._thread.join(timeout=timeout)
        logger.info("StarWaves background worker thread stopped.")

    def _run_loop(self):
        # Obtain Firestore client for worker background thread
        try:
            self.database = get_firestore()
        except Exception as err:
            logger.warning("Worker could not connect to Firestore on startup: %s", err)

        while not self._stop_event.is_set():
            try:
                self.tick()
            except Exception as err:
                logger.error("Error during background worker tick: %s", err, exc_info=True)

            # Sleep in short increments to allow rapid shutdown response
            for _ in range(self.interval_seconds):
                if self._stop_event.is_set():
                    break
                time.sleep(1)

    def tick(self):
        if not self.database:
            try:
                self.database = get_firestore()
            except Exception:
                return

        self._execute_due_schedules()
        self._cleanup_stale_calls()

    def _execute_due_schedules(self):
        if not self.database:
            return
        due = list_all_due_schedules(self.database)
        if not due:
            return

        for schedule in due:
            if self._stop_event.is_set():
                break
            user_id = schedule.get("user_id")
            schedule_id = schedule.get("id")
            if not user_id or not schedule_id:
                continue

            user_record = get_user_by_id(self.database, user_id) or {
                "uid": user_id,
                "display_name": "User",
                "email": "",
            }
            action_type = schedule.get("action_type", "chat_prompt")
            prompt = schedule.get("prompt", "Scheduled action execution")
            title = schedule.get("title", "Automated Schedule")

            try:
                if action_type == "voice_call":
                    call_repo = CallRepository(self.database)
                    caller = CallUser(uid="eve-bot", name="Eve AI Assistant", email="eve@starwaves.app")
                    callee = CallUser(
                        uid=user_id,
                        name=user_record.get("display_name") or "User",
                        email=user_record.get("email") or "",
                    )
                    call = call_repo.create(caller=caller, callee=callee, mode="audio")
                    send_call_notification(
                        database=self.database,
                        target_user_id=user_id,
                        title=f"Incoming Eve Call ({title})",
                        message=prompt,
                        notification_type="call_incoming",
                        call_id=call["id"],
                    )
                else:
                    chat_with_eve(
                        database=self.database,
                        user=user_record,
                        messages=[{"role": "user", "content": f"[Automated Schedule: {title}] {prompt}"}],
                    )

                repo = EveScheduleRepository(self.database, user_id)
                repo.mark_executed(schedule_id)
                logger.info("Worker executed schedule '%s' (%s) for user %s.", title, schedule_id, user_id)
            except Exception as err:
                logger.error("Worker failed to execute schedule %s: %s", schedule_id, err)

    def _cleanup_stale_calls(self):
        if not self.database:
            return
        # Expire any calls stuck in ringing state across the system
        try:
            now_ts = datetime.now(timezone.utc).timestamp()
            query = self.database.collection("calls").where(filter=FieldFilter("status", "==", "ringing"))
            for doc in query.stream():
                data = doc.to_dict() or {}
                created_at = data.get("created_at")
                if hasattr(created_at, "timestamp") and (now_ts - created_at.timestamp()) > 45:
                    doc.reference.update({"status": "missed", "updated_at": firestore.SERVER_TIMESTAMP})
        except Exception:
            pass


# Global singleton worker for server application lifetime
server_worker = ServerBackgroundWorker(interval_seconds=30)
