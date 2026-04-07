from fastapi import APIRouter, Depends
from ..schemas import MemberTimeout, SuccessResponse
from dependencies import get_controller

router = APIRouter()

@router.post("/timeout", response_model=SuccessResponse)
async def timeout_member(data: MemberTimeout, ctrl = Depends(get_controller)):
    success = await ctrl.kick_member(data.id)
    return SuccessResponse(success=success)
