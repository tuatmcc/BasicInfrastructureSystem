from fastapi import APIRouter, Depends, Query
from DiscordConnector.PublicAPI.auth import require_viewer
from DiscordConnector.PublicAPI.dependencies import get_member_service
from ..schemas import RoleResponse, Snowflake

router = APIRouter()


@router.get("/list-roles", response_model=list[RoleResponse])
async def list_member_roles(
    member_id: Snowflake = Query(...),
    _principal=Depends(require_viewer),
    service=Depends(get_member_service),
):
    roles = await service.list_member_roles(int(member_id))
    return [
        RoleResponse(id=str(r.id), name=r.name, color=r.color, position=r.position)
        for r in roles
    ]
