from fastapi import APIRouter
from .create import router as create_router
from .delete import router as delete_router
from .list import router as list_router

router = APIRouter(prefix="/role", tags=["role"])
router.include_router(create_router)
router.include_router(delete_router)
router.include_router(list_router)

# Import list-members as list_members due to Python naming
from importlib import import_module
list_members_module = import_module(".list-members", package=__name__)
router.include_router(list_members_module.router)
