"""Test fixtures for DiscordDatabaseController tests."""

import sys
from pathlib import Path

import pytest

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from controller import DiscordDatabaseController
from test_support.supabase import get_test_database_url, reset_test_database


@pytest.fixture
async def db_controller():
    """Create a DiscordDatabaseController backed by Supabase Postgres."""
    database_url = get_test_database_url()
    await reset_test_database(database_url)

    controller = DiscordDatabaseController(database_url)
    await controller.connect()
    yield controller
    await controller.disconnect()
