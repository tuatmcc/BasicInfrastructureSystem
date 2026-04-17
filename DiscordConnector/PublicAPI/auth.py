"""JWT authentication and RBAC helpers for PublicAPI."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Annotated, Callable

from fastapi import Depends, Request
import jwt
from jwt import InvalidTokenError, PyJWKClient
from jwt.exceptions import (
    ExpiredSignatureError,
    InvalidAudienceError,
    InvalidIssuerError,
    PyJWKClientError,
)

from DiscordConnector.config import (
    get_discord_connector_role_claim,
    get_supabase_jwks_url,
    get_supabase_jwt_algorithms,
    get_supabase_jwt_audience,
    get_supabase_jwt_issuer,
)

ROLE_HIERARCHY = {
    "viewer": 1,
    "operator": 2,
    "admin": 3,
}


class AuthenticationError(Exception):
    """Raised when a request is not authenticated."""


class AuthorizationError(Exception):
    """Raised when an authenticated request lacks required permissions."""


@dataclass(frozen=True, slots=True)
class AuthPrincipal:
    """Represents the authenticated caller extracted from a JWT."""

    subject: str
    roles: frozenset[str]
    claims: dict[str, object]


_jwks_client: PyJWKClient | None = None
_jwks_client_url: str | None = None


def _get_jwks_client() -> PyJWKClient:
    global _jwks_client, _jwks_client_url
    jwks_url = get_supabase_jwks_url()
    if _jwks_client is None or _jwks_client_url != jwks_url:
        _jwks_client = PyJWKClient(jwks_url)
        _jwks_client_url = jwks_url
    return _jwks_client


def _verify_supabase_jwt(token: str) -> dict[str, object]:
    try:
        signing_key = _get_jwks_client().get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=get_supabase_jwt_algorithms(),
            audience=get_supabase_jwt_audience(),
            issuer=get_supabase_jwt_issuer(),
            options={"require": ["exp", "sub", "aud", "iss"]},
        )
    except ExpiredSignatureError as exc:
        raise AuthenticationError("JWT has expired") from exc
    except InvalidAudienceError as exc:
        raise AuthorizationError("JWT audience does not allow this API") from exc
    except InvalidIssuerError as exc:
        raise AuthenticationError("Unexpected JWT issuer") from exc
    except PyJWKClientError as exc:
        raise AuthenticationError("Unable to resolve JWT signing key") from exc
    except InvalidTokenError as exc:
        raise AuthenticationError("Invalid JWT") from exc

    if not isinstance(payload, dict):
        raise AuthenticationError("Invalid JWT payload")

    subject = payload.get("sub")
    if not isinstance(subject, str) or not subject:
        raise AuthenticationError("JWT subject is required")

    supabase_role = payload.get("role")
    if supabase_role != "authenticated":
        raise AuthorizationError("Supabase authenticated role is required")

    return payload


def _get_claim_value(payload: dict[str, object], claim_path: str) -> object:
    value: object = payload
    for segment in claim_path.split("."):
        if not isinstance(value, dict):
            return None
        value = value.get(segment)
    return value


def _extract_roles(payload: dict[str, object]) -> frozenset[str]:
    role_claim = get_discord_connector_role_claim()
    raw_roles = _get_claim_value(payload, role_claim)
    if raw_roles is None:
        raw_roles = []
    if not isinstance(raw_roles, list):
        raise AuthenticationError(f"JWT claim {role_claim!r} must be a list")

    normalized_roles: set[str] = set()
    for role in raw_roles:
        if not isinstance(role, str):
            raise AuthenticationError(f"JWT claim {role_claim!r} must contain strings")
        if role in ROLE_HIERARCHY:
            normalized_roles.add(role)

    return frozenset(normalized_roles)


async def get_current_principal(
    request: Request,
) -> AuthPrincipal:
    """Validate the Authorization header and return the current caller."""
    authorization = request.headers.get("Authorization")
    if not authorization:
        raise AuthenticationError("Authorization header is required")

    try:
        scheme, token = authorization.split(" ", 1)
    except ValueError as exc:
        raise AuthenticationError("Malformed Authorization header") from exc

    if scheme.lower() != "bearer":
        raise AuthenticationError("Authorization scheme must be Bearer")
    if not token:
        raise AuthenticationError("Bearer token is required")

    payload = _verify_supabase_jwt(token)
    return AuthPrincipal(
        subject=payload["sub"],
        roles=_extract_roles(payload),
        claims=payload,
    )


def require_role(required_role: str) -> Callable[[AuthPrincipal], AuthPrincipal]:
    """Build a dependency that enforces the minimum required role."""
    if required_role not in ROLE_HIERARCHY:
        raise ValueError(f"Unsupported role: {required_role}")

    async def dependency(
        principal: Annotated[AuthPrincipal, Depends(get_current_principal)],
    ) -> AuthPrincipal:
        highest_role = max((ROLE_HIERARCHY.get(role, 0) for role in principal.roles), default=0)
        if highest_role < ROLE_HIERARCHY[required_role]:
            raise AuthorizationError(f"{required_role} role is required")
        return principal

    return dependency


require_viewer = require_role("viewer")
require_operator = require_role("operator")
require_admin = require_role("admin")
