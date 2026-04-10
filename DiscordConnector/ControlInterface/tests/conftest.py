"""Test fixtures for service layer tests."""
import os
import sys
from pathlib import Path

# Set MOCK_MODE before importing any project modules
os.environ["MOCK_MODE"] = "true"

import pytest

repo_root = Path(__file__).resolve().parents[3]
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
from DiscordConnector.DiscordDatabaseController.mock_controller import (
    MockDiscordDatabaseController,
)
from DiscordConnector.test_support.supabase import (
    get_test_database_url,
    reset_test_database,
)


@pytest.fixture
def mock_controller() -> MockDiscordController:
    """Create a fresh MockDiscordController for each test."""
    return MockDiscordController()


@pytest.fixture
def mock_db_controller():
    """Create a MockDiscordDatabaseController for unit tests."""
    return MockDiscordDatabaseController()


@pytest.fixture
async def db_controller():
    """Create a DiscordDatabaseController backed by Supabase Postgres."""
    database_url = get_test_database_url()
    await reset_test_database(database_url)
    controller = DiscordDatabaseController(database_url)
    await controller.connect()
    yield controller
    await controller.disconnect()


# Service fixtures
@pytest.fixture
def role_service(mock_controller, mock_db_controller):
    """Create a RoleService with mock controllers."""
    return RoleService(mock_controller, mock_db_controller)


@pytest.fixture
def role_service_with_db(mock_controller, db_controller):
    """Create a RoleService with mock Discord controller and real DB."""
    return RoleService(mock_controller, db_controller)


@pytest.fixture
def channel_service(mock_controller, mock_db_controller):
    """Create a ChannelService with mock controllers."""
    return ChannelService(mock_controller, mock_db_controller)


@pytest.fixture
def channel_service_with_db(mock_controller, db_controller):
    """Create a ChannelService with mock Discord controller and real DB."""
    return ChannelService(mock_controller, db_controller)


@pytest.fixture
def category_service(mock_controller, mock_db_controller):
    """Create a CategoryService with mock controllers."""
    return CategoryService(mock_controller, mock_db_controller)


@pytest.fixture
def category_service_with_db(mock_controller, db_controller):
    """Create a CategoryService with mock Discord controller and real DB."""
    return CategoryService(mock_controller, db_controller)


@pytest.fixture
def member_service(mock_controller, mock_db_controller):
    """Create a MemberService with mock controllers."""
    return MemberService(mock_controller, mock_db_controller)


@pytest.fixture
def member_service_with_db(mock_controller, db_controller):
    """Create a MemberService with mock Discord controller and real DB."""
    return MemberService(mock_controller, db_controller)


@pytest.fixture
def message_service(mock_controller, mock_db_controller):
    """Create a MessageService with mock controllers."""
    return MessageService(mock_controller, mock_db_controller)
