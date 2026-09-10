"""SQLite-backed database helpers shared by integration and E2E tests.

The engine itself is created once at import time (see ``tests/conftest.py``),
bound to a throwaway per-worker SQLite file. Schema is created once per
worker; per-test isolation truncates rows (``DELETE FROM``) instead of
``drop_all``/``create_all`` DDL, which is ~10x faster on Windows file SQLite.
"""

from datetime import datetime, timezone

import pytest

TEST_DB_USER = {
    "uid": "user-1",
    "email": "user1@example.com",
    "display_name": "User One",
}


def _ensure_schema() -> None:
    """Create all tables once per worker (idempotent, no drop)."""
    from app.db.session import Base, sync_engine

    Base.metadata.create_all(sync_engine)


def truncate_database() -> None:
    """Delete all rows for per-test isolation without DDL rebuilds."""
    from sqlalchemy import text

    from app.db.session import Base, sync_engine

    _ensure_schema()
    with sync_engine.begin() as conn:
        for table in reversed(Base.metadata.sorted_tables):
            conn.execute(text(f'DELETE FROM "{table.name}"'))
        try:
            conn.execute(text("DELETE FROM sqlite_sequence"))
        except Exception:
            pass
    try:
        from app.core.cache import cache_clear

        cache_clear()
    except Exception:
        pass


def clean_database() -> None:
    """Backward-compatible alias: pristine rows via truncate (no DDL)."""
    truncate_database()


@pytest.fixture()
def db():
    """Function-scoped fixture: clean rows before each test (not after).

    Truncate-before (single pass) is sufficient for isolation and halves the
    per-test DB cost vs the old drop+create before+after pattern. Schema is
    created once per worker via ``_ensure_schema``.
    """
    truncate_database()
    yield


def get_sql_client():
    """Return the application's real SqlClient singleton."""
    from app.db import get_db_client

    return get_db_client()


def seed_user(
    uid: str = TEST_DB_USER["uid"],
    email: str = TEST_DB_USER["email"],
    display_name: str = TEST_DB_USER["display_name"],
    **extra_fields,
) -> dict:
    """Insert a user document through the SQL compat layer and return it."""
    client = get_sql_client()
    data = {
        "uid": uid,
        "email": email.lower().strip(),
        "display_name": display_name,
        "created_at": datetime.now(timezone.utc).isoformat(),
        **extra_fields,
    }
    client.collection("users").document(uid).set(data)
    return data
