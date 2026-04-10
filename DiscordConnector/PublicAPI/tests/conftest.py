"""Test fixtures for PublicAPI tests."""
import os
import sys
from pathlib import Path
from typing import AsyncGenerator
import importlib.util

# Set MOCK_MODE before importing any project modules
os.environ["MOCK_MODE"] = "true"

# Load modules from explicit paths (BEFORE any other imports)
_control_interface_path = Path(__file__).parent.parent.parent / "ControlInterface"
_discord_controller_path = Path(__file__).parent.parent.parent / "DiscordController"
_db_controller_path = Path(__file__).parent.parent.parent / "DiscordDatabaseController"
_public_api_path = Path(__file__).parent.parent


def load_module_from_path(module_name: str, file_path: Path):
    """Load a module from an explicit file path."""
    spec = importlib.util.spec_from_file_location(module_name, file_path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = module
    spec.loader.exec_module(module)
    return module


# IMPORTANT: Add PublicAPI path FIRST and register its dependencies module
sys.path.insert(0, str(_public_api_path))
sys.path.insert(0, str(_control_interface_path))
sys.path.insert(0, str(_discord_controller_path))
sys.path.insert(0, str(_db_controller_path))
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

# Pre-register PublicAPI's dependencies module BEFORE importing api modules
_public_deps = load_module_from_path(
    "dependencies",
    _public_api_path / "dependencies.py"
)

import pytest
from httpx import ASGITransport, AsyncClient

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
async def mock_db_controller():
    """Create a connected MockDiscordDatabaseController for unit tests."""
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
        await controller.connect()
        yield controller
        await controller.disconnect()
    finally:
        if saved_interface:
            sys.modules['interface'] = saved_interface


@pytest.fixture
async def client(
    mock_controller: MockDiscordController,
    mock_db_controller,
) -> AsyncGenerator[AsyncClient, None]:
    """Create an AsyncClient with mocked dependencies."""
    from contextlib import asynccontextmanager
    from fastapi import FastAPI
    
    # Import PublicAPI dependencies (already registered in sys.modules)
    import dependencies as public_deps
    
    # Initialize services manually
    from services import RoleService, ChannelService, CategoryService, MemberService, MessageService
    
    role_service = RoleService(mock_controller, mock_db_controller)
    channel_service = ChannelService(mock_controller, mock_db_controller)
    category_service = CategoryService(mock_controller, mock_db_controller)
    member_service = MemberService(mock_controller, mock_db_controller)
    message_service = MessageService(mock_controller, mock_db_controller)
    
    public_deps._role_service = role_service
    public_deps._channel_service = channel_service
    public_deps._category_service = category_service
    public_deps._member_service = member_service
    public_deps._message_service = message_service
    
    # Create a no-op lifespan to skip initialization
    @asynccontextmanager
    async def test_lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
        yield
    
    # Import and configure app with test lifespan
    from api.v0 import router as v0_router
    
    app = FastAPI(
        title="Discord Connector Public API (Test)",
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
    
    # Override dependencies to return our mock services
    app.dependency_overrides[public_deps.get_role_service] = get_role_service_override
    app.dependency_overrides[public_deps.get_channel_service] = get_channel_service_override
    app.dependency_overrides[public_deps.get_category_service] = get_category_service_override
    app.dependency_overrides[public_deps.get_member_service] = get_member_service_override
    app.dependency_overrides[public_deps.get_message_service] = get_message_service_override
    
    @app.get("/health")
    async def health_check():
        return {"status": "ok"}
    
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as test_client:
        yield test_client
    
    # Cleanup
    public_deps._role_service = None
    public_deps._channel_service = None
    public_deps._category_service = None
    public_deps._member_service = None
    public_deps._message_service = None
