"""Configuration module for DiscordConnector."""

import os
from dotenv import load_dotenv

load_dotenv()


def _parse_bool(value: str | None) -> bool:
    """Parse a string value as a boolean."""
    if value is None:
        return False
    return value.lower() in ("true", "1", "yes")


def is_mock_mode() -> bool:
    """Check if mock mode is enabled via MOCK_MODE environment variable."""
    return _parse_bool(os.getenv("MOCK_MODE"))


def get_discord_token() -> str | None:
    """Get Discord bot token from environment."""
    return os.getenv("DISCORD_BOT_TOKEN")


def get_discord_guild_id() -> int | None:
    """Get Discord guild ID from environment."""
    value = os.getenv("DISCORD_GUILD_ID")
    if value is None:
        return None
    try:
        return int(value)
    except ValueError:
        return None


def get_discord_log_channel_id() -> int | None:
    """Get Discord log channel ID from environment."""
    value = os.getenv("DISCORD_LOG_CHANNEL_ID")
    if value is None:
        return None
    try:
        return int(value)
    except ValueError:
        return None


def validate_discord_config() -> None:
    """Validate required Discord configuration.
    
    Raises:
        ValueError: If required configuration is missing or invalid.
    """
    errors = []
    
    if not get_discord_token():
        errors.append("DISCORD_BOT_TOKEN is not set")
    
    guild_id = os.getenv("DISCORD_GUILD_ID")
    if not guild_id:
        errors.append("DISCORD_GUILD_ID is not set")
    elif get_discord_guild_id() is None:
        errors.append(f"DISCORD_GUILD_ID must be an integer, got: {guild_id!r}")
    
    if errors:
        raise ValueError(
            "Discord configuration error:\n"
            + "\n".join(f"  - {e}" for e in errors)
            + "\n\nPlease set the required environment variables or use --mock mode."
        )


def get_database_url() -> str:
    """Get the Postgres database URL from environment."""
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise ValueError("DATABASE_URL is required and must point to a Supabase Postgres instance")
    if not database_url.startswith("postgresql+asyncpg://"):
        raise ValueError(
            "DATABASE_URL must use the SQLAlchemy asyncpg dialect: "
            "'postgresql+asyncpg://...'"
        )
    return database_url


# Module-level flag for convenience
MOCK_MODE = is_mock_mode()
DATABASE_URL = os.getenv("DATABASE_URL")
