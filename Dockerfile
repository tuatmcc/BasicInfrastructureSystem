FROM python:3.13-slim

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

# Copy dependency files first for better caching
COPY pyproject.toml uv.lock ./
COPY AuthService/pyproject.toml AuthService/
COPY DiscordConnector/DiscordController/pyproject.toml DiscordConnector/DiscordController/
COPY DiscordConnector/ControlInterface/pyproject.toml DiscordConnector/ControlInterface/
COPY DiscordConnector/DiscordDatabaseController/pyproject.toml DiscordConnector/DiscordDatabaseController/
COPY DiscordConnector/PublicAPI/pyproject.toml DiscordConnector/PublicAPI/

# Install dependencies
RUN uv sync --frozen --no-install-project

# Copy source code
COPY . .

# Install project
RUN uv sync --frozen

WORKDIR /app/DiscordConnector/PublicAPI

EXPOSE 8000

CMD ["uv", "run", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
