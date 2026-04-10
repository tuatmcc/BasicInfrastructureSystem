from fastapi import APIRouter, Depends
from DiscordConnector.PublicAPI.dependencies import get_channel_service
from ..schemas import ChannelResponse

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
