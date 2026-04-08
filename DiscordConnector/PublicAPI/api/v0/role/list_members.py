from fastapi import APIRouter, Depends, Query
from ..schemas import MemberResponse
from dependencies import get_role_service

router = APIRouter()


@router.get("/list-members", response_model=list[MemberResponse])
async def list_role_members(role_id: int = Query(...), service=Depends(get_role_service)):
    members = await service.list_role_members(role_id)
    return [MemberResponse(id=m.id, name=m.name) for m in members]
