"""Test fixtures for integration tests.

This module provides fixtures that combine:
- MockDiscordController (simulates Discord API)
- ControlInterface API (FastAPI TestClient)
- DiscordDatabaseController (Supabase Postgres)
"""

import os
import sys
import json
import time
from pathlib import Path
from typing import AsyncGenerator

import pytest
import jwt
from cryptography.hazmat.primitives.asymmetric import rsa
from jwt import PyJWK
from jwt.exceptions import PyJWKClientError

# Set MOCK_MODE before importing any project modules
os.environ["MOCK_MODE"] = "true"
os.environ["SUPABASE_PROJECT_URL"] = "https://supabase.test"
os.environ["SUPABASE_JWT_AUDIENCE"] = "authenticated"
os.environ["DISCORD_CONNECTOR_ROLE_CLAIM"] = "app_metadata.discord_connector_roles"

repo_root = Path(__file__).resolve().parents[2]
if str(repo_root) not in sys.path:
    sys.path.insert(0, str(repo_root))

from DiscordConnector.ControlInterface.services import (
    CategoryService,
    ChannelService,
    MemberService,
    MessageService,
    RoleService,
)
from DiscordConnector.DiscordController.mock_controller import MockDiscordController
from DiscordConnector.DiscordDatabaseController.controller import (
    DiscordDatabaseController,
)
from DiscordConnector.PublicAPI import dependencies
from DiscordConnector.PublicAPI import auth as public_auth
from DiscordConnector.PublicAPI.api.v0 import router as v0_router
from DiscordConnector.PublicAPI.error_handlers import register_exception_handlers
from DiscordConnector.test_support.supabase import (
    get_test_database_url,
    reset_test_database,
)


TEST_KEY_ID = "integration-test-key"
_PRIVATE_KEY = rsa.generate_private_key(public_exponent=65537, key_size=2048)
_PUBLIC_JWK_JSON = jwt.algorithms.RSAAlgorithm.to_jwk(_PRIVATE_KEY.public_key())
_PUBLIC_JWK = PyJWK.from_json(
    json.dumps({**json.loads(_PUBLIC_JWK_JSON), "kid": TEST_KEY_ID, "alg": "RS256"})
)


def _create_test_jwt(roles: list[str]) -> str:
    payload = {
        "sub": "integration-test-user",
        "iss": "https://supabase.test/auth/v1",
        "aud": "authenticated",
        "role": "authenticated",
        "app_metadata": {"discord_connector_roles": roles},
        "exp": int(time.time()) + 3600,
    }
    return jwt.encode(
        payload,
        _PRIVATE_KEY,
        algorithm="RS256",
        headers={"kid": TEST_KEY_ID, "typ": "JWT"},
    )


class StaticJwksClient:
    """Test-only JWKS client that never performs network I/O."""

    def get_signing_key_from_jwt(self, token: str):
        try:
            header = jwt.get_unverified_header(token)
        except jwt.InvalidTokenError as exc:
            raise PyJWKClientError("Invalid token header") from exc
        if header.get("kid") != TEST_KEY_ID:
            raise PyJWKClientError("Unable to find a signing key that matches")
        return _PUBLIC_JWK


@pytest.fixture
def mock_discord_controller() -> MockDiscordController:
    """Create a fresh MockDiscordController for each test."""
    return MockDiscordController()


@pytest.fixture
async def db_controller():
    """Create a DiscordDatabaseController backed by Supabase Postgres."""
    database_url = get_test_database_url()
    await reset_test_database(database_url)
    controller = DiscordDatabaseController(database_url)
    await controller.connect()
    yield controller
    await controller.disconnect()


@pytest.fixture
async def integrated_client(
    mock_discord_controller: MockDiscordController,
    db_controller
) -> AsyncGenerator:
    """Create a TestClient with both MockDiscordController and Supabase DB.
    
    This fixture provides a fully integrated test environment where:
    - Discord operations go through MockDiscordController
    - Database operations go through real DiscordDatabaseController (Supabase Postgres)
    - API operations go through an in-process FastAPI AsyncClient
    """
    from contextlib import asynccontextmanager
    from fastapi import FastAPI
    from httpx import ASGITransport, AsyncClient

    role_service = RoleService(mock_discord_controller, db_controller)
    channel_service = ChannelService(mock_discord_controller, db_controller)
    category_service = CategoryService(mock_discord_controller, db_controller)
    member_service = MemberService(mock_discord_controller, db_controller)
    message_service = MessageService(mock_discord_controller, db_controller)

    dependencies._role_service = role_service
    dependencies._channel_service = channel_service
    dependencies._category_service = category_service
    dependencies._member_service = member_service
    dependencies._message_service = message_service
    public_auth._jwks_client = StaticJwksClient()
    public_auth._jwks_client_url = "https://supabase.test/auth/v1/.well-known/jwks.json"

    @asynccontextmanager
    async def test_lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
        yield

    app = FastAPI(
        title="Discord Connector Public API (Integration Test)",
        lifespan=test_lifespan,
    )
    register_exception_handlers(app)
    app.include_router(v0_router, prefix="/api/v0")

    async def get_role_service_override():
        return role_service

    async def get_channel_service_override():
        return channel_service

    async def get_category_service_override():
        return category_service

    async def get_member_service_override():
        return member_service

    async def get_message_service_override():
        return message_service

    app.dependency_overrides[dependencies.get_role_service] = get_role_service_override
    app.dependency_overrides[dependencies.get_channel_service] = get_channel_service_override
    app.dependency_overrides[dependencies.get_category_service] = get_category_service_override
    app.dependency_overrides[dependencies.get_member_service] = get_member_service_override
    app.dependency_overrides[dependencies.get_message_service] = get_message_service_override

    transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=transport,
        base_url="http://testserver",
        headers={"Authorization": f"Bearer {_create_test_jwt(['admin'])}"},
    ) as test_client:
        yield test_client

    dependencies._role_service = None
    dependencies._channel_service = None
    dependencies._category_service = None
    dependencies._member_service = None
    dependencies._message_service = None
    public_auth._jwks_client = None
    public_auth._jwks_client_url = None


class IntegrationTestContext:
    """Context object providing access to all components for integration tests."""

    def __init__(self, api_client, discord_controller, db_controller):
        self.api = api_client
        self.discord = discord_controller
        self.db = db_controller


@pytest.fixture
def integration_context(
    integrated_client,
    mock_discord_controller,
    db_controller
) -> IntegrationTestContext:
    """Provide a unified context for integration tests.
    
    Usage:
        def test_example(integration_context):
            ctx = integration_context
            # Use ctx.api for API calls
            # Use ctx.discord for direct Discord controller access
            # Use ctx.db for direct DB controller access
    """
    return IntegrationTestContext(
        api_client=integrated_client,
        discord_controller=mock_discord_controller,
        db_controller=db_controller
    )
