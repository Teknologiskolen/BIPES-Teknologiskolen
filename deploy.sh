#!/usr/bin/env bash
set -euo pipefail

# Provision or update BIPES on an Ubuntu VM.
#
# Production:
#   sudo ./deploy.sh --domain bipes.example.com
#
# Temporary IP-only test:
#   sudo ./deploy.sh --self-signed

DOMAIN=""
SELF_SIGNED=false
INSTALL_DIR="$(cd "$(dirname "$0")" && pwd)"
COMPOSE=(docker compose
  -f "$INSTALL_DIR/docker-compose.yml"
  -f "$INSTALL_DIR/docker-compose.prod.yml")

# eclipse-mosquitto:2.0 drops privileges to this UID/GID. The bind-mounted TLS
# certs must be owned by it (and the directory traversable) or the broker
# crash-loops on "Unable to load server certificate". See install_certificate.
MOSQUITTO_UID=1883

usage() {
  cat <<'EOF'
Usage:
  sudo ./deploy.sh --domain DOMAIN
  sudo ./deploy.sh --self-signed

Options:
  --domain DOMAIN   Public DNS name pointing at this VM
  --self-signed     Explicitly use a browser-warning certificate for testing
EOF
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --domain)
      DOMAIN="${2:-}"
      shift 2
      ;;
    --self-signed)
      SELF_SIGNED=true
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [ "$EUID" -ne 0 ]; then
  echo "Run this script with sudo." >&2
  exit 1
fi

if [ "$SELF_SIGNED" = false ] && [ -z "$DOMAIN" ]; then
  echo "Production deployment requires --domain." >&2
  echo "Use --self-signed only for temporary IP testing." >&2
  exit 1
fi

if [ "$SELF_SIGNED" = true ] && [ -n "$DOMAIN" ]; then
  echo "Do not combine --self-signed with --domain." >&2
  exit 1
fi

if [ ! -f /etc/os-release ] || ! grep -qi 'ubuntu' /etc/os-release; then
  echo "This installer currently supports Ubuntu VMs." >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

install_docker() {
  if docker compose version >/dev/null 2>&1; then
    return
  fi

  apt-get update
  apt-get install -y ca-certificates curl gnupg
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg |
    gpg --dearmor --yes -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg

  . /etc/os-release
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable" \
    > /etc/apt/sources.list.d/docker.list

  apt-get update
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  systemctl enable --now docker
}

ensure_swap() {
  if swapon --show --noheadings | grep -q .; then
    return
  fi

  # One gigabyte is enough to keep image builds from being killed on the 2 GB VM
  # without consuming too much of the 15 GB SSD.
  fallocate -l 1G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile >/dev/null
  swapon /swapfile
  grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  sysctl -w vm.swappiness=10 >/dev/null
  printf 'vm.swappiness=10\n' > /etc/sysctl.d/99-bipes.conf
}

generate_secret() {
  # 256 random bits encoded as unpadded RFC 4648 Base32. The output contains
  # only A-Z and 2-7, so it is safe in an unquoted dotenv assignment.
  openssl rand 32 | base32 | tr -d '=\n'
}

prepare_env() {
  if [ ! -f "$INSTALL_DIR/.env" ]; then
    umask 077
    cat > "$INSTALL_DIR/.env" <<EOF
COMPOSE_PROJECT_NAME=bipes
AUTH_MODE=full
FLASK_SECRET_KEY=$(generate_secret)
PASSWORD_PEPPER=$(generate_secret)
POSTGRES_DB=bipes
POSTGRES_USER=bipes_user
POSTGRES_PASSWORD=$(generate_secret)
MOSQUITTO_USERNAME=bipes-server
MOSQUITTO_PASSWORD=$(generate_secret)
MOSQUITTO_DYNSEC_ENABLED=true
MOSQUITTO_DYNSEC_ADMIN_USERNAME=admin
MOSQUITTO_DYNSEC_ADMIN_PASSWORD=$(generate_secret)
GUNICORN_WORKERS=1
GUNICORN_THREADS=4
BACKUP_RETENTION_DAYS=7
EOF
  fi

  chmod 600 "$INSTALL_DIR/.env"

  if grep -Eq '(^|=)(changeme|change-this|change-this-password|change-this-dynsec-admin-password)' "$INSTALL_DIR/.env"; then
    echo ".env still contains placeholder secrets. Replace them before deployment." >&2
    exit 1
  fi

  set -a
  # shellcheck disable=SC1091
  source "$INSTALL_DIR/.env"
  set +a

  for name in FLASK_SECRET_KEY PASSWORD_PEPPER POSTGRES_PASSWORD MOSQUITTO_PASSWORD MOSQUITTO_DYNSEC_ADMIN_PASSWORD; do
    if [ -z "${!name:-}" ]; then
      echo "Required variable $name is missing from .env." >&2
      exit 1
    fi
  done
}

install_certificate() {
  # 0755 so the mosquitto user (a non-root "other") can traverse into the dir;
  # files owned by that UID so it can read the key (kept 0600). nginx reads the
  # same files as root, so this ownership is transparent to it.
  install -d -m 0755 "$INSTALL_DIR/docker/ssl"
  install -m 0644 -o "$MOSQUITTO_UID" -g "$MOSQUITTO_UID" "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" "$INSTALL_DIR/docker/ssl/cert.pem"
  install -m 0600 -o "$MOSQUITTO_UID" -g "$MOSQUITTO_UID" "/etc/letsencrypt/live/$DOMAIN/privkey.pem" "$INSTALL_DIR/docker/ssl/key.pem"
}

