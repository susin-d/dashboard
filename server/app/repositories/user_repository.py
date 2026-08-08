import hashlib
import os
import uuid
from google.cloud.firestore_v1 import Client
from firebase_admin import firestore

ITERATIONS = 100_000


def hash_password(password: str, salt: str | None = None) -> tuple[str, str]:
    if salt is None:
        salt_bytes = os.urandom(16)
        salt = salt_bytes.hex()
    else:
        salt_bytes = bytes.fromhex(salt)

    pwd_hash = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt_bytes,
        ITERATIONS,
    ).hex()
    return pwd_hash, salt


def verify_password(password: str, stored_hash: str, stored_salt: str) -> bool:
    pwd_hash, _ = hash_password(password, stored_salt)
    return hashlib.compare_digest(pwd_hash, stored_hash)


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
    return user_data


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


def add_pending_combine_request(database: Client, owner_uid: str, target_email: str) -> None:
    owner_ref = get_users_collection(database).document(owner_uid)
    doc = owner_ref.get()
    if not doc.exists:
        raise ValueError("User not found.")
    data = doc.to_dict() or {}
    pending = data.get("pending_combine_requests", [])
    normalized_target = target_email.lower().strip()

    if not any(req.get("email") == normalized_target for req in pending):
        pending.append({
            "email": normalized_target,
            "requested_at": firestore.SERVER_TIMESTAMP,
        })
        owner_ref.update({"pending_combine_requests": pending, "updated_at": firestore.SERVER_TIMESTAMP})


def confirm_combine_accounts(
    database: Client,
    owner_uid: str,
    target_email: str,
    target_uid: str | None = None,
) -> dict:
    normalized_target = target_email.lower().strip()
    owner_ref = get_users_collection(database).document(owner_uid)
    owner_doc = owner_ref.get()
    if not owner_doc.exists:
        raise ValueError("Owner account not found.")
    owner_data = owner_doc.to_dict() or {}

    # If target_uid wasn't provided, try resolving from email
    if not target_uid:
        target_user = get_user_by_email(database, normalized_target)
        if target_user:
            target_uid = target_user["uid"]

    # 1. Update owner's combined_accounts
    combined = owner_data.get("combined_accounts", [])
    if not any(acc.get("email") == normalized_target or (target_uid and acc.get("uid") == target_uid) for acc in combined):
        combined.append({
            "email": normalized_target,
            "uid": target_uid or "",
            "linked_at": firestore.SERVER_TIMESTAMP,
        })

    # Remove from pending requests
    pending = [req for req in owner_data.get("pending_combine_requests", []) if req.get("email") != normalized_target]
    owner_ref.update({
        "combined_accounts": combined,
        "pending_combine_requests": pending,
        "updated_at": firestore.SERVER_TIMESTAMP,
    })

    # 2. If target user exists in DB, also update their document with owner's link
    if target_uid and target_uid != owner_uid:
        target_ref = get_users_collection(database).document(target_uid)
        target_doc = target_ref.get()
        if target_doc.exists:
            target_data = target_doc.to_dict() or {}
            target_combined = target_data.get("combined_accounts", [])
            owner_email = owner_data.get("email", "")
            if not any(acc.get("uid") == owner_uid or acc.get("email") == owner_email for acc in target_combined):
                target_combined.append({
                    "email": owner_email,
                    "uid": owner_uid,
                    "linked_at": firestore.SERVER_TIMESTAMP,
                })
                target_ref.update({
                    "combined_accounts": target_combined,
                    "updated_at": firestore.SERVER_TIMESTAMP,
                })

    return {
        "owner_uid": owner_uid,
        "target_email": normalized_target,
        "target_uid": target_uid,
    }


def remove_combined_account(database: Client, uid: str, target_identifier: str) -> None:
    doc_ref = get_users_collection(database).document(uid)
    doc = doc_ref.get()
    if not doc.exists:
        raise ValueError("User not found.")
    data = doc.to_dict() or {}
    clean_target = target_identifier.lower().strip()

    # Find the account entry to remove
    combined = data.get("combined_accounts", [])
    removed_entry = None
    new_combined = []

    for acc in combined:
        if acc.get("uid") == target_identifier or acc.get("email") == clean_target:
            removed_entry = acc
        else:
            new_combined.append(acc)

    pending = [req for req in data.get("pending_combine_requests", []) if req.get("email") != clean_target]

    doc_ref.update({
        "combined_accounts": new_combined,
        "pending_combine_requests": pending,
        "updated_at": firestore.SERVER_TIMESTAMP,
    })

    # Also remove reciprocal link from the target user doc if found
    if removed_entry:
        other_uid = removed_entry.get("uid")
        other_email = removed_entry.get("email")
        if other_uid:
            other_ref = get_users_collection(database).document(other_uid)
            other_doc = other_ref.get()
            if other_doc.exists:
                other_data = other_doc.to_dict() or {}
                user_email = data.get("email", "")
                other_combined = [
                    acc for acc in other_data.get("combined_accounts", [])
                    if acc.get("uid") != uid and acc.get("email") != user_email
                ]
                other_ref.update({
                    "combined_accounts": other_combined,
                    "updated_at": firestore.SERVER_TIMESTAMP,
                })
        elif other_email:
            other_user = get_user_by_email(database, other_email)
            if other_user:
                other_ref = get_users_collection(database).document(other_user["uid"])
                other_doc = other_ref.get()
                if other_doc.exists:
                    other_data = other_doc.to_dict() or {}
                    user_email = data.get("email", "")
                    other_combined = [
                        acc for acc in other_data.get("combined_accounts", [])
                        if acc.get("uid") != uid and acc.get("email") != user_email
                    ]
                    other_ref.update({
                        "combined_accounts": other_combined,
                        "updated_at": firestore.SERVER_TIMESTAMP,
                    })


def get_combined_accounts_info(database: Client, uid: str) -> dict:
    doc = get_users_collection(database).document(uid).get()
    if not doc.exists:
        return {"combined_accounts": [], "pending_combine_requests": []}
    data = doc.to_dict() or {}

    combined = []
    for item in data.get("combined_accounts", []):
        combined.append({
            "uid": item.get("uid", ""),
            "email": item.get("email", ""),
            "linked_at": item.get("linked_at").isoformat() if hasattr(item.get("linked_at"), "isoformat") else str(item.get("linked_at") or ""),
        })

    pending = []
    for item in data.get("pending_combine_requests", []):
        pending.append({
            "email": item.get("email", ""),
            "requested_at": item.get("requested_at").isoformat() if hasattr(item.get("requested_at"), "isoformat") else str(item.get("requested_at") or ""),
        })

    return {
        "combined_accounts": combined,
        "pending_combine_requests": pending,
    }

