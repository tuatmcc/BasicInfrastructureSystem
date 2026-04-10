import discord
from DiscordConnector.DiscordController.interface import DiscordError, Member, Role

async def list_(guild: discord.Guild) -> list[Member]:
    return [Member(m.id, m.name) for m in guild.members]

# TODO: positionがメンバー内での相対値になっている
async def list_roles(member_id: int, guild: discord.Guild) -> list[Role]:
    try:
        m = guild.get_member(member_id)
        return [Role(r.id, r.name, r.color.to_rgb(), i, r.permissions.value) for i, r in enumerate(m.roles)]
    except AttributeError as e:
        raise DiscordError(f"No such member found: {member_id}") from e

async def ban(id: int, guild: discord.Guild) -> bool:
    try:
        m = guild.get_member(id)
        await m.ban()
    except discord.Forbidden as e:
        raise DiscordError(f"No permission to ban member {id}") from e
    except discord.HTTPException as e:
        raise DiscordError(f"HTTP error while banning member {id}") from e
    else:
        return guild.get_member(id) == None

async def kick(id: int, guild: discord.Guild) -> bool:
    try:
        m = guild.get_member(id)
        await m.kick()
    except discord.Forbidden as e:
        raise DiscordError(f"No permission to kick member {id}") from e
    except discord.HTTPException as e:
        raise DiscordError(f"HTTP error while kicking member {id}") from e
    else:
        return guild.get_member(id) == None
