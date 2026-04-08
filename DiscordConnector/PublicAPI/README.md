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
uvicorn main:app --reload
```

## Endpoints

- `/health` - Health check
- `/api/v0/role/*` - Role operations
- `/api/v0/channel/*` - Channel operations  
- `/api/v0/category/*` - Category operations
- `/api/v0/member/*` - Member operations
- `/api/v0/message/*` - Message operations
