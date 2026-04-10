"""Test fixtures for service layer tests."""
import os
import sys
from pathlib import Path
import importlib.util

# Set MOCK_MODE before importing any project modules
os.environ["MOCK_MODE"] = "true"

import pytest


def load_module_from_path(module_name: str, file_path: Path):
    """Load a module from an explicit file path."""
    spec = importlib.util.spec_from_file_location(module_name, file_path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = module
    spec.loader.exec_module(module)
    return module


# Load modules from explicit paths
_discord_controller_path = Path(__file__).parent.parent.parent / "DiscordController"
_db_controller_path = Path(__file__).parent.parent.parent / "DiscordDatabaseController"
_control_interface_path = Path(__file__).parent.parent

# Add paths for imports
sys.path.insert(0, str(_control_interface_path))
sys.path.insert(0, str(_discord_controller_path))
sys.path.insert(0, str(_db_controller_path))
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from test_support.supabase import get_test_database_url, reset_test_database

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


@pytest.fixture
def mock_controller() -> MockDiscordController:
    """Create a fresh MockDiscordController for each test."""
    return MockDiscordController()


@pytest.fixture
def mock_db_controller():
    """Create a MockDiscordDatabaseController for unit tests."""
    saved_interface = sys.modules.get('interface')
    
    db_interface = load_module_from_path(
        "db_interface_temp",
        _db_controller_path / "interface.py"
    )
    sys.modules['interface'] = db_interface
    
    try:
        db_mock_module = load_module_from_path(
            "db_mock_controller",
            _db_controller_path / "mock_controller.py"
        )
        controller = db_mock_module.MockDiscordDatabaseController()
    finally:
        if saved_interface:
            sys.modules['interface'] = saved_interface
    
    return controller


@pytest.fixture
async def db_controller():
    """Create a DiscordDatabaseController backed by Supabase Postgres."""
    database_url = get_test_database_url()
    await reset_test_database(database_url)

    saved_interface = sys.modules.get('interface')
    
    db_interface = load_module_from_path(
        "db_interface",
        _db_controller_path / "interface.py"
    )
    sys.modules['interface'] = db_interface
    
    load_module_from_path(
        "database",
        _db_controller_path / "database.py"
    )
    
    load_module_from_path(
        "models",
        _db_controller_path / "models.py"
    )
    
    db_ctrl_module = load_module_from_path(
        "db_controller_module",
        _db_controller_path / "controller.py"
    )
    DiscordDatabaseController = db_ctrl_module.DiscordDatabaseController
    
    controller = DiscordDatabaseController(database_url)
    await controller.connect()
    yield controller
    await controller.disconnect()
    
    if saved_interface:
        sys.modules['interface'] = saved_interface


# Service fixtures
@pytest.fixture
def role_service(mock_controller, mock_db_controller):
    """Create a RoleService with mock controllers."""
    from services import RoleService
    return RoleService(mock_controller, mock_db_controller)


@pytest.fixture
def role_service_with_db(mock_controller, db_controller):
    """Create a RoleService with mock Discord controller and real DB."""
    from services import RoleService
    return RoleService(mock_controller, db_controller)


@pytest.fixture
def channel_service(mock_controller, mock_db_controller):
    """Create a ChannelService with mock controllers."""
    from services import ChannelService
    return ChannelService(mock_controller, mock_db_controller)


@pytest.fixture
def channel_service_with_db(mock_controller, db_controller):
    """Create a ChannelService with mock Discord controller and real DB."""
    from services import ChannelService
    return ChannelService(mock_controller, db_controller)


@pytest.fixture
def category_service(mock_controller, mock_db_controller):
    """Create a CategoryService with mock controllers."""
    from services import CategoryService
    return CategoryService(mock_controller, mock_db_controller)


@pytest.fixture
def category_service_with_db(mock_controller, db_controller):
    """Create a CategoryService with mock Discord controller and real DB."""
    from services import CategoryService
    return CategoryService(mock_controller, db_controller)


@pytest.fixture
def member_service(mock_controller, mock_db_controller):
    """Create a MemberService with mock controllers."""
    from services import MemberService
    return MemberService(mock_controller, mock_db_controller)


@pytest.fixture
def member_service_with_db(mock_controller, db_controller):
    """Create a MemberService with mock Discord controller and real DB."""
    from services import MemberService
    return MemberService(mock_controller, db_controller)


@pytest.fixture
def message_service(mock_controller, mock_db_controller):
    """Create a MessageService with mock controllers."""
    from services import MessageService
    return MessageService(mock_controller, mock_db_controller)
