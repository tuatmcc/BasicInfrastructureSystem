from fastapi import APIRouter, Depends
from DiscordConnector.PublicAPI.dependencies import get_category_service
from ..schemas import CategoryResponse

router = APIRouter()


@router.get("/list", response_model=list[CategoryResponse])
async def list_categories(service=Depends(get_category_service)):
    categories = await service.list_categories()
    return [
        CategoryResponse(id=str(c.id), name=c.name, position=c.position)
        for c in categories
    ]
