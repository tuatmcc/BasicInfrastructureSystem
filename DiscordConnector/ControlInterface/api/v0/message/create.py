from fastapi import APIRouter, Depends
from ..schemas import MessageCreate, MessageResponse
from dependencies import get_controller

router = APIRouter()

@router.post("/create", response_model=MessageResponse)
async def create_message(data: MessageCreate, ctrl = Depends(get_controller)):
    message = await ctrl.create_message(data.channel_id, data.content)
    return MessageResponse(id=message.id, content=message.content, author_id=message.author_id, channel_id=message.channel_id)
