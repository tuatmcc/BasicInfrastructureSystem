"""Tests for AuthService."""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time

import pytest
from httpx import ASGITransport, AsyncClient

from AuthService.app import create_app
from AuthService.store import CredentialStore
from DiscordConnector.PublicAPI.tests.conftest import _build_test_app
from DiscordConnector.DiscordController.mock_controller import MockDiscordController
from DiscordConnector.DiscordDatabaseController.mock_controller import (
    MockDiscordDatabaseController,
)


def _decode_segment(value: str) -> dict[str, object]:
    padding = "=" * (-len(value) % 4)
    decoded = base64.urlsafe_b64decode(value + padding).decode("utf-8")
    return json.loads(decoded)


@pytest.fixture
async def auth_client(monkeypatch) -> AsyncClient:
    monkeypatch.setenv(
        "AUTH_BOOTSTRAP_USERS_JSON",
        json.dumps(
            [
                {
                    "username": "admin",
                    "email": "admin@example.local",
                    "password": "correct-password",
                    "roles": ["admin"],
                    "enabled": True,
                },
                {
                    "username": "disabled",
                    "email": "disabled@example.local",
                    "password": "correct-password",
                    "roles": ["viewer"],
                    "enabled": False,
                },
            ]
        ),
    )
    monkeypatch.setenv(
        "AUTH_BOOTSTRAP_SERVICE_ACCOUNTS_JSON",
        json.dumps(
            [
                {
                    "client_id": "discord-sync",
                    "client_secret": "service-secret",
                    "roles": ["operator"],
                    "enabled": True,
                },
                {
                    "client_id": "disabled-client",
                    "client_secret": "service-secret",
                    "roles": ["viewer"],
                    "enabled": False,
                },
            ]
        ),
    )
    app = create_app(CredentialStore())
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://auth.local") as client:
        yield client


class TestAuthService:
    async def test_login_returns_token(self, auth_client: AsyncClient):
        response = await auth_client.post(
            "/auth/login",
            json={"username_or_email": "admin", "password": "correct-password"},
        )
        assert response.status_code == 200
        body = response.json()
        assert body["token_type"] == "Bearer"
        assert body["subject"] == "admin"
        assert body["roles"] == ["admin"]
        header_segment, payload_segment, _signature = body["access_token"].split(".")
        header = _decode_segment(header_segment)
        payload = _decode_segment(payload_segment)
        assert header == {"alg": "HS256", "typ": "JWT"}
        assert payload["sub"] == "admin"
        assert payload["roles"] == ["admin"]
        assert payload["iss"] == "auth-service"
        assert payload["aud"] == "discord-public-api"
        assert payload["iat"] <= payload["exp"]
        assert payload["exp"] > time.time()

    async def test_login_rejects_invalid_password(self, auth_client: AsyncClient):
        response = await auth_client.post(
            "/auth/login",
            json={"username_or_email": "admin", "password": "wrong"},
        )
        assert response.status_code == 401
        assert response.json() == {"detail": "Invalid username/email or password"}

    async def test_login_rejects_disabled_user(self, auth_client: AsyncClient):
        response = await auth_client.post(
            "/auth/login",
            json={"username_or_email": "disabled", "password": "correct-password"},
        )
        assert response.status_code == 401
        assert response.json() == {"detail": "Invalid username/email or password"}

    async def test_service_token_returns_token(self, auth_client: AsyncClient):
        response = await auth_client.post(
            "/auth/token",
            json={"client_id": "discord-sync", "client_secret": "service-secret"},
        )
        assert response.status_code == 200
        body = response.json()
        assert body["subject"] == "service:discord-sync"
        assert body["roles"] == ["operator"]
        assert body["expires_in"] == 900

    async def test_service_token_rejects_invalid_secret(self, auth_client: AsyncClient):
        response = await auth_client.post(
            "/auth/token",
            json={"client_id": "discord-sync", "client_secret": "wrong"},
        )
        assert response.status_code == 401
        assert response.json() == {"detail": "Invalid client credentials"}


class TestIntegrationWithPublicAPI:
    async def test_auth_service_token_can_call_public_api(self, auth_client: AsyncClient):
        auth_response = await auth_client.post(
            "/auth/login",
            json={"username_or_email": "admin", "password": "correct-password"},
        )
        token = auth_response.json()["access_token"]

        mock_controller = MockDiscordController()
        mock_db_controller = MockDiscordDatabaseController()
        await mock_db_controller.connect()
        app = _build_test_app(mock_controller, mock_db_controller)
        transport = ASGITransport(app=app)
        async with AsyncClient(
            transport=transport,
            base_url="http://discord.local",
            headers={"Authorization": f"Bearer {token}"},
        ) as client:
            response = await client.get("/api/v0/role/list")
        await mock_db_controller.disconnect()

        assert response.status_code == 200
