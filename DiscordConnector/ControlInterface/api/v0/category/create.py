from fastapi import APIRouter, Depends
from ..schemas import CategoryCreate, CategoryResponse
from dependencies import get_controller

router = APIRouter()

@router.post("/create", response_model=CategoryResponse)
async def create_category(data: CategoryCreate, ctrl = Depends(get_controller)):
    category = await ctrl.create_category(data.name, data.position)
    return CategoryResponse(id=category.id, name=category.name, position=category.position)
