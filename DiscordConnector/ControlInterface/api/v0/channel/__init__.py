from fastapi import APIRouter
from .create import router as create_router
from .delete import router as delete_router
from .list import router as list_router

router = APIRouter(prefix="/channel", tags=["channel"])
router.include_router(create_router)
router.include_router(delete_router)
router.include_router(list_router)

from importlib import import_module
list_role_module = import_module(".list-role", package=__name__)
router.include_router(list_role_module.router)
