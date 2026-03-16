import os
from dotenv import load_dotenv
import logging
import discord

logger = logging.getLogger(__name__)

load_dotenv()
token = os.getenv("DISCORD_BOT_TOKEN")
guild_id = int(os.getenv("DISCORD_GUILD_ID"))

intents = discord.Intents.all()
client = discord.Client(intents=intents)

def logged_command(command):
    async def wrapper(*args, **kwargs):
        logger.info(f"Executing command {command.__name__}...")
        result = await command(*args, **kwargs)
        logger.info("Command {command.__name__} done.")
        return result
    return wrapper
