from fastapi import APIRouter, Depends, Query
from DiscordConnector.PublicAPI.dependencies import get_channel_service
from ..schemas import RoleResponse

router = APIRouter()


@router.get("/list-role", response_model=list[RoleResponse])
async def list_channel_roles(channel_id: int = Query(...), service=Depends(get_channel_service)):
    roles = await service.list_channel_roles(channel_id)
    return [RoleResponse(id=r.id, name=r.name, color=r.color, position=r.position) for r in roles]
