from fastapi import APIRouter, Depends
from DiscordConnector.PublicAPI.dependencies import get_role_service
from ..schemas import RoleDelete, SuccessResponse

router = APIRouter()


@router.post("/delete", response_model=SuccessResponse)
async def delete_role(
    data: RoleDelete,
    service=Depends(get_role_service),
):
    success = await service.delete_role(int(data.id))
    return SuccessResponse(success=success)
