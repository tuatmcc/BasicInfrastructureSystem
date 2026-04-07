"""Tests for Channel CRUD operations."""

import pytest
from interface import DatabaseError


class TestChannelCreate:
    """Tests for create_channel method."""

    async def test_create_channel(self, db_controller):
        await db_controller.create_category("cat1", "General")
        
        channel = await db_controller.create_channel(
            channel_id="ch1",
            channel_name="general-chat",
            category_id="cat1",
        )
        assert channel.channel_id == "ch1"
        assert channel.channel_name == "general-chat"
        assert channel.category_id == "cat1"
        assert channel.role_ids == []

    async def test_create_channel_with_roles(self, db_controller):
        await db_controller.create_category("cat1", "General")
        await db_controller.create_role("role1", "Admin", 8)
        await db_controller.create_role("role2", "Mod", 4)
        
        channel = await db_controller.create_channel(
            channel_id="ch1",
            channel_name="admin-only",
            category_id="cat1",
            allowed_role_ids=["role1", "role2"],
        )
        assert set(channel.role_ids) == {"role1", "role2"}

    async def test_create_channel_nonexistent_category(self, db_controller):
        with pytest.raises(DatabaseError, match="Category .* not found"):
            await db_controller.create_channel(
                channel_id="ch1",
                channel_name="test",
                category_id="nonexistent",
            )


class TestChannelGet:
    """Tests for get_channel and get_channels methods."""

    async def test_get_channel_exists(self, db_controller):
        await db_controller.create_category("cat1", "General")
        await db_controller.create_channel("ch1", "general-chat", "cat1")
        
        channel = await db_controller.get_channel("ch1")
        assert channel is not None
        assert channel.channel_name == "general-chat"

    async def test_get_channel_not_exists(self, db_controller):
        channel = await db_controller.get_channel("nonexistent")
        assert channel is None

    async def test_get_channels_empty(self, db_controller):
        channels = await db_controller.get_channels()
        assert channels == []

    async def test_get_channels_multiple(self, db_controller):
        await db_controller.create_category("cat1", "General")
        await db_controller.create_channel("ch1", "general", "cat1")
        await db_controller.create_channel("ch2", "random", "cat1")
        await db_controller.create_channel("ch3", "announcements", "cat1")
        
        channels = await db_controller.get_channels()
        assert len(channels) == 3


class TestChannelDelete:
    """Tests for delete_channel method."""

    async def test_delete_existing_channel(self, db_controller):
        await db_controller.create_category("cat1", "General")
        await db_controller.create_channel("ch1", "general-chat", "cat1")
        
        result = await db_controller.delete_channel("ch1")
        assert result is True
        
        # Verify deletion
        channel = await db_controller.get_channel("ch1")
        assert channel is None

    async def test_delete_nonexistent_channel(self, db_controller):
        result = await db_controller.delete_channel("nonexistent")
        assert result is False


class TestChannelPermissions:
    """Tests for sync_channel_permissions method."""

    async def test_sync_channel_permissions(self, db_controller):
        await db_controller.create_category("cat1", "General")
        await db_controller.create_channel("ch1", "admin-only", "cat1")
        await db_controller.create_role("role1", "Admin", 8)
        await db_controller.create_role("role2", "Mod", 4)
        
        count = await db_controller.sync_channel_permissions("ch1", ["role1", "role2"])
        assert count == 2
        
        # Verify permissions
        channel = await db_controller.get_channel("ch1")
        assert set(channel.role_ids) == {"role1", "role2"}

    async def test_sync_channel_permissions_replaces_existing(self, db_controller):
        await db_controller.create_category("cat1", "General")
        await db_controller.create_channel("ch1", "test", "cat1")
        await db_controller.create_role("role1", "Admin", 8)
        await db_controller.create_role("role2", "Mod", 4)
        await db_controller.create_role("role3", "Member", 0)
        
        # Initial sync
        await db_controller.sync_channel_permissions("ch1", ["role1"])
        
        # Replace with different roles
        await db_controller.sync_channel_permissions("ch1", ["role2", "role3"])
        
        channel = await db_controller.get_channel("ch1")
        assert set(channel.role_ids) == {"role2", "role3"}

    async def test_sync_permissions_nonexistent_channel(self, db_controller):
        with pytest.raises(DatabaseError, match="not found"):
            await db_controller.sync_channel_permissions("nonexistent", ["role1"])
