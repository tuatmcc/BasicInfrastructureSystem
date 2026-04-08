from fastapi import APIRouter, Depends
from ..schemas import MemberBan, SuccessResponse
from dependencies import get_member_service

router = APIRouter()


@router.post("/ban", response_model=SuccessResponse)
async def ban_member(
    data: MemberBan,
    service=Depends(get_member_service),
):
    success = await service.ban_member(data.id)
    return SuccessResponse(success=success)
