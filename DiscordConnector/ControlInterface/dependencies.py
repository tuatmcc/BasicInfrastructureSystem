from contextlib import asynccontextmanager
from typing import AsyncGenerator
import logging

from DiscordConnector.config import MOCK_MODE, get_database_url
from DiscordConnector.DiscordController.interface import IDiscordController
from DiscordConnector.DiscordDatabaseController.interface import (
    IDiscordDatabaseController,
)

logger = logging.getLogger(__name__)

_controller: IDiscordController | None = None
_db_controller: IDiscordDatabaseController | None = None


def _create_controller() -> IDiscordController:
    """Create the appropriate controller based on configuration."""
    if MOCK_MODE:
        logger.info("Starting in MOCK MODE - using MockDiscordController")
        from DiscordConnector.DiscordController.mock_controller import (
            MockDiscordController,
        )

        return MockDiscordController()

    logger.info("Starting with real Discord controller (Discord connection is deferred)")
    from DiscordConnector.DiscordController.controller import DiscordController

    return DiscordController()


def _create_db_controller() -> "IDiscordDatabaseController":
    """Create the appropriate database controller based on configuration."""
    if MOCK_MODE:
        logger.info("Starting in MOCK MODE - using MockDiscordDatabaseController")
        from DiscordConnector.DiscordDatabaseController.mock_controller import (
            MockDiscordDatabaseController,
        )

        return MockDiscordDatabaseController()

    logger.info("Starting with real database connection")
    from DiscordConnector.DiscordDatabaseController.controller import (
        DiscordDatabaseController,
    )

    return DiscordDatabaseController(get_database_url())


@asynccontextmanager
async def lifespan(app) -> AsyncGenerator[None, None]:
    """Manage DiscordController and DiscordDatabaseController lifecycle with FastAPI app."""
    global _controller, _db_controller
    
    # Skip initialization if controllers are already set (e.g., by tests)
    should_cleanup_controller = False
    should_cleanup_db_controller = False
    
    if _controller is None:
        _controller = _create_controller()
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
