"""Async database engine, session generator, and model initialization."""

import asyncio
from collections.abc import AsyncGenerator
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings


from sqlalchemy import create_engine, text

class Base(DeclarativeBase):
    pass


def get_async_db_url() -> str:
    url = settings.database_url
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgresql://") and not url.startswith("postgresql+asyncpg://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return url


def get_sync_db_url() -> str:
    url = settings.database_url
    if url.startswith("postgresql+asyncpg://"):
        url = url.replace("postgresql+asyncpg://", "postgresql+psycopg2://", 1)
    elif url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+psycopg2://", 1)
    elif url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+psycopg2://", 1)
    elif url.startswith("sqlite+aiosqlite://"):
        url = url.replace("sqlite+aiosqlite://", "sqlite://", 1)
    return url


async_db_url = get_async_db_url()
sync_db_url = get_sync_db_url()
is_sqlite = sync_db_url.startswith("sqlite")

engine = create_async_engine(
    async_db_url,
    echo=False,
    future=True,
    pool_pre_ping=True,
    **({} if is_sqlite else {"pool_size": 5, "max_overflow": 5, "pool_recycle": 300, "pool_timeout": 30}),
)

sync_engine = create_engine(
    sync_db_url,
    echo=False,
    future=True,
    pool_pre_ping=True,
    **({} if is_sqlite else {"pool_size": 5, "max_overflow": 5, "pool_recycle": 300, "pool_timeout": 30}),
)

