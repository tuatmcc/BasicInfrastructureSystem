"""Tests for channel commands in DiscordController."""

import pytest

from DiscordConnector.DiscordController.cmds import channel
from DiscordConnector.DiscordController.interface import DiscordError


class TestChannelCreate:
    """Tests for channel.create command."""

    async def test_create_channel_basic(self, mock_guild):
        result = await channel.create("test-channel", None, None, mock_guild)
        
        assert result.name == "test-channel"
        assert result.id is not None
        assert result.category_id is None

    async def test_create_channel_with_category(self, mock_guild_with_data):
        result = await channel.create("new-channel", 300, None, mock_guild_with_data)
        
        assert result.name == "new-channel"
        assert result.category_id == 300

    async def test_create_channel_with_position(self, mock_guild):
        result = await channel.create("positioned-channel", None, 5, mock_guild)
        
        assert result.name == "positioned-channel"
        assert result.position == 5


class TestChannelDelete:
    """Tests for channel.delete command."""

    async def test_delete_existing_channel(self, mock_guild_with_data):
        # After delete, get_channel returns None
        original_get_channel = mock_guild_with_data.get_channel
        call_count = [0]
        
        def mock_get_channel(channel_id):
            call_count[0] += 1
            if call_count[0] > 1 and channel_id == 400:
                return None
            return original_get_channel(channel_id)
        
        mock_guild_with_data.get_channel = mock_get_channel
        
        result = await channel.delete(400, mock_guild_with_data)
        assert result is True

    async def test_delete_nonexistent_channel(self, mock_guild):
        with pytest.raises(DiscordError, match="No such channel found"):
            await channel.delete(9999, mock_guild)


class TestChannelList:
    """Tests for channel.list_ command."""

    async def test_list_channels(self, mock_guild_with_data):
        result = await channel.list_(mock_guild_with_data)
        
        assert len(result) == 3
        assert all(hasattr(c, 'id') and hasattr(c, 'name') for c in result)

    async def test_list_channels_empty(self, mock_guild):
        result = await channel.list_(mock_guild)
        assert result == []


class TestChannelListRoles:
    """Tests for channel.list_roles command."""

    async def test_list_channel_roles(self, mock_guild_with_data):
        # Channel 400 (general) has role 102 (Member) as changed_roles
        result = await channel.list_roles(400, mock_guild_with_data)
        
        assert len(result) == 1

    async def test_list_channel_roles_admin_only(self, mock_guild_with_data):
        # Channel 402 (admin-only) has role 100 (Admin)
        result = await channel.list_roles(402, mock_guild_with_data)
        assert len(result) == 1

    async def test_list_roles_nonexistent_channel(self, mock_guild):
        with pytest.raises(DiscordError):
            await channel.list_roles(9999, mock_guild)
