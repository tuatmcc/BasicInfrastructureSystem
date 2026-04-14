# Discord Connector Public API

Public HTTP API for Discord Connector.

## Overview

This module provides the external-facing HTTP API endpoints for the Discord Connector. It delegates all business logic to the `ControlInterface` service layer.

## Architecture

```
PublicAPI (HTTP endpoints)
    ↓
ControlInterface/services (Business logic)
    ↓
DiscordController / DiscordDatabaseController
```

## Running

```bash
export DATABASE_URL=postgresql+asyncpg://postgres:postgres@127.0.0.1:54322/postgres
export JWT_SECRET_KEY=replace_with_shared_jwt_secret
uvicorn main:app --reload
```

## Endpoints

- `/health` - Health check
- `/api/v0/role/*` - Role operations
- `/api/v0/channel/*` - Channel operations  
- `/api/v0/category/*` - Category operations
- `/api/v0/member/*` - Member operations
- `/api/v0/message/*` - Message operations

## Authentication

All endpoints except `/health` require `Authorization: Bearer <jwt>`.
JWTs are issued by an external auth service, not by `PublicAPI`.

- `JWT_SECRET_KEY` is required
- `JWT_ALGORITHM` defaults to `HS256`
- `JWT_ROLE_CLAIM` defaults to `roles`

Expected JWT claims:

- `sub`: caller identifier
- `roles`: array of role names

RBAC levels:

- `viewer`: read-only GET endpoints
- `operator`: message create/delete plus all viewer access
- `admin`: full access
