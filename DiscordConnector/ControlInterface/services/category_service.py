"""Category service - business logic for category operations."""

import logging
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class CategoryData:
    """Domain object for category."""
    id: int
    name: str
    position: int


class CategoryService:
    """Service for category operations."""

    def __init__(self, controller, db_controller):
        self._ctrl = controller
        self._db_ctrl = db_controller

    async def create_category(
        self,
        name: str,
        position: int | None = None,
    ) -> CategoryData:
        """Create a new category and persist to database."""
        category = await self._ctrl.create_category(name, position)

        try:
            await self._db_ctrl.create_category(
                category_id=str(category.id),
                category_name=category.name,
            )
        except Exception as e:
            logger.error(f"Failed to save category to database: {e}")

        return CategoryData(
            id=category.id,
            name=category.name,
            position=category.position,
        )

    async def delete_category(self, category_id: int) -> bool:
        """Delete a category and remove from database."""
        success = await self._ctrl.delete_category(category_id)

        if success:
            try:
                await self._db_ctrl.delete_category(category_id=str(category_id))
            except Exception as e:
                logger.error(f"Failed to delete category from database: {e}")

        return success

    async def list_categories(self) -> list[CategoryData]:
        """List all categories."""
        categories = await self._ctrl.list_categories()
        return [
            CategoryData(id=c.id, name=c.name, position=c.position)
            for c in categories
        ]
