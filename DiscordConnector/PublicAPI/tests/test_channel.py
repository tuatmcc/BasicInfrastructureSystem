"""Tests for Channel API endpoints via PublicAPI."""

import pytest

pytestmark = pytest.mark.asyncio


class TestChannelCreate:
    """Tests for POST /api/v0/channel/create endpoint."""

    async def test_create_channel_with_all_fields(self, client):
        response = await client.post(
            "/api/v0/channel/create",
            json={"name": "test-channel", "category_id": 100, "position": 3},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "test-channel"
        assert data["category_id"] == 100
        assert data["position"] == 3
        assert "id" in data

    async def test_create_channel_with_name_only(self, client):
        response = await client.post(
            "/api/v0/channel/create",
            json={"name": "minimal-channel"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "minimal-channel"
        assert "id" in data

    async def test_create_channel_missing_name(self, client):
        response = await client.post(
            "/api/v0/channel/create",
            json={},
        )
        assert response.status_code == 422


class TestChannelDelete:
    """Tests for POST /api/v0/channel/delete endpoint."""

    async def test_delete_channel(self, client):
        response = await client.post(
            "/api/v0/channel/delete",
            json={"id": 12345},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True


class TestChannelList:
    """Tests for GET /api/v0/channel/list endpoint."""

    async def test_list_channels(self, client):
        response = await client.get("/api/v0/channel/list")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        channel = data[0]
        assert "id" in channel
        assert "name" in channel
        assert "category_id" in channel
        assert "position" in channel


class TestChannelListRole:
    """Tests for GET /api/v0/channel/list-role endpoint."""

    async def test_list_channel_roles(self, client):
        response = await client.get("/api/v0/channel/list-role", params={"channel_id": 100})
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        role = data[0]
        assert "id" in role
        assert "name" in role
        assert "color" in role
        assert "position" in role

    async def test_list_channel_roles_missing_id(self, client):
        response = await client.get("/api/v0/channel/list-role")
        assert response.status_code == 422
