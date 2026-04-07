import logging
from fastapi import APIRouter, Depends
from ..schemas import CategoryCreate, CategoryResponse
from dependencies import get_controller, get_db_controller

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/create", response_model=CategoryResponse)
async def create_category(
    data: CategoryCreate,
    ctrl = Depends(get_controller),
    db_ctrl = Depends(get_db_controller),
):
    category = await ctrl.create_category(data.name, data.position)
    
    try:
        await db_ctrl.create_category(
            category_id=str(category.id),
            category_name=category.name,
        )
    except Exception as e:
        logger.error(f"Failed to save category to database: {e}")
    
    return CategoryResponse(id=category.id, name=category.name, position=category.position)
