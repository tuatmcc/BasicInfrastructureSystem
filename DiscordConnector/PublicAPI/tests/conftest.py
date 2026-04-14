"""Test fixtures for PublicAPI tests."""

import base64
import hashlib
import hmac
import json
import os
import sys
import time
from pathlib import Path
from typing import AsyncGenerator, Callable

# Set auth-related env vars before importing project modules.
os.environ["MOCK_MODE"] = "true"
os.environ["JWT_SECRET_KEY"] = "test-jwt-secret"
os.environ["JWT_ALGORITHM"] = "HS256"

repo_root = Path(__file__).resolve().parents[3]
if str(repo_root) not in sys.path:
    sys.path.insert(0, str(repo_root))

import pytest
from httpx import ASGITransport, AsyncClient

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
from DiscordConnector.PublicAPI.api.v0 import router as v0_router
from DiscordConnector.PublicAPI.error_handlers import register_exception_handlers


def _encode_segment(value: dict[str, object]) -> str:
    raw = json.dumps(value, separators=(",", ":"), sort_keys=True).encode("utf-8")
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")


def create_test_jwt(
    subject: str = "test-user",
    roles: list[str] | None = None,
    expires_in: int = 3600,
    secret: str | None = None,
) -> str:
    """Create an HS256 JWT that matches PublicAPI's test configuration."""
    header = {"alg": "HS256", "typ": "JWT"}
    payload: dict[str, object] = {
        "sub": subject,
        "exp": int(time.time()) + expires_in,
    }
    if roles is not None:
        payload["roles"] = roles

    signing_input = f"{_encode_segment(header)}.{_encode_segment(payload)}"
    signing_secret = secret or os.environ["JWT_SECRET_KEY"]
    signature = base64.urlsafe_b64encode(
        hmac.new(
            signing_secret.encode("utf-8"),
            signing_input.encode("ascii"),
            hashlib.sha256,
        ).digest()
    ).rstrip(b"=").decode("ascii")
    return f"{signing_input}.{signature}"


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
    ) -> dict[str, str]:
        token = create_test_jwt(
            subject=subject,
            roles=roles,
            expires_in=expires_in,
            secret=secret,
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
