from fastapi import APIRouter
from .create import router as create_router
from .delete import router as delete_router
from .list import router as list_router
from .list_role import router as list_role_router

router = APIRouter(prefix="/channel", tags=["channel"])
router.include_router(create_router)
router.include_router(delete_router)
router.include_router(list_router)
router.include_router(list_role_router)
