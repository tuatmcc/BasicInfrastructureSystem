from fastapi import APIRouter, Depends, Query
from ..schemas import RoleResponse
from dependencies import get_controller

router = APIRouter()

@router.get("/list-roles", response_model=list[RoleResponse])
async def list_member_roles(member_id: int = Query(...), ctrl = Depends(get_controller)):
    roles = await ctrl.list_member_roles(member_id)
    return [RoleResponse(id=r.id, name=r.name, color=r.color, position=r.position) for r in roles]
