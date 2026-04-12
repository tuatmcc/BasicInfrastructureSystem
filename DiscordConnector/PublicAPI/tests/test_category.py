"""Tests for Category API endpoints via PublicAPI."""

import pytest

pytestmark = pytest.mark.asyncio


class TestCategoryCreate:
    """Tests for POST /api/v0/category/create endpoint."""

    async def test_create_category_with_all_fields(self, client):
        response = await client.post(
            "/api/v0/category/create",
            json={"name": "Test Category", "position": 2},
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data["id"], str)
        assert data["name"] == "Test Category"
        assert data["position"] == 2

    async def test_create_category_with_name_only(self, client):
        response = await client.post(
            "/api/v0/category/create",
            json={"name": "Minimal Category"},
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data["id"], str)
        assert data["name"] == "Minimal Category"

    async def test_create_category_missing_name(self, client):
        response = await client.post(
            "/api/v0/category/create",
            json={},
        )
        assert response.status_code == 422


class TestCategoryDelete:
    """Tests for POST /api/v0/category/delete endpoint."""

    async def test_delete_category(self, client):
        response = await client.post(
            "/api/v0/category/delete",
            json={"id": "12345"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True


class TestCategoryList:
    """Tests for GET /api/v0/category/list endpoint."""

    async def test_list_categories(self, client):
        response = await client.get("/api/v0/category/list")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        category = data[0]
        assert "id" in category
        assert isinstance(category["id"], str)
        assert "name" in category
        assert "position" in category
