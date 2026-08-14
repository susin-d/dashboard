import logging
import threading
import time
from datetime import datetime, timezone
from typing import Any

from google.cloud import firestore
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


class EveSchedulesBackgroundJob:
    """GCP Server Job: Evaluates and executes due Eve schedules & voice calls every 30s."""

    def __init__(self, interval_seconds: int = 30):
        self.interval_seconds = interval_seconds
        self.last_run_ts: float = 0.0

    def should_run(self, current_ts: float) -> bool:
        return (current_ts - self.last_run_ts) >= self.interval_seconds

    def run(self, database: Client, stop_event: threading.Event):
        self.last_run_ts = time.time()
        due = list_all_due_schedules(database)
        if not due:
            return

        for schedule in due:
            if stop_event.is_set():
                break
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
                logger.info("GCP Worker executed schedule '%s' (%s) for user %s.", title, schedule_id, user_id)
            except Exception as err:
                logger.error("GCP Worker failed to execute schedule %s: %s", schedule_id, err)


class StaleCallsBackgroundJob:
    """GCP Server Job: Cleans up stuck ringing calls every 15s."""

    def __init__(self, interval_seconds: int = 15):
        self.interval_seconds = interval_seconds
        self.last_run_ts: float = 0.0

    def should_run(self, current_ts: float) -> bool:
        return (current_ts - self.last_run_ts) >= self.interval_seconds

    def run(self, database: Client, stop_event: threading.Event):
        self.last_run_ts = time.time()
        try:
            now_ts = datetime.now(timezone.utc).timestamp()
            query = database.collection("calls").where(filter=FieldFilter("status", "==", "ringing"))
            for doc in query.stream():
                if stop_event.is_set():
                    break
                data = doc.to_dict() or {}
                created_at = data.get("created_at")
                if hasattr(created_at, "timestamp") and (now_ts - created_at.timestamp()) > 45:
                    doc.reference.update({"status": "missed", "updated_at": firestore.SERVER_TIMESTAMP})
        except Exception as err:
            logger.warning("GCP Worker stale calls error: %s", err)


class MaintenanceBackgroundJob:
    """GCP Server Job: Workspace cleanup & maintenance job running hourly."""

    def __init__(self, interval_seconds: int = 3600):
        self.interval_seconds = interval_seconds
        self.last_run_ts: float = 0.0

    def should_run(self, current_ts: float) -> bool:
        return (current_ts - self.last_run_ts) >= self.interval_seconds

    def run(self, database: Client, stop_event: threading.Event):
        self.last_run_ts = time.time()
        try:
            now_ts = datetime.now(timezone.utc).timestamp()
            thirty_days_ago = now_ts - (30 * 86400)
            query = database.collection_group("notifications").where(filter=FieldFilter("read", "==", True))
            for doc in query.stream():
                if stop_event.is_set():
                    break
                data = doc.to_dict() or {}
                created_at = data.get("created_at")
                if hasattr(created_at, "timestamp") and created_at.timestamp() < thirty_days_ago:
                    doc.reference.delete()
        except Exception as err:
            logger.warning("GCP Worker maintenance notice: %s", err)


class ServerBackgroundWorker:
    """Persistent background daemon worker for GCP Server / long-running environments.

    Runs dedicated independent background jobs (EveSchedules, StaleCalls, Maintenance)
    each on their own configured cadence and schedule.
    """

    def __init__(
        self,
        jobs: list[Any] | None = None,
        poll_interval: int = 5,
        interval_seconds: int | None = None,
    ):
        self._stop_event = threading.Event()
        self._thread: threading.Thread | None = None
        self.database: Client | None = None
        self.poll_interval = interval_seconds or poll_interval
        self.jobs = jobs or [
            EveSchedulesBackgroundJob(interval_seconds=30),
            StaleCallsBackgroundJob(interval_seconds=15),
            MaintenanceBackgroundJob(interval_seconds=3600),
        ]

    def start(self):
        if self._thread and self._thread.is_alive():
            return
        self._stop_event.clear()
        self._thread = threading.Thread(
            target=self._run_loop,
            name="StarWavesGCPBackgroundWorker",
            daemon=True,
        )
        self._thread.start()
        logger.info("StarWaves GCP background worker daemon started with %d individual jobs.", len(self.jobs))

    def stop(self, timeout: float = 5.0):
        if not self._thread or not self._thread.is_alive():
            return
        self._stop_event.set()
        self._thread.join(timeout=timeout)
        logger.info("StarWaves GCP background worker daemon stopped.")

    def _run_loop(self):
        try:
            self.database = get_firestore()
        except Exception as err:
            logger.warning("Worker could not connect to Firestore on startup: %s", err)

        while not self._stop_event.is_set():
            try:
                self.tick()
            except Exception as err:
                logger.error("Error during GCP worker tick: %s", err, exc_info=True)

            # Sleep in short increments to allow graceful shutdown
            for _ in range(5):
                if self._stop_event.is_set():
                    break
                time.sleep(1)

    def tick(self):
        if not self.database:
            try:
                self.database = get_firestore()
            except Exception:
                return

        now = time.time()
        for job in self.jobs:
            if self._stop_event.is_set():
                break
            if job.should_run(now):
                try:
                    job.run(self.database, self._stop_event)
                except Exception as err:
                    logger.error("Error running GCP background job %s: %s", job.__class__.__name__, err)


# Global singleton worker for server application lifetime
server_worker = ServerBackgroundWorker()
