import unittest
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi.testclient import TestClient

from app.core.config import settings
from app.db import get_firestore
from app.main import app
from app.services.calendar_reminders import (
    parse_datetime,
    process_user_calendar_reminders,
    sanitize_doc_id,
)


class TestCalendarReminders(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.original_secret = settings.cron_secret
        self.original_firestore_override = app.dependency_overrides.get(get_firestore)
        object.__setattr__(settings, "cron_secret", "test-cron-secret")

    def tearDown(self):
        object.__setattr__(settings, "cron_secret", self.original_secret)
        if self.original_firestore_override:
            app.dependency_overrides[get_firestore] = self.original_firestore_override
        else:
            app.dependency_overrides.pop(get_firestore, None)

    def test_parse_datetime(self):
        now = datetime.now(timezone.utc)
        self.assertIsNotNone(parse_datetime(now.isoformat()))
        self.assertIsNotNone(parse_datetime("2026-08-09T10:00:00Z"))
        self.assertIsNotNone(parse_datetime("2026-08-09"))
        self.assertIsNotNone(parse_datetime("2026-08-09 10:00:00"))
        self.assertIsNone(parse_datetime(None))

    def test_sanitize_doc_id(self):
        self.assertEqual(sanitize_doc_id("test/event@123!"), "test_event_123_")

    def test_cron_endpoint_auth_required(self):
        response = self.client.post("/api/v1/cron/send-calendar-reminders")
        self.assertEqual(response.status_code, 401)

    @patch("app.services.calendar_reminders.send_reminder_email")
    @patch("app.services.calendar_reminders.fetch_global_calendar_events", new_callable=AsyncMock)
    async def test_process_user_calendar_reminders(self, mock_global_events, mock_send_email):
        now = datetime.now(timezone.utc)
        next_day_event = {
            "id": "event_next_day_1",
            "title": "Tomorrow Meeting",
            "start": (now + timedelta(hours=24)).isoformat(),
            "description": "Important sync",
            "source": "Google Calendar",
        }
        one_hour_event = {
            "id": "event_1h_1",
            "title": "Urgent Sync",
            "start": (now + timedelta(minutes=45)).isoformat(),
            "description": "Starting soon",
            "source": "Tasks",
        }
        mock_global_events.return_value = [next_day_event, one_hour_event]
        mock_send_email.return_value = True

        database = MagicMock()
        user_doc = MagicMock()
        user_doc.id = "user_123"
        user_doc.to_dict.return_value = {
            "email": "user@example.com",
            "display_name": "Test User",
        }
        database.collection.return_value.limit.return_value.stream.return_value = [user_doc]

        # Mock sent_calendar_reminders check
        sent_doc = MagicMock()
        sent_doc.get.return_value.exists = False
        database.collection.return_value.document.return_value.collection.return_value.document.return_value = sent_doc

        result = await process_user_calendar_reminders(database)
        self.assertEqual(result["processed_users"], 1)
        self.assertGreaterEqual(result["reminders_sent"], 2)


if __name__ == "__main__":
    unittest.main()
