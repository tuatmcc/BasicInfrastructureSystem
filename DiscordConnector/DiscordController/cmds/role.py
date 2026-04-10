import discord
from DiscordConnector.DiscordController.interface import DiscordError, Member, Role

# permissionsもほしい
# 成功/失敗だけ返す方がいいかも？
async def create(name: str, color: tuple[int, int, int]|None, position: int|None, guild: discord.Guild) -> Role:
    try:
        color = discord.Colour.from_rgb(*color) if color != None else None
        r_temp = await guild.create_role(name=name, color=color)
        await guild.edit_role_positions({r_temp: position})
        r = guild.get_role(r_temp.id)
    except discord.Forbidden as e:
        raise DiscordError(f"No permission to create role {name}") from e
    except discord.HTTPException as e:
        raise DiscordError(f"HTTP error while creating role {name}") from e
    # TODO: discord.Role.positionは信用ならないらしい。毎回list_とって確認するか…？
    else:
        return Role(r.id, r.name, r.color.to_rgb(), r.position, r.permissions.value)

async def delete(id: int, guild: discord.Guild) -> bool:
    try:
        r = guild.get_role(id)
        await r.delete()
    except discord.NotFound:
        return True
    except AttributeError as e:
        raise DiscordError(f"No such role found: {id}") from e
    except discord.Forbidden as e:
        raise DiscordError(f"No permission to delete role {id}") from e
    except discord.HTTPException as e:
        raise DiscordError(f"HTTP error while deleting role {id}") from e
    else:
        return guild.get_role(id) == None

async def list_(guild: discord.Guild) -> list[Role]:
    return [Role(r.id, r.name, r.color.to_rgb(), i, r.permissions.value) for i, r in enumerate(guild.roles)]

async def list_members(role_id, guild: discord.Guild) -> list[Member]:
    try:
        r = guild.get_role(role_id)
        return [Member(m.id, m.name) for m in r.members]
    except AttributeError as e:
        raise DiscordError(f"No such role found: {role_id}") from e
