"""Tests for CategoryService."""
import pytest


class TestCategoryServiceCreate:
    """Tests for CategoryService.create_category."""

    @pytest.mark.asyncio
    async def test_create_category_with_all_fields(self, category_service):
        category = await category_service.create_category("Test Category", 5)
        assert category.name == "Test Category"
        assert category.position == 5
        assert category.id is not None

    @pytest.mark.asyncio
    async def test_create_category_with_name_only(self, category_service):
        category = await category_service.create_category("Minimal Category")
        assert category.name == "Minimal Category"
        assert category.id is not None
        assert category.position is not None


class TestCategoryServiceDelete:
    """Tests for CategoryService.delete_category."""

    @pytest.mark.asyncio
    async def test_delete_category(self, category_service):
        success = await category_service.delete_category(12345)
        assert success is True


class TestCategoryServiceList:
    """Tests for CategoryService.list_categories."""

    @pytest.mark.asyncio
    async def test_list_categories(self, category_service):
        categories = await category_service.list_categories()
        assert isinstance(categories, list)
        assert len(categories) > 0
        category = categories[0]
        assert category.id is not None
        assert category.name is not None
        assert category.position is not None
