from fastapi import APIRouter
from .role import router as role_router
from .channel import router as channel_router
from .category import router as category_router
from .member import router as member_router
from .message import router as message_router

router = APIRouter()
router.include_router(role_router)
router.include_router(channel_router)
router.include_router(category_router)
router.include_router(member_router)
router.include_router(message_router)
