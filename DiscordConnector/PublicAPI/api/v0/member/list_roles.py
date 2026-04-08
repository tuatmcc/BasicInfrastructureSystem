from fastapi import APIRouter, Depends, Query
from ..schemas import RoleResponse
from dependencies import get_member_service

router = APIRouter()


@router.get("/list-roles", response_model=list[RoleResponse])
async def list_member_roles(member_id: int = Query(...), service=Depends(get_member_service)):
    roles = await service.list_member_roles(member_id)
    return [RoleResponse(id=r.id, name=r.name, color=r.color, position=r.position) for r in roles]
