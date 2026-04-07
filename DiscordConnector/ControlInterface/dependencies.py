from contextlib import asynccontextmanager
from typing import AsyncGenerator
import sys
from pathlib import Path
import logging

# Add DiscordController to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / "DiscordController"))
# Add parent for config
sys.path.insert(0, str(Path(__file__).parent.parent))

from config import MOCK_MODE
from interface import IDiscordController

logger = logging.getLogger(__name__)

_controller: IDiscordController | None = None


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


@asynccontextmanager
async def lifespan(app) -> AsyncGenerator[None, None]:
    """Manage DiscordController lifecycle with FastAPI app."""
    global _controller
    _controller = _create_controller()
    await _controller.connect()
    await _controller.set_guild()
    yield
    await _controller.disconnect()


def get_controller() -> IDiscordController:
    """Dependency to get the DiscordController instance."""
    if _controller is None:
        raise RuntimeError("DiscordController not initialized")
    return _controller
