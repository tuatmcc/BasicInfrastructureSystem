from fastapi import APIRouter, Depends
from ..schemas import ChannelResponse
from dependencies import get_controller

router = APIRouter()

@router.get("/list", response_model=list[ChannelResponse])
async def list_channels(ctrl = Depends(get_controller)):
    channels = await ctrl.list_channels()
    return [ChannelResponse(id=c.id, name=c.name, category_id=c.category_id, position=c.position) for c in channels]
