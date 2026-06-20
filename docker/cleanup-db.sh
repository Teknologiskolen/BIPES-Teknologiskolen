#!/usr/bin/env bash
set -euo pipefail

# Purge unusable auth rows so the tables (and the 15 GB disk) can't grow without bound:
#   - auth_sessions: rows that are revoked or already expired are unusable (login
#     rejects them), so they are safe to delete.
#   - auth_events: each row stores client IP + User-Agent; keep only the most recent
#     AUTH_EVENT_RETENTION_DAYS (default 90) so audit data isn't retained indefinitely
#     (data-protection for a system handling minors).
#
# Wired into a daily cron by deploy.sh. Run manually with: ./docker/cleanup-db.sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
INSTALL_DIR="$(dirname "$SCRIPT_DIR")"
COMPOSE=(docker compose -f "$INSTALL_DIR/docker-compose.yml" -f "$INSTALL_DIR/docker-compose.prod.yml")

# Load env
set -a
# shellcheck disable=SC1091
source "$INSTALL_DIR/.env"
set +a
EVENT_RETENTION_DAYS="${AUTH_EVENT_RETENTION_DAYS:-90}"

"${COMPOSE[@]}" exec -T postgres psql \
  -U "${POSTGRES_USER:-bipes_user}" \
  -d "${POSTGRES_DB:-bipes}" \
  -v ON_ERROR_STOP=1 \
  -c "DELETE FROM auth_sessions WHERE revoked_at IS NOT NULL OR expires_at < EXTRACT(EPOCH FROM now());" \
  -c "DELETE FROM auth_events WHERE created_at < EXTRACT(EPOCH FROM now()) - (${EVENT_RETENTION_DAYS} * 86400);"

echo "Cleanup complete: purged revoked/expired sessions and auth_events older than ${EVENT_RETENTION_DAYS} days."
