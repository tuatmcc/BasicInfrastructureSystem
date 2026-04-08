from fastapi import APIRouter, Depends
from ..schemas import MemberResponse
from dependencies import get_member_service

router = APIRouter()


@router.get("/list", response_model=list[MemberResponse])
async def list_members(service=Depends(get_member_service)):
    members = await service.list_members()
    return [MemberResponse(id=m.id, name=m.name) for m in members]
