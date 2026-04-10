import discord
from DiscordConnector.DiscordController.interface import Category, DiscordError

async def create(name: str, position: int|None, guild: discord.Guild) -> Category:
    try:
        cc = await guild.create_category(name=name, position=position)
    except discord.Forbidden as e:
        raise DiscordError("No permission to create category {name}") from e
    except discord.HTTPException as e:
        raise DiscordError("HTTP error while creating category {name}") from e
    else:
        return Category(cc.id, cc.name, cc.position)

async def delete(id: int, guild: discord.Guild) -> bool:
    try:
        cc = guild.get_channel(id)
        await cc.delete()
    except discord.NotFound:
        return True
    except AttributeError as e:
        raise DiscordError(f"No such category found: {id}") from e
    except discord.Forbidden as e:
        raise DiscordError(f"No permission to delete category {id}") from e
    except discord.HTTPException as e:
        raise DiscordError(f"HTTP error while deleting category {id}") from e
    else:
        return guild.get_channel(id) == None

async def list_(guild: discord.Guild) -> list[Category]:
    return [Category(cc.id, cc.name, cc.position) for cc in guild.categories]
