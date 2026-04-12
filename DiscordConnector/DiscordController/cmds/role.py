import inspect
import logging

import discord
from DiscordConnector.DiscordController.interface import DiscordError, Member, Role

logger = logging.getLogger(__name__)

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


async def _find_role(guild: discord.Guild, role_id: int):
    role = guild.get_role(role_id)
    if role is not None:
        return role

    for cached_role in getattr(guild, "roles", []):
        if getattr(cached_role, "id", None) == role_id:
            return cached_role

    fetch_roles = getattr(guild, "fetch_roles", None)
    if callable(fetch_roles):
        try:
            fetched_roles = fetch_roles()
            if not inspect.isawaitable(fetched_roles):
                return None
            for fetched_role in await fetched_roles:
                if getattr(fetched_role, "id", None) == role_id:
                    return fetched_role
        except discord.Forbidden as e:
            raise DiscordError(f"No permission to inspect role {role_id}") from e
        except discord.HTTPException as e:
            raise DiscordError(f"HTTP error while looking up role {role_id}") from e

    return None

async def delete(id: int, guild: discord.Guild) -> bool:
    try:
        r = await _find_role(guild, id)
        if r is None:
            logger.warning("Role delete failed because role was not found: role_id=%s", id)
            raise DiscordError(f"No such role found: {id}")
        await r.delete()
    except discord.NotFound:
        logger.info("Role delete treated as success because role was already gone: role_id=%s", id)
        return True
    except discord.Forbidden as e:
        logger.warning("Role delete forbidden: role_id=%s", id)
        raise DiscordError(f"No permission to delete role {id}") from e
    except discord.HTTPException as e:
        logger.warning("Role delete HTTP error: role_id=%s", id)
        raise DiscordError(f"HTTP error while deleting role {id}") from e
    else:
        logger.info("Role delete finished successfully: role_id=%s", id)
        return True

async def list_(guild: discord.Guild) -> list[Role]:
    return [Role(r.id, r.name, r.color.to_rgb(), i, r.permissions.value) for i, r in enumerate(guild.roles)]

async def list_members(role_id, guild: discord.Guild) -> list[Member]:
    try:
        r = guild.get_role(role_id)
        return [Member(m.id, m.name) for m in r.members]
    except AttributeError as e:
        raise DiscordError(f"No such role found: {role_id}") from e
