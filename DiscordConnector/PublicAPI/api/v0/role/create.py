from fastapi import APIRouter, Depends
from DiscordConnector.PublicAPI.dependencies import get_role_service
from ..schemas import RoleCreate, RoleResponse

router = APIRouter()


@router.post("/create", response_model=RoleResponse)
async def create_role(
    data: RoleCreate,
    service=Depends(get_role_service),
):
    role = await service.create_role(data.name, data.color, data.position)
    return RoleResponse(id=role.id, name=role.name, color=role.color, position=role.position)
