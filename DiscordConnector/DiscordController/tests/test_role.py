"""Tests for role commands in DiscordController."""

import pytest
from unittest.mock import AsyncMock

from DiscordConnector.DiscordController.cmds import role
from DiscordConnector.DiscordController.interface import DiscordError


class TestRoleCreate:
    """Tests for role.create command."""

    async def test_create_role_basic(self, mock_guild):
        result = await role.create("TestRole", None, None, mock_guild)
        
        assert result.name == "TestRole"
        assert result.id is not None
        assert result.color == (0, 0, 0)

    async def test_create_role_with_color(self, mock_guild):
        result = await role.create("ColorRole", (255, 100, 50), None, mock_guild)
        
        assert result.name == "ColorRole"
        assert result.color == (255, 100, 50)

    async def test_create_role_with_position(self, mock_guild):
        result = await role.create("PositionRole", None, 5, mock_guild)
        
        assert result.name == "PositionRole"
        assert result.position == 5


class TestRoleDelete:
    """Tests for role.delete command."""

    async def test_delete_existing_role(self, mock_guild_with_data):
        # The role exists and gets deleted
        mock_guild_with_data._roles[100].delete = pytest.importorskip("unittest.mock").AsyncMock()
        
        # After delete, get_role returns None
        original_get_role = mock_guild_with_data.get_role
        call_count = [0]
        
        def mock_get_role(role_id):
            call_count[0] += 1
            if call_count[0] > 1 and role_id == 100:
                return None
            return original_get_role(role_id)
        
        mock_guild_with_data.get_role = mock_get_role
        
        result = await role.delete(100, mock_guild_with_data)
        assert result is True

    async def test_delete_nonexistent_role(self, mock_guild):
        with pytest.raises(DiscordError, match="No such role found"):
            await role.delete(9999, mock_guild)

    async def test_delete_role_falls_back_to_guild_roles_when_get_role_misses(self, mock_guild_with_data):
        target_role = mock_guild_with_data._roles[100]
        target_role.delete = AsyncMock()
        mock_guild_with_data.get_role = lambda _role_id: None

        result = await role.delete(100, mock_guild_with_data)

        assert result is True
        target_role.delete.assert_awaited_once()

    async def test_delete_role_logs_missing_role(self, mock_guild, caplog):
        with pytest.raises(DiscordError, match="No such role found"):
            await role.delete(9999, mock_guild)

        assert "Role delete failed because role was not found: role_id=9999" in caplog.text


class TestRoleList:
    """Tests for role.list_ command."""

    async def test_list_roles(self, mock_guild_with_data):
        result = await role.list_(mock_guild_with_data)
        
        assert len(result) == 3
        # Check that roles are converted to Role objects
        assert all(hasattr(r, 'id') and hasattr(r, 'name') for r in result)

    async def test_list_roles_empty(self, mock_guild):
        result = await role.list_(mock_guild)
        assert result == []


class TestRoleListMembers:
    """Tests for role.list_members command."""

    async def test_list_role_members(self, mock_guild_with_data):
        # Role 102 (Member) has all 3 members
        result = await role.list_members(102, mock_guild_with_data)
        
        assert len(result) == 3
        assert all(hasattr(m, 'id') and hasattr(m, 'name') for m in result)

    async def test_list_role_members_admin_only(self, mock_guild_with_data):
        # Role 100 (Admin) has only 1 member
        result = await role.list_members(100, mock_guild_with_data)
        assert len(result) == 1

    async def test_list_members_nonexistent_role(self, mock_guild):
        with pytest.raises(DiscordError, match="No such role found"):
            await role.list_members(9999, mock_guild)
