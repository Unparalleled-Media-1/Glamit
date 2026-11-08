# syntax=docker/dockerfile:1
# Build from repository root: npm workspaces require the root lockfile/shared packages.
FROM node:24.22.1-bookworm-slim AS base
# Runtime TLS (including libpq sslrootcert=system) needs a real system CA bundle.
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && update-ca-certificates \
    && rm -rf /var/lib/apt/lists/*
FROM base AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1 NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/mobile/package.json apps/mobile/package.json
RUN npm ci --ignore-scripts
COPY apps/web apps/web
COPY packages packages
COPY scripts/check-browser-auth-config.mjs scripts/public-supabase-config.mjs scripts/
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY=""
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
RUN node scripts/check-browser-auth-config.mjs --production-web && npm run build:web
FROM base AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000 NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt
COPY --from=build --chown=node:node /app/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=node:node /app/apps/web/public ./apps/web/public
USER node
CMD ["node", "apps/web/server.js"]
