from fastapi import APIRouter
from .list import router as list_router
from .ban import router as ban_router
from .timeout import router as timeout_router
from .list_roles import router as list_roles_router

router = APIRouter(prefix="/member", tags=["member"])
router.include_router(list_router)
router.include_router(ban_router)
router.include_router(timeout_router)
router.include_router(list_roles_router)
