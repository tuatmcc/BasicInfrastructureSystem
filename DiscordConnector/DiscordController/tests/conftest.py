"""Test fixtures for DiscordController tests with mocked discord.py objects."""

import sys
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, PropertyMock

import pytest

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))


def create_mock_colour(r: int, g: int, b: int) -> MagicMock:
    """Create a mock discord.Colour object."""
    colour = MagicMock()
    colour.to_rgb.return_value = (r, g, b)
    return colour


def create_mock_role(
    id_: int,
    name: str,
    color: tuple[int, int, int] = (0, 0, 0),
    position: int = 0,
    members: list | None = None,
) -> MagicMock:
    """Create a mock discord.Role object."""
    role = MagicMock()
    role.id = id_
    role.name = name
    role.color = create_mock_colour(*color)
    role.position = position
    role.members = members or []
    role.delete = AsyncMock()
    return role


def create_mock_member(id_: int, name: str, roles: list | None = None) -> MagicMock:
    """Create a mock discord.Member object."""
    member = MagicMock()
    member.id = id_
    member.name = name
    member.roles = roles or []
    member.ban = AsyncMock()
    member.kick = AsyncMock()
    return member


def create_mock_category(id_: int, name: str, position: int = 0) -> MagicMock:
    """Create a mock discord.CategoryChannel object."""
    category = MagicMock()
    category.id = id_
    category.name = name
    category.position = position
    category.delete = AsyncMock()
    return category


def create_mock_text_channel(
    id_: int,
    name: str,
    category_id: int | None = None,
    position: int = 0,
    changed_roles: list | None = None,
) -> MagicMock:
    """Create a mock discord.TextChannel object."""
    channel = MagicMock()
    channel.id = id_
    channel.name = name
    channel.category_id = category_id
    channel.position = position
    channel.changed_roles = changed_roles or []
    channel.delete = AsyncMock()
    channel.send = AsyncMock()
    channel.fetch_message = AsyncMock()
    return channel


def create_mock_message(
    id_: int,
    content: str,
    author_id: int,
    channel_id: int,
    reactions: list | None = None,
) -> MagicMock:
    """Create a mock discord.Message object."""
    message = MagicMock()
    message.id = id_
    message.content = content
    message.author = MagicMock()
    message.author.id = author_id
    message.channel = MagicMock()
    message.channel.id = channel_id
    message.reactions = reactions or []
    message.delete = AsyncMock()
    return message


def create_mock_reaction(emoji: str, user_ids: list[int], me: bool, message_id: int) -> MagicMock:
    """Create a mock discord.Reaction object."""
    reaction = MagicMock()
    reaction.emoji = emoji
    reaction.me = me
    reaction.message = MagicMock()
    reaction.message.id = message_id

    async def mock_users():
        for uid in user_ids:
            user = MagicMock()
            user.id = uid
            yield user

    reaction.users = mock_users
    return reaction


@pytest.fixture
def mock_guild():
    """Create a mock discord.Guild with common operations."""
    guild = MagicMock()

    # Storage for mock objects
    guild._roles = {}
    guild._channels = {}
    guild._categories = {}
    guild._members = {}

    # Role operations
    guild.roles = []

    def get_role(role_id):
        return guild._roles.get(role_id)

    guild.get_role = get_role

    async def create_role(name, color=None):
        role_id = 1000 + len(guild._roles)
        role = create_mock_role(
            role_id,
            name,
            color=color.to_rgb() if color else (0, 0, 0),
        )
        guild._roles[role_id] = role
        guild.roles.append(role)
        return role

    guild.create_role = create_role

    async def edit_role_positions(positions):
        for role, pos in positions.items():
            role.position = pos

    guild.edit_role_positions = edit_role_positions

    # Channel operations
    guild.text_channels = []

    def get_channel(channel_id):
        return guild._channels.get(channel_id) or guild._categories.get(channel_id)

    guild.get_channel = get_channel

    async def create_text_channel(name, category=None, position=None):
        channel_id = 2000 + len(guild._channels)
        channel = create_mock_text_channel(
            channel_id,
            name,
            category_id=category.id if category else None,
            position=position or 0,
        )
        guild._channels[channel_id] = channel
        guild.text_channels.append(channel)
        return channel

    guild.create_text_channel = create_text_channel

    # Category operations
    guild.categories = []

    async def create_category(name, position=None):
        category_id = 3000 + len(guild._categories)
        category = create_mock_category(category_id, name, position=position or 0)
        guild._categories[category_id] = category
        guild.categories.append(category)
        return category

    guild.create_category = create_category

    # Member operations
    guild.members = []

    def get_member(member_id):
        return guild._members.get(member_id)

    guild.get_member = get_member

    return guild


@pytest.fixture
def mock_guild_with_data(mock_guild):
    """Create a mock guild pre-populated with test data."""
    # Add some roles
    role1 = create_mock_role(100, "Admin", (255, 0, 0), 10)
    role2 = create_mock_role(101, "Moderator", (0, 255, 0), 5)
    role3 = create_mock_role(102, "Member", (0, 0, 255), 1)
    mock_guild._roles = {100: role1, 101: role2, 102: role3}
    mock_guild.roles = [role1, role2, role3]

    # Add some members
    member1 = create_mock_member(200, "User1", roles=[role3])
    member2 = create_mock_member(201, "User2", roles=[role2, role3])
    member3 = create_mock_member(202, "Admin", roles=[role1, role2, role3])
    mock_guild._members = {200: member1, 201: member2, 202: member3}
    mock_guild.members = [member1, member2, member3]
    role1.members = [member3]
    role2.members = [member2, member3]
    role3.members = [member1, member2, member3]

    # Add some categories
    cat1 = create_mock_category(300, "Text Channels", 0)
    cat2 = create_mock_category(301, "Voice Channels", 1)
    mock_guild._categories = {300: cat1, 301: cat2}
    mock_guild.categories = [cat1, cat2]

    # Add some channels
    ch1 = create_mock_text_channel(400, "general", 300, 0, changed_roles=[role3])
    ch2 = create_mock_text_channel(401, "random", 300, 1)
    ch3 = create_mock_text_channel(402, "admin-only", 301, 0, changed_roles=[role1])
    mock_guild._channels = {400: ch1, 401: ch2, 402: ch3}
    mock_guild.text_channels = [ch1, ch2, ch3]

    return mock_guild
