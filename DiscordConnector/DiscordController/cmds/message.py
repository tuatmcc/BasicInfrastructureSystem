import discord
from DiscordConnector.DiscordController.interface import DiscordError, Message, Reaction

#TextChannel.send自体はもっと埋め込みとかリンクとか送れるので対応したいね
async def create(channel_id: int, content: str, guild: discord.Guild) -> Message:
    try:
        tc = guild.get_channel(channel_id)
        msg = await tc.send(content=content)
    except AttributeError as e:
        raise DiscordError(f"No such channel found: {channel_id}") from e
    except discord.Forbidden as e:
        raise DiscordError(f"No permission to send message to channel {channel_id}") from e
    except discord.HTTPException as e:
        raise DiscordError(f"HTTP error while sending message to channel {channel_id}") from e
    else:
        return Message(msg.id, msg.content, msg.author.id, msg.channel.id)

async def delete(channel_id: int, message_id: int, guild: discord.Guild) -> bool:
    try:
        tc = guild.get_channel(channel_id)
        msg = await tc.fetch_message(message_id)
        await msg.delete()
        await tc.fetch_message(message_id)
    except discord.NotFound:
        return True
    except AttributeError as e:
        raise DiscordError(f"Channel {channel_id} or message {message_id} not found") from e
    except discord.Forbidden as e:
        raise DiscordError(f"No permission to delete channel {channel_id}") from e
    except discord.HTTPException as e:
        raise DiscordError(f"HTTP error while deleting channel {channel_id}") from e
    else:
        return False

async def reactions(channel_id: int, message_id: int, guild: discord.Guild) -> list[Reaction]:
    try:
        tc = guild.get_channel(channel_id)
        msg = await tc.fetch_message(message_id)
        return [Reaction((ra.emoji if type(ra.emoji)==str else ra.emoji.name), [m.id async for m in ra.users()], ra.me, ra.message.id) for ra in msg.reactions]
    except AttributeError as e:
        raise DiscordError(f"Channel {channel_id} or message {message_id} not found") from e
