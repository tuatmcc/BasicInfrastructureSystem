"""Tests for Role API endpoints via PublicAPI."""

import pytest
from unittest.mock import AsyncMock

from DiscordConnector.DiscordController.interface import DiscordError
from DiscordConnector.PublicAPI import dependencies as public_deps

pytestmark = pytest.mark.asyncio


class TestRoleCreate:
    """Tests for POST /api/v0/role/create endpoint."""

    async def test_create_role_with_all_fields(self, client):
        response = await client.post(
            "/api/v0/role/create",
            json={"name": "TestRole", "color": [255, 100, 50], "position": 5},
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data["id"], str)
        assert data["name"] == "TestRole"
        assert data["color"] == [255, 100, 50]
        assert data["position"] == 5

    async def test_create_role_with_name_only(self, client):
        response = await client.post(
            "/api/v0/role/create",
            json={"name": "MinimalRole"},
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data["id"], str)
        assert data["name"] == "MinimalRole"
        assert "color" in data
        assert "position" in data

    async def test_create_role_missing_name(self, client):
        response = await client.post(
            "/api/v0/role/create",
            json={},
        )
        assert response.status_code == 422

    async def test_create_role_returns_403_on_permission_error(self, client):
        public_deps._role_service.create_role = AsyncMock(
            side_effect=DiscordError("No permission to create role empty chairs")
        )

        response = await client.post(
            "/api/v0/role/create",
            json={"name": "empty chairs"},
        )

        assert response.status_code == 403
        assert response.json() == {
            "detail": "No permission to create role empty chairs"
        }


class TestRoleDelete:
    """Tests for POST /api/v0/role/delete endpoint."""

    async def test_delete_role(self, client):
        create_response = await client.post(
            "/api/v0/role/create",
            json={"name": "DeleteMe"},
        )
        role_id = create_response.json()["id"]

        response = await client.post(
            "/api/v0/role/delete",
            json={"id": role_id},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

    async def test_delete_role_accepts_string_snowflake_without_precision_loss(self, client):
        snowflake = "1492893356760764400"
        public_deps._role_service.delete_role = AsyncMock(return_value=True)

        response = await client.post(
            "/api/v0/role/delete",
            json={"id": snowflake},
        )

        assert response.status_code == 200
        public_deps._role_service.delete_role.assert_awaited_once_with(int(snowflake))

    async def test_delete_role_missing_id(self, client):
        response = await client.post(
            "/api/v0/role/delete",
            json={},
        )
        assert response.status_code == 422

    async def test_delete_role_rejects_numeric_json_id(self, client):
        response = await client.post(
            "/api/v0/role/delete",
            json={"id": 1492893356760764400},
        )
        assert response.status_code == 422


class TestRoleList:
    """Tests for GET /api/v0/role/list endpoint."""

    async def test_list_roles(self, client):
        response = await client.get("/api/v0/role/list")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        role = data[0]
        assert "id" in role
        assert isinstance(role["id"], str)
        assert "name" in role
        assert "color" in role
        assert "position" in role


class TestRoleListMembers:
    """Tests for GET /api/v0/role/list-members endpoint."""

    async def test_list_role_members(self, client):
        response = await client.get("/api/v0/role/list-members", params={"role_id": "100"})
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        member = data[0]
        assert "id" in member
        assert "name" in member

    async def test_list_role_members_missing_role_id(self, client):
        response = await client.get("/api/v0/role/list-members")
        assert response.status_code == 422
