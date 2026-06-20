#!/usr/bin/env bash
set -euo pipefail

# BIPES PostgreSQL + Mosquitto security-state backup.
# Keeps the last BACKUP_RETENTION_DAYS days (default 7).

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
INSTALL_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$INSTALL_DIR/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
COMPOSE=(docker compose -f "$INSTALL_DIR/docker-compose.yml" -f "$INSTALL_DIR/docker-compose.prod.yml")

# Load env
set -a
source "$INSTALL_DIR/.env"
set +a
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

# Write atomically so an interrupted backup is never mistaken for a good one.
DB_TMP="$BACKUP_DIR/.bipes_$TIMESTAMP.sql.gz.tmp"
DYNSEC_TMP="$BACKUP_DIR/.dynamic-security_$TIMESTAMP.json.tmp"

"${COMPOSE[@]}" exec -T postgres pg_dump \
  -U "${POSTGRES_USER:-bipes_user}" \
  "${POSTGRES_DB:-bipes}" | gzip > "$DB_TMP"

"${COMPOSE[@]}" exec -T mosquitto \
  sh -c 'cat /mosquitto/data/dynamic-security.json' > "$DYNSEC_TMP"

mv "$DB_TMP" "$BACKUP_DIR/bipes_$TIMESTAMP.sql.gz"
mv "$DYNSEC_TMP" "$BACKUP_DIR/dynamic-security_$TIMESTAMP.json"
chmod 600 \
  "$BACKUP_DIR/bipes_$TIMESTAMP.sql.gz" \
  "$BACKUP_DIR/dynamic-security_$TIMESTAMP.json"

# Remove old backups and abandoned temporary files.
find "$BACKUP_DIR" -type f \
  \( -name "*.sql.gz" -o -name "dynamic-security_*.json" -o -name "*.tmp" \) \
  -mtime "+$RETENTION_DAYS" -delete

echo "Backup complete: bipes_$TIMESTAMP.sql.gz and dynamic-security_$TIMESTAMP.json"
