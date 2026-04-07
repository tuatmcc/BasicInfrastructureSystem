"""Tests for Member API endpoints."""


class TestMemberList:
    """Tests for GET /api/v0/member/list endpoint."""

    def test_list_members(self, client):
        response = client.get("/api/v0/member/list")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        # Verify structure
        member = data[0]
        assert "id" in member
        assert "name" in member


class TestMemberBan:
    """Tests for POST /api/v0/member/ban endpoint."""

    def test_ban_member(self, client):
        response = client.post(
            "/api/v0/member/ban",
            json={"id": 200},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

    def test_ban_member_missing_id(self, client):
        response = client.post(
            "/api/v0/member/ban",
            json={},
        )
        assert response.status_code == 422


class TestMemberTimeout:
    """Tests for POST /api/v0/member/timeout endpoint."""

    def test_timeout_member(self, client):
        response = client.post(
            "/api/v0/member/timeout",
            json={"id": 200},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

    def test_timeout_member_missing_id(self, client):
        response = client.post(
            "/api/v0/member/timeout",
            json={},
        )
        assert response.status_code == 422


class TestMemberListRoles:
    """Tests for GET /api/v0/member/list-roles endpoint."""

    def test_list_member_roles(self, client):
        response = client.get("/api/v0/member/list-roles", params={"member_id": 200})
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Verify structure if roles exist
        if len(data) > 0:
            role = data[0]
            assert "id" in role
            assert "name" in role
            assert "color" in role
            assert "position" in role

    def test_list_member_roles_missing_member_id(self, client):
        response = client.get("/api/v0/member/list-roles")
        assert response.status_code == 422
