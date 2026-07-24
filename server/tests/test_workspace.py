import unittest
from unittest.mock import MagicMock
from fastapi.testclient import TestClient

from app.main import app
from app.core.auth import get_current_user
from app.db import get_firestore

mock_user = {"uid": "test-user-123", "email": "test@example.com"}
mock_db = MagicMock()


def override_get_current_user():
    return mock_user


def override_get_firestore():
    return mock_db


app.dependency_overrides[get_current_user] = override_get_current_user
app.dependency_overrides[get_firestore] = override_get_firestore

client = TestClient(app)


class TestWorkspaceEndpoints(unittest.TestCase):
    def test_health_check(self):
        response = client.get("/api/v1/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "ok")

    def test_list_jobs_mocked(self):
        mock_collection = MagicMock()
        mock_query = MagicMock()
        mock_query.stream.return_value = []
        mock_collection.order_by.return_value = mock_query
        mock_db.collection.return_value.document.return_value.collection.return_value = mock_collection

        response = client.get("/api/v1/jobs")
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.json(), list)

    def test_create_job_mocked(self):
        mock_doc_ref = MagicMock()
        mock_doc_ref.id = "job-999"
        mock_doc_ref.get.return_value.to_dict.return_value = {
            "company": "Acme Corp",
            "role": "Frontend Engineer",
            "status": "Applied",
            "location": "Remote",
            "work_type": "Full-time",
            "salary": "$120k",
            "resume_id": "",
            "job_url": "",
            "notes": "",
        }

        mock_collection = MagicMock()
        mock_collection.document.return_value = mock_doc_ref
        mock_db.collection.return_value.document.return_value.collection.return_value = mock_collection

        payload = {
            "company": "Acme Corp",
            "role": "Frontend Engineer",
            "status": "Applied",
            "location": "Remote",
            "work_type": "Full-time",
            "salary": "$120k",
        }
        response = client.post("/api/v1/jobs", json=payload)
        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertEqual(data["id"], "job-999")
        self.assertEqual(data["company"], "Acme Corp")

    def test_delete_job_mocked(self):
        mock_doc_ref = MagicMock()
        mock_doc_ref.get.return_value.exists = True
        mock_collection = MagicMock()
        mock_collection.document.return_value = mock_doc_ref
        mock_db.collection.return_value.document.return_value.collection.return_value = mock_collection

        response = client.delete("/api/v1/jobs/job-999")
        self.assertEqual(response.status_code, 204)

    def test_mark_all_notifications_read(self):
        mock_collection = MagicMock()
        mock_collection.where.return_value.stream.return_value = []
        mock_db.collection.return_value.document.return_value.collection.return_value = mock_collection

        response = client.post("/api/v1/notifications/mark-all-read")
        self.assertEqual(response.status_code, 200)
        self.assertIn("updated", response.json())


if __name__ == "__main__":
    unittest.main()
