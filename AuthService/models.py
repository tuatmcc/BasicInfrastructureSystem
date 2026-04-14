"""Internal models for AuthService."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class UserRecord:
    username: str
    email: str
    password_hash: str
    roles: tuple[str, ...]
    enabled: bool = True


@dataclass(frozen=True, slots=True)
class ServiceAccountRecord:
    client_id: str
    secret_hash: str
    roles: tuple[str, ...]
    enabled: bool = True
