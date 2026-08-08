"""User account CRUD: lookup, creation (password & Google), and profile updates."""

import uuid

from firebase_admin import firestore
from google.cloud.firestore_v1 import Client

from app.repositories.password import hash_password


def get_users_collection(database: Client):
    return database.collection("users")


def get_user_by_email(database: Client, email: str) -> dict | None:
    query = get_users_collection(database).where("email", "==", email.lower().strip()).limit(1)
    docs = list(query.stream())
    if not docs:
        return None
    data = docs[0].to_dict()
    data["uid"] = docs[0].id
    return data


def get_user_by_id(database: Client, uid: str) -> dict | None:
    doc = get_users_collection(database).document(uid).get()
    if not doc.exists:
        return None
    data = doc.to_dict()
    data["uid"] = doc.id
    return data


def create_user_with_password(
    database: Client,
    email: str,
    password: str,
    name: str | None = None,
) -> dict:
    normalized_email = email.lower().strip()
    existing = get_user_by_email(database, normalized_email)
    if existing:
        raise ValueError("An account already exists for this email.")

    uid = str(uuid.uuid4())
    pwd_hash, pwd_salt = hash_password(password)
    display_name = name.strip() if name and name.strip() else normalized_email.split("@")[0]

    user_data = {
        "uid": uid,
        "email": normalized_email,
        "display_name": display_name,
        "password_hash": pwd_hash,
        "password_salt": pwd_salt,
        "created_at": firestore.SERVER_TIMESTAMP,
        "updated_at": firestore.SERVER_TIMESTAMP,
    }

    get_users_collection(database).document(uid).set(user_data)
    return user_data


def get_or_create_google_user(
    database: Client,
    email: str,
    name: str | None = None,
    picture: str | None = None,
) -> dict:
    normalized_email = email.lower().strip()
    existing = get_user_by_email(database, normalized_email)

    display_name = name.strip() if name and name.strip() else normalized_email.split("@")[0]

    if existing:
        updates = {"updated_at": firestore.SERVER_TIMESTAMP}
        if picture and not existing.get("picture"):
            updates["picture"] = picture
        if display_name and not existing.get("display_name"):
            updates["display_name"] = display_name
        get_users_collection(database).document(existing["uid"]).update(updates)
        existing.update(updates)
        return existing

    uid = str(uuid.uuid4())
    user_data = {
        "uid": uid,
        "email": normalized_email,
        "display_name": display_name,
        "picture": picture or "",
        "google_auth": True,
        "created_at": firestore.SERVER_TIMESTAMP,
        "updated_at": firestore.SERVER_TIMESTAMP,
    }
    get_users_collection(database).document(uid).set(user_data)
    user_data["is_new"] = True
    return user_data


def mark_email_verified(database: Client, uid: str) -> bool:
    doc_ref = get_users_collection(database).document(uid)
    doc = doc_ref.get()
    if not doc.exists:
        return False
    doc_ref.update({
        "email_verified": True,
        "email_verified_at": firestore.SERVER_TIMESTAMP,
        "updated_at": firestore.SERVER_TIMESTAMP,
    })
    return True


def update_user_password(database: Client, uid: str, new_password: str) -> bool:
    doc_ref = get_users_collection(database).document(uid)
    doc = doc_ref.get()
    if not doc.exists:
        return False
    pwd_hash, pwd_salt = hash_password(new_password)
    doc_ref.update({
        "password_hash": pwd_hash,
        "password_salt": pwd_salt,
        "updated_at": firestore.SERVER_TIMESTAMP,
    })
    return True


def update_user_profile(database: Client, uid: str, display_name: str) -> dict:
    doc_ref = get_users_collection(database).document(uid)
    doc = doc_ref.get()
    if not doc.exists:
        raise ValueError("User not found.")

    clean_name = display_name.strip()
    doc_ref.update({
        "display_name": clean_name,
        "updated_at": firestore.SERVER_TIMESTAMP,
    })
    data = doc.to_dict()
    data["uid"] = uid
    data["display_name"] = clean_name
    return data
