"""Tests for Role API endpoints."""


class TestRoleCreate:
    """Tests for POST /api/v0/role/create endpoint."""

    def test_create_role_with_all_fields(self, client):
        response = client.post(
            "/api/v0/role/create",
            json={"name": "TestRole", "color": [255, 100, 50], "position": 5},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "TestRole"
        assert data["color"] == [255, 100, 50]
        assert data["position"] == 5
        assert "id" in data

    def test_create_role_with_name_only(self, client):
        response = client.post(
            "/api/v0/role/create",
            json={"name": "MinimalRole"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "MinimalRole"
        assert "id" in data
        assert "color" in data
        assert "position" in data

    def test_create_role_missing_name(self, client):
        response = client.post(
            "/api/v0/role/create",
            json={},
        )
        assert response.status_code == 422  # Validation error


class TestRoleDelete:
    """Tests for POST /api/v0/role/delete endpoint."""

    def test_delete_role(self, client):
        response = client.post(
            "/api/v0/role/delete",
            json={"id": 12345},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

    def test_delete_role_missing_id(self, client):
        response = client.post(
            "/api/v0/role/delete",
            json={},
        )
        assert response.status_code == 422


class TestRoleList:
    """Tests for GET /api/v0/role/list endpoint."""

    def test_list_roles(self, client):
        response = client.get("/api/v0/role/list")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        # Verify structure of first role
        role = data[0]
        assert "id" in role
        assert "name" in role
        assert "color" in role
        assert "position" in role


class TestRoleListMembers:
    """Tests for GET /api/v0/role/list-members endpoint."""

    def test_list_role_members(self, client):
        response = client.get("/api/v0/role/list-members", params={"role_id": 100})
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        # Verify structure
        member = data[0]
        assert "id" in member
        assert "name" in member

    def test_list_role_members_missing_role_id(self, client):
        response = client.get("/api/v0/role/list-members")
        assert response.status_code == 422
