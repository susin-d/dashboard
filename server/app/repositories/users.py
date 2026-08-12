"""User account CRUD: lookup, creation (password & Google), and profile updates."""

import uuid

from firebase_admin import firestore
from google.cloud.firestore_v1 import Client

from google.cloud.firestore_v1.base_query import FieldFilter

from app.repositories.password import hash_password


def get_users_collection(database: Client):
    return database.collection("users")


def merge_duplicate_user_accounts(database: Client, email: str | None = None) -> list[dict]:
    """Merges duplicate user documents sharing the same email into a single primary record."""
    users_coll = get_users_collection(database)
    all_docs = list(users_coll.stream())

    email_groups: dict[str, list[dict]] = {}
    for doc in all_docs:
        d = doc.to_dict() or {}
        doc_email = (d.get("email") or "").lower().strip()
        if not doc_email:
            continue
        if email and doc_email != email.lower().strip():
            continue
        d["uid"] = doc.id
        email_groups.setdefault(doc_email, []).append(d)

    merged_primary_users = []

    for _, docs in email_groups.items():
        if len(docs) <= 1:
            if docs:
                merged_primary_users.append(docs[0])
            continue

        primary = docs[0]
        for candidate in docs[1:]:
            if (not primary.get("password_hash") and candidate.get("password_hash")) or \
               (not primary.get("google_auth") and candidate.get("google_auth")):
                primary = candidate

        primary_uid = primary["uid"]
        updates = {"updated_at": firestore.SERVER_TIMESTAMP}
        combined_accounts = list(primary.get("combined_accounts") or [])

        for second in docs:
            if second["uid"] == primary_uid:
                continue

            if not primary.get("password_hash") and second.get("password_hash"):
                updates["password_hash"] = second["password_hash"]
                updates["password_salt"] = second.get("password_salt", "")
                primary["password_hash"] = second["password_hash"]
                primary["password_salt"] = second.get("password_salt", "")

            if second.get("google_auth"):
                updates["google_auth"] = True
                primary["google_auth"] = True

            if not primary.get("display_name") and second.get("display_name"):
                updates["display_name"] = second["display_name"]
                primary["display_name"] = second["display_name"]

            if not primary.get("picture") and second.get("picture"):
                updates["picture"] = second["picture"]
                primary["picture"] = second["picture"]

            if second.get("email_verified"):
                updates["email_verified"] = True
                primary["email_verified"] = True

            for acc in second.get("combined_accounts") or []:
                if not any(a.get("email") == acc.get("email") or (a.get("uid") and a.get("uid") == acc.get("uid")) for a in combined_accounts):
                    combined_accounts.append(acc)

            users_coll.document(second["uid"]).delete()

        if combined_accounts != list(primary.get("combined_accounts") or []):
            updates["combined_accounts"] = combined_accounts
            primary["combined_accounts"] = combined_accounts

        if len(updates) > 1:
            users_coll.document(primary_uid).update(updates)

        merged_primary_users.append(primary)

    return merged_primary_users


def get_user_by_email(database: Client, email: str) -> dict | None:
    normalized_email = email.lower().strip()
    query = get_users_collection(database).where(filter=FieldFilter("email", "==", normalized_email))
    docs = list(query.stream())
    if len(docs) > 1:
        merged_list = merge_duplicate_user_accounts(database, email=normalized_email)
        return merged_list[0] if merged_list else None

    if not docs:
        for doc in get_users_collection(database).limit(100).stream():
            d = doc.to_dict() or {}
            if (d.get("email") or "").lower().strip() == normalized_email:
                d["uid"] = doc.id
                return d
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
    pwd_hash, pwd_salt = hash_password(password)
    display_name = name.strip() if name and name.strip() else normalized_email.split("@")[0]

    if existing:
        if not existing.get("password_hash"):
            updates = {
                "password_hash": pwd_hash,
                "password_salt": pwd_salt,
                "updated_at": firestore.SERVER_TIMESTAMP,
            }
            if display_name and not existing.get("display_name"):
                updates["display_name"] = display_name
                existing["display_name"] = display_name
            get_users_collection(database).document(existing["uid"]).update(updates)
            existing.update(updates)
            return existing

        raise ValueError("An account already exists for this email.")

    uid = str(uuid.uuid4())
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
        updates = {"google_auth": True, "updated_at": firestore.SERVER_TIMESTAMP}
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
