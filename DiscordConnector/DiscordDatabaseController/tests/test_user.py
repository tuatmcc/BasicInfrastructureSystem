"""Tests for User CRUD operations."""

import pytest
from interface import DatabaseError


class TestUserCreate:
    """Tests for create_user method."""

    async def test_create_user_basic(self, db_controller):
        user = await db_controller.create_user(
            discord_user_id="123456789",
            display_name="TestUser",
        )
        assert user.discord_user_id == "123456789"
        assert user.display_name == "TestUser"
        assert user.member_id is None
        assert user.role_ids == []

    async def test_create_user_with_member_id(self, db_controller):
        user = await db_controller.create_user(
            discord_user_id="123456789",
            display_name="TestUser",
            member_id="member-001",
        )
        assert user.member_id == "member-001"

    async def test_create_duplicate_user_raises_error(self, db_controller):
        await db_controller.create_user(
            discord_user_id="123456789",
            display_name="TestUser",
        )
        with pytest.raises(DatabaseError, match="already exists"):
            await db_controller.create_user(
                discord_user_id="123456789",
                display_name="AnotherUser",
            )


class TestUserGet:
    """Tests for get_user and get_users methods."""

    async def test_get_user_exists(self, db_controller):
        await db_controller.create_user(
            discord_user_id="123456789",
            display_name="TestUser",
        )
        user = await db_controller.get_user("123456789")
        assert user is not None
        assert user.display_name == "TestUser"

    async def test_get_user_not_exists(self, db_controller):
        user = await db_controller.get_user("nonexistent")
        assert user is None

    async def test_get_users_empty(self, db_controller):
        users = await db_controller.get_users()
        assert users == []

    async def test_get_users_multiple(self, db_controller):
        await db_controller.create_user("user1", "User One")
        await db_controller.create_user("user2", "User Two")
        await db_controller.create_user("user3", "User Three")
        
        users = await db_controller.get_users()
        assert len(users) == 3

    async def test_get_users_filter_by_member_id(self, db_controller):
        await db_controller.create_user("user1", "User One", member_id="member-A")
        await db_controller.create_user("user2", "User Two", member_id="member-B")
        await db_controller.create_user("user3", "User Three", member_id="member-A")
        
        users = await db_controller.get_users(member_id="member-A")
        assert len(users) == 2
        assert all(u.member_id == "member-A" for u in users)


class TestUserUpdate:
    """Tests for update_user method."""

    async def test_update_user_display_name(self, db_controller):
        await db_controller.create_user("user1", "Original Name")
        
        updated = await db_controller.update_user("user1", "New Name")
        assert updated is not None
        assert updated.display_name == "New Name"
        
        # Verify persistence
        user = await db_controller.get_user("user1")
        assert user.display_name == "New Name"

    async def test_update_user_member_id(self, db_controller):
        await db_controller.create_user("user1", "User One")
        
        updated = await db_controller.update_user("user1", "User One", member_id="new-member-id")
        assert updated.member_id == "new-member-id"

    async def test_update_nonexistent_user(self, db_controller):
        result = await db_controller.update_user("nonexistent", "Name")
        assert result is None


class TestUserDelete:
    """Tests for delete_user method."""

    async def test_delete_existing_user(self, db_controller):
        await db_controller.create_user("user1", "User One")
        
        result = await db_controller.delete_user("user1")
        assert result is True
        
        # Verify deletion
        user = await db_controller.get_user("user1")
        assert user is None

    async def test_delete_nonexistent_user(self, db_controller):
        result = await db_controller.delete_user("nonexistent")
        assert result is False


class TestUserRoleSync:
    """Tests for sync_user_roles method."""

    async def test_sync_user_roles(self, db_controller):
        # Create user and roles
        await db_controller.create_user("user1", "User One")
        await db_controller.create_role("role1", "Role One", 0)
        await db_controller.create_role("role2", "Role Two", 0)
        
        # Sync roles
        count = await db_controller.sync_user_roles("user1", ["role1", "role2"])
        assert count == 2
        
        # Verify roles are assigned
        user = await db_controller.get_user("user1")
        assert set(user.role_ids) == {"role1", "role2"}

    async def test_sync_user_roles_replaces_existing(self, db_controller):
        await db_controller.create_user("user1", "User One")
        await db_controller.create_role("role1", "Role One", 0)
        await db_controller.create_role("role2", "Role Two", 0)
        await db_controller.create_role("role3", "Role Three", 0)
        
        # Initial sync
        await db_controller.sync_user_roles("user1", ["role1", "role2"])
        
        # Replace with different roles
        count = await db_controller.sync_user_roles("user1", ["role2", "role3"])
        assert count == 2
        
        user = await db_controller.get_user("user1")
        assert set(user.role_ids) == {"role2", "role3"}

    async def test_sync_user_roles_nonexistent_user(self, db_controller):
        with pytest.raises(DatabaseError, match="not found"):
            await db_controller.sync_user_roles("nonexistent", ["role1"])
