from fastapi import APIRouter, Depends
from ..schemas import RoleResponse
from dependencies import get_role_service

router = APIRouter()


@router.get("/list", response_model=list[RoleResponse])
async def list_roles(service=Depends(get_role_service)):
    roles = await service.list_roles()
    return [RoleResponse(id=r.id, name=r.name, color=r.color, position=r.position) for r in roles]
