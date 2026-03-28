# ─────────────────────────────────────────────────────────────
# TimmyLine — Multi-stage Docker build
# ─────────────────────────────────────────────────────────────
# Stage 1 (builder): install everything, run `vite build`
# Stage 2 (production): lean image with only runtime deps
# ─────────────────────────────────────────────────────────────

# ── Stage 1: Build ───────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first (better layer caching — only re-installs when deps change)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build
COPY . .

# svelte-kit sync generates .svelte-kit/tsconfig.json (needed before build).
# Create a stub data/ dir so better-sqlite3 doesn't crash during Vite's
# server-side bundling (this directory is NOT carried to the production image).
RUN mkdir -p /app/data && npm run prepare && npm run build

# ── Stage 2: Production ─────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

# better-sqlite3 is a native addon that must be compiled for the target OS.
# These build tools are needed for `npm ci` to compile it on Alpine Linux.
RUN apk add --no-cache python3 make g++

# Install production dependencies only (no devDependencies)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && apk del python3 make g++

# Copy the built SvelteKit output and production entry point
COPY --from=builder /app/build ./build
COPY --from=builder /app/server.js ./
COPY --from=builder /app/migrate.js ./

# Copy Drizzle migration files (needed for `node migrate.js` on first run)
COPY --from=builder /app/drizzle ./drizzle

# Copy the standalone config reader and example config
COPY --from=builder /app/config.js ./
COPY --from=builder /app/timmyline.config.example.json ./

# NOTE: No VOLUME or mkdir for /app/data here — the host owns the data
# directory and bind-mounts it into the container. Run init-db.sh on the
# host first to create the directory and seed files.

# ── Environment defaults ───────────────────────────────────────
# Non-secret config is now in timmyline.config.json.
# Only secrets and the config file path remain as env vars.
ENV NODE_ENV=production
ENV TIMMYLINE_CONFIG=/app/data/timmyline.config.json

EXPOSE 3000

# Copy the entrypoint script that runs migrations before starting the server
COPY --from=builder /app/docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Start: run migrations, then launch the production server
ENTRYPOINT ["./docker-entrypoint.sh"]
