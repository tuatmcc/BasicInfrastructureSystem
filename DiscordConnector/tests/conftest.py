"""Test fixtures for integration tests.

This module provides fixtures that combine:
- MockDiscordController (simulates Discord API)
- ControlInterface API (FastAPI TestClient)
- DiscordDatabaseController (Supabase Postgres)
"""

import os
import sys
from pathlib import Path
from typing import Generator
import importlib.util

import pytest

# Set MOCK_MODE before importing any project modules
os.environ["MOCK_MODE"] = "true"

# Base paths
_base_path = Path(__file__).parent.parent
_discord_controller_path = _base_path / "DiscordController"
_db_controller_path = _base_path / "DiscordDatabaseController"
_control_interface_path = _base_path / "ControlInterface"


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

# Add paths for other imports
sys.path.insert(0, str(_discord_controller_path))
sys.path.insert(0, str(_control_interface_path))
sys.path.insert(0, str(_base_path))

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
def integrated_client(
    mock_discord_controller: MockDiscordController,
    db_controller
) -> Generator:
    """Create a TestClient with both MockDiscordController and Supabase DB.
    
    This fixture provides a fully integrated test environment where:
    - Discord operations go through MockDiscordController
    - Database operations go through real DiscordDatabaseController (Supabase Postgres)
    - API operations go through real FastAPI TestClient
    """
    from fastapi.testclient import TestClient
    import dependencies
    from main import app

    # Override both controllers
    dependencies._controller = mock_discord_controller
    dependencies._db_controller = db_controller

    with TestClient(app) as test_client:
        yield test_client

    dependencies._controller = None
    dependencies._db_controller = None


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
