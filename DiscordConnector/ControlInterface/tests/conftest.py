"""Test fixtures for API v0 integration tests."""
import os
import sys
from pathlib import Path
from typing import Generator

# Set MOCK_MODE before importing any project modules
os.environ["MOCK_MODE"] = "true"

import pytest
from fastapi.testclient import TestClient

# Add required paths for imports
sys.path.insert(0, str(Path(__file__).parent.parent))
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "DiscordController"))
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from mock_controller import MockDiscordController
from interface import IDiscordController


@pytest.fixture
def mock_controller() -> MockDiscordController:
    """Create a fresh MockDiscordController for each test."""
    return MockDiscordController()


@pytest.fixture
def client(mock_controller: MockDiscordController) -> Generator[TestClient, None, None]:
    """Create a TestClient with mocked controller dependency."""
    import dependencies
    from main import app

    # Override the controller dependency
    original_get_controller = dependencies.get_controller
    dependencies._controller = mock_controller

    with TestClient(app) as test_client:
        yield test_client

    # Restore original (though typically not needed in tests)
    dependencies._controller = None
