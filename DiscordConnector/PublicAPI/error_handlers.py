"""Exception handlers for PublicAPI."""

import logging

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from DiscordConnector.DiscordController.interface import DiscordConnectionError

logger = logging.getLogger(__name__)


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(DiscordConnectionError)
    async def handle_discord_connection_error(
        _request: Request,
        exc: DiscordConnectionError,
    ) -> JSONResponse:
        logger.warning("Discord connection failure while handling request: %s", exc)
        return JSONResponse(
            status_code=503,
            content={"detail": str(exc)},
        )
