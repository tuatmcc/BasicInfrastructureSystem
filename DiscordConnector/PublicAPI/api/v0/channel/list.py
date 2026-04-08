from fastapi import APIRouter, Depends
from ..schemas import ChannelResponse
from dependencies import get_channel_service

router = APIRouter()


@router.get("/list", response_model=list[ChannelResponse])
async def list_channels(service=Depends(get_channel_service)):
    channels = await service.list_channels()
    return [
        ChannelResponse(
            id=c.id,
            name=c.name,
            category_id=c.category_id,
            position=c.position,
        )
        for c in channels
    ]
