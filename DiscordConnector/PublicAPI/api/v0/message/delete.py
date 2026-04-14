from fastapi import APIRouter, Depends
from DiscordConnector.PublicAPI.auth import require_operator
from DiscordConnector.PublicAPI.dependencies import get_message_service
from ..schemas import MessageDelete, SuccessResponse

router = APIRouter()


@router.post("/delete", response_model=SuccessResponse)
async def delete_message(
    data: MessageDelete,
    _principal=Depends(require_operator),
    service=Depends(get_message_service),
):
    success = await service.delete_message(int(data.channel_id), int(data.message_id))
    return SuccessResponse(success=success)
