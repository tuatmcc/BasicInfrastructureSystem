# Auth Service

Central authentication service for BasicInfrastructureSystem.

## Endpoints

- `GET /health`
- `POST /auth/login`
- `POST /auth/token`

## Running

```bash
export JWT_SECRET_KEY=replace_with_shared_jwt_secret
uvicorn main:app --reload --port 8001
```

Default bootstrap credentials:

- user: `admin` / `change-this-admin-password`
- service account: `discord-sync` / `change-this-service-secret`

Override them with:

- `AUTH_BOOTSTRAP_USERS_JSON`
- `AUTH_BOOTSTRAP_SERVICE_ACCOUNTS_JSON`
