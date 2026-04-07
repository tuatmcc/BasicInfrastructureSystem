from fastapi import APIRouter, Depends
from ..schemas import RoleDelete, SuccessResponse
from dependencies import get_controller

router = APIRouter()

@router.post("/delete", response_model=SuccessResponse)
async def delete_role(data: RoleDelete, ctrl = Depends(get_controller)):
    success = await ctrl.delete_role(data.id)
    return SuccessResponse(success=success)
