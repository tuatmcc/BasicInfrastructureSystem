from fastapi import APIRouter, Depends
from ..schemas import MessageDelete, SuccessResponse
from dependencies import get_controller

router = APIRouter()

@router.post("/delete", response_model=SuccessResponse)
async def delete_message(data: MessageDelete, ctrl = Depends(get_controller)):
    success = await ctrl.delete_message(data.channel_id, data.message_id)
    return SuccessResponse(success=success)
