"""API tests: GET /dashboard-overview aggregate."""

JOB_PAYLOAD = {
    "company": "Acme Corp",
    "role": "Frontend Engineer",
    "status": "Applied",
    "location": "Remote",
    "work_type": "Full-time",
    "salary": "$120k",
}

PROJECT_PAYLOAD = {
    "name": "StarWaves Web",
    "status": "Planning",
    "progress": 10,
    "members": 2,
    "technologies": ["React"],
}

TODO_PAYLOAD = {"title": "Overview todo"}


class TestDashboardOverview:
    def test_requires_auth(self, client, db):
        assert client.get("/api/v1/dashboard-overview").status_code == 401

    def test_empty_shape(self, auth_client):
        res = auth_client.get("/api/v1/dashboard-overview", params={"limit": 3})
        assert res.status_code == 200
        body = res.json()
        assert set(body) == {"jobs", "projects", "hackathons", "notifications", "contests", "todos", "documents"}
        for key in body:
            assert set(body[key]) == {"items", "next_cursor", "has_more"}
            assert isinstance(body[key]["items"], list)

    def test_includes_created_records(self, auth_client):
        assert auth_client.post("/api/v1/jobs", json=JOB_PAYLOAD).status_code == 201
        assert auth_client.post("/api/v1/projects", json=PROJECT_PAYLOAD).status_code == 201
        assert auth_client.post("/api/v1/todos", json=TODO_PAYLOAD).status_code == 201
        body = auth_client.get("/api/v1/dashboard-overview", params={"limit": 3}).json()
        assert any(j["company"] == "Acme Corp" for j in body["jobs"]["items"])
        assert any(p["name"] == "StarWaves Web" for p in body["projects"]["items"])
        assert any(t["title"] == "Overview todo" for t in body["todos"]["items"])

    def test_limit_validation(self, auth_client):
        assert auth_client.get("/api/v1/dashboard-overview", params={"limit": 0}).status_code == 422
        assert auth_client.get("/api/v1/dashboard-overview", params={"limit": 99}).status_code == 422

    def test_ownership_isolation(self, auth_client, other_user_headers):
        auth_client.post("/api/v1/jobs", json=JOB_PAYLOAD)
        other = auth_client.get("/api/v1/dashboard-overview", headers=other_user_headers).json()
        assert other["jobs"]["items"] == []

    def test_mutation_invalidates_overview(self, auth_client):
        before = auth_client.get("/api/v1/dashboard-overview", params={"limit": 3}).json()
        assert before["jobs"]["items"] == []
        auth_client.post("/api/v1/jobs", json=JOB_PAYLOAD)
        after = auth_client.get("/api/v1/dashboard-overview", params={"limit": 3}).json()
        assert len(after["jobs"]["items"]) == 1
