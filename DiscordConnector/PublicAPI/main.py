from fastapi import FastAPI
from dependencies import lifespan
from api.v0 import router as v0_router

app = FastAPI(
    title="Discord Connector Public API",
    description="Public HTTP API for Discord Connector",
    version="0.1.0",
    lifespan=lifespan,
)

app.include_router(v0_router, prefix="/api/v0")


@app.get("/health")
async def health_check():
    return {"status": "ok"}
