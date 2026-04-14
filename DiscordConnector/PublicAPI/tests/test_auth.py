"""Tests for JWT authentication and RBAC in PublicAPI."""

import pytest

pytestmark = pytest.mark.asyncio


class TestAuthentication:
    async def test_health_is_public(self, anon_client):
        response = await anon_client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}

    async def test_protected_endpoint_requires_authorization_header(self, anon_client):
        response = await anon_client.get("/api/v0/role/list")
        assert response.status_code == 401
        assert response.json() == {"detail": "Authorization header is required"}
        assert response.headers["www-authenticate"] == "Bearer"

    async def test_invalid_signature_returns_401(self, anon_client, make_auth_headers):
        response = await anon_client.get(
            "/api/v0/role/list",
            headers=make_auth_headers(["viewer"], secret="wrong-secret"),
        )
        assert response.status_code == 401
        assert response.json() == {"detail": "Invalid JWT signature"}

    async def test_expired_jwt_returns_401(self, anon_client, make_auth_headers):
        response = await anon_client.get(
            "/api/v0/role/list",
            headers=make_auth_headers(["viewer"], expires_in=-60),
        )
        assert response.status_code == 401
        assert response.json() == {"detail": "JWT has expired"}

    async def test_non_bearer_scheme_returns_401(self, anon_client, make_auth_headers):
        token = make_auth_headers(["viewer"])["Authorization"].split(" ", 1)[1]
        response = await anon_client.get(
            "/api/v0/role/list",
            headers={"Authorization": f"Basic {token}"},
        )
        assert response.status_code == 401
        assert response.json() == {"detail": "Authorization scheme must be Bearer"}


class TestAuthorization:
    async def test_missing_roles_claim_returns_403(self, anon_client, make_auth_headers):
        response = await anon_client.get(
            "/api/v0/role/list",
            headers=make_auth_headers(roles=None),
        )
        assert response.status_code == 403
        assert response.json() == {"detail": "viewer role is required"}

    async def test_empty_roles_returns_403(self, anon_client, make_auth_headers):
        response = await anon_client.get(
            "/api/v0/role/list",
            headers=make_auth_headers([]),
        )
        assert response.status_code == 403
        assert response.json() == {"detail": "viewer role is required"}

    async def test_viewer_can_access_read_endpoints(self, anon_client, make_auth_headers):
        response = await anon_client.get(
            "/api/v0/member/list",
            headers=make_auth_headers(["viewer"]),
        )
        assert response.status_code == 200

    async def test_viewer_cannot_create_message(self, anon_client, make_auth_headers):
        response = await anon_client.post(
            "/api/v0/message/create",
            json={"channel_id": "100", "content": "Hello"},
            headers=make_auth_headers(["viewer"]),
        )
        assert response.status_code == 403
        assert response.json() == {"detail": "operator role is required"}

    async def test_operator_can_create_message(self, anon_client, make_auth_headers):
        response = await anon_client.post(
            "/api/v0/message/create",
            json={"channel_id": "100", "content": "Hello"},
            headers=make_auth_headers(["operator"]),
        )
        assert response.status_code == 200

    async def test_operator_cannot_create_role(self, anon_client, make_auth_headers):
        response = await anon_client.post(
            "/api/v0/role/create",
            json={"name": "TestRole"},
            headers=make_auth_headers(["operator"]),
        )
        assert response.status_code == 403
        assert response.json() == {"detail": "admin role is required"}
