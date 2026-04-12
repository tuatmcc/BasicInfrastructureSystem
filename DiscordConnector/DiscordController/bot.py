import logging
import ssl
from collections.abc import Awaitable, Callable
from functools import wraps

import aiohttp
import certifi
import discord

from DiscordConnector.config import (
    get_discord_token,
    get_discord_guild_id,
    validate_discord_config,
)

logger = logging.getLogger(__name__)


def create_client() -> discord.Client:
    """Create a fresh discord.py client for one connection session."""
    intents = discord.Intents.none()
    intents.guilds = True
    # Member-related API endpoints rely on guild member caches.
    intents.members = True
    ssl_context = ssl.create_default_context(cafile=certifi.where())
    connector = aiohttp.TCPConnector(limit=0, ssl=ssl_context)
    return discord.Client(intents=intents, connector=connector)


def get_connection_settings() -> tuple[str, int]:
    """Load and validate Discord connection settings on demand."""
    validate_discord_config()

    token = get_discord_token()
    guild_id = get_discord_guild_id()
    if token is None or guild_id is None:
        raise ValueError("Discord connection settings are incomplete")
    return token, guild_id


def logged_command(command: Callable[..., Awaitable[object]]):
    @wraps(command)
    async def wrapper(*args, **kwargs):
        logger.info("Executing command %s...", command.__name__)

        controller = args[0] if args else None
        if controller is not None and hasattr(controller, "_execute_with_connection"):
            result = await controller._execute_with_connection(command, *args, **kwargs)
        else:
            result = await command(*args, **kwargs)

        logger.info("Command %s done.", command.__name__)
        return result

    return wrapper
