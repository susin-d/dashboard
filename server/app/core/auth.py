from fastapi import Header, HTTPException, status
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

from app.core.config import settings


def auth_serializer() -> URLSafeTimedSerializer:
    return URLSafeTimedSerializer(
        settings.auth_secret_key,
        salt="starwaves-auth-token",
    )


def create_user_token(user_data: dict) -> str:
    payload = {
        "uid": user_data["uid"],
        "email": user_data.get("email"),
        "name": user_data.get("name") or user_data.get("display_name"),
    }
    return auth_serializer().dumps(payload)


def get_current_user(
    authorization: str | None = Header(default=None),
) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="An authentication token is required.",
        )

    token = authorization.removeprefix("Bearer ").strip()

    try:
        data = auth_serializer().loads(token, max_age=86400 * 30)
        if isinstance(data, dict) and "uid" in data:
            return data
    except (BadSignature, SignatureExpired):
        pass

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="The authentication token is invalid or expired.",
    )


