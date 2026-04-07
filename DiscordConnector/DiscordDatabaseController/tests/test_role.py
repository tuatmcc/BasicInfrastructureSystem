"""Tests for Role CRUD operations."""

import pytest


class TestRoleCreate:
    """Tests for create_role method."""

    async def test_create_role(self, db_controller):
        role = await db_controller.create_role(
            role_id="role1",
            role_name="Admin",
            permissions=8,  # Administrator permission
        )
        assert role.role_id == "role1"
        assert role.role_name == "Admin"
        assert role.permissions == 8

    async def test_create_role_zero_permissions(self, db_controller):
        role = await db_controller.create_role(
            role_id="role1",
            role_name="Member",
            permissions=0,
        )
        assert role.permissions == 0


class TestRoleGet:
    """Tests for get_role and get_roles methods."""

    async def test_get_role_exists(self, db_controller):
        await db_controller.create_role("role1", "Admin", 8)
        
        role = await db_controller.get_role("role1")
        assert role is not None
        assert role.role_name == "Admin"

    async def test_get_role_not_exists(self, db_controller):
        role = await db_controller.get_role("nonexistent")
        assert role is None

    async def test_get_roles_empty(self, db_controller):
        roles = await db_controller.get_roles()
        assert roles == []

    async def test_get_roles_multiple(self, db_controller):
        await db_controller.create_role("role1", "Admin", 8)
        await db_controller.create_role("role2", "Mod", 4)
        await db_controller.create_role("role3", "Member", 0)
        
        roles = await db_controller.get_roles()
        assert len(roles) == 3


class TestRoleUpdate:
    """Tests for update_role method."""

    async def test_update_role_name(self, db_controller):
        await db_controller.create_role("role1", "Admin", 8)
        
        updated = await db_controller.update_role("role1", role_name="Super Admin")
        assert updated is not None
        assert updated.role_name == "Super Admin"
        assert updated.permissions == 8  # Unchanged

    async def test_update_role_permissions(self, db_controller):
        await db_controller.create_role("role1", "Admin", 8)
        
        updated = await db_controller.update_role("role1", permissions=16)
        assert updated.permissions == 16
        assert updated.role_name == "Admin"  # Unchanged

    async def test_update_role_all_fields(self, db_controller):
        await db_controller.create_role("role1", "Admin", 8)
        
        updated = await db_controller.update_role("role1", role_name="New Name", permissions=32)
        assert updated.role_name == "New Name"
        assert updated.permissions == 32

    async def test_update_nonexistent_role(self, db_controller):
        result = await db_controller.update_role("nonexistent", role_name="Name")
        assert result is None


class TestRoleDelete:
    """Tests for delete_role method."""

    async def test_delete_existing_role(self, db_controller):
        await db_controller.create_role("role1", "Admin", 8)
        
        result = await db_controller.delete_role("role1")
        assert result is True
        
        # Verify deletion
        role = await db_controller.get_role("role1")
        assert role is None

    async def test_delete_nonexistent_role(self, db_controller):
        result = await db_controller.delete_role("nonexistent")
        assert result is False

    async def test_delete_role_removes_from_user(self, db_controller):
        # Setup user with role
        await db_controller.create_user("user1", "User One")
        await db_controller.create_role("role1", "Admin", 8)
        await db_controller.sync_user_roles("user1", ["role1"])
        
        # Delete role
        await db_controller.delete_role("role1")
        
        # Verify role is removed from user
        user = await db_controller.get_user("user1")
        assert "role1" not in (user.role_ids or [])
