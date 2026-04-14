"""In-memory credential store for AuthService."""

from __future__ import annotations

from AuthService.config import (
    get_bootstrap_service_accounts,
    get_bootstrap_users,
)
from AuthService.models import ServiceAccountRecord, UserRecord
from AuthService.security import hash_secret, verify_secret


class CredentialStore:
    """In-memory credential store seeded from environment configuration."""

    def __init__(self) -> None:
        self._users_by_username: dict[str, UserRecord] = {}
        self._users_by_email: dict[str, UserRecord] = {}
        self._service_accounts: dict[str, ServiceAccountRecord] = {}
        self._load_users()
        self._load_service_accounts()

    def _load_users(self) -> None:
        for item in get_bootstrap_users():
            username = str(item["username"])
            email = str(item["email"])
            roles = tuple(str(role) for role in item.get("roles", ["viewer"]))
            enabled = bool(item.get("enabled", True))
            password = str(item["password"])
            record = UserRecord(
                username=username,
                email=email,
                password_hash=hash_secret(password),
                roles=roles,
                enabled=enabled,
            )
            self._users_by_username[username] = record
            self._users_by_email[email] = record

    def _load_service_accounts(self) -> None:
        for item in get_bootstrap_service_accounts():
            client_id = str(item["client_id"])
            roles = tuple(str(role) for role in item.get("roles", ["viewer"]))
            enabled = bool(item.get("enabled", True))
            secret = str(item["client_secret"])
            self._service_accounts[client_id] = ServiceAccountRecord(
                client_id=client_id,
                secret_hash=hash_secret(secret),
                roles=roles,
                enabled=enabled,
            )

    def authenticate_user(self, username_or_email: str, password: str) -> UserRecord | None:
        record = self._users_by_username.get(username_or_email) or self._users_by_email.get(
            username_or_email
        )
        if record is None or not record.enabled:
            return None
        if not verify_secret(password, record.password_hash):
            return None
        return record

    def authenticate_service_account(
        self,
        client_id: str,
        client_secret: str,
    ) -> ServiceAccountRecord | None:
        record = self._service_accounts.get(client_id)
        if record is None or not record.enabled:
            return None
        if not verify_secret(client_secret, record.secret_hash):
            return None
        return record
