"""Tests for Message API endpoints via PublicAPI."""

import pytest

pytestmark = pytest.mark.asyncio


class TestMessageCreate:
    """Tests for POST /api/v0/message/create endpoint."""

    async def test_create_message(self, client):
        response = await client.post(
            "/api/v0/message/create",
            json={"channel_id": "100", "content": "Hello, World!"},
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data["id"], str)
        assert data["content"] == "Hello, World!"
        assert data["channel_id"] == "100"
        assert isinstance(data["author_id"], str)

    async def test_create_message_missing_content(self, client):
        response = await client.post(
            "/api/v0/message/create",
            json={"channel_id": "100"},
        )
        assert response.status_code == 422

    async def test_create_message_missing_channel_id(self, client):
        response = await client.post(
            "/api/v0/message/create",
            json={"content": "Hello"},
        )
        assert response.status_code == 422

    async def test_create_message_rejects_numeric_json_channel_id(self, client):
        response = await client.post(
            "/api/v0/message/create",
            json={"channel_id": 100, "content": "Hello"},
        )
        assert response.status_code == 422


class TestMessageDelete:
    """Tests for POST /api/v0/message/delete endpoint."""

    async def test_delete_message(self, client):
        response = await client.post(
            "/api/v0/message/delete",
            json={"channel_id": "100", "message_id": "12345"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True


class TestReactionTotalling:
    """Tests for GET /api/v0/message/reaction/totalling endpoint."""

    async def test_totalling_reactions(self, client):
        response = await client.get(
            "/api/v0/message/reaction/totalling",
            params={"channel_id": "100", "message_id": "12345"},
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        reaction = data[0]
        assert "emoji" in reaction
        assert "member_ids" in reaction
        assert all(isinstance(member_id, str) for member_id in reaction["member_ids"])
        assert "me" in reaction
        assert "message_id" in reaction
        assert isinstance(reaction["message_id"], str)

    async def test_totalling_reactions_missing_params(self, client):
        response = await client.get("/api/v0/message/reaction/totalling")
        assert response.status_code == 422
