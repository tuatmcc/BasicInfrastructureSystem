"""Application factory for AuthService."""

from __future__ import annotations

from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel, Field

from AuthService.config import get_service_token_ttl, get_user_token_ttl
from AuthService.security import issue_access_token
from AuthService.store import CredentialStore


class LoginRequest(BaseModel):
    username_or_email: str = Field(min_length=1)
    password: str = Field(min_length=1)


class ClientCredentialsRequest(BaseModel):
    client_id: str = Field(min_length=1)
    client_secret: str = Field(min_length=1)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "Bearer"
    expires_in: int
    roles: list[str]
    subject: str


def create_app(store: CredentialStore | None = None) -> FastAPI:
    credential_store = store or CredentialStore()
    app = FastAPI(
        title="Auth Service",
        description="Central authentication service for BasicInfrastructureSystem",
        version="0.1.0",
    )

    @app.get("/health")
    async def health_check() -> dict[str, str]:
        return {"status": "ok"}

    @app.post("/auth/login", response_model=TokenResponse)
    async def login(payload: LoginRequest) -> TokenResponse:
        user = credential_store.authenticate_user(payload.username_or_email, payload.password)
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username/email or password",
            )
        token, ttl = issue_access_token(
            subject=user.username,
            roles=user.roles,
            ttl_seconds=get_user_token_ttl(),
        )
        return TokenResponse(
            access_token=token,
            expires_in=ttl,
            roles=list(user.roles),
            subject=user.username,
        )

    @app.post("/auth/token", response_model=TokenResponse)
    async def client_credentials(payload: ClientCredentialsRequest) -> TokenResponse:
        account = credential_store.authenticate_service_account(
            payload.client_id,
            payload.client_secret,
        )
        if account is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid client credentials",
            )
        subject = f"service:{account.client_id}"
        token, ttl = issue_access_token(
            subject=subject,
            roles=account.roles,
            ttl_seconds=get_service_token_ttl(),
        )
        return TokenResponse(
            access_token=token,
            expires_in=ttl,
            roles=list(account.roles),
            subject=subject,
        )

    return app
