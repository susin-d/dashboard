"""Job routes: list, create, update, and delete workspace jobs."""

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from google.cloud.firestore_v1 import Client

from app.api.routes.workspace._shared import DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE
from app.core.auth import get_current_user
from app.db import get_firestore
from app.repositories import JobRepository
from app.schemas.workspace import JobCreate, JobResponse, JobUpdate, PageResponse

router = APIRouter()


@router.get("/jobs", response_model=PageResponse)
def list_jobs(
    cursor: str | None = None,
    limit: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    repository = JobRepository(database, user["uid"])
    items, next_cursor, has_more = repository.list_page(cursor, limit)
    return {"items": items, "next_cursor": next_cursor, "has_more": has_more}


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
