import logging
from fastapi import APIRouter, Depends
from ..schemas import RoleDelete, SuccessResponse
from dependencies import get_controller, get_db_controller

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/delete", response_model=SuccessResponse)
async def delete_role(
    data: RoleDelete,
    ctrl = Depends(get_controller),
    db_ctrl = Depends(get_db_controller),
):
    success = await ctrl.delete_role(data.id)
    
    if success:
        try:
            await db_ctrl.delete_role(role_id=str(data.id))
        except Exception as e:
            logger.error(f"Failed to delete role from database: {e}")
    
    return SuccessResponse(success=success)
