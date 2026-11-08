# syntax=docker/dockerfile:1
FROM ghcr.io/astral-sh/uv:0.13.4 AS uv
FROM python:3.12-slim-bookworm AS base
# Runtime TLS (including libpq sslrootcert=system) needs a real system CA bundle.
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && update-ca-certificates \
    && rm -rf /var/lib/apt/lists/*
FROM base AS build
COPY --from=uv /uv /usr/local/bin/uv
WORKDIR /app
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy UV_PYTHON_DOWNLOADS=never
COPY pyproject.toml uv.lock ./
COPY services/api services/api
RUN uv sync --frozen --no-dev --no-editable
FROM base AS runtime
WORKDIR /app
ENV PATH=/app/.venv/bin:$PATH PYTHONUNBUFFERED=1 PORT=8000 SSL_CERT_FILE=/etc/ssl/certs/ca-certificates.crt
RUN useradd --uid 10001 --create-home app
COPY --from=build --chown=app:app /app/.venv /app/.venv
COPY --chown=app:app scripts/start-api.py scripts/start-api.py
USER app
CMD ["python", "scripts/start-api.py"]
