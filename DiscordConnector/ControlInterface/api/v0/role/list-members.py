from fastapi import APIRouter, Depends, Query
from ..schemas import MemberResponse
from dependencies import get_controller

router = APIRouter()

@router.get("/list-members", response_model=list[MemberResponse])
async def list_role_members(role_id: int = Query(...), ctrl = Depends(get_controller)):
    members = await ctrl.list_role_members(role_id)
    return [MemberResponse(id=m.id, name=m.name) for m in members]
