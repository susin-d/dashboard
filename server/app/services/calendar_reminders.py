import asyncio
import logging
from datetime import datetime, timedelta, timezone
from typing import Any

from google.cloud.firestore_v1 import Client

from app.services.contests import ContestService
from app.services.email import send_reminder_email
from app.services.google_calendar import (
    decrypt_google_token,
    google_calendar_data,
    refresh_google_token,
)
from app.services.hackathon_sources import fetch_enabled_hackathons

logger = logging.getLogger(__name__)


def parse_datetime(val: Any) -> datetime | None:
    if not val:
        return None
    if isinstance(val, datetime):
        return val if val.tzinfo else val.replace(tzinfo=timezone.utc)
    if isinstance(val, (int, float)):
        try:
            return datetime.fromtimestamp(val, tz=timezone.utc)
        except Exception:
            return None
    if isinstance(val, str):
        val = val.strip()
        if not val:
            return None
        val = val.replace("Z", "+00:00")
        try:
            parsed = datetime.fromisoformat(val)
            return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
        except ValueError:
            pass
        try:
            parsed = datetime.strptime(val, "%Y-%m-%d")
            return parsed.replace(tzinfo=timezone.utc)
        except ValueError:
            pass
        try:
            parsed = datetime.strptime(val, "%Y-%m-%d %H:%M:%S")
            return parsed.replace(tzinfo=timezone.utc)
        except ValueError:
            pass
    return None


def sanitize_doc_id(raw_id: str) -> str:
    return "".join(c if c.isalnum() or c in ("-", "_") else "_" for c in raw_id)[:100]


async def fetch_user_google_calendar_events(database: Client, user_id: str) -> list[dict[str, Any]]:
    events = []
    accounts_ref = (
        database.collection("users")
        .document(user_id)
        .collection("integrations")
        .document("google_calendar")
        .collection("accounts")
    )
    accounts = accounts_ref.stream()

    for acc_doc in accounts:
        acc_data = acc_doc.to_dict() or {}
        refresh_tok = acc_data.get("refresh_token")
        if not refresh_tok:
            continue
        try:
            decrypted_tok = decrypt_google_token(refresh_tok)
            access_tok = await refresh_google_token(decrypted_tok)
            cal_data = await google_calendar_data(access_tok)
            for evt in cal_data.get("events", []):
                events.append({
                    "id": f"google_{evt['id']}",
                    "title": evt.get("title", "(Untitled Event)"),
                    "start": evt.get("start"),
                    "description": evt.get("description") or f"Calendar: {evt.get('calendarName', 'Google Calendar')}",
                    "source": "Google Calendar",
                })
        except Exception as exc:
            logger.warning("Error fetching Google Calendar for user %s: %s", user_id, exc)

    return events


def fetch_user_todo_events(database: Client, user_id: str) -> list[dict[str, Any]]:
    events = []
    todos_ref = database.collection("users").document(user_id).collection("todos")
    for doc in todos_ref.stream():
        data = doc.to_dict() or {}
        if data.get("completed") is True or data.get("deleted") is True:
            continue
        due_val = data.get("due_date") or data.get("dueDate") or data.get("scheduled_at")
        if not due_val:
            continue
        events.append({
            "id": f"todo_{doc.id}",
            "title": data.get("title", "Todo Task"),
            "start": due_val,
            "description": data.get("description") or "StarWaves Task",
            "source": "To-Do List",
        })
    return events


def fetch_user_job_events(database: Client, user_id: str) -> list[dict[str, Any]]:
    events = []
    jobs_ref = database.collection("users").document(user_id).collection("jobs")
    for doc in jobs_ref.stream():
        data = doc.to_dict() or {}
        if data.get("deleted") is True:
            continue
        company = data.get("company", "Company")
        role = data.get("role", "Role")
        interview_date = data.get("interviewDate")
        deadline = data.get("deadline")

        if interview_date:
            events.append({
                "id": f"job_interview_{doc.id}",
                "title": f"Job Interview: {role} at {company}",
                "start": interview_date,
                "description": f"Interview scheduled for {role} position at {company}.",
                "source": "Jobs Tracker",
            })
        if deadline:
            events.append({
                "id": f"job_deadline_{doc.id}",
                "title": f"Job Application Deadline: {role} at {company}",
                "start": deadline,
                "description": f"Application deadline for {role} position at {company}.",
                "source": "Jobs Tracker",
            })
    return events


