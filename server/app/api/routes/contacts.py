from fastapi import APIRouter, Depends, HTTPException, Response, status
from google.cloud.firestore_v1 import Client

from app.core.auth import get_current_user
from app.db import get_firestore
from app.repositories import contacts
from app.schemas.contact import ContactCreate, ContactResponse, ContactUpdate

router = APIRouter(prefix="/contacts")


@router.get("", response_model=list[ContactResponse])
def list_contacts(
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    return contacts.list_contacts(database, user["uid"])


@router.get("/{contact_id}", response_model=ContactResponse)
def get_contact(
    contact_id: str,
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    contact = contacts.get_contact(database, user["uid"], contact_id)
    if contact is None:
        raise HTTPException(status_code=404, detail="Contact not found.")
    return contact


@router.post("", response_model=ContactResponse, status_code=status.HTTP_201_CREATED)
def create_contact(
    contact: ContactCreate,
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    return contacts.create_contact(database, user["uid"], contact)


@router.patch("/{contact_id}", response_model=ContactResponse)
def update_contact(
    contact_id: str,
    changes: ContactUpdate,
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    contact = contacts.update_contact(database, user["uid"], contact_id, changes)
    if contact is None:
        raise HTTPException(status_code=404, detail="Contact not found.")
    return contact


@router.delete("/{contact_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_contact(
    contact_id: str,
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    if not contacts.delete_contact(database, user["uid"], contact_id):
        raise HTTPException(status_code=404, detail="Contact not found.")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{contact_id}/restore", response_model=ContactResponse)
def restore_contact(
    contact_id: str,
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    if not contacts.restore_contact(database, user["uid"], contact_id):
        raise HTTPException(status_code=404, detail="Contact not found.")
    contact = contacts.get_contact(database, user["uid"], contact_id)
    if contact is None:
        raise HTTPException(status_code=404, detail="Contact not found.")
    return contact
