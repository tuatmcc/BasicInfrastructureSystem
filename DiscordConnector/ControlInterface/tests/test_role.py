"""Tests for RoleService."""
import pytest


class TestRoleServiceCreate:
    """Tests for RoleService.create_role."""

    @pytest.mark.asyncio
    async def test_create_role_with_all_fields(self, role_service):
        role = await role_service.create_role("TestRole", (255, 100, 50), 5)
        assert role.name == "TestRole"
        assert role.color == (255, 100, 50)
        assert role.position == 5
        assert role.id is not None

    @pytest.mark.asyncio
    async def test_create_role_with_name_only(self, role_service):
        role = await role_service.create_role("MinimalRole")
        assert role.name == "MinimalRole"
        assert role.id is not None
        assert role.color is not None
        assert role.position is not None


class TestRoleServiceDelete:
    """Tests for RoleService.delete_role."""

    @pytest.mark.asyncio
    async def test_delete_role(self, role_service):
        success = await role_service.delete_role(12345)
        assert success is True


class TestRoleServiceList:
    """Tests for RoleService.list_roles."""

    @pytest.mark.asyncio
    async def test_list_roles(self, role_service):
        roles = await role_service.list_roles()
        assert isinstance(roles, list)
        assert len(roles) > 0
        role = roles[0]
        assert role.id is not None
        assert role.name is not None
        assert role.color is not None
        assert role.position is not None


class TestRoleServiceListMembers:
    """Tests for RoleService.list_role_members."""

    @pytest.mark.asyncio
    async def test_list_role_members(self, role_service):
        members = await role_service.list_role_members(100)
        assert isinstance(members, list)
        assert len(members) > 0
        member = members[0]
        assert member.id is not None
        assert member.name is not None
