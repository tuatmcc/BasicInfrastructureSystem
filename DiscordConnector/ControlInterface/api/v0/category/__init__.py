from fastapi import APIRouter
from .create import router as create_router
from .delete import router as delete_router
from .list import router as list_router

router = APIRouter(prefix="/category", tags=["category"])
router.include_router(create_router)
router.include_router(delete_router)
router.include_router(list_router)
