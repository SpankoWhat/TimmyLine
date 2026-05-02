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

# Optionally inject runtime credentials from AWS Secrets Manager.
# The secret payload must be a JSON object whose keys match the expected env var names.
if [ -n "${TIMMYLINE_AWS_SECRET_ID:-}" ]; then
	echo "Loading runtime credentials from AWS Secrets Manager..."
	eval "$(node /app/scripts/aws-secrets-env.mjs --format sh)"
fi

# ── Run migrations ───────────────────────────────────────────
echo "Checking database migrations..."
node migrate.js

# ── Start server ─────────────────────────────────────────────
echo "Starting TimmyLine..."
exec node server.js
