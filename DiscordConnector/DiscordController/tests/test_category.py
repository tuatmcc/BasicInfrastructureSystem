"""Tests for category commands in DiscordController."""

import pytest
from cmds import category
from interface import DiscordError


class TestCategoryCreate:
    """Tests for category.create command."""

    async def test_create_category_basic(self, mock_guild):
        result = await category.create("Test Category", None, mock_guild)
        
        assert result.name == "Test Category"
        assert result.id is not None

    async def test_create_category_with_position(self, mock_guild):
        result = await category.create("Positioned Category", 5, mock_guild)
        
        assert result.name == "Positioned Category"
        assert result.position == 5


class TestCategoryDelete:
    """Tests for category.delete command."""

    async def test_delete_existing_category(self, mock_guild_with_data):
        # After delete, get_channel returns None
        original_get_channel = mock_guild_with_data.get_channel
        call_count = [0]
        
        def mock_get_channel(channel_id):
            call_count[0] += 1
            if call_count[0] > 1 and channel_id == 300:
                return None
            return original_get_channel(channel_id)
        
        mock_guild_with_data.get_channel = mock_get_channel
        
        result = await category.delete(300, mock_guild_with_data)
        assert result is True

    async def test_delete_nonexistent_category(self, mock_guild):
        with pytest.raises(DiscordError, match="No such category found"):
            await category.delete(9999, mock_guild)


class TestCategoryList:
    """Tests for category.list_ command."""

    async def test_list_categories(self, mock_guild_with_data):
        result = await category.list_(mock_guild_with_data)
        
        assert len(result) == 2
        assert all(hasattr(c, 'id') and hasattr(c, 'name') for c in result)

    async def test_list_categories_empty(self, mock_guild):
        result = await category.list_(mock_guild)
        assert result == []
