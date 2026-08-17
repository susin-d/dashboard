"""Async database engine, session generator, and model initialization."""

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
    **({} if is_sqlite else {"pool_size": 10, "max_overflow": 20}),
)

sync_engine = create_engine(
    sync_db_url,
    echo=False,
    future=True,
    pool_pre_ping=True,
    **({} if is_sqlite else {"pool_size": 10, "max_overflow": 20}),
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
    """Initialize database tables."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    _ensure_call_messages_column()
    _ensure_whatsapp_columns()


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
