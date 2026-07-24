from fastapi import Header, HTTPException, status
from firebase_admin import auth

from app.db.firestore import get_firebase_app


def get_current_user(
    authorization: str | None = Header(default=None),
) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="A Firebase ID token is required.",
        )

    token = authorization.removeprefix("Bearer ").strip()
    try:
        return auth.verify_id_token(token, app=get_firebase_app())
    except (ValueError, auth.InvalidIdTokenError, auth.ExpiredIdTokenError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="The Firebase ID token is invalid or expired.",
        ) from None
