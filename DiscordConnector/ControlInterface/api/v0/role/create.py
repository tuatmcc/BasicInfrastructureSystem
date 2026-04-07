import logging
from fastapi import APIRouter, Depends
from ..schemas import RoleCreate, RoleResponse
from dependencies import get_controller, get_db_controller

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/create", response_model=RoleResponse)
async def create_role(
    data: RoleCreate,
    ctrl = Depends(get_controller),
    db_ctrl = Depends(get_db_controller),
):
    role = await ctrl.create_role(data.name, data.color, data.position)
    
    try:
        await db_ctrl.create_role(
            role_id=str(role.id),
            role_name=role.name,
            permissions=role.permissions,
        )
    except Exception as e:
        logger.error(f"Failed to save role to database: {e}")
    
    return RoleResponse(id=role.id, name=role.name, color=role.color, position=role.position)
