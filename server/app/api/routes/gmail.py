import hashlib

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from firebase_admin import firestore
from google.cloud.firestore_v1 import Client
from pydantic import BaseModel, Field

from app.core.auth import get_current_user
from app.db import get_firestore

router = APIRouter(prefix="/integrations/gmail")


class GmailConnection(BaseModel):
    access_token: str = Field(min_length=1)


def gmail_accounts_collection(database: Client, user_id: str):
    return (
        database.collection("users")
        .document(user_id)
        .collection("integrations")
        .document("gmail")
        .collection("accounts")
    )


def account_document_id(email: str) -> str:
    return hashlib.sha256(email.lower().strip().encode()).hexdigest()


@router.post("")
@router.post("/accounts")
async def connect_gmail(
    connection: GmailConnection,
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.get(
            "https://gmail.googleapis.com/gmail/v1/users/me/profile",
            headers={"Authorization": f"Bearer {connection.access_token}"},
        )
    if response.status_code in (401, 403):
        raise HTTPException(
            status_code=400,
            detail="Google rejected the Gmail authorization.",
        )
    try:
        response.raise_for_status()
        profile = response.json()
        email = profile["emailAddress"]
    except (httpx.HTTPError, KeyError, ValueError) as error:
        raise HTTPException(
            status_code=502,
            detail="Gmail account verification failed.",
        ) from error

    doc_id = account_document_id(email)
    doc_ref = gmail_accounts_collection(database, user["uid"]).document(doc_id)
    doc_ref.set(
        {
            "id": doc_id,
            "email": email,
            "connected": True,
            "access_token": connection.access_token,
            "updated_at": firestore.SERVER_TIMESTAMP,
        },
        merge=True,
    )
    return {
        "connected": True,
        "account": {"id": doc_id, "email": email},
    }


@router.get("/accounts")
def get_gmail_accounts(
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    snapshots = list(gmail_accounts_collection(database, user["uid"]).stream())
    accounts = []
    for snapshot in snapshots:
        data = snapshot.to_dict()
        accounts.append({
            "id": snapshot.id,
            "email": data.get("email", ""),
            "connected": bool(data.get("connected", True)),
        })
    return {"accounts": accounts}


@router.get("/status")
def gmail_status(
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    snapshots = list(gmail_accounts_collection(database, user["uid"]).stream())
    accounts = []
    for snapshot in snapshots:
        data = snapshot.to_dict()
        accounts.append({
            "id": snapshot.id,
            "email": data.get("email", ""),
            "connected": bool(data.get("connected", True)),
        })

    connected = len(accounts) > 0
    primary_account = accounts[0] if accounts else None
    return {
        "connected": connected,
        "account": primary_account,
        "accounts": accounts,
    }


@router.delete("/accounts/{account_id}", status_code=204)
def disconnect_gmail_account(
    account_id: str,
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    gmail_accounts_collection(database, user["uid"]).document(account_id).delete()


@router.delete("", status_code=204)
def disconnect_all_gmail(
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    snapshots = list(gmail_accounts_collection(database, user["uid"]).stream())
    for snapshot in snapshots:
        snapshot.reference.delete()
