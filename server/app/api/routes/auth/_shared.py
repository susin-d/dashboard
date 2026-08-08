"""Shared helpers used across the authentication feature-group routes."""

import logging

from fastapi import Header
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

from app.core.auth import auth_serializer
from app.core.config import settings
from app.services.email import EmailDeliveryError, send_welcome_email

logger = logging.getLogger(__name__)


def _send_welcome_email_best_effort(to_email: str, user_name: str) -> None:
    try:
        send_welcome_email(to_email=to_email, user_name=user_name)
    except EmailDeliveryError as exc:
        logger.warning("Welcome email to %s could not be delivered: %s", to_email, exc)


def state_serializer() -> URLSafeTimedSerializer:
    return URLSafeTimedSerializer(
        settings.auth_secret_key,
        salt="starwaves-google-auth-state",
    )


def combine_token_serializer() -> URLSafeTimedSerializer:
    return URLSafeTimedSerializer(
        settings.auth_secret_key,
        salt="starwaves-combine-account-token",
    )


def get_current_user_optional(
    authorization: str | None = Header(default=None),
) -> dict | None:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.removeprefix("Bearer ").strip()
    try:
        data = auth_serializer().loads(token, max_age=86400 * 30)
        if isinstance(data, dict) and "uid" in data:
            return data
    except (BadSignature, SignatureExpired):
        pass
    return None
