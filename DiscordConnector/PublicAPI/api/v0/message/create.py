from fastapi import APIRouter, Depends
from DiscordConnector.PublicAPI.dependencies import get_message_service
from ..schemas import MessageCreate, MessageResponse

router = APIRouter()


@router.post("/create", response_model=MessageResponse)
async def create_message(
    data: MessageCreate,
    service=Depends(get_message_service),
):
    message = await service.create_message(data.channel_id, data.content)
    return MessageResponse(
        id=message.id,
        content=message.content,
        author_id=message.author_id,
        channel_id=message.channel_id,
    )
