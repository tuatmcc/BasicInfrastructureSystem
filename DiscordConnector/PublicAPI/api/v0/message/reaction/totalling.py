from fastapi import APIRouter, Depends, Query
from DiscordConnector.PublicAPI.dependencies import get_message_service
from ...schemas import ReactionResponse

router = APIRouter()


@router.get("/totalling", response_model=list[ReactionResponse])
async def totalling_reactions(
    channel_id: int = Query(...),
    message_id: int = Query(...),
    service=Depends(get_message_service),
):
    reactions = await service.total_reactions(channel_id, message_id)
    return [
        ReactionResponse(
            emoji=r.emoji,
            member_ids=r.member_ids,
            me=r.me,
            message_id=r.message_id,
        )
        for r in reactions
    ]
