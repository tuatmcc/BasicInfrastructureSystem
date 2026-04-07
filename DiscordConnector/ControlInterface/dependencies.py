from contextlib import asynccontextmanager
from typing import AsyncGenerator, Protocol
import sys
from pathlib import Path
import logging

# Add DiscordController to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / "DiscordController"))
# Add DiscordDatabaseController to path for imports  
sys.path.insert(0, str(Path(__file__).parent.parent / "DiscordDatabaseController"))
# Add parent for config
sys.path.insert(0, str(Path(__file__).parent.parent))

from config import MOCK_MODE, DATABASE_URL

# Import Discord controller interface
import importlib.util as _importlib_util

# Load DiscordController's interface
_dc_interface_spec = _importlib_util.spec_from_file_location(
    "discord_controller_interface",
    Path(__file__).parent.parent / "DiscordController" / "interface.py"
)
_dc_interface = _importlib_util.module_from_spec(_dc_interface_spec)
_dc_interface_spec.loader.exec_module(_dc_interface)
IDiscordController = _dc_interface.IDiscordController

# Load DiscordDatabaseController's interface
_db_interface_spec = _importlib_util.spec_from_file_location(
    "discord_database_controller_interface",
    Path(__file__).parent.parent / "DiscordDatabaseController" / "interface.py"
)
_db_interface = _importlib_util.module_from_spec(_db_interface_spec)
_db_interface_spec.loader.exec_module(_db_interface)
IDiscordDatabaseController = _db_interface.IDiscordDatabaseController

logger = logging.getLogger(__name__)

_controller: IDiscordController | None = None
_db_controller: IDiscordDatabaseController | None = None


def _create_controller() -> IDiscordController:
    """Create the appropriate controller based on configuration."""
    if MOCK_MODE:
        logger.info("Starting in MOCK MODE - using MockDiscordController")
        from mock_controller import MockDiscordController
        return MockDiscordController()
    else:
        logger.info("Starting with real Discord connection")
        from controller import DiscordController
        return DiscordController()


def _create_db_controller() -> "IDiscordDatabaseController":
    """Create the appropriate database controller based on configuration."""
    if MOCK_MODE:
        logger.info("Starting in MOCK MODE - using MockDiscordDatabaseController")
        # Import from DiscordDatabaseController using explicit path
        import importlib.util
        spec = importlib.util.spec_from_file_location(
            "db_mock_controller",
            Path(__file__).parent.parent / "DiscordDatabaseController" / "mock_controller.py"
        )
        db_mock_module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(db_mock_module)
        return db_mock_module.MockDiscordDatabaseController()
    else:
        logger.info("Starting with real database connection")
        # Import from DiscordDatabaseController using explicit path
        import importlib.util
        spec = importlib.util.spec_from_file_location(
            "db_controller_module",
            Path(__file__).parent.parent / "DiscordDatabaseController" / "controller.py"
        )
        db_ctrl_module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(db_ctrl_module)
        return db_ctrl_module.DiscordDatabaseController(DATABASE_URL)


@asynccontextmanager
async def lifespan(app) -> AsyncGenerator[None, None]:
    """Manage DiscordController and DiscordDatabaseController lifecycle with FastAPI app."""
    global _controller, _db_controller
    
    # Skip initialization if controllers are already set (e.g., by tests)
    should_cleanup_controller = False
    should_cleanup_db_controller = False
    
    if _controller is None:
        _controller = _create_controller()
        await _controller.connect()
        await _controller.set_guild()
        should_cleanup_controller = True
    
    if _db_controller is None:
        _db_controller = _create_db_controller()
        await _db_controller.connect()
        should_cleanup_db_controller = True
    
    yield
    
    # Cleanup only what we initialized
    if should_cleanup_db_controller and _db_controller is not None:
        await _db_controller.disconnect()
    if should_cleanup_controller and _controller is not None:
        await _controller.disconnect()


def get_controller() -> IDiscordController:
    """Dependency to get the DiscordController instance."""
    if _controller is None:
        raise RuntimeError("DiscordController not initialized")
    return _controller


def get_db_controller() -> "IDiscordDatabaseController":
    """Dependency to get the DiscordDatabaseController instance."""
    if _db_controller is None:
        raise RuntimeError("DiscordDatabaseController not initialized")
    return _db_controller
