from fastapi import APIRouter
from .v0 import router as v0_router

router = APIRouter()
router.include_router(v0_router)
