from fastapi import APIRouter, Depends
from DiscordConnector.PublicAPI.auth import require_admin
from DiscordConnector.PublicAPI.dependencies import get_member_service
from ..schemas import MemberBan, SuccessResponse

router = APIRouter()


@router.post("/ban", response_model=SuccessResponse)
async def ban_member(
    data: MemberBan,
    _principal=Depends(require_admin),
    service=Depends(get_member_service),
):
    success = await service.ban_member(int(data.id))
    return SuccessResponse(success=success)
