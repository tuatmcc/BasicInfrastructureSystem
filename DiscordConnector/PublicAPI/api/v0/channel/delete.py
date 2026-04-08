from fastapi import APIRouter, Depends
from ..schemas import ChannelDelete, SuccessResponse
from dependencies import get_channel_service

router = APIRouter()


@router.post("/delete", response_model=SuccessResponse)
async def delete_channel(
    data: ChannelDelete,
    service=Depends(get_channel_service),
):
    success = await service.delete_channel(data.id)
    return SuccessResponse(success=success)
