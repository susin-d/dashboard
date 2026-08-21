"""Notification routes: list, update, delete, and mark all as read."""

import asyncio
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from google.cloud.firestore_v1 import Client

from app.api.routes.workspace._shared import DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE
from app.core.auth import get_current_user
from app.db import get_firestore
from app.repositories import NotificationRepository
from app.schemas.workspace import NotificationResponse, NotificationUpdate, PageResponse

router = APIRouter()


@router.get("/notifications", response_model=PageResponse)
async def list_notifications(
    cursor: str | None = None,
    limit: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    repository = NotificationRepository(database, user["uid"])
    items, next_cursor, has_more = await asyncio.to_thread(repository.list_page, cursor, limit)
    return {"items": items, "next_cursor": next_cursor, "has_more": has_more}


@router.get("/notifications/{notification_id}", response_model=NotificationResponse)
async def get_notification(
    notification_id: str,
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    repository = NotificationRepository(database, user["uid"])
    result = await asyncio.to_thread(repository.get, notification_id)
    if not result:
        raise HTTPException(status_code=404, detail="Notification not found.")
    return result


@router.patch("/notifications/{notification_id}", response_model=NotificationResponse)
async def update_notification(
    notification_id: str,
    changes: NotificationUpdate,
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    repository = NotificationRepository(database, user["uid"])
    result = await asyncio.to_thread(repository.update, notification_id, changes)
    if not result:
        raise HTTPException(status_code=404, detail="Notification not found.")
    return result


@router.delete("/notifications/{notification_id}", status_code=204)
async def delete_notification(
    notification_id: str,
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    repository = NotificationRepository(database, user["uid"])
    ok = await asyncio.to_thread(repository.delete, notification_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Notification not found.")
    return Response(status_code=204)


@router.post("/notifications/mark-all-read")
async def mark_all_notifications_read(
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    repository = NotificationRepository(database, user["uid"])
    updated_count = await asyncio.to_thread(repository.mark_all_read)
    return {"updated": updated_count}


@router.post("/notifications/{notification_id}/restore", response_model=NotificationResponse)
async def restore_notification(
    notification_id: str,
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    repository = NotificationRepository(database, user["uid"])
    ok = await asyncio.to_thread(repository.restore, notification_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Notification not found.")
    result = await asyncio.to_thread(repository.get, notification_id)
    if not result:
        raise HTTPException(status_code=404, detail="Notification not found.")
    return result