prepare_tls() {
  if [ "$SELF_SIGNED" = true ]; then
    if [ ! -s "$INSTALL_DIR/docker/ssl/cert.pem" ] || [ ! -s "$INSTALL_DIR/docker/ssl/key.pem" ]; then
      "$INSTALL_DIR/docker/generate-ssl.sh"
    fi
    return
  fi

  apt-get update
  apt-get install -y certbot

  if [ ! -d "/etc/letsencrypt/live/$DOMAIN" ]; then
    "${COMPOSE[@]}" down >/dev/null 2>&1 || true
    certbot certonly --standalone \
      --domain "$DOMAIN" \
      --register-unsafely-without-email \
      --agree-tos \
      --non-interactive
  fi

  install_certificate

  # Certbot's systemd timer performs renewal. This hook copies renewed files
  # into the bind-mounted directory and reloads both TLS consumers.
  install -d -m 0755 /etc/letsencrypt/renewal-hooks/deploy
  cat > /etc/letsencrypt/renewal-hooks/deploy/bipes <<EOF
#!/bin/sh
set -eu
install -m 0644 -o $MOSQUITTO_UID -g $MOSQUITTO_UID /etc/letsencrypt/live/$DOMAIN/fullchain.pem "$INSTALL_DIR/docker/ssl/cert.pem"
install -m 0600 -o $MOSQUITTO_UID -g $MOSQUITTO_UID /etc/letsencrypt/live/$DOMAIN/privkey.pem "$INSTALL_DIR/docker/ssl/key.pem"
cd "$INSTALL_DIR"
docker compose -f docker-compose.yml -f docker-compose.prod.yml restart nginx mosquitto
EOF
  chmod 700 /etc/letsencrypt/renewal-hooks/deploy/bipes
}

configure_firewall() {
  apt-get install -y ufw
  ufw allow OpenSSH
  ufw allow 80/tcp
  ufw allow 443/tcp
  ufw allow 8883/tcp
  ufw --force enable
}

configure_maintenance() {
  chmod 700 "$INSTALL_DIR/docker/backup-db.sh"
  chmod 700 "$INSTALL_DIR/docker/cleanup-db.sh"
  install -d -m 0700 "$INSTALL_DIR/backups"

  cat > /etc/cron.d/bipes-backup <<EOF
17 2 * * * root "$INSTALL_DIR/docker/backup-db.sh" 2>&1 | logger -t bipes-backup
EOF
  chmod 644 /etc/cron.d/bipes-backup

  # Nightly purge of revoked/expired sessions and aged-out audit events so the auth
  # tables can't grow unbounded on the 15 GB disk (and PII isn't retained forever).
  cat > /etc/cron.d/bipes-db-cleanup <<EOF
37 3 * * * root "$INSTALL_DIR/docker/cleanup-db.sh" 2>&1 | logger -t bipes-db-cleanup
EOF
  chmod 644 /etc/cron.d/bipes-db-cleanup

  # Reclaim stale build cache and unused images weekly. Volumes are deliberately
  # excluded because they contain PostgreSQL and Mosquitto state.
  cat > /etc/cron.d/bipes-docker-prune <<'EOF'
43 3 * * 0 root docker image prune -af --filter "until=168h" 2>&1 | logger -t bipes-docker-prune
53 3 * * 0 root docker builder prune -af --filter "until=168h" 2>&1 | logger -t bipes-docker-prune
EOF
  chmod 644 /etc/cron.d/bipes-docker-prune
}

start_stack() {
  cd "$INSTALL_DIR"
  "${COMPOSE[@]}" config --quiet
  "${COMPOSE[@]}" up -d --build --remove-orphans

  for _ in $(seq 1 60); do
    status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' bipes_web 2>/dev/null || true)"
    if [ "$status" = "healthy" ]; then
      break
    fi
    if [ "$status" = "unhealthy" ] || [ "$status" = "exited" ]; then
      "${COMPOSE[@]}" logs --tail=100 web
      exit 1
    fi
    sleep 2
  done

  if [ "${status:-}" != "healthy" ]; then
    "${COMPOSE[@]}" logs --tail=100 web
    echo "Web container did not become healthy in time." >&2
    exit 1
  fi

  curl --fail --silent --show-error --insecure https://localhost/ >/dev/null
  "${COMPOSE[@]}" ps
}

echo "Preparing BIPES production deployment in $INSTALL_DIR"
install_docker
ensure_swap
prepare_env
configure_firewall
prepare_tls
configure_maintenance
start_stack

echo
if [ "$SELF_SIGNED" = true ]; then
  echo "BIPES is available at https://SERVER_IP (temporary self-signed certificate)."
else
  echo "BIPES is available at https://$DOMAIN"
fi
echo "Create the first teacher account (server-side):"
echo "  sudo docker compose -f docker-compose.yml -f docker-compose.prod.yml exec web \\"
echo "    python scripts/add_teacher.py \"teacher@school.dk\" \"Full Name\""
echo "Then verify a database backup."
