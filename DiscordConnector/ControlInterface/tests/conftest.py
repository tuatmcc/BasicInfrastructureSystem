"""Test fixtures for API v0 integration tests."""
import os
import sys
from pathlib import Path
from typing import Generator
import importlib.util

# Set MOCK_MODE before importing any project modules
os.environ["MOCK_MODE"] = "true"

import pytest
from fastapi.testclient import TestClient


def load_module_from_path(module_name: str, file_path: Path, deps: dict | None = None):
    """Load a module from an explicit file path with optional dependencies."""
    # Temporarily set up dependencies in sys.modules
    saved_modules = {}
    if deps:
        for dep_name, dep_path in deps.items():
            if dep_name in sys.modules:
                saved_modules[dep_name] = sys.modules[dep_name]
            dep_spec = importlib.util.spec_from_file_location(dep_name, dep_path)
            dep_module = importlib.util.module_from_spec(dep_spec)
            sys.modules[dep_name] = dep_module
            dep_spec.loader.exec_module(dep_module)
    
    spec = importlib.util.spec_from_file_location(module_name, file_path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = module
    spec.loader.exec_module(module)
    return module


# Load modules from explicit paths
_discord_controller_path = Path(__file__).parent.parent.parent / "DiscordController"
_db_controller_path = Path(__file__).parent.parent.parent / "DiscordDatabaseController"

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
sys.path.insert(0, str(Path(__file__).parent.parent.parent))
sys.path.insert(0, str(Path(__file__).parent.parent))


@pytest.fixture
def mock_controller() -> MockDiscordController:
    """Create a fresh MockDiscordController for each test."""
    return MockDiscordController()


@pytest.fixture
async def db_controller():
    """Create a DiscordDatabaseController with in-memory SQLite for each test."""
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
    
    controller = DiscordDatabaseController("sqlite+aiosqlite:///:memory:")
    await controller.connect()
    yield controller
    await controller.disconnect()
    
    # Restore interface
    if saved_interface:
        sys.modules['interface'] = saved_interface


@pytest.fixture
def client(mock_controller: MockDiscordController) -> Generator[TestClient, None, None]:
    """Create a TestClient with mocked controller dependency."""
    import dependencies
    from main import app

    # Override the controller dependency
    dependencies._controller = mock_controller

    with TestClient(app) as test_client:
        yield test_client

    # Restore original (though typically not needed in tests)
    dependencies._controller = None


@pytest.fixture
def client_with_db(mock_controller: MockDiscordController, db_controller) -> Generator[TestClient, None, None]:
    """Create a TestClient with both mocked Discord controller and real in-memory DB."""
    import dependencies
    from main import app

    # Override both controllers
    dependencies._controller = mock_controller
    dependencies._db_controller = db_controller

    with TestClient(app) as test_client:
        yield test_client

    # Restore
    dependencies._controller = None
    dependencies._db_controller = None
