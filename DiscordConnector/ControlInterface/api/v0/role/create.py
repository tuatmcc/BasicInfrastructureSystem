from fastapi import APIRouter, Depends
from ..schemas import RoleCreate, RoleResponse
from dependencies import get_controller

router = APIRouter()

@router.post("/create", response_model=RoleResponse)
async def create_role(data: RoleCreate, ctrl = Depends(get_controller)):
    role = await ctrl.create_role(data.name, data.color, data.position)
    return RoleResponse(id=role.id, name=role.name, color=role.color, position=role.position)
