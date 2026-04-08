from fastapi import APIRouter, Depends
from ..schemas import RoleDelete, SuccessResponse
from dependencies import get_role_service

router = APIRouter()


@router.post("/delete", response_model=SuccessResponse)
async def delete_role(
    data: RoleDelete,
    service=Depends(get_role_service),
):
    success = await service.delete_role(data.id)
    return SuccessResponse(success=success)
