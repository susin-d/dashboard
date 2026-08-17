from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from google.cloud.firestore_v1 import Client

from app.core.auth import get_current_user
from app.core.config import settings
from app.db import get_firestore
from app.repositories import workspace_files
from app.schemas.workspace_files import (
    WorkspaceCreateRequest,
    WorkspaceFileReadResponse,
    WorkspaceFileWriteRequest,
    WorkspaceItem,
    WorkspaceListResponse,
    WorkspaceRenameRequest,
    WorkspaceSyncRequest,
    WorkspaceSyncResponse,
    WorkspaceTreeResponse,
)

router = APIRouter(prefix="/workspace-files")


def _require_non_serverless():
    if getattr(settings, "is_serverless", False):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Workspace file storage is not available in serverless mode.",
        )


# Workspace Management Endpoints
@router.get("/workspaces", response_model=WorkspaceListResponse)
def get_workspaces(
    user: dict = Depends(get_current_user),
):
    _require_non_serverless()
    items = workspace_files.list_workspaces(user["uid"])
    return WorkspaceListResponse(
        workspaces=[WorkspaceItem(**item) for item in items],
        active_id=items[0]["id"] if items else "default",
    )


@router.post("/workspaces", response_model=WorkspaceItem, status_code=status.HTTP_201_CREATED)
def create_workspace(
    body: WorkspaceCreateRequest,
    user: dict = Depends(get_current_user),
):
    _require_non_serverless()
    try:
        created = workspace_files.create_workspace(user["uid"], body.name)
        return WorkspaceItem(**created)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))


@router.patch("/workspaces/{workspace_id}", response_model=WorkspaceItem)
def rename_workspace(
    workspace_id: str,
    body: WorkspaceRenameRequest,
    user: dict = Depends(get_current_user),
):
    _require_non_serverless()
    try:
        updated = workspace_files.rename_workspace(user["uid"], workspace_id, body.name)
        return WorkspaceItem(**updated)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Workspace not found.")
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))


@router.delete("/workspaces/{workspace_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_workspace(
    workspace_id: str,
    user: dict = Depends(get_current_user),
):
    _require_non_serverless()
    if not workspace_files.delete_workspace(user["uid"], workspace_id):
        raise HTTPException(status_code=404, detail="Workspace not found.")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# Workspace Files Endpoints
@router.get("/tree", response_model=WorkspaceTreeResponse)
def get_file_tree(
    workspace_id: str = Query(default="default"),
    user: dict = Depends(get_current_user),
):
    _require_non_serverless()
    files = workspace_files.list_tree(user["uid"], workspace_id=workspace_id)
    return WorkspaceTreeResponse(root="/", files=files)


@router.get("/{file_path:path}", response_model=WorkspaceFileReadResponse)
def read_file(
    file_path: str,
    workspace_id: str = Query(default="default"),
    user: dict = Depends(get_current_user),
):
    _require_non_serverless()
    try:
        content, size = workspace_files.read_file(user["uid"], file_path, workspace_id=workspace_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="File not found.")
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))
    return WorkspaceFileReadResponse(path=file_path, content=content, size=size)


@router.put("/{file_path:path}", status_code=status.HTTP_200_OK)
def write_file(
    file_path: str,
    body: WorkspaceFileWriteRequest,
    workspace_id: str = Query(default="default"),
    user: dict = Depends(get_current_user),
):
    _require_non_serverless()
    try:
        size = workspace_files.write_file(
            user["uid"],
            file_path,
            body.content,
            body.encoding,
            workspace_id=workspace_id,
        )
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))
    return {"path": file_path, "size": size, "written": True}


@router.delete("/{file_path:path}", status_code=status.HTTP_204_NO_CONTENT)
def delete_file(
    file_path: str,
    workspace_id: str = Query(default="default"),
    user: dict = Depends(get_current_user),
):
    _require_non_serverless()
    try:
        if not workspace_files.delete_file(user["uid"], file_path, workspace_id=workspace_id):
            raise HTTPException(status_code=404, detail="File not found.")
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/sync", response_model=WorkspaceSyncResponse)
def sync_files(
    body: WorkspaceSyncRequest,
    workspace_id: str = Query(default="default"),
    user: dict = Depends(get_current_user),
):
    _require_non_serverless()
    synced = 0
    errors = []
    for entry in body.files:
        try:
            workspace_files.write_file(
                user["uid"],
                entry.path,
                entry.content,
                entry.encoding,
                workspace_id=workspace_id,
            )
            synced += 1
        except (ValueError, OSError) as error:
            errors.append(f"{entry.path}: {error}")
    return WorkspaceSyncResponse(synced=synced, errors=errors)

