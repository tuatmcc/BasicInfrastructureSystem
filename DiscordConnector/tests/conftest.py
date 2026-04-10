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
import importlib.util

import pytest

# Set MOCK_MODE before importing any project modules
os.environ["MOCK_MODE"] = "true"

# Base paths
_base_path = Path(__file__).parent.parent
_discord_controller_path = _base_path / "DiscordController"
_db_controller_path = _base_path / "DiscordDatabaseController"
_control_interface_path = _base_path / "ControlInterface"
_public_api_path = _base_path / "PublicAPI"


def load_module_from_path(module_name: str, file_path: Path):
    """Load a module from an explicit file path."""
    spec = importlib.util.spec_from_file_location(module_name, file_path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = module
    spec.loader.exec_module(module)
    return module


# Load interface from DiscordController first
_interface_module = load_module_from_path(
    "interface",
    _discord_controller_path / "interface.py"
)

# Load DiscordController's mock_controller
_discord_mock_module = load_module_from_path(
    "mock_controller",
    _discord_controller_path / "mock_controller.py"
)
MockDiscordController = _discord_mock_module.MockDiscordController

# Add paths for other imports.
# PublicAPI must be first so `main` and `dependencies` resolve to that package.
sys.path.insert(0, str(_public_api_path))
sys.path.insert(0, str(_control_interface_path))
sys.path.insert(0, str(_discord_controller_path))
sys.path.insert(0, str(_db_controller_path))
sys.path.insert(0, str(_base_path))

# Pre-register PublicAPI dependencies before importing `main`.
load_module_from_path(
    "dependencies",
    _public_api_path / "dependencies.py"
)

from test_support.supabase import get_test_database_url, reset_test_database


@pytest.fixture
def mock_discord_controller() -> MockDiscordController:
    """Create a fresh MockDiscordController for each test."""
    return MockDiscordController()


@pytest.fixture
async def db_controller():
    """Create a DiscordDatabaseController backed by Supabase Postgres."""
    database_url = get_test_database_url()
    await reset_test_database(database_url)

    # Save current interface module
    saved_interface = sys.modules.get('interface')
    
    # Load DB controller's interface
    db_interface = load_module_from_path(
        "db_interface",
        _db_controller_path / "interface.py"
    )
    sys.modules['interface'] = db_interface
    
    # Load database module
    load_module_from_path(
        "database",
        _db_controller_path / "database.py"
    )
    
    # Load models module
    load_module_from_path(
        "models",
        _db_controller_path / "models.py"
    )
    
    # Load controller
    db_ctrl_module = load_module_from_path(
        "db_controller_module",
        _db_controller_path / "controller.py"
    )
    DiscordDatabaseController = db_ctrl_module.DiscordDatabaseController
    
    controller = DiscordDatabaseController(database_url)
    await controller.connect()
    yield controller
    await controller.disconnect()
    
    # Restore interface
    if saved_interface:
        sys.modules['interface'] = saved_interface


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
    import dependencies

    from services import (
        RoleService,
        ChannelService,
        CategoryService,
        MemberService,
        MessageService,
    )
    from api.v0 import router as v0_router

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
