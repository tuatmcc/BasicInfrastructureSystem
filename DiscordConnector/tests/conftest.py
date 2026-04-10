"""Test fixtures for integration tests.

This module provides fixtures that combine:
- MockDiscordController (simulates Discord API)
- ControlInterface API (FastAPI TestClient)
- DiscordDatabaseController (Supabase Postgres)
"""

import os
import sys
from pathlib import Path
from typing import AsyncGenerator

import pytest

# Set MOCK_MODE before importing any project modules
os.environ["MOCK_MODE"] = "true"

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
from DiscordConnector.PublicAPI.api.v0 import router as v0_router
from DiscordConnector.test_support.supabase import (
    get_test_database_url,
    reset_test_database,
)


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

    @asynccontextmanager
    async def test_lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
        yield

    app = FastAPI(
        title="Discord Connector Public API (Integration Test)",
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

    app.dependency_overrides[dependencies.get_role_service] = get_role_service_override
    app.dependency_overrides[dependencies.get_channel_service] = get_channel_service_override
    app.dependency_overrides[dependencies.get_category_service] = get_category_service_override
    app.dependency_overrides[dependencies.get_member_service] = get_member_service_override
    app.dependency_overrides[dependencies.get_message_service] = get_message_service_override

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as test_client:
        yield test_client

    dependencies._role_service = None
    dependencies._channel_service = None
    dependencies._category_service = None
    dependencies._member_service = None
    dependencies._message_service = None


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
