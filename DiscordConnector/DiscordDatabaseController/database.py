"""Database connection and session management for DiscordDatabaseController."""

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, AsyncEngine
from sqlalchemy.orm import sessionmaker
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from models import Base


class Database:
    """Database connection manager."""

    def __init__(self, database_url: str):
        """Initialize database with connection URL.
        
        Args:
            database_url: SQLAlchemy connection URL (e.g., sqlite+aiosqlite:///./discord.db)
        """
        self._database_url = database_url
        self._engine: AsyncEngine | None = None
        self._session_factory: sessionmaker | None = None

    @property
    def engine(self) -> AsyncEngine:
        """Get the database engine."""
        if self._engine is None:
            raise RuntimeError("Database not initialized. Call connect() first.")
        return self._engine

    async def connect(self) -> None:
        """Initialize database connection and create tables."""
        if self._engine is not None:
            return

        self._engine = create_async_engine(
            self._database_url,
            echo=False,
        )
        self._session_factory = sessionmaker(
            bind=self._engine,
            class_=AsyncSession,
            expire_on_commit=False,
        )

        # Create tables
        async with self._engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    async def disconnect(self) -> None:
        """Close database connection and cleanup."""
        if self._engine is not None:
            await self._engine.dispose()
            self._engine = None
            self._session_factory = None

    @asynccontextmanager
    async def session(self) -> AsyncGenerator[AsyncSession, None]:
        """Get a database session."""
        if self._session_factory is None:
            raise RuntimeError("Database not initialized. Call connect() first.")
        
        async with self._session_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise
