"""Fixtures for AuthService tests."""

from __future__ import annotations

import os
import sys
from pathlib import Path

repo_root = Path(__file__).resolve().parents[2]
if str(repo_root) not in sys.path:
    sys.path.insert(0, str(repo_root))

os.environ["JWT_SECRET_KEY"] = "test-jwt-secret"
os.environ["JWT_ALGORITHM"] = "HS256"
os.environ["JWT_ISSUER"] = "auth-service"
os.environ["JWT_AUDIENCE_DISCORD"] = "discord-public-api"
os.environ["AUTH_USER_TOKEN_TTL_SECONDS"] = "3600"
os.environ["AUTH_SERVICE_TOKEN_TTL_SECONDS"] = "900"
