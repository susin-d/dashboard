import unittest
from fastapi.testclient import TestClient

from app.main import app
from app.core.auth import get_current_user
from app.services import prompts as prompt_catalog

mock_user = {"uid": "test-user-123", "email": "test@example.com"}


class TestPromptsEndpoint(unittest.TestCase):
    def setUp(self):
        self._prev_user = app.dependency_overrides.get(get_current_user)
        app.dependency_overrides[get_current_user] = lambda: mock_user
        self.client = TestClient(app)

    def tearDown(self):
        if self._prev_user is None:
            app.dependency_overrides.pop(get_current_user, None)
        else:
            app.dependency_overrides[get_current_user] = self._prev_user

    def test_prompts_returns_catalog(self):
        response = self.client.get("/api/v1/prompts")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data["presets"]), len(prompt_catalog.PRESET_PROMPTS))
        self.assertEqual(len(data["tools"]), len(prompt_catalog.TOOLS_LIST))
        self.assertEqual(len(data["studio_templates"]), len(prompt_catalog.STUDIO_TEMPLATES))
        self.assertEqual(data["starters"]["page"], prompt_catalog.EVE_STARTER_MESSAGE)
        self.assertEqual(data["starters"]["modal"], prompt_catalog.EVE_MODAL_STARTER_MESSAGE)
        commands = [item["command"] for item in data["presets"]]
        self.assertIn("call", commands)
        self.assertTrue(all(item["prompt"] for item in data["presets"]))

    def test_prompts_requires_auth(self):
        app.dependency_overrides.pop(get_current_user, None)
        try:
            response = self.client.get("/api/v1/prompts")
            self.assertIn(response.status_code, (401, 403))
        finally:
            app.dependency_overrides[get_current_user] = lambda: mock_user
