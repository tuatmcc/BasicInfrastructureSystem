"""Test fixtures for PublicAPI tests."""
import os
import sys
from pathlib import Path
from typing import AsyncGenerator

# Set MOCK_MODE before importing any project modules
os.environ["MOCK_MODE"] = "true"

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
async def client(
    mock_controller: MockDiscordController,
    mock_db_controller,
) -> AsyncGenerator[AsyncClient, None]:
    """Create an AsyncClient with mocked dependencies."""
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
    
    # Create a no-op lifespan to skip initialization
    @asynccontextmanager
    async def test_lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
        yield

    app = FastAPI(
        title="Discord Connector Public API (Test)",
        lifespan=test_lifespan,
    )
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
    
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as test_client:
        yield test_client
    
    public_deps._role_service = None
    public_deps._channel_service = None
    public_deps._category_service = None
    public_deps._member_service = None
    public_deps._message_service = None
