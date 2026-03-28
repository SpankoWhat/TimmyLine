#!/bin/sh
# TimmyLine Docker Entrypoint
#
# Validates the bind-mounted data directory, runs database migrations on
# every container start (idempotent — already-applied migrations are
# skipped), then launches the production server.

set -e

# ── Validate data directory ──────────────────────────────────
DATA_DIR="/app/data"

if [ ! -d "${DATA_DIR}" ]; then
    echo "   Data directory not found: ${DATA_DIR}"
    echo "   Run ./init-db.sh on the host before starting the container."
    echo "   Or ensure the volume is mounted correctly in docker-compose.yml."
    exit 1
fi

echo "Data directory found: ${DATA_DIR}"

# Copy example config into the data volume if none exists yet
CONFIG_FILE="${TIMMYLINE_CONFIG:-/app/data/timmyline.config.json}"
if [ ! -f "${CONFIG_FILE}" ]; then
    echo "No config file found — copying example config to ${CONFIG_FILE}"
    cp /app/timmyline.config.example.json "${CONFIG_FILE}"
fi

# ── Run migrations ───────────────────────────────────────────
echo "Checking database migrations..."
node migrate.js

# ── Start server ─────────────────────────────────────────────
echo "Starting TimmyLine..."
exec node server.js
