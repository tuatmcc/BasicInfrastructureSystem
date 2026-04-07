from fastapi import APIRouter, Depends
from ..schemas import MemberBan, SuccessResponse
from dependencies import get_controller

router = APIRouter()

@router.post("/ban", response_model=SuccessResponse)
async def ban_member(data: MemberBan, ctrl = Depends(get_controller)):
    success = await ctrl.ban_member(data.id)
    return SuccessResponse(success=success)
