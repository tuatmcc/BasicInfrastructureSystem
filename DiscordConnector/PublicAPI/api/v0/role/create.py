from fastapi import APIRouter, Depends
from ..schemas import RoleCreate, RoleResponse
from dependencies import get_role_service

router = APIRouter()


@router.post("/create", response_model=RoleResponse)
async def create_role(
    data: RoleCreate,
    service=Depends(get_role_service),
):
    role = await service.create_role(data.name, data.color, data.position)
    return RoleResponse(id=role.id, name=role.name, color=role.color, position=role.position)
