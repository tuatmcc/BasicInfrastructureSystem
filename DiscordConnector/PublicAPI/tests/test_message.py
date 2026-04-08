"""Tests for Message API endpoints via PublicAPI."""


class TestMessageCreate:
    """Tests for POST /api/v0/message/create endpoint."""

    def test_create_message(self, client):
        response = client.post(
            "/api/v0/message/create",
            json={"channel_id": 100, "content": "Hello, World!"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["content"] == "Hello, World!"
        assert data["channel_id"] == 100
        assert "id" in data
        assert "author_id" in data

    def test_create_message_missing_content(self, client):
        response = client.post(
            "/api/v0/message/create",
            json={"channel_id": 100},
        )
        assert response.status_code == 422

    def test_create_message_missing_channel_id(self, client):
        response = client.post(
            "/api/v0/message/create",
            json={"content": "Hello"},
        )
        assert response.status_code == 422


class TestMessageDelete:
    """Tests for POST /api/v0/message/delete endpoint."""

    def test_delete_message(self, client):
        response = client.post(
            "/api/v0/message/delete",
            json={"channel_id": 100, "message_id": 12345},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True


class TestReactionTotalling:
    """Tests for GET /api/v0/message/reaction/totalling endpoint."""

    def test_totalling_reactions(self, client):
        response = client.get(
            "/api/v0/message/reaction/totalling",
            params={"channel_id": 100, "message_id": 12345},
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        reaction = data[0]
        assert "emoji" in reaction
        assert "member_ids" in reaction
        assert "me" in reaction
        assert "message_id" in reaction

    def test_totalling_reactions_missing_params(self, client):
        response = client.get("/api/v0/message/reaction/totalling")
        assert response.status_code == 422
