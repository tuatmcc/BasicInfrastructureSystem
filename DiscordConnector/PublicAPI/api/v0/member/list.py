from fastapi import APIRouter, Depends
from DiscordConnector.PublicAPI.dependencies import get_member_service
from ..schemas import MemberResponse

router = APIRouter()


@router.get("/list", response_model=list[MemberResponse])
async def list_members(service=Depends(get_member_service)):
    members = await service.list_members()
    return [MemberResponse(id=str(m.id), name=m.name) for m in members]
