from fastapi import APIRouter, Depends, Query
from DiscordConnector.PublicAPI.auth import require_viewer
from DiscordConnector.PublicAPI.dependencies import get_role_service
from ..schemas import MemberResponse, Snowflake

router = APIRouter()


@router.get("/list-members", response_model=list[MemberResponse])
async def list_role_members(
    role_id: Snowflake = Query(...),
    _principal=Depends(require_viewer),
    service=Depends(get_role_service),
):
    members = await service.list_role_members(int(role_id))
    return [MemberResponse(id=str(m.id), name=m.name) for m in members]
