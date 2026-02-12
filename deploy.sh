#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# BIPES Deployment Script
# Usage: sudo ./deploy.sh [--domain YOUR_DOMAIN] [--email YOUR_EMAIL]
#
# If --domain is provided, sets up Let's Encrypt SSL.
# Otherwise, generates self-signed certificates for testing.
# ============================================================================

DOMAIN=""
EMAIL=""
INSTALL_DIR="$(cd "$(dirname "$0")" && pwd)"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --domain) DOMAIN="$2"; shift 2 ;;
    --email)  EMAIL="$2"; shift 2 ;;
    --help)
      echo "Usage: sudo ./deploy.sh [--domain YOUR_DOMAIN] [--email YOUR_EMAIL]"
      echo ""
      echo "Options:"
      echo "  --domain   Domain name for Let's Encrypt SSL (e.g., bipes.example.com)"
      echo "  --email    Email for Let's Encrypt notifications"
      echo ""
      echo "Without --domain, self-signed certificates are used."
      exit 0
      ;;
    *) echo "Unknown option: $1. Use --help for usage."; exit 1 ;;
  esac
done

# Check root
if [ "$EUID" -ne 0 ]; then
  echo "Please run with sudo: sudo ./deploy.sh"
  exit 1
fi

echo "============================================"
echo "  BIPES Deployment"
echo "============================================"
echo ""

# -----------------------------------------------------------
# Step 1: Install Docker if not present
# -----------------------------------------------------------
if ! command -v docker &> /dev/null; then
  echo "[1/7] Installing Docker..."
  apt-get update -qq
  apt-get install -y -qq ca-certificates curl gnupg
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
    https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -qq
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin
  systemctl enable docker
  systemctl start docker
  echo "  Docker installed."
else
  echo "[1/7] Docker already installed, skipping."
fi

# -----------------------------------------------------------
# Step 2: Generate .env with secure random values
# -----------------------------------------------------------
generate_secret() {
  openssl rand -base64 32 | tr -d '=/+' | head -c 48
}

if [ ! -f "$INSTALL_DIR/.env" ]; then
  echo "[2/7] Generating .env with secure secrets..."
  cat > "$INSTALL_DIR/.env" << EOF
FLASK_SECRET_KEY=$(generate_secret)
POSTGRES_DB=bipes
POSTGRES_USER=bipes_user
POSTGRES_PASSWORD=$(generate_secret)
MOSQUITTO_PASSWORD=$(generate_secret)
EOF
  chmod 600 "$INSTALL_DIR/.env"
  echo "  .env created."
else
  echo "[2/7] .env already exists, skipping."
fi

# -----------------------------------------------------------
# Step 3: SSL setup
# -----------------------------------------------------------
mkdir -p "$INSTALL_DIR/docker/ssl"

if [ -n "$DOMAIN" ] && [ -n "$EMAIL" ]; then
  echo "[3/7] Setting up Let's Encrypt SSL for $DOMAIN..."

  # Install certbot if needed
  if ! command -v certbot &> /dev/null; then
    apt-get install -y -qq certbot
  fi

  # Stop anything on port 80 temporarily
  docker compose -f "$INSTALL_DIR/docker-compose.yml" down 2>/dev/null || true

  certbot certonly --standalone -d "$DOMAIN" -m "$EMAIL" --agree-tos --non-interactive

  cp "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" "$INSTALL_DIR/docker/ssl/cert.pem"
  cp "/etc/letsencrypt/live/$DOMAIN/privkey.pem" "$INSTALL_DIR/docker/ssl/key.pem"

  # Auto-renewal cron
  cat > /etc/cron.d/bipes-certbot << CRON
0 3 * * * root certbot renew --quiet --deploy-hook "cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem $INSTALL_DIR/docker/ssl/cert.pem && cp /etc/letsencrypt/live/$DOMAIN/privkey.pem $INSTALL_DIR/docker/ssl/key.pem && docker restart bipes_nginx" 2>&1 | logger -t bipes-certbot
CRON
  echo "  Let's Encrypt configured with auto-renewal."
else
  if [ ! -f "$INSTALL_DIR/docker/ssl/cert.pem" ]; then
    echo "[3/7] Generating self-signed SSL certificates..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
      -keyout "$INSTALL_DIR/docker/ssl/key.pem" \
      -out "$INSTALL_DIR/docker/ssl/cert.pem" \
      -subj "/CN=localhost" 2>/dev/null
    echo "  Self-signed certificates created."
  else
    echo "[3/7] SSL certificates already exist, skipping."
  fi
fi

# -----------------------------------------------------------
# Step 4: Configure Mosquitto authentication
# -----------------------------------------------------------
if [ ! -f "$INSTALL_DIR/docker/mosquitto_passwd" ]; then
  echo "[4/7] Configuring Mosquitto authentication..."
  source "$INSTALL_DIR/.env"
  # Generate password file using the mosquitto container
  docker run --rm \
    -v "$INSTALL_DIR/docker:/mosquitto/config" \
    eclipse-mosquitto:2.0 \
    mosquitto_passwd -b -c /mosquitto/config/mosquitto_passwd bipes "$MOSQUITTO_PASSWORD"
  echo "  Mosquitto password file created."
else
  echo "[4/7] Mosquitto password file exists, skipping."
fi

# -----------------------------------------------------------
# Step 5: Firewall
# -----------------------------------------------------------
echo "[5/7] Configuring firewall..."
if command -v ufw &> /dev/null; then
  ufw allow OpenSSH >/dev/null 2>&1
  ufw allow 80/tcp >/dev/null 2>&1
  ufw allow 443/tcp >/dev/null 2>&1
  ufw --force enable >/dev/null 2>&1
  echo "  Firewall configured (SSH, HTTP, HTTPS)."
else
  echo "  UFW not found, skipping firewall config."
fi

# -----------------------------------------------------------
# Step 6: Database backup cron
# -----------------------------------------------------------
echo "[6/7] Setting up daily database backups..."
mkdir -p "$INSTALL_DIR/backups"
cat > /etc/cron.d/bipes-backup << CRON
0 2 * * * root $INSTALL_DIR/docker/backup-db.sh 2>&1 | logger -t bipes-backup
CRON
echo "  Daily backup cron configured."

# -----------------------------------------------------------
# Step 7: Build and start
# -----------------------------------------------------------
echo "[7/7] Building and starting BIPES..."
cd "$INSTALL_DIR"
docker compose up -d --build

echo ""
echo "Waiting for services to start..."
sleep 10
docker compose ps

echo ""
echo "============================================"
echo "  BIPES is running!"
echo "============================================"
if [ -n "$DOMAIN" ]; then
  echo "  Access at: https://$DOMAIN"
else
  PUBLIC_IP=$(curl -s ifconfig.me 2>/dev/null || echo "YOUR_SERVER_IP")
  echo "  Access at: https://$PUBLIC_IP"
  echo "  (Browser will show certificate warning with self-signed certs)"
fi
echo ""
echo "  Useful commands:"
echo "    docker compose logs -f       # View logs"
echo "    docker compose restart       # Restart services"
echo "    docker compose down          # Stop everything"
echo "    $INSTALL_DIR/docker/backup-db.sh  # Manual backup"
echo ""
