"""Shared model helpers — UUIDs, UTC timestamps, pgvector fallback."""

import uuid
from datetime import datetime, timezone

try:
    from pgvector.sqlalchemy import Vector  # type: ignore
except Exception:  # fallback for sqlite tests without pgvector
    Vector = None  # type: ignore


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def generate_uuid() -> str:
    return str(uuid.uuid4())
