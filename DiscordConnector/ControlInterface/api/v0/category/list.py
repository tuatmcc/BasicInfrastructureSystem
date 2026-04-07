from fastapi import APIRouter, Depends
from ..schemas import CategoryResponse
from dependencies import get_controller

router = APIRouter()

@router.get("/list", response_model=list[CategoryResponse])
async def list_categories(ctrl = Depends(get_controller)):
    categories = await ctrl.list_categories()
    return [CategoryResponse(id=c.id, name=c.name, position=c.position) for c in categories]
