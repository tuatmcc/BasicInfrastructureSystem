from fastapi import APIRouter, Depends
from DiscordConnector.PublicAPI.auth import require_admin
from DiscordConnector.PublicAPI.dependencies import get_member_service
from ..schemas import MemberTimeout, SuccessResponse

router = APIRouter()


@router.post("/timeout", response_model=SuccessResponse)
async def timeout_member(
    data: MemberTimeout,
    _principal=Depends(require_admin),
    service=Depends(get_member_service),
):
    success = await service.timeout_member(int(data.id))
    return SuccessResponse(success=success)
