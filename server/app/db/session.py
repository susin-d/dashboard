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
