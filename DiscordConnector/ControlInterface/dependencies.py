from contextlib import asynccontextmanager
from typing import AsyncGenerator
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
from interface import IDiscordController

# Import database controller interface
from interface import IDiscordDatabaseController  # type: ignore  # noqa: F811

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
        # Import from DiscordDatabaseController (already in sys.path)
        from mock_controller import MockDiscordDatabaseController  # type: ignore
        return MockDiscordDatabaseController()
    else:
        logger.info("Starting with real database connection")
        from controller import DiscordDatabaseController  # type: ignore
        return DiscordDatabaseController(DATABASE_URL)


@asynccontextmanager
async def lifespan(app) -> AsyncGenerator[None, None]:
    """Manage DiscordController and DiscordDatabaseController lifecycle with FastAPI app."""
    global _controller, _db_controller
    
    # Initialize Discord controller
    _controller = _create_controller()
    await _controller.connect()
    await _controller.set_guild()
    
    # Initialize Database controller
    _db_controller = _create_db_controller()
    await _db_controller.connect()
    
    yield
    
    # Cleanup
    await _db_controller.disconnect()
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
