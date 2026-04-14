from fastapi import APIRouter, Depends
from DiscordConnector.PublicAPI.auth import require_admin
from DiscordConnector.PublicAPI.dependencies import get_channel_service
from ..schemas import ChannelCreate, ChannelResponse

router = APIRouter()


@router.post("/create", response_model=ChannelResponse)
async def create_channel(
    data: ChannelCreate,
    _principal=Depends(require_admin),
    service=Depends(get_channel_service),
):
    category_id = int(data.category_id) if data.category_id is not None else None
    channel = await service.create_channel(data.name, category_id, data.position)
    return ChannelResponse(
        id=str(channel.id),
        name=channel.name,
        category_id=(
            str(channel.category_id) if channel.category_id is not None else None
        ),
        position=channel.position,
    )
