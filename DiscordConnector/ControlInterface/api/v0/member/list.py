from fastapi import APIRouter, Depends
from ..schemas import MemberResponse
from dependencies import get_controller

router = APIRouter()

@router.get("/list", response_model=list[MemberResponse])
async def list_members(ctrl = Depends(get_controller)):
    members = await ctrl.list_members()
    return [MemberResponse(id=m.id, name=m.name) for m in members]
