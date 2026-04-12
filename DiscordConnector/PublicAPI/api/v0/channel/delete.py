from fastapi import APIRouter, Depends
from DiscordConnector.PublicAPI.dependencies import get_channel_service
from ..schemas import ChannelDelete, SuccessResponse

router = APIRouter()


@router.post("/delete", response_model=SuccessResponse)
async def delete_channel(
    data: ChannelDelete,
    service=Depends(get_channel_service),
):
    success = await service.delete_channel(int(data.id))
    return SuccessResponse(success=success)
