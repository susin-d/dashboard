import asyncio
import time
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, Depends, HTTPException, Response, status
from firebase_admin import firestore
from google.cloud.firestore_v1 import Client

from app.core.auth import get_current_user
from app.db import get_firestore
from app.repositories import (
    JobRepository,
    NotificationRepository,
    ProjectRepository,
)
from app.schemas.workspace import (
    HackathonCreate,
    HackathonResponse,
    HackathonUpdate,
    JobCreate,
    JobResponse,
    JobUpdate,
    NotificationResponse,
    NotificationUpdate,
    ProjectCreate,
    ProjectResponse,
    ProjectUpdate,
)
from app.services.hackathon_sources import (
    SOURCE_CATALOG,
    SOURCE_IDS,
    fetch_enabled_hackathons,
)

router = APIRouter()
CONTEST_CACHE_TTL = 10 * 60
_contest_cache: tuple[float, list[dict]] | None = None
CONTEST_REQUEST_TIMEOUT = httpx.Timeout(8.0, connect=2.0)


def duration_label(seconds: int) -> str:
    hours, remainder = divmod(seconds, 3600)
    minutes = remainder // 60
    return " ".join(
        part
        for part in (
            f"{hours}h" if hours else "",
            f"{minutes}m" if minutes else "",
        )
        if part
    )


def user_collection(database: Client, user_id: str, name: str):
    return database.collection("users").document(user_id).collection(name)


def hackathon_settings_reference(database: Client, user_id: str):
    return (
        database.collection("users")
        .document(user_id)
        .collection("settings")
        .document("hackathon_sources")
    )


# --- Jobs Routes ---

