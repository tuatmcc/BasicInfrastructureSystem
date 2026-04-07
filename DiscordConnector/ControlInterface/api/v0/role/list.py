from fastapi import APIRouter, Depends
from ..schemas import RoleResponse
from dependencies import get_controller

router = APIRouter()

@router.get("/list", response_model=list[RoleResponse])
async def list_roles(ctrl = Depends(get_controller)):
    roles = await ctrl.list_roles()
    return [RoleResponse(id=r.id, name=r.name, color=r.color, position=r.position) for r in roles]
