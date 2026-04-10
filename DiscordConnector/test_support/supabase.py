"""Helpers for tests that use a Supabase-backed Postgres database."""

import os

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine


def get_test_database_url() -> str:
    """Return the database URL for Supabase-backed integration tests."""
    database_url = os.getenv("TEST_DATABASE_URL") or os.getenv("DATABASE_URL")
    if not database_url:
        raise RuntimeError(
            "DATABASE_URL or TEST_DATABASE_URL must be set to a Supabase Postgres URL "
            "before running database integration tests"
        )
    if not database_url.startswith("postgresql+asyncpg://"):
        raise RuntimeError(
            "Database integration tests require a SQLAlchemy asyncpg URL: "
            "'postgresql+asyncpg://...'"
        )
    return database_url


async def reset_test_database(database_url: str) -> None:
    """Clear DiscordConnector tables in the test database."""
    engine = create_async_engine(database_url, echo=False, pool_pre_ping=True)
    try:
        async with engine.begin() as conn:
            try:
                await conn.execute(
                    text(
                        """
                        truncate table
                            public.channel_role_access,
                            public.category_role_access,
                            public.user_roles,
                            public.channels,
                            public.categories,
                            public.roles,
                            public.users
                        restart identity cascade
                        """
                    )
                )
            except Exception as exc:
                raise RuntimeError(
                    "Supabase test schema is missing. Run 'supabase db reset --local' "
                    "before running database integration tests."
                ) from exc
    finally:
        await engine.dispose()
