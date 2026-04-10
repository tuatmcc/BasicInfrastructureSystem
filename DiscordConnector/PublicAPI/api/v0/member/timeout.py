from fastapi import APIRouter, Depends
from DiscordConnector.PublicAPI.dependencies import get_member_service
from ..schemas import MemberTimeout, SuccessResponse

router = APIRouter()


@router.post("/timeout", response_model=SuccessResponse)
async def timeout_member(
    data: MemberTimeout,
    service=Depends(get_member_service),
):
    success = await service.timeout_member(data.id)
    return SuccessResponse(success=success)
