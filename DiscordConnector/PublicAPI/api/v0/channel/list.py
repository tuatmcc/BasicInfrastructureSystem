from fastapi import APIRouter, Depends
from DiscordConnector.PublicAPI.auth import require_viewer
from DiscordConnector.PublicAPI.dependencies import get_channel_service
from ..schemas import ChannelResponse

router = APIRouter()


@router.get("/list", response_model=list[ChannelResponse])
async def list_channels(
    _principal=Depends(require_viewer),
    service=Depends(get_channel_service),
):
    channels = await service.list_channels()
    return [
        ChannelResponse(
            id=str(c.id),
            name=c.name,
            category_id=str(c.category_id) if c.category_id is not None else None,
            position=c.position,
        )
        for c in channels
    ]
