from fastapi import APIRouter, Depends, Query
from DiscordConnector.PublicAPI.auth import require_viewer
from DiscordConnector.PublicAPI.dependencies import get_message_service
from ...schemas import ReactionResponse, Snowflake

router = APIRouter()


@router.get("/totalling", response_model=list[ReactionResponse])
async def totalling_reactions(
    channel_id: Snowflake = Query(...),
    message_id: Snowflake = Query(...),
    _principal=Depends(require_viewer),
    service=Depends(get_message_service),
):
    reactions = await service.total_reactions(int(channel_id), int(message_id))
    return [
        ReactionResponse(
            emoji=r.emoji,
            member_ids=[str(member_id) for member_id in r.member_ids],
            me=r.me,
            message_id=str(r.message_id),
        )
        for r in reactions
    ]
