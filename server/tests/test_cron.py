import unittest
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from app.api.routes.cron import send_due_notifications
from app.core.config import settings
from app.db import get_firestore
from app.main import app


class TestNotificationCron(unittest.TestCase):
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

    def test_requires_cron_secret(self):
        response = self.client.post("/api/v1/cron/send-notifications")
        self.assertEqual(response.status_code, 401)

    @patch("app.api.routes.cron.send_multicast_notification")
    def test_sends_due_notification_and_marks_it_sent(self, send_notification):
        database = MagicMock()
        document = MagicMock()
        document.to_dict.return_value = {
            "scheduled_at": datetime(2020, 1, 1, tzinfo=timezone.utc),
            "title": "Title",
            "body": "Body",
        }
        document.reference.parent.parent = MagicMock()
        device = MagicMock()
        device.to_dict.return_value = {"token": "device-token"}
        database.collection_group.return_value.stream.return_value = [document]
        document.reference.parent.parent.collection.return_value.stream.return_value = [device]
        send_notification.return_value = {"success_count": 1, "failure_count": 0}

        result = send_due_notifications(database)

        self.assertEqual(result, {"processed": 1, "sent": 1, "failed": 0})
        document.reference.update.assert_called_once()


if __name__ == "__main__":
    unittest.main()
