import sys
from pathlib import Path

from fastapi import FastAPI

if __package__ in {None, ""}:
    repo_root = Path(__file__).resolve().parents[2]
    if str(repo_root) not in sys.path:
        sys.path.insert(0, str(repo_root))

from DiscordConnector.PublicAPI.api.v0 import router as v0_router
from DiscordConnector.PublicAPI.dependencies import lifespan
from DiscordConnector.PublicAPI.error_handlers import register_exception_handlers

app = FastAPI(
    title="Discord Connector Public API",
    description="Public HTTP API for Discord Connector",
    version="0.1.0",
    lifespan=lifespan,
)

register_exception_handlers(app)
app.include_router(v0_router, prefix="/api/v0")


@app.get("/health")
async def health_check():
    return {"status": "ok"}
