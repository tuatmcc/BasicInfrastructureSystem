from fastapi import APIRouter, Depends
from ..schemas import CategoryResponse
from dependencies import get_category_service

router = APIRouter()


@router.get("/list", response_model=list[CategoryResponse])
async def list_categories(service=Depends(get_category_service)):
    categories = await service.list_categories()
    return [CategoryResponse(id=c.id, name=c.name, position=c.position) for c in categories]
