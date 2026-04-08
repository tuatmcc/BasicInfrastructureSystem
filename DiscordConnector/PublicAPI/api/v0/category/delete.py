from fastapi import APIRouter, Depends
from ..schemas import CategoryDelete, SuccessResponse
from dependencies import get_category_service

router = APIRouter()


@router.post("/delete", response_model=SuccessResponse)
async def delete_category(
    data: CategoryDelete,
    service=Depends(get_category_service),
):
    success = await service.delete_category(data.id)
    return SuccessResponse(success=success)
