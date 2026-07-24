import httpx
from fastapi import APIRouter, Depends, HTTPException
from firebase_admin import firestore
from google.cloud.firestore_v1 import Client
from pydantic import BaseModel, Field

from app.core.auth import get_current_user
from app.db import get_firestore

router = APIRouter(prefix="/integrations/gmail")


class GmailConnection(BaseModel):
    access_token: str = Field(min_length=1)


def gmail_reference(database: Client, user_id: str):
    return (
        database.collection("users")
        .document(user_id)
        .collection("integrations")
        .document("gmail")
    )


@router.post("")
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

    gmail_reference(database, user["uid"]).set(
        {
            "email": email,
            "connected": True,
            "updated_at": firestore.SERVER_TIMESTAMP,
        },
        merge=True,
    )
    return {"connected": True, "account": {"email": email}}


@router.get("/status")
def gmail_status(
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    snapshot = gmail_reference(database, user["uid"]).get()
    if not snapshot.exists:
        return {"connected": False, "account": None}
    connection = snapshot.to_dict()
    return {
        "connected": bool(connection.get("connected")),
        "account": {"email": connection.get("email", "")},
    }


@router.delete("", status_code=204)
def disconnect_gmail(
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    gmail_reference(database, user["uid"]).delete()
