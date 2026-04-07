"""Tests for Category API endpoints."""


class TestCategoryCreate:
    """Tests for POST /api/v0/category/create endpoint."""

    def test_create_category_with_all_fields(self, client):
        response = client.post(
            "/api/v0/category/create",
            json={"name": "Test Category", "position": 5},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Test Category"
        assert data["position"] == 5
        assert "id" in data

    def test_create_category_with_name_only(self, client):
        response = client.post(
            "/api/v0/category/create",
            json={"name": "Minimal Category"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Minimal Category"
        assert "id" in data
        assert "position" in data

    def test_create_category_missing_name(self, client):
        response = client.post(
            "/api/v0/category/create",
            json={},
        )
        assert response.status_code == 422


class TestCategoryDelete:
    """Tests for POST /api/v0/category/delete endpoint."""

    def test_delete_category(self, client):
        response = client.post(
            "/api/v0/category/delete",
            json={"id": 12345},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

    def test_delete_category_missing_id(self, client):
        response = client.post(
            "/api/v0/category/delete",
            json={},
        )
        assert response.status_code == 422


class TestCategoryList:
    """Tests for GET /api/v0/category/list endpoint."""

    def test_list_categories(self, client):
        response = client.get("/api/v0/category/list")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        # Verify structure
        category = data[0]
        assert "id" in category
        assert "name" in category
        assert "position" in category
