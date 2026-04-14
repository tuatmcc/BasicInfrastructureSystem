from fastapi import APIRouter, Depends, Query
from DiscordConnector.PublicAPI.auth import require_viewer
from DiscordConnector.PublicAPI.dependencies import get_channel_service
from ..schemas import RoleResponse, Snowflake

router = APIRouter()


@router.get("/list-role", response_model=list[RoleResponse])
async def list_channel_roles(
    channel_id: Snowflake = Query(...),
    _principal=Depends(require_viewer),
    service=Depends(get_channel_service),
):
    roles = await service.list_channel_roles(int(channel_id))
    return [
        RoleResponse(id=str(r.id), name=r.name, color=r.color, position=r.position)
        for r in roles
    ]
