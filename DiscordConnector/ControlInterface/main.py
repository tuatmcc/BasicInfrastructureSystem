from fastapi import FastAPI
from dependencies import lifespan
from api.v0 import router as v0_router

app = FastAPI(
    title="Discord Controller API",
    description="HTTP API for controlling Discord via DiscordController",
    version="0.1.0",
    lifespan=lifespan,
)

app.include_router(v0_router, prefix="/api/v0")


@app.get("/health")
async def health_check():
    return {"status": "ok"}
