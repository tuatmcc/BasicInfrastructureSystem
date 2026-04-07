import logging
from fastapi import APIRouter, Depends
from ..schemas import ChannelCreate, ChannelResponse
from dependencies import get_controller, get_db_controller

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/create", response_model=ChannelResponse)
async def create_channel(
    data: ChannelCreate,
    ctrl = Depends(get_controller),
    db_ctrl = Depends(get_db_controller),
):
    channel = await ctrl.create_channel(data.name, data.category_id, data.position)
    
    try:
        await db_ctrl.create_channel(
            channel_id=str(channel.id),
            channel_name=channel.name,
            category_id=str(channel.category_id),
        )
    except Exception as e:
        logger.error(f"Failed to save channel to database: {e}")
    
    return ChannelResponse(id=channel.id, name=channel.name, category_id=channel.category_id, position=channel.position)
