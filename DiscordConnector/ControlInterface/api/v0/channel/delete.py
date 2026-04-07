from fastapi import APIRouter, Depends
from ..schemas import ChannelDelete, SuccessResponse
from dependencies import get_controller

router = APIRouter()

@router.post("/delete", response_model=SuccessResponse)
async def delete_channel(data: ChannelDelete, ctrl = Depends(get_controller)):
    success = await ctrl.delete_channel(data.id)
    return SuccessResponse(success=success)
