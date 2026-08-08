"""Project routes: list, create, patch, and delete workspace projects."""

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from google.cloud.firestore_v1 import Client

from app.api.routes.workspace._shared import DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE
from app.core.auth import get_current_user
from app.db import get_firestore
from app.repositories import ProjectRepository
from app.schemas.workspace import PageResponse, ProjectCreate, ProjectResponse, ProjectUpdate

router = APIRouter()


@router.get("/projects", response_model=PageResponse)
def list_projects(
    cursor: str | None = None,
    limit: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    repository = ProjectRepository(database, user["uid"])
    items, next_cursor, has_more = repository.list_page(cursor, limit)
    return {"items": items, "next_cursor": next_cursor, "has_more": has_more}


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
