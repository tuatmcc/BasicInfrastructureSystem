"""Exception handlers for PublicAPI."""

import logging

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from DiscordConnector.DiscordController.interface import DiscordConnectionError, DiscordError
from DiscordConnector.PublicAPI.auth import AuthenticationError, AuthorizationError

logger = logging.getLogger(__name__)


def _status_code_for_discord_error(exc: DiscordError) -> int:
    message = str(exc).lower()
    if "no permission" in message:
        return 403
    if "no such" in message or "not found" in message:
        return 404
    if "http error" in message:
        return 502
    return 400


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AuthenticationError)
    async def handle_authentication_error(
        _request: Request,
        exc: AuthenticationError,
    ) -> JSONResponse:
        logger.warning("Authentication failure while handling request: %s", exc)
        return JSONResponse(
            status_code=401,
            content={"detail": str(exc)},
            headers={"WWW-Authenticate": "Bearer"},
        )

    @app.exception_handler(AuthorizationError)
    async def handle_authorization_error(
        _request: Request,
        exc: AuthorizationError,
    ) -> JSONResponse:
        logger.warning("Authorization failure while handling request: %s", exc)
        return JSONResponse(
            status_code=403,
            content={"detail": str(exc)},
        )

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

    @app.exception_handler(DiscordError)
    async def handle_discord_error(
        _request: Request,
        exc: DiscordError,
    ) -> JSONResponse:
        status_code = _status_code_for_discord_error(exc)
        logger.warning("Discord operation failure while handling request: %s", exc)
        return JSONResponse(
            status_code=status_code,
            content={"detail": str(exc)},
        )
