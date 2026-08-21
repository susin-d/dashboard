import asyncio
from fastapi import APIRouter, Depends, HTTPException, Response, status
from google.cloud.firestore_v1 import Client

from app.core.auth import get_current_user
from app.db import get_firestore
from app.repositories import todos
from app.schemas.todo import TodoCreate, TodoResponse, TodoUpdate

router = APIRouter(prefix="/todos")


@router.get("", response_model=list[TodoResponse])
async def list_todos(
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    return await asyncio.to_thread(todos.list_todos, database, user["uid"])


@router.get("/{todo_id}", response_model=TodoResponse)
async def get_todo(
    todo_id: str,
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    todo = await asyncio.to_thread(todos.get_todo, database, user["uid"], todo_id)
    if todo is None:
        raise HTTPException(status_code=404, detail="Todo not found.")
    return todo


@router.post("", response_model=TodoResponse, status_code=status.HTTP_201_CREATED)
async def create_todo(
    todo: TodoCreate,
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    return await asyncio.to_thread(todos.create_todo, database, user["uid"], todo)


@router.patch("/{todo_id}", response_model=TodoResponse)
async def update_todo(
    todo_id: str,
    changes: TodoUpdate,
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    todo = await asyncio.to_thread(todos.update_todo, database, user["uid"], todo_id, changes)
    if todo is None:
        raise HTTPException(status_code=404, detail="Todo not found.")
    return todo


@router.delete("/{todo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_todo(
    todo_id: str,
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    ok = await asyncio.to_thread(todos.delete_todo, database, user["uid"], todo_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Todo not found.")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{todo_id}/restore", response_model=TodoResponse)
async def restore_todo(
    todo_id: str,
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    ok = await asyncio.to_thread(todos.restore_todo, database, user["uid"], todo_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Todo not found.")
    todo = await asyncio.to_thread(todos.get_todo, database, user["uid"], todo_id)
    if todo is None:
        raise HTTPException(status_code=404, detail="Todo not found.")
    return todo