@router.get("/jobs", response_model=list[JobResponse])
def list_jobs(
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    repository = JobRepository(database, user["uid"])
    return repository.list_all()


@router.post("/jobs", response_model=JobResponse, status_code=201)
def create_job(
    job: JobCreate,
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    repository = JobRepository(database, user["uid"])
    return repository.create(job)


@router.patch("/jobs/{job_id}", response_model=JobResponse)
def update_job(
    job_id: str,
    changes: JobUpdate,
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    repository = JobRepository(database, user["uid"])
    updates = changes.model_dump(exclude_unset=True)
    result = repository.update(job_id, updates)
    if not result:
        raise HTTPException(status_code=404, detail="Job not found.")
    return result


@router.delete("/jobs/{job_id}", status_code=204)
def delete_job(
    job_id: str,
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    repository = JobRepository(database, user["uid"])
    if not repository.delete(job_id):
        raise HTTPException(status_code=404, detail="Job not found.")
    return Response(status_code=204)


# --- Hackathon Sources & Hackathons Routes ---

@router.get("/hackathon-sources")
def list_hackathon_sources(
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    snapshot = hackathon_settings_reference(database, user["uid"]).get()
    enabled = (snapshot.to_dict() or {}).get("enabled", [])
    return {
        "sources": [
            {**source, "enabled": source["id"] in enabled}
            for source in SOURCE_CATALOG
        ],
    }


@router.put("/hackathon-sources/{source_id}")
def update_hackathon_source(
    source_id: str,
    enabled: bool,
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    if source_id not in SOURCE_IDS:
        raise HTTPException(status_code=404, detail="Unknown hackathon source.")
    reference = hackathon_settings_reference(database, user["uid"])
    current = set((reference.get().to_dict() or {}).get("enabled", []))
    if enabled:
        current.add(source_id)
    else:
        current.discard(source_id)
    reference.set(
        {
            "enabled": sorted(current),
            "updated_at": firestore.SERVER_TIMESTAMP,
        },
        merge=True,
    )
    return {"source_id": source_id, "enabled": enabled}


@router.get("/hackathons", response_model=list[HackathonResponse])
async def list_hackathons(
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    def load_saved_data():
        query = user_collection(
            database,
            user["uid"],
            "hackathons",
        ).order_by("starts_at")
        settings_snapshot = hackathon_settings_reference(
            database,
            user["uid"],
        ).get()
        return list(query.stream()), (
            (settings_snapshot.to_dict() or {}).get("enabled", [])
        )

    snapshots, enabled = await asyncio.to_thread(load_saved_data)
    now = datetime.now(timezone.utc)
    manual = []
    for item in snapshots:
        record = item.to_dict() or {}
        end = record.get("ends_at")
        if isinstance(end, str):
            end = datetime.fromisoformat(end)
        if end and end.astimezone(timezone.utc) >= now:
            manual.append({"id": item.id, "source": "manual", **record})
    connected = await fetch_enabled_hackathons(enabled)
    return sorted([*manual, *connected], key=lambda item: item["starts_at"])


@router.post("/hackathons", response_model=HackathonResponse, status_code=201)
def create_hackathon(
    hackathon: HackathonCreate,
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    reference = user_collection(database, user["uid"], "hackathons").document()
    reference.set(
        {
            **hackathon.model_dump(mode="python"),
            "created_at": firestore.SERVER_TIMESTAMP,
            "updated_at": firestore.SERVER_TIMESTAMP,
        },
    )
    return {"id": reference.id, **(reference.get().to_dict() or {})}


@router.patch("/hackathons/{hackathon_id}", response_model=HackathonResponse)
def update_hackathon(
    hackathon_id: str,
    changes: HackathonUpdate,
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    reference = user_collection(database, user["uid"], "hackathons").document(hackathon_id)
    if not reference.get().exists:
        raise HTTPException(status_code=404, detail="Hackathon not found.")
    updates = changes.model_dump(exclude_unset=True, mode="python")
    reference.update(
        {
            **updates,
            "updated_at": firestore.SERVER_TIMESTAMP,
        },
    )
    return {"id": reference.id, **(reference.get().to_dict() or {})}


@router.delete("/hackathons/{hackathon_id}", status_code=204)
def delete_hackathon(
    hackathon_id: str,
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    reference = user_collection(database, user["uid"], "hackathons").document(hackathon_id)
    if not reference.get().exists:
        raise HTTPException(status_code=404, detail="Hackathon not found.")
    reference.delete()
    return Response(status_code=204)


# --- Projects Routes ---

@router.get("/projects", response_model=list[ProjectResponse])
def list_projects(
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    repository = ProjectRepository(database, user["uid"])
    return repository.list_all()


@router.post("/projects", response_model=ProjectResponse, status_code=201)
def create_project(
    project: ProjectCreate,
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    repository = ProjectRepository(database, user["uid"])
    return repository.create(project)


@router.patch("/projects/{project_id}", response_model=ProjectResponse)
def patch_project(
    project_id: str,
    changes: ProjectUpdate,
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    repository = ProjectRepository(database, user["uid"])
    updates = changes.model_dump(exclude_unset=True)
    result = repository.patch(project_id, updates)
    if not result:
        raise HTTPException(status_code=404, detail="Project not found.")
    return result


@router.delete("/projects/{project_id}", status_code=204)
def delete_project(
    project_id: str,
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    repository = ProjectRepository(database, user["uid"])
    if not repository.delete(project_id):
        raise HTTPException(status_code=404, detail="Project not found.")
    return Response(status_code=204)


# --- Notifications Routes ---

@router.get("/notifications", response_model=list[NotificationResponse])
def list_notifications(
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    repository = NotificationRepository(database, user["uid"])
    return repository.list_all()


@router.patch("/notifications/{notification_id}", response_model=NotificationResponse)
def update_notification(
    notification_id: str,
    changes: NotificationUpdate,
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    repository = NotificationRepository(database, user["uid"])
    result = repository.update(notification_id, changes)
    if not result:
        raise HTTPException(status_code=404, detail="Notification not found.")
    return result


@router.delete("/notifications/{notification_id}", status_code=204)
def delete_notification(
    notification_id: str,
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    repository = NotificationRepository(database, user["uid"])
    if not repository.delete(notification_id):
        raise HTTPException(status_code=404, detail="Notification not found.")
    return Response(status_code=204)


@router.post("/notifications/mark-all-read")
def mark_all_notifications_read(
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    repository = NotificationRepository(database, user["uid"])
    updated_count = repository.mark_all_read()
    return {"updated": updated_count}



# --- Contests External API Services & Route ---

async def codeforces_contests(client: httpx.AsyncClient) -> dict | None:
    try:
        response = await client.get("https://codeforces.com/api/contest.list")
        response.raise_for_status()
        payload = response.json()
        if payload.get("status") != "OK":
            raise ValueError(payload.get("comment", "Codeforces request failed."))
        contests = [
            {
                "id": f"cf-{contest['id']}",
                "name": contest["name"],
                "startsAt": datetime.fromtimestamp(
                    contest["startTimeSeconds"],
                    tz=timezone.utc,
                ).isoformat(),
                "duration": duration_label(contest["durationSeconds"]),
                "url": f"https://codeforces.com/contest/{contest['id']}",
            }
            for contest in payload["result"]
            if contest.get("phase") == "BEFORE"
        ]
        return {
            "id": "codeforces",
            "name": "Codeforces",
            "shortName": "CF",
            "description": "Live upcoming contests from Codeforces.",
            "contests": sorted(contests, key=lambda contest: contest["startsAt"]),
        }
    except (httpx.HTTPError, ValueError, KeyError):
        return None


async def codechef_contests(client: httpx.AsyncClient) -> dict | None:
    try:
        response = await client.get(
            "https://www.codechef.com/api/list/contests/future",
        )
        response.raise_for_status()
        payload = response.json()
        contests = [
            {
                "id": f"cc-{contest['contest_code']}",
                "name": contest["contest_name"],
                "startsAt": contest["contest_start_date_iso"],
                "duration": duration_label(int(contest["contest_duration"]) * 60),
                "url": f"https://www.codechef.com/{contest['contest_code']}",
            }
            for contest in payload.get("contests", [])
        ]
        return {
            "id": "codechef",
            "name": "CodeChef",
            "shortName": "CC",
            "description": "Live upcoming contests from CodeChef.",
            "contests": sorted(contests, key=lambda contest: contest["startsAt"]),
        }
    except (httpx.HTTPError, ValueError, KeyError, TypeError):
        return None


async def leetcode_contests(client: httpx.AsyncClient) -> dict | None:
    queries = (
        (
            "topTwoContests",
            """
              query topTwoContests {
                topTwoContests { title titleSlug startTime duration }
              }
            """,
            "topTwoContests",
        ),
        (
            "contestList",
            """
              query contestList {
                allContests { title titleSlug startTime duration }
              }
            """,
            "allContests",
        ),
    )
    try:
        async def fetch_query(operation_name: str, query: str, field: str):
            for attempt in range(3):
                try:
                    response = await client.post(
                        "https://leetcode.com/graphql",
                        json={
                            "operationName": operation_name,
                            "query": query,
                            "variables": {},
                        },
                        headers={
                            "Accept": "application/json",
                            "Content-Type": "application/json",
                            "Origin": "https://leetcode.com",
                            "Referer": "https://leetcode.com/contest/",
                        },
                    )
                    if response.is_success:
                        records = (response.json().get("data") or {}).get(
                            field,
                            [],
                        )
                        if records:
                            return records
                except httpx.HTTPError:
                    pass
                if attempt < 2:
                    await asyncio.sleep(1)
            return []

        tasks = [
            asyncio.create_task(fetch_query(operation_name, query, field))
            for operation_name, query, field in queries
        ]
        records = []
        for task in asyncio.as_completed(tasks):
            candidate = await task
            if candidate:
                records = candidate
                break
        for task in tasks:
            if not task.done():
                task.cancel()
        now = datetime.now(tz=timezone.utc).timestamp()
        contests = [
            {
                "id": f"lc-{contest['titleSlug']}",
                "name": contest["title"],
                "startsAt": datetime.fromtimestamp(
                    contest["startTime"],
                    tz=timezone.utc,
                ).isoformat(),
                "duration": duration_label(contest["duration"]),
                "url": f"https://leetcode.com/contest/{contest['titleSlug']}",
            }
            for contest in records
            if contest["startTime"] > now
        ]
        return {
            "id": "leetcode",
            "name": "LeetCode",
            "shortName": "LC",
            "description": "Live upcoming contests from LeetCode.",
            "contests": sorted(contests, key=lambda contest: contest["startsAt"]),
        }
    except (httpx.HTTPError, ValueError, KeyError, TypeError):
        return None


@router.get("/contests")
async def list_contests():
    global _contest_cache
    if _contest_cache and _contest_cache[0] > time.monotonic():
        return _contest_cache[1]
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 Chrome/126 Safari/537.36"
        ),
    }
    async with httpx.AsyncClient(
        timeout=CONTEST_REQUEST_TIMEOUT,
        follow_redirects=True,
        headers=headers,
    ) as client:
        platforms = await asyncio.gather(
            codeforces_contests(client),
            codechef_contests(client),
            leetcode_contests(client),
        )
    result = [platform for platform in platforms if platform is not None]
    if result:
        _contest_cache = (time.monotonic() + CONTEST_CACHE_TTL, result)
    return result
