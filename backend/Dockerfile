# ─────────────────────────────────────────────────────────────────────────────
# Dockerfile — AgentRelay LCP Team Synchronization Server (PRD §21)
# ─────────────────────────────────────────────────────────────────────────────

FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Install native compilation dependencies for better-sqlite3
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
 && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --omit=dev

# ── Runtime Stage ────────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production \
    PORT=4000 \
    DB_PATH=/data/lcp.db

# Install curl for docker healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
 && rm -rf /var/lib/apt/lists/*

# Create persistent data directory for SQLite WAL database
RUN mkdir -p /data && chown -R node:node /data /app

# Copy production node_modules from builder
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package*.json ./
COPY --chown=node:node src ./src

USER node

VOLUME ["/data"]

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:4000/healthz || exit 1

CMD ["node", "src/server.js"]
