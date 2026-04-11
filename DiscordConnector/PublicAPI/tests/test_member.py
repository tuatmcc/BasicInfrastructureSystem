"""Tests for Member API endpoints via PublicAPI."""

import pytest
from unittest.mock import AsyncMock

from DiscordConnector.DiscordController.interface import DiscordConnectionError
from DiscordConnector.PublicAPI import dependencies as public_deps

pytestmark = pytest.mark.asyncio


class TestMemberList:
    """Tests for GET /api/v0/member/list endpoint."""

    async def test_list_members(self, client):
        response = await client.get("/api/v0/member/list")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        member = data[0]
        assert "id" in member
        assert "name" in member

    async def test_list_members_returns_503_on_discord_connection_failure(self, client):
        public_deps._member_service.list_members = AsyncMock(
            side_effect=DiscordConnectionError("Failed to connect to Discord")
        )

        response = await client.get("/api/v0/member/list")

        assert response.status_code == 503
        assert response.json() == {"detail": "Failed to connect to Discord"}


class TestMemberBan:
    """Tests for POST /api/v0/member/ban endpoint."""

    async def test_ban_member(self, client):
        response = await client.post(
            "/api/v0/member/ban",
            json={"id": 12345},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

    async def test_ban_member_missing_id(self, client):
        response = await client.post(
            "/api/v0/member/ban",
            json={},
        )
        assert response.status_code == 422


class TestMemberTimeout:
    """Tests for POST /api/v0/member/timeout endpoint."""

    async def test_timeout_member(self, client):
        response = await client.post(
            "/api/v0/member/timeout",
            json={"id": 12345},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True


class TestMemberListRoles:
    """Tests for GET /api/v0/member/list-roles endpoint."""

    async def test_list_member_roles(self, client):
        response = await client.get("/api/v0/member/list-roles", params={"member_id": 100})
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        role = data[0]
        assert "id" in role
        assert "name" in role
        assert "color" in role
        assert "position" in role

    async def test_list_member_roles_missing_id(self, client):
        response = await client.get("/api/v0/member/list-roles")
        assert response.status_code == 422
