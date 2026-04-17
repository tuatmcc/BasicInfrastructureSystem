"""Test fixtures for PublicAPI tests."""

import json
import os
import sys
import time
from pathlib import Path
from typing import AsyncGenerator, Callable

# Set auth-related env vars before importing project modules.
os.environ["MOCK_MODE"] = "true"
os.environ["SUPABASE_PROJECT_URL"] = "https://supabase.test"
os.environ["SUPABASE_JWT_AUDIENCE"] = "authenticated"
os.environ["DISCORD_CONNECTOR_ROLE_CLAIM"] = "app_metadata.discord_connector_roles"

repo_root = Path(__file__).resolve().parents[3]
if str(repo_root) not in sys.path:
    sys.path.insert(0, str(repo_root))

import pytest
import jwt
from cryptography.hazmat.primitives.asymmetric import rsa
from httpx import ASGITransport, AsyncClient
from jwt import PyJWK
from jwt.exceptions import PyJWKClientError

from DiscordConnector.ControlInterface.services import (
    CategoryService,
    ChannelService,
    MemberService,
    MessageService,
    RoleService,
)
from DiscordConnector.DiscordController.mock_controller import MockDiscordController
from DiscordConnector.DiscordDatabaseController.mock_controller import (
    MockDiscordDatabaseController,
)
from DiscordConnector.PublicAPI import dependencies as public_deps
from DiscordConnector.PublicAPI import auth as public_auth
from DiscordConnector.PublicAPI.api.v0 import router as v0_router
from DiscordConnector.PublicAPI.error_handlers import register_exception_handlers


TEST_KEY_ID = "public-api-test-key"
TEST_ISSUER = "https://supabase.test/auth/v1"
TEST_AUDIENCE = "authenticated"
_PRIVATE_KEY = rsa.generate_private_key(public_exponent=65537, key_size=2048)
_WRONG_PRIVATE_KEY = rsa.generate_private_key(public_exponent=65537, key_size=2048)
_PUBLIC_JWK_JSON = jwt.algorithms.RSAAlgorithm.to_jwk(_PRIVATE_KEY.public_key())
_PUBLIC_JWK = PyJWK.from_json(
    json.dumps({**json.loads(_PUBLIC_JWK_JSON), "kid": TEST_KEY_ID, "alg": "RS256"})
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


def create_test_jwt(
    subject: str = "test-user",
    roles: list[str] | None = None,
    expires_in: int = 3600,
    secret: str | None = None,
    issuer: str = TEST_ISSUER,
    audience: str | list[str] = TEST_AUDIENCE,
    supabase_role: str | None = "authenticated",
    key_id: str = TEST_KEY_ID,
) -> str:
    """Create an RS256 Supabase-like JWT that matches PublicAPI's test configuration."""
    payload: dict[str, object] = {
        "sub": subject,
        "exp": int(time.time()) + expires_in,
        "iss": issuer,
        "aud": audience,
    }
    if supabase_role is not None:
        payload["role"] = supabase_role
    if roles is not None:
        payload["app_metadata"] = {"discord_connector_roles": roles}

    signing_key = _WRONG_PRIVATE_KEY if secret is not None else _PRIVATE_KEY
    return jwt.encode(
        payload,
        signing_key,
        algorithm="RS256",
        headers={"kid": key_id, "typ": "JWT"},
    )


def _build_test_app(
    mock_controller: MockDiscordController,
    mock_db_controller: MockDiscordDatabaseController,
):
    from contextlib import asynccontextmanager
    from fastapi import FastAPI

    role_service = RoleService(mock_controller, mock_db_controller)
    channel_service = ChannelService(mock_controller, mock_db_controller)
    category_service = CategoryService(mock_controller, mock_db_controller)
    member_service = MemberService(mock_controller, mock_db_controller)
    message_service = MessageService(mock_controller, mock_db_controller)

    public_deps._role_service = role_service
    public_deps._channel_service = channel_service
    public_deps._category_service = category_service
    public_deps._member_service = member_service
    public_deps._message_service = message_service
    public_auth._jwks_client = StaticJwksClient()
    public_auth._jwks_client_url = "https://supabase.test/auth/v1/.well-known/jwks.json"

    @asynccontextmanager
    async def test_lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
        yield

    app = FastAPI(
        title="Discord Connector Public API (Test)",
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

    app.dependency_overrides[public_deps.get_role_service] = get_role_service_override
    app.dependency_overrides[public_deps.get_channel_service] = get_channel_service_override
    app.dependency_overrides[public_deps.get_category_service] = get_category_service_override
    app.dependency_overrides[public_deps.get_member_service] = get_member_service_override
    app.dependency_overrides[public_deps.get_message_service] = get_message_service_override

    @app.get("/health")
    async def health_check():
        return {"status": "ok"}

    return app


def _clear_services() -> None:
    public_deps._role_service = None
    public_deps._channel_service = None
    public_deps._category_service = None
    public_deps._member_service = None
    public_deps._message_service = None
    public_auth._jwks_client = None
    public_auth._jwks_client_url = None


@pytest.fixture
def mock_controller() -> MockDiscordController:
    """Create a fresh MockDiscordController for each test."""
    return MockDiscordController()


@pytest.fixture
async def mock_db_controller():
    """Create a connected MockDiscordDatabaseController for unit tests."""
    controller = MockDiscordDatabaseController()
    await controller.connect()
    yield controller
    await controller.disconnect()


@pytest.fixture
def make_auth_headers() -> Callable[..., dict[str, str]]:
    """Return Authorization headers for a test JWT."""

    def factory(
        roles: list[str] | None = None,
        subject: str = "test-user",
        expires_in: int = 3600,
        secret: str | None = None,
        issuer: str = TEST_ISSUER,
        audience: str | list[str] = TEST_AUDIENCE,
        supabase_role: str | None = "authenticated",
        key_id: str = TEST_KEY_ID,
    ) -> dict[str, str]:
        token = create_test_jwt(
            subject=subject,
            roles=roles,
            expires_in=expires_in,
            secret=secret,
            issuer=issuer,
            audience=audience,
            supabase_role=supabase_role,
            key_id=key_id,
        )
        return {"Authorization": f"Bearer {token}"}

    return factory


@pytest.fixture
async def client(
    mock_controller: MockDiscordController,
    mock_db_controller,
    make_auth_headers,
) -> AsyncGenerator[AsyncClient, None]:
    """Create an authenticated AsyncClient with mocked dependencies."""
    app = _build_test_app(mock_controller, mock_db_controller)
    transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=transport,
        base_url="http://testserver",
        headers=make_auth_headers(["admin"]),
    ) as test_client:
        yield test_client
    _clear_services()


@pytest.fixture
async def anon_client(
    mock_controller: MockDiscordController,
    mock_db_controller,
) -> AsyncGenerator[AsyncClient, None]:
    """Create an unauthenticated AsyncClient with mocked dependencies."""
    app = _build_test_app(mock_controller, mock_db_controller)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as test_client:
        yield test_client
    _clear_services()
