from fastapi import APIRouter, Depends
from ..schemas import CategoryCreate, CategoryResponse
from dependencies import get_category_service

router = APIRouter()


@router.post("/create", response_model=CategoryResponse)
async def create_category(
    data: CategoryCreate,
    service=Depends(get_category_service),
):
    category = await service.create_category(data.name, data.position)
    return CategoryResponse(id=category.id, name=category.name, position=category.position)
