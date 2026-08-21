import asyncio
from fastapi import APIRouter, Depends, HTTPException, Response, status
from google.cloud.firestore_v1 import Client

from app.core.auth import get_current_user
from app.db import get_firestore
from app.repositories import contacts
from app.schemas.contact import ContactCreate, ContactResponse, ContactUpdate

router = APIRouter(prefix="/contacts")


@router.get("", response_model=list[ContactResponse])
async def list_contacts(
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    return await asyncio.to_thread(contacts.list_contacts, database, user["uid"])


@router.get("/{contact_id}", response_model=ContactResponse)
async def get_contact(
    contact_id: str,
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    contact = await asyncio.to_thread(contacts.get_contact, database, user["uid"], contact_id)
    if contact is None:
        raise HTTPException(status_code=404, detail="Contact not found.")
    return contact


@router.post("", response_model=ContactResponse, status_code=status.HTTP_201_CREATED)
async def create_contact(
    contact: ContactCreate,
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    return await asyncio.to_thread(contacts.create_contact, database, user["uid"], contact)


@router.patch("/{contact_id}", response_model=ContactResponse)
async def update_contact(
    contact_id: str,
    changes: ContactUpdate,
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    contact = await asyncio.to_thread(contacts.update_contact, database, user["uid"], contact_id, changes)
    if contact is None:
        raise HTTPException(status_code=404, detail="Contact not found.")
    return contact


@router.delete("/{contact_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_contact(
    contact_id: str,
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    ok = await asyncio.to_thread(contacts.delete_contact, database, user["uid"], contact_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Contact not found.")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{contact_id}/restore", response_model=ContactResponse)
async def restore_contact(
    contact_id: str,
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    ok = await asyncio.to_thread(contacts.restore_contact, database, user["uid"], contact_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Contact not found.")
    contact = await asyncio.to_thread(contacts.get_contact, database, user["uid"], contact_id)
    if contact is None:
        raise HTTPException(status_code=404, detail="Contact not found.")
    return contact
