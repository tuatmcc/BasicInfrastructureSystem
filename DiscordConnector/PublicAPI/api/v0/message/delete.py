from fastapi import APIRouter, Depends
from ..schemas import MessageDelete, SuccessResponse
from dependencies import get_message_service

router = APIRouter()


@router.post("/delete", response_model=SuccessResponse)
async def delete_message(
    data: MessageDelete,
    service=Depends(get_message_service),
):
    success = await service.delete_message(data.channel_id, data.message_id)
    return SuccessResponse(success=success)