async def fetch_global_calendar_events() -> list[dict[str, Any]]:
    events = []
    try:
        contest_sites = await ContestService.fetch_contests()
        for site_info in contest_sites:
            site_name = site_info.get("site", "Coding Contest")
            for contest in site_info.get("contests", []):
                start_val = contest.get("start_time")
                if not start_val:
                    continue
                contest_title = contest.get("title", "Contest")
                events.append({
                    "id": f"contest_{sanitize_doc_id(contest_title)}",
                    "title": f"Coding Contest: {contest_title}",
                    "start": start_val,
                    "description": f"Platform: {site_name}. Duration: {contest.get('duration', 'N/A')}.",
                    "source": "Competitive Coding",
                })
    except Exception as exc:
        logger.warning("Error fetching contests for calendar reminders: %s", exc)

    try:
        hackathons = await fetch_enabled_hackathons(["devpost", "unstop", "mlh"])
        for hack in hackathons:
            start_val = hack.get("starts_at")
            if not start_val:
                continue
            hack_title = hack.get("title", "Hackathon")
            events.append({
                "id": f"hackathon_{hack.get('id', sanitize_doc_id(hack_title))}",
                "title": f"Hackathon: {hack_title}",
                "start": start_val,
                "description": f"Organizer: {hack.get('organizer', 'Hackathon')}. Mode: {hack.get('mode', 'Online')}.",
                "source": "Hackathons",
            })
    except Exception as exc:
        logger.warning("Error fetching hackathons for calendar reminders: %s", exc)

    return events


async def process_user_calendar_reminders(database: Client) -> dict[str, int]:
    now = datetime.now(timezone.utc)
    processed_users = 0
    reminders_sent = 0
    failed_reminders = 0

    global_events = await fetch_global_calendar_events()
    user_docs = list(database.collection("users").limit(100).stream())

    for user_doc in user_docs:
        user_data = user_doc.to_dict() or {}
        user_id = user_doc.id
        user_email = user_data.get("email")
        if not user_email:
            continue

        processed_users += 1
        user_name = user_data.get("display_name") or user_data.get("name") or user_email.split("@")[0]

        google_events = await fetch_user_google_calendar_events(database, user_id)
        todo_events = fetch_user_todo_events(database, user_id)
        job_events = fetch_user_job_events(database, user_id)

        all_events = global_events + google_events + todo_events + job_events

        sent_reminders_ref = (
            database.collection("users")
            .document(user_id)
            .collection("sent_calendar_reminders")
        )

        for event in all_events:
            event_id = event["id"]
            start_dt = parse_datetime(event["start"])
            if not start_dt:
                continue

            delta_seconds = (start_dt - now).total_seconds()
            if delta_seconds <= 0:
                continue

            is_next_day = 20 * 3600 <= delta_seconds <= 28 * 3600 or (
                start_dt.date() == (now + timedelta(days=1)).date() and delta_seconds <= 36 * 3600
            )
            is_one_hour = 0 < delta_seconds <= 3600

            window_types = []
            if is_next_day:
                window_types.append("next_day")
            if is_one_hour:
                window_types.append("1h")

            for window in window_types:
                doc_key = sanitize_doc_id(f"{event_id}_{window}")
                sent_doc_ref = sent_reminders_ref.document(doc_key)
                if sent_doc_ref.get().exists:
                    continue

                if window == "next_day":
                    reminder_type = "Calendar Reminder - Next Day"
                    due_time_str = f"Tomorrow at {start_dt.strftime('%I:%M %p UTC')}"
                else:
                    reminder_type = "Calendar Reminder - 1 Hour Away"
                    minutes_left = max(1, int(delta_seconds // 60))
                    due_time_str = f"In {minutes_left} minutes ({start_dt.strftime('%I:%M %p UTC')})"

                description_text = f"Source: {event['source']}. {event['description']}"

                try:
                    success = send_reminder_email(
                        to_email=user_email,
                        user_name=user_name,
                        reminder_title=event["title"],
                        reminder_type=reminder_type,
                        due_time=due_time_str,
                        description=description_text,
                    )
                    if success:
                        reminders_sent += 1
                        sent_doc_ref.set({
                            "event_id": event_id,
                            "window": window,
                            "event_title": event["title"],
                            "start_time": start_dt.isoformat(),
                            "sent_at": datetime.now(timezone.utc),
                        })
                    else:
                        failed_reminders += 1
                except Exception as exc:
                    logger.error("Failed to send calendar reminder email to %s: %s", user_email, exc)
                    failed_reminders += 1

    return {
        "processed_users": processed_users,
        "reminders_sent": reminders_sent,
        "failed_reminders": failed_reminders,
    }
