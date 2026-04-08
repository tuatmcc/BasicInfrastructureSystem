from fastapi import APIRouter, Depends
from ..schemas import ChannelCreate, ChannelResponse
from dependencies import get_channel_service

router = APIRouter()


@router.post("/create", response_model=ChannelResponse)
async def create_channel(
    data: ChannelCreate,
    service=Depends(get_channel_service),
):
    channel = await service.create_channel(data.name, data.category_id, data.position)
    return ChannelResponse(
        id=channel.id,
        name=channel.name,
        category_id=channel.category_id,
        position=channel.position,
    )
