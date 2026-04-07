"""Test fixtures for DiscordDatabaseController tests."""

import sys
from pathlib import Path

import pytest

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from controller import DiscordDatabaseController


@pytest.fixture
async def db_controller():
    """Create a DiscordDatabaseController with in-memory SQLite for each test."""
    controller = DiscordDatabaseController("sqlite+aiosqlite:///:memory:")
    await controller.connect()
    yield controller
    await controller.disconnect()
