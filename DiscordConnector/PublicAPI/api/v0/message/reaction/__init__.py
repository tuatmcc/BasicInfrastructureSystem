from fastapi import APIRouter
from .totalling import router as totalling_router

router = APIRouter(prefix="/reaction", tags=["reaction"])
router.include_router(totalling_router)
