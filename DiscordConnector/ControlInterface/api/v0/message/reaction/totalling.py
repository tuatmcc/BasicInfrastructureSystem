from fastapi import APIRouter, Depends, Query
from ...schemas import ReactionResponse
from dependencies import get_controller

router = APIRouter()

@router.get("/totalling", response_model=list[ReactionResponse])
async def totalling_reactions(channel_id: int = Query(...), message_id: int = Query(...), ctrl = Depends(get_controller)):
    reactions = await ctrl.total_reactions(channel_id, message_id)
    return [ReactionResponse(emoji=r.emoji, member_ids=r.member_ids, me=r.me, message_id=r.message_id) for r in reactions]
