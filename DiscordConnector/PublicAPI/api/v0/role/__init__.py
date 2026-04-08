from fastapi import APIRouter
from .create import router as create_router
from .delete import router as delete_router
from .list import router as list_router
from .list_members import router as list_members_router

router = APIRouter(prefix="/role", tags=["role"])
router.include_router(create_router)
router.include_router(delete_router)
router.include_router(list_router)
router.include_router(list_members_router)
