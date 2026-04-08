from fastapi import APIRouter
from .create import router as create_router
from .delete import router as delete_router
from .reaction import router as reaction_router

router = APIRouter(prefix="/message", tags=["message"])
router.include_router(create_router)
router.include_router(delete_router)
router.include_router(reaction_router)
