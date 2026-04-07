"""Tests for Category CRUD operations."""

import pytest
from interface import DatabaseError


class TestCategoryCreate:
    """Tests for create_category method."""

    async def test_create_category(self, db_controller):
        category = await db_controller.create_category(
            category_id="cat1",
            category_name="General",
        )
        assert category.category_id == "cat1"
        assert category.category_name == "General"
        assert category.channels == []
        assert category.role_ids == []


class TestCategoryGet:
    """Tests for get_category and get_categories methods."""

    async def test_get_category_exists(self, db_controller):
        await db_controller.create_category("cat1", "General")
        
        category = await db_controller.get_category("cat1")
        assert category is not None
        assert category.category_name == "General"

    async def test_get_category_not_exists(self, db_controller):
        category = await db_controller.get_category("nonexistent")
        assert category is None

    async def test_get_categories_empty(self, db_controller):
        categories = await db_controller.get_categories()
        assert categories == []

    async def test_get_categories_multiple(self, db_controller):
        await db_controller.create_category("cat1", "General")
        await db_controller.create_category("cat2", "Voice")
        await db_controller.create_category("cat3", "Admin")
        
        categories = await db_controller.get_categories()
        assert len(categories) == 3

    async def test_get_category_with_channels(self, db_controller):
        await db_controller.create_category("cat1", "General")
        await db_controller.create_channel("ch1", "general-chat", "cat1")
        await db_controller.create_channel("ch2", "random", "cat1")
        
        category = await db_controller.get_category("cat1")
        assert category is not None
        assert len(category.channels) == 2


class TestCategoryDelete:
    """Tests for delete_category method."""

    async def test_delete_existing_category(self, db_controller):
        await db_controller.create_category("cat1", "General")
        
        result = await db_controller.delete_category("cat1")
        assert result is True
        
        # Verify deletion
        category = await db_controller.get_category("cat1")
        assert category is None

    async def test_delete_nonexistent_category(self, db_controller):
        result = await db_controller.delete_category("nonexistent")
        assert result is False

    async def test_delete_category_cascades_to_channels(self, db_controller):
        await db_controller.create_category("cat1", "General")
        await db_controller.create_channel("ch1", "general-chat", "cat1")
        
        # Delete category
        await db_controller.delete_category("cat1")
        
        # Verify channel is also deleted
        channel = await db_controller.get_channel("ch1")
        assert channel is None


class TestCategoryPermissions:
    """Tests for sync_category_permissions method."""

    async def test_sync_category_permissions(self, db_controller):
        await db_controller.create_category("cat1", "General")
        await db_controller.create_role("role1", "Admin", 8)
        await db_controller.create_role("role2", "Mod", 4)
        
        count = await db_controller.sync_category_permissions("cat1", ["role1", "role2"])
        assert count == 2
        
        # Verify permissions
        category = await db_controller.get_category("cat1")
        assert set(category.role_ids) == {"role1", "role2"}

    async def test_sync_category_permissions_replaces_existing(self, db_controller):
        await db_controller.create_category("cat1", "General")
        await db_controller.create_role("role1", "Admin", 8)
        await db_controller.create_role("role2", "Mod", 4)
        await db_controller.create_role("role3", "Member", 0)
        
        # Initial sync
        await db_controller.sync_category_permissions("cat1", ["role1"])
        
        # Replace with different roles
        await db_controller.sync_category_permissions("cat1", ["role2", "role3"])
        
        category = await db_controller.get_category("cat1")
        assert set(category.role_ids) == {"role2", "role3"}

    async def test_sync_permissions_nonexistent_category(self, db_controller):
        with pytest.raises(DatabaseError, match="not found"):
            await db_controller.sync_category_permissions("nonexistent", ["role1"])
