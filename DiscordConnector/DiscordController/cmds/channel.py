import discord
from interface import Channel, Role, DiscordError

#とりあえずテキストチャンネルのみ

async def create(name: str, category_id: int|None, position: int|None, guild: discord.Guild) -> Channel:
    try:
        cc = None
        if category_id != None:
            cc = guild.get_channel(category_id)
        tc = await guild.create_text_channel(name=name, category=cc, position=position)
    except discord.Forbidden as e:
        raise DiscordError(f"No permission to create channel {name}") from e
    except discord.HTTPException as e:
        raise DiscordError(f"HTTP error while creating role {name}") from e
    else:
        return Channel(tc.id, tc.name, tc.category_id, tc.position)

async def delete(id: int, guild: discord.Guild) -> bool:
    try:
        tc = guild.get_channel(id)
        await tc.delete()
    except discord.NotFound:
        return True
    except AttributeError as e:
        raise DiscordError(f"No such channel found: {id}") from e
    except discord.Forbidden as e:
        raise DiscordError(f"No permission to delete channel {id}") from e
    except discord.HTTPException as e:
        raise DiscordError(f"HTTP erro while deleting channel {id}") from e
    else:
        return guild.get_channel(id) == None

async def list_(guild: discord.Guild) -> list[Channel]:
    return [Channel(tc.id, tc.name, tc.category_id, tc.position) for tc in guild.text_channels]

#要件はチャンネルにアクセスできるロールのリストだが現状はチャンネル単位で権限が上書きされたロールのリスト
#各ロールのデフォルトの権限でチャンネルが見られずチャンネル毎に許可を出す運用なら両者が一致する
async def list_roles(channel_id: int, guild: discord.Guild) -> list[Role]:
    try:
        tc = guild.get_channel(channel_id)
        return tc.changed_roles
    except AttributeError as e:
        raise DiscordError(f"No such channel found: {channel_id}") from e
