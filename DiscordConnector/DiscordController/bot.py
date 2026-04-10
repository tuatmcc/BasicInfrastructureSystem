import logging
import discord

from DiscordConnector.config import (
    MOCK_MODE,
    get_discord_token,
    get_discord_guild_id,
    validate_discord_config,
)

logger = logging.getLogger(__name__)

# Validate configuration unless in mock mode
if not MOCK_MODE:
    validate_discord_config()

token = get_discord_token()
guild_id = get_discord_guild_id()

intents = discord.Intents.all()
client = discord.Client(intents=intents)

def logged_command(command):
    async def wrapper(*args, **kwargs):
        logger.info(f"Executing command {command.__name__}...")
        result = await command(*args, **kwargs)
        logger.info("Command {command.__name__} done.")
        return result
    return wrapper
