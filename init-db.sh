#!/bin/sh
# TimmyLine — Host-side Database Initialization
#
# Run this script BEFORE starting the Docker container to ensure the
# data directory and SQLite database file exist on the host filesystem.
#
# Usage:
#   chmod +x init-db.sh
#   ./init-db.sh              # uses default ./data directory
#   ./init-db.sh /path/to/dir # uses a custom directory
#
# The data directory is bind-mounted into the container at /app/data,
# giving you full control over the database file for backups, migrations,
# and portability — the container never owns the data.

set -e

DATA_DIR="${1:-./data}"
DB_FILE="${DATA_DIR}/timmyLine.db"
LOG_FILE="${DATA_DIR}/timmyLine.log"

echo "TimmyLine — Initializing data directory"
echo "  Directory: ${DATA_DIR}"

# Create the data directory if it doesn't exist
mkdir -p "${DATA_DIR}"

# Touch the DB and log files so the bind mount maps to files, not directories
if [ ! -f "${DB_FILE}" ]; then
    touch "${DB_FILE}"
    echo "  Created:   ${DB_FILE}"
else
    echo "  Exists:    ${DB_FILE}"
fi

if [ ! -f "${LOG_FILE}" ]; then
    touch "${LOG_FILE}"
    echo "  Created:   ${LOG_FILE}"
else
    echo "  Exists:    ${LOG_FILE}"
fi

echo ""
echo "   Data directory ready. You can now run:"
echo "   docker compose up -d"
