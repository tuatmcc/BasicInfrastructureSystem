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


def get_supabase_project_url() -> str:
    """Get the Supabase project URL used as the Auth issuer base."""
    project_url = os.getenv("SUPABASE_PROJECT_URL", "").strip().rstrip("/")
    if not project_url:
        raise ValueError("SUPABASE_PROJECT_URL is required for PublicAPI authentication")
    return project_url


def get_supabase_jwt_issuer() -> str:
    """Get the expected Supabase Auth issuer."""
    return os.getenv("SUPABASE_JWT_ISSUER", f"{get_supabase_project_url()}/auth/v1").rstrip("/")


def get_supabase_jwks_url() -> str:
    """Get the Supabase JWKS endpoint URL."""
    return os.getenv(
        "SUPABASE_JWKS_URL",
        f"{get_supabase_jwt_issuer()}/.well-known/jwks.json",
    )


def get_supabase_jwt_audience() -> str:
    """Get the expected audience for Supabase user access tokens."""
    return os.getenv("SUPABASE_JWT_AUDIENCE", "authenticated")


def get_supabase_jwt_algorithms() -> list[str]:
    """Get accepted JWT signing algorithms for Supabase JWKS verification."""
    raw_algorithms = os.getenv("SUPABASE_JWT_ALGORITHMS", "RS256,ES256")
    algorithms = [algorithm.strip() for algorithm in raw_algorithms.split(",") if algorithm.strip()]
    if not algorithms:
        raise ValueError("SUPABASE_JWT_ALGORITHMS must contain at least one algorithm")
    return algorithms


def get_discord_connector_role_claim() -> str:
    """Get the dotted claim path that stores DiscordConnector RBAC roles."""
    return os.getenv(
        "DISCORD_CONNECTOR_ROLE_CLAIM",
        "app_metadata.discord_connector_roles",
    )


def validate_public_api_auth_config() -> None:
    """Validate required PublicAPI authentication configuration."""
    get_supabase_project_url()
    if not get_supabase_jwt_issuer():
        raise ValueError("SUPABASE_JWT_ISSUER is required for PublicAPI authentication")
    if not get_supabase_jwks_url():
        raise ValueError("SUPABASE_JWKS_URL is required for PublicAPI authentication")
    if not get_supabase_jwt_audience():
        raise ValueError("SUPABASE_JWT_AUDIENCE is required for PublicAPI authentication")
    get_supabase_jwt_algorithms()
    if not get_discord_connector_role_claim():
        raise ValueError("DISCORD_CONNECTOR_ROLE_CLAIM is required for PublicAPI authentication")


# Module-level flag for convenience
MOCK_MODE = is_mock_mode()
DATABASE_URL = os.getenv("DATABASE_URL")
