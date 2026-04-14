"""Security helpers for AuthService."""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import secrets
import time

from AuthService.config import (
    get_discord_audience,
    get_jwt_issuer,
    get_jwt_secret_key,
    get_user_token_ttl,
)

PBKDF2_ITERATIONS = 600_000


def _encode_segment(value: dict[str, object]) -> str:
    raw = json.dumps(value, separators=(",", ":"), sort_keys=True).encode("utf-8")
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")


def hash_secret(secret: str) -> str:
    salt = secrets.token_bytes(16)
    derived = hashlib.pbkdf2_hmac(
        "sha256",
        secret.encode("utf-8"),
        salt,
        PBKDF2_ITERATIONS,
    )
    return (
        "pbkdf2_sha256$"
        f"{PBKDF2_ITERATIONS}$"
        f"{base64.urlsafe_b64encode(salt).decode('ascii')}$"
        f"{base64.urlsafe_b64encode(derived).decode('ascii')}"
    )


def verify_secret(secret: str, encoded_hash: str) -> bool:
    try:
        algorithm, iterations_str, salt_b64, digest_b64 = encoded_hash.split("$", 3)
    except ValueError:
        return False
    if algorithm != "pbkdf2_sha256":
        return False
    iterations = int(iterations_str)
    salt = base64.urlsafe_b64decode(salt_b64.encode("ascii"))
    expected = base64.urlsafe_b64decode(digest_b64.encode("ascii"))
    candidate = hashlib.pbkdf2_hmac(
        "sha256",
        secret.encode("utf-8"),
        salt,
        iterations,
    )
    return hmac.compare_digest(candidate, expected)


def issue_access_token(
    subject: str,
    roles: list[str] | tuple[str, ...],
    *,
    audience: str | list[str] | None = None,
    ttl_seconds: int | None = None,
) -> tuple[str, int]:
    ttl = ttl_seconds if ttl_seconds is not None else get_user_token_ttl()
    issued_at = int(time.time())
    expires_at = issued_at + ttl
    payload: dict[str, object] = {
        "sub": subject,
        "roles": list(roles),
        "iss": get_jwt_issuer(),
        "aud": audience if audience is not None else get_discord_audience(),
        "iat": issued_at,
        "exp": expires_at,
    }
    header = {"alg": "HS256", "typ": "JWT"}
    signing_input = f"{_encode_segment(header)}.{_encode_segment(payload)}"
    signature = base64.urlsafe_b64encode(
        hmac.new(
            get_jwt_secret_key().encode("utf-8"),
            signing_input.encode("ascii"),
            hashlib.sha256,
        ).digest()
    ).rstrip(b"=").decode("ascii")
    return f"{signing_input}.{signature}", ttl
