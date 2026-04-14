"""Configuration helpers for AuthService."""

from __future__ import annotations

import json
import os


def _load_json_list(name: str) -> list[dict[str, object]] | None:
    raw = os.getenv(name)
    if not raw:
        return None
    try:
        value = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise ValueError(f"{name} must be valid JSON") from exc
    if not isinstance(value, list):
        raise ValueError(f"{name} must decode to a list")
    normalized: list[dict[str, object]] = []
    for item in value:
        if not isinstance(item, dict):
            raise ValueError(f"{name} items must be objects")
        normalized.append(item)
    return normalized


def get_jwt_secret_key() -> str:
    secret = os.getenv("JWT_SECRET_KEY")
    if not secret:
        raise ValueError("JWT_SECRET_KEY is required for AuthService")
    return secret


def get_jwt_algorithm() -> str:
    algorithm = os.getenv("JWT_ALGORITHM", "HS256")
    if algorithm != "HS256":
        raise ValueError(f"Unsupported JWT_ALGORITHM: {algorithm!r}. Only 'HS256' is supported.")
    return algorithm


def get_jwt_issuer() -> str:
    issuer = os.getenv("JWT_ISSUER", "auth-service")
    if not issuer:
        raise ValueError("JWT_ISSUER is required for AuthService")
    return issuer


def get_discord_audience() -> str:
    audience = os.getenv("JWT_AUDIENCE_DISCORD", "discord-public-api")
    if not audience:
        raise ValueError("JWT_AUDIENCE_DISCORD is required for AuthService")
    return audience


def get_user_token_ttl() -> int:
    return int(os.getenv("AUTH_USER_TOKEN_TTL_SECONDS", "3600"))


def get_service_token_ttl() -> int:
    return int(os.getenv("AUTH_SERVICE_TOKEN_TTL_SECONDS", "900"))


def get_bootstrap_users() -> list[dict[str, object]]:
    configured = _load_json_list("AUTH_BOOTSTRAP_USERS_JSON")
    if configured is not None:
        return configured
    return [
        {
            "username": os.getenv("AUTH_BOOTSTRAP_ADMIN_USERNAME", "admin"),
            "email": os.getenv("AUTH_BOOTSTRAP_ADMIN_EMAIL", "admin@example.local"),
            "password": os.getenv("AUTH_BOOTSTRAP_ADMIN_PASSWORD", "change-this-admin-password"),
            "roles": ["admin"],
            "enabled": True,
        }
    ]


def get_bootstrap_service_accounts() -> list[dict[str, object]]:
    configured = _load_json_list("AUTH_BOOTSTRAP_SERVICE_ACCOUNTS_JSON")
    if configured is not None:
        return configured
    return [
        {
            "client_id": os.getenv("AUTH_BOOTSTRAP_SERVICE_CLIENT_ID", "discord-sync"),
            "client_secret": os.getenv(
                "AUTH_BOOTSTRAP_SERVICE_CLIENT_SECRET",
                "change-this-service-secret",
            ),
            "roles": ["admin"],
            "enabled": True,
        }
    ]
