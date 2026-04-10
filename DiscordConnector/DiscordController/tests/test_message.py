"""Tests for message commands in DiscordController."""

import pytest
from unittest.mock import MagicMock, AsyncMock

from DiscordConnector.DiscordController.cmds import message
from DiscordConnector.DiscordController.interface import DiscordError


def create_mock_message(
    id_: int,
    content: str,
    author_id: int,
    channel_id: int,
    reactions: list | None = None,
) -> MagicMock:
    """Create a mock discord.Message object."""
    msg = MagicMock()
    msg.id = id_
    msg.content = content
    msg.author = MagicMock()
    msg.author.id = author_id
    msg.channel = MagicMock()
    msg.channel.id = channel_id
    msg.reactions = reactions or []
    msg.delete = AsyncMock()
    return msg


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


class TestMessageCreate:
    """Tests for message.create command."""

    async def test_create_message(self, mock_guild_with_data):
        # Setup: mock the send to return a message
        mock_msg = create_mock_message(
            id_=5000,
            content="Hello World",
            author_id=999,  # Bot ID
            channel_id=400,
        )
        mock_guild_with_data._channels[400].send = AsyncMock(return_value=mock_msg)
        
        result = await message.create(400, "Hello World", mock_guild_with_data)
        
        assert result.content == "Hello World"
        assert result.channel_id == 400
        assert result.id == 5000

    async def test_create_message_nonexistent_channel(self, mock_guild):
        with pytest.raises(DiscordError, match="No such channel found"):
            await message.create(9999, "Test", mock_guild)


class TestMessageDelete:
    """Tests for message.delete command."""

    async def test_delete_message(self, mock_guild_with_data):
        # Setup: mock fetch_message and delete
        mock_msg = create_mock_message(5000, "To Delete", 999, 400)
        channel = mock_guild_with_data._channels[400]
        
        # First fetch returns the message, second fetch raises NotFound
        import discord
        fetch_call_count = [0]
        
        async def mock_fetch(msg_id):
            fetch_call_count[0] += 1
            if fetch_call_count[0] == 1:
                return mock_msg
            raise discord.NotFound(MagicMock(), "Not found")
        
        channel.fetch_message = mock_fetch
        
        result = await message.delete(400, 5000, mock_guild_with_data)
        assert result is True

    async def test_delete_message_nonexistent_channel(self, mock_guild):
        with pytest.raises(DiscordError):
            await message.delete(9999, 5000, mock_guild)


class TestMessageReactions:
    """Tests for message.reactions command."""

    async def test_get_reactions(self, mock_guild_with_data):
        # Setup: mock fetch_message with reactions
        reaction1 = create_mock_reaction("👍", [200, 201], False, 5000)
        reaction2 = create_mock_reaction("❤️", [202], True, 5000)
        
        mock_msg = create_mock_message(5000, "React to this", 999, 400)
        mock_msg.reactions = [reaction1, reaction2]
        
        mock_guild_with_data._channels[400].fetch_message = AsyncMock(return_value=mock_msg)
        
        result = await message.reactions(400, 5000, mock_guild_with_data)
        
        assert len(result) == 2
        assert result[0].emoji == "👍"
        assert result[0].member_ids == [200, 201]
        assert result[1].emoji == "❤️"
        assert result[1].me is True

    async def test_get_reactions_nonexistent_channel(self, mock_guild):
        with pytest.raises(DiscordError):
            await message.reactions(9999, 5000, mock_guild)
