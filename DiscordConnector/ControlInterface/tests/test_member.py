"""Tests for MemberService."""
import pytest


class TestMemberServiceList:
    """Tests for MemberService.list_members."""

    @pytest.mark.asyncio
    async def test_list_members(self, member_service):
        members = await member_service.list_members()
        assert isinstance(members, list)
        assert len(members) > 0
        member = members[0]
        assert member.id is not None
        assert member.name is not None


class TestMemberServiceBan:
    """Tests for MemberService.ban_member."""

    @pytest.mark.asyncio
    async def test_ban_member(self, member_service):
        success = await member_service.ban_member(200)
        assert success is True


class TestMemberServiceTimeout:
    """Tests for MemberService.timeout_member."""

    @pytest.mark.asyncio
    async def test_timeout_member(self, member_service):
        success = await member_service.timeout_member(200)
        assert success is True


class TestMemberServiceListRoles:
    """Tests for MemberService.list_member_roles."""

    @pytest.mark.asyncio
    async def test_list_member_roles(self, member_service):
        roles = await member_service.list_member_roles(200)
        assert isinstance(roles, list)
        if len(roles) > 0:
            role = roles[0]
            assert role.id is not None
            assert role.name is not None
            assert role.color is not None
            assert role.position is not None
