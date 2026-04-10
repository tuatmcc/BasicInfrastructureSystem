"""Test fixtures for DiscordDatabaseController tests."""

import sys
from pathlib import Path

import pytest

repo_root = Path(__file__).resolve().parents[3]
if str(repo_root) not in sys.path:
    sys.path.insert(0, str(repo_root))

from DiscordConnector.DiscordDatabaseController.controller import (
    DiscordDatabaseController,
)
from DiscordConnector.test_support.supabase import (
    get_test_database_url,
    reset_test_database,
)


@pytest.fixture
async def db_controller():
    """Create a DiscordDatabaseController backed by Supabase Postgres."""
    database_url = get_test_database_url()
    await reset_test_database(database_url)

    controller = DiscordDatabaseController(database_url)
    await controller.connect()
    yield controller
    await controller.disconnect()
