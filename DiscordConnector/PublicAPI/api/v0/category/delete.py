from fastapi import APIRouter, Depends
from DiscordConnector.PublicAPI.auth import require_admin
from DiscordConnector.PublicAPI.dependencies import get_category_service
from ..schemas import CategoryDelete, SuccessResponse

router = APIRouter()


@router.post("/delete", response_model=SuccessResponse)
async def delete_category(
    data: CategoryDelete,
    _principal=Depends(require_admin),
    service=Depends(get_category_service),
):
    success = await service.delete_category(int(data.id))
    return SuccessResponse(success=success)
