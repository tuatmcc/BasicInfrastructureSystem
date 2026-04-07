from fastapi import APIRouter, Depends
from ..schemas import CategoryDelete, SuccessResponse
from dependencies import get_controller

router = APIRouter()

@router.post("/delete", response_model=SuccessResponse)
async def delete_category(data: CategoryDelete, ctrl = Depends(get_controller)):
    success = await ctrl.delete_category(data.id)
    return SuccessResponse(success=success)
