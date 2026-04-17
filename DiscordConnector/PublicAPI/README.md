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
export SUPABASE_PROJECT_URL=https://your-project-ref.supabase.co
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
JWTs are issued by Supabase Auth, not by `PublicAPI`.

- `SUPABASE_PROJECT_URL` is required
- `SUPABASE_JWT_AUDIENCE` defaults to `authenticated`
- `SUPABASE_JWT_ALGORITHMS` defaults to `RS256,ES256`
- `DISCORD_CONNECTOR_ROLE_CLAIM` defaults to `app_metadata.discord_connector_roles`

Expected JWT claims:

- `sub`: caller identifier
- `iss`: `{SUPABASE_PROJECT_URL}/auth/v1`
- `aud`: `authenticated` by default
- `role`: `authenticated`
- `app_metadata.discord_connector_roles`: array of DiscordConnector role names

RBAC levels:

- `viewer`: read-only GET endpoints
- `operator`: message create/delete plus all viewer access
- `admin`: full access
