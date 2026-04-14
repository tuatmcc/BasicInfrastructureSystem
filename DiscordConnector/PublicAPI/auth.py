"""JWT authentication and RBAC helpers for PublicAPI."""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time
from dataclasses import dataclass
from typing import Annotated, Callable

from fastapi import Depends, Request

from DiscordConnector.config import (
    get_jwt_algorithm,
    get_jwt_audience_discord,
    get_jwt_issuer,
    get_jwt_role_claim,
    get_jwt_secret_key,
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


def _decode_base64url(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    try:
        return base64.urlsafe_b64decode(value + padding)
    except Exception as exc:  # pragma: no cover - narrow errors are not valuable here
        raise AuthenticationError("Invalid JWT encoding") from exc


def _decode_json_segment(value: str) -> dict[str, object]:
    try:
        decoded = _decode_base64url(value).decode("utf-8")
        payload = json.loads(decoded)
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise AuthenticationError("Invalid JWT payload") from exc
    if not isinstance(payload, dict):
        raise AuthenticationError("Invalid JWT payload")
    return payload


def _verify_hs256(token: str, secret: str) -> dict[str, object]:
    try:
        signing_input, signature = token.rsplit(".", 1)
        header_segment, payload_segment = signing_input.split(".", 1)
    except ValueError as exc:
        raise AuthenticationError("Malformed JWT") from exc

    header = _decode_json_segment(header_segment)
    payload = _decode_json_segment(payload_segment)

    algorithm = header.get("alg")
    if algorithm != get_jwt_algorithm():
        raise AuthenticationError("Unexpected JWT algorithm")

    expected_signature = base64.urlsafe_b64encode(
        hmac.new(secret.encode("utf-8"), signing_input.encode("ascii"), hashlib.sha256).digest()
    ).rstrip(b"=").decode("ascii")
    if not hmac.compare_digest(signature, expected_signature):
        raise AuthenticationError("Invalid JWT signature")

    exp = payload.get("exp")
    if exp is not None:
        if not isinstance(exp, int | float):
            raise AuthenticationError("Invalid JWT expiration")
        if exp <= time.time():
            raise AuthenticationError("JWT has expired")

    subject = payload.get("sub")
    if not isinstance(subject, str) or not subject:
        raise AuthenticationError("JWT subject is required")

    issuer = payload.get("iss")
    if issuer != get_jwt_issuer():
        raise AuthenticationError("Unexpected JWT issuer")

    audience = payload.get("aud")
    expected_audience = get_jwt_audience_discord()
    if isinstance(audience, str):
        valid_audience = audience == expected_audience
    elif isinstance(audience, list):
        valid_audience = expected_audience in audience and all(
            isinstance(item, str) for item in audience
        )
    else:
        valid_audience = False
    if not valid_audience:
        raise AuthorizationError("JWT audience does not allow this API")

    return payload


def _extract_roles(payload: dict[str, object]) -> frozenset[str]:
    role_claim = get_jwt_role_claim()
    raw_roles = payload.get(role_claim, [])
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

    payload = _verify_hs256(token, get_jwt_secret_key())
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