async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency that provides an asynchronous database session."""
    async with async_session_factory() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db() -> None:
    """Initialize database tables.

    e2-micro note: _ensure_* ALTERs run off the event loop via to_thread to avoid
    blocking lifespan; create_all is already async via run_sync.
    """
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    # Run sync ALTERs off the loop so single worker stays responsive
    await asyncio.to_thread(_ensure_call_messages_column)
    await asyncio.to_thread(_ensure_call_provider_columns)
    await asyncio.to_thread(_ensure_whatsapp_columns)
    await asyncio.to_thread(_ensure_eve_memory_embedding)
    # Composite indexes for pagination hot paths (lean, concurrent-safe)
    await asyncio.to_thread(_ensure_performance_indexes)


def _ensure_call_messages_column() -> None:
    """Idempotently backfill the calls.messages column on existing tables.

    create_all() only creates missing tables, and this project has no alembic
    migrations, so pre-existing deployments need an explicit ALTER TABLE.
    """
    with sync_engine.connect() as conn:
        if is_sqlite:
            columns = {row[1] for row in conn.execute(text("PRAGMA table_info(calls)"))}
            if "messages" not in columns:
                conn.execute(text("ALTER TABLE calls ADD COLUMN messages JSON NOT NULL DEFAULT '[]'"))
        else:
            conn.execute(text("ALTER TABLE calls ADD COLUMN IF NOT EXISTS messages JSON NOT NULL DEFAULT '[]'"))
        conn.commit()


def _ensure_call_provider_columns() -> None:
    """Backfill provider/external_sid/phone_number for dual call option (in_app vs twilio)."""
    with sync_engine.connect() as conn:
        if is_sqlite:
            cols = {row[1] for row in conn.execute(text("PRAGMA table_info(calls)"))}
            if "provider" not in cols:
                conn.execute(text("ALTER TABLE calls ADD COLUMN provider TEXT DEFAULT 'in_app'"))
                conn.execute(text("UPDATE calls SET provider='in_app' WHERE provider IS NULL"))
            if "external_sid" not in cols:
                conn.execute(text("ALTER TABLE calls ADD COLUMN external_sid TEXT"))
            if "phone_number" not in cols:
                conn.execute(text("ALTER TABLE calls ADD COLUMN phone_number TEXT"))
        else:
            conn.execute(text("ALTER TABLE calls ADD COLUMN IF NOT EXISTS provider VARCHAR(32) DEFAULT 'in_app'"))
            conn.execute(text("ALTER TABLE calls ADD COLUMN IF NOT EXISTS external_sid VARCHAR(64)"))
            conn.execute(text("ALTER TABLE calls ADD COLUMN IF NOT EXISTS phone_number VARCHAR(32)"))
        conn.commit()


def _ensure_whatsapp_columns() -> None:
    """Idempotently backfill WhatsApp tables columns on existing databases."""
    with sync_engine.connect() as conn:
        if is_sqlite:
            msg_cols = {row[1] for row in conn.execute(text("PRAGMA table_info(whatsapp_messages)"))}
            if "sender_avatar_url" not in msg_cols:
                conn.execute(text("ALTER TABLE whatsapp_messages ADD COLUMN sender_avatar_url TEXT"))
            if "reactions" not in msg_cols:
                conn.execute(text("ALTER TABLE whatsapp_messages ADD COLUMN reactions JSON DEFAULT '[]'"))
            if "is_forwarded" not in msg_cols:
                conn.execute(text("ALTER TABLE whatsapp_messages ADD COLUMN is_forwarded BOOLEAN DEFAULT FALSE"))
            if "is_starred" not in msg_cols:
                conn.execute(text("ALTER TABLE whatsapp_messages ADD COLUMN is_starred BOOLEAN DEFAULT FALSE"))
            if "is_pinned" not in msg_cols:
                conn.execute(text("ALTER TABLE whatsapp_messages ADD COLUMN is_pinned BOOLEAN DEFAULT FALSE"))

            chat_cols = {row[1] for row in conn.execute(text("PRAGMA table_info(whatsapp_chats)"))}
            if "avatar_url" not in chat_cols:
                conn.execute(text("ALTER TABLE whatsapp_chats ADD COLUMN avatar_url TEXT"))
            if "participants" not in chat_cols:
                conn.execute(text("ALTER TABLE whatsapp_chats ADD COLUMN participants JSON DEFAULT '[]'"))
            if "unread_count" not in chat_cols:
                conn.execute(text("ALTER TABLE whatsapp_chats ADD COLUMN unread_count INTEGER DEFAULT 0"))
            if "last_message" not in chat_cols:
                conn.execute(text("ALTER TABLE whatsapp_chats ADD COLUMN last_message JSON"))
            if "is_pinned" not in chat_cols:
                conn.execute(text("ALTER TABLE whatsapp_chats ADD COLUMN is_pinned BOOLEAN DEFAULT FALSE"))
            if "is_muted" not in chat_cols:
                conn.execute(text("ALTER TABLE whatsapp_chats ADD COLUMN is_muted BOOLEAN DEFAULT FALSE"))
            if "is_archived" not in chat_cols:
                conn.execute(text("ALTER TABLE whatsapp_chats ADD COLUMN is_archived BOOLEAN DEFAULT FALSE"))
            if "eve_auto_reply" not in chat_cols:
                conn.execute(text("ALTER TABLE whatsapp_chats ADD COLUMN eve_auto_reply BOOLEAN DEFAULT FALSE"))
        else:
            conn.execute(text("ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS sender_avatar_url TEXT"))
            conn.execute(text("ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS reactions JSON DEFAULT '[]'"))
            conn.execute(text("ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS is_forwarded BOOLEAN DEFAULT FALSE"))
            conn.execute(text("ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS is_starred BOOLEAN DEFAULT FALSE"))
            conn.execute(text("ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE"))

            conn.execute(text("ALTER TABLE whatsapp_chats ADD COLUMN IF NOT EXISTS avatar_url TEXT"))
            conn.execute(text("ALTER TABLE whatsapp_chats ADD COLUMN IF NOT EXISTS participants JSON DEFAULT '[]'"))
            conn.execute(text("ALTER TABLE whatsapp_chats ADD COLUMN IF NOT EXISTS unread_count INTEGER DEFAULT 0"))
            conn.execute(text("ALTER TABLE whatsapp_chats ADD COLUMN IF NOT EXISTS last_message JSON"))
            conn.execute(text("ALTER TABLE whatsapp_chats ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE"))
            conn.execute(text("ALTER TABLE whatsapp_chats ADD COLUMN IF NOT EXISTS is_muted BOOLEAN DEFAULT FALSE"))
            conn.execute(text("ALTER TABLE whatsapp_chats ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE"))
            conn.execute(text("ALTER TABLE whatsapp_chats ADD COLUMN IF NOT EXISTS eve_auto_reply BOOLEAN DEFAULT FALSE"))
        conn.commit()


def _ensure_eve_memory_embedding() -> None:
    """Enable pgvector and add embedding column + HNSW index (postgres only)."""
    if is_sqlite:
        # SQLite: create embedding as JSON text fallback (type affinity)
        with sync_engine.connect() as conn:
            cols = {row[1] for row in conn.execute(text("PRAGMA table_info(eve_memories)"))}
            if "embedding" not in cols:
                try:
                    conn.execute(text("ALTER TABLE eve_memories ADD COLUMN embedding JSON"))
                except Exception:
                    # fallback to TEXT if JSON not supported
                    try:
                        conn.execute(text("ALTER TABLE eve_memories ADD COLUMN embedding TEXT"))
                    except Exception:
                        pass
            conn.commit()
        return
    with sync_engine.connect() as conn:
        try:
            # Enable extension (requires superuser on first run; pgvector image has it preinstalled)
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        except Exception:
            pass
        # Add column if missing
        conn.execute(text("ALTER TABLE eve_memories ADD COLUMN IF NOT EXISTS embedding vector(1536)"))
        # HNSW index for cosine recall; IF NOT EXISTS safe for re-entry, small tables so no CONCURRENTLY
        try:
            conn.execute(
                text(
                    "CREATE INDEX IF NOT EXISTS ix_eve_memories_embedding ON eve_memories USING hnsw (embedding vector_cosine_ops)"
                )
            )
        except Exception:
            # Fallback to ivfflat if hnsw not available
            try:
                conn.execute(
                    text(
                        "CREATE INDEX IF NOT EXISTS ix_eve_memories_embedding ON eve_memories USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)"
                    )
                )
            except Exception:
                pass
        conn.commit()


def _ensure_performance_indexes() -> None:
    """Create composite indexes for pagination hot paths (lean, e2-micro safe).

    Uses IF NOT EXISTS + CONCURRENTLY avoidance (within transaction) for 1-10 users.
    For larger scale, move to Alembic migration with CONCURRENTLY outside txn.
    """
    if is_sqlite:
        # SQLite: simple indexes; sync_engine already handles it, errors ignored if exists
        stmts = [
            "CREATE INDEX IF NOT EXISTS ix_jobs_user_deleted_created ON jobs(user_id, deleted, created_at DESC, id DESC)",
            "CREATE INDEX IF NOT EXISTS ix_projects_user_deleted_created ON projects(user_id, deleted, created_at DESC, id DESC)",
            "CREATE INDEX IF NOT EXISTS ix_hackathons_user_deleted_created ON hackathons(user_id, deleted, created_at DESC, id DESC)",
            "CREATE INDEX IF NOT EXISTS ix_documents_user_deleted_updated ON documents(user_id, deleted, updated_at DESC, id DESC)",
            "CREATE INDEX IF NOT EXISTS ix_todos_user_deleted_due ON todos(user_id, deleted, due_date, created_at DESC)",
            "CREATE INDEX IF NOT EXISTS ix_contacts_user_deleted_name ON contacts(user_id, deleted, name)",
            "CREATE INDEX IF NOT EXISTS ix_notifications_user_read_created ON notifications(user_id, read, created_at DESC)",
            "CREATE INDEX IF NOT EXISTS ix_calls_status_updated ON calls(status, updated_at) WHERE status='ringing'",
            "CREATE INDEX IF NOT EXISTS ix_whatsapp_messages_user_chat_ts ON whatsapp_messages(user_id, chat_id, timestamp DESC)",
            "CREATE INDEX IF NOT EXISTS ix_calls_participants_created ON calls(caller_id, receiver_id, created_at DESC)",
        ]
        with sync_engine.connect() as conn:
            for stmt in stmts:
                try:
                    conn.execute(text(stmt))
                except Exception:
                    pass
            conn.commit()
        return
    # Postgres: IF NOT EXISTS is safe inside txn for 1-10 users; no CONCURRENTLY needed on small tables
    stmts = [
        "CREATE INDEX IF NOT EXISTS ix_jobs_user_deleted_created ON jobs(user_id, deleted, created_at DESC, id DESC)",
        "CREATE INDEX IF NOT EXISTS ix_projects_user_deleted_created ON projects(user_id, deleted, created_at DESC, id DESC)",
        "CREATE INDEX IF NOT EXISTS ix_hackathons_user_deleted_created ON hackathons(user_id, deleted, created_at DESC, id DESC)",
        "CREATE INDEX IF NOT EXISTS ix_documents_user_deleted_updated ON documents(user_id, deleted, updated_at DESC, id DESC)",
        "CREATE INDEX IF NOT EXISTS ix_todos_user_deleted_due ON todos(user_id, deleted, due_date, created_at DESC)",
        "CREATE INDEX IF NOT EXISTS ix_contacts_user_deleted_name ON contacts(user_id, deleted, name)",
        "CREATE INDEX IF NOT EXISTS ix_notifications_user_read_created ON notifications(user_id, read, created_at DESC)",
        "CREATE INDEX IF NOT EXISTS ix_calls_status_updated ON calls(status, updated_at) WHERE status='ringing'",
        "CREATE INDEX IF NOT EXISTS ix_whatsapp_messages_user_chat_ts ON whatsapp_messages(user_id, chat_id, timestamp DESC)",
        "CREATE INDEX IF NOT EXISTS ix_calls_participants_created ON calls(caller_id, receiver_id, created_at DESC)",
    ]
    with sync_engine.connect() as conn:
        for stmt in stmts:
            conn.execute(text(stmt))
        conn.commit()
