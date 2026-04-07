import logging
from fastapi import APIRouter, Depends
from ..schemas import MemberBan, SuccessResponse
from dependencies import get_controller, get_db_controller

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/ban", response_model=SuccessResponse)
async def ban_member(
    data: MemberBan,
    ctrl = Depends(get_controller),
    db_ctrl = Depends(get_db_controller),
):
    success = await ctrl.ban_member(data.id)
    
    if success:
        try:
            await db_ctrl.delete_user(discord_user_id=str(data.id))
        except Exception as e:
            logger.error(f"Failed to delete user from database: {e}")
    
    return SuccessResponse(success=success)
