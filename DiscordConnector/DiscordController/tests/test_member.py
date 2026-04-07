"""Tests for member commands in DiscordController."""

import pytest
from cmds import member
from interface import DiscordError


class TestMemberList:
    """Tests for member.list_ command."""

    async def test_list_members(self, mock_guild_with_data):
        result = await member.list_(mock_guild_with_data)
        
        assert len(result) == 3
        assert all(hasattr(m, 'id') and hasattr(m, 'name') for m in result)

    async def test_list_members_empty(self, mock_guild):
        result = await member.list_(mock_guild)
        assert result == []


class TestMemberListRoles:
    """Tests for member.list_roles command."""

    async def test_list_member_roles_single(self, mock_guild_with_data):
        # Member 200 (User1) has only role 102 (Member)
        result = await member.list_roles(200, mock_guild_with_data)
        
        assert len(result) == 1

    async def test_list_member_roles_multiple(self, mock_guild_with_data):
        # Member 202 (Admin) has all 3 roles
        result = await member.list_roles(202, mock_guild_with_data)
        
        assert len(result) == 3

    async def test_list_roles_nonexistent_member(self, mock_guild):
        with pytest.raises(DiscordError, match="No such member found"):
            await member.list_roles(9999, mock_guild)


class TestMemberBan:
    """Tests for member.ban command."""

    async def test_ban_member(self, mock_guild_with_data):
        # After ban, get_member returns None
        original_get_member = mock_guild_with_data.get_member
        call_count = [0]
        
        def mock_get_member(member_id):
            call_count[0] += 1
            if call_count[0] > 1 and member_id == 200:
                return None
            return original_get_member(member_id)
        
        mock_guild_with_data.get_member = mock_get_member
        
        result = await member.ban(200, mock_guild_with_data)
        assert result is True


class TestMemberKick:
    """Tests for member.kick command."""

    async def test_kick_member(self, mock_guild_with_data):
        # After kick, get_member returns None
        original_get_member = mock_guild_with_data.get_member
        call_count = [0]
        
        def mock_get_member(member_id):
            call_count[0] += 1
            if call_count[0] > 1 and member_id == 200:
                return None
            return original_get_member(member_id)
        
        mock_guild_with_data.get_member = mock_get_member
        
        result = await member.kick(200, mock_guild_with_data)
        assert result is True
