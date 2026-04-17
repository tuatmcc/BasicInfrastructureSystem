from fastapi import APIRouter, Depends
from DiscordConnector.PublicAPI.auth import require_operator
from DiscordConnector.PublicAPI.dependencies import get_message_service
from ..schemas import MessageCreate, MessageResponse

router = APIRouter()


@router.post("/create", response_model=MessageResponse)
async def create_message(
    data: MessageCreate,
    _principal=Depends(require_operator),
    service=Depends(get_message_service),
):
    message = await service.create_message(int(data.channel_id), data.content)
    return MessageResponse(
        id=str(message.id),
        content=message.content,
        author_id=str(message.author_id),
        channel_id=str(message.channel_id),
    )
