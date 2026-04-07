import logging
from fastapi import APIRouter, Depends
from ..schemas import CategoryDelete, SuccessResponse
from dependencies import get_controller, get_db_controller

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/delete", response_model=SuccessResponse)
async def delete_category(
    data: CategoryDelete,
    ctrl = Depends(get_controller),
    db_ctrl = Depends(get_db_controller),
):
    success = await ctrl.delete_category(data.id)
    
    if success:
        try:
            await db_ctrl.delete_category(category_id=str(data.id))
        except Exception as e:
            logger.error(f"Failed to delete category from database: {e}")
    
    return SuccessResponse(success=success)
