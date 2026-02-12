#!/bin/bash
# BIPES Deployment Setup Script
# Run this on your VM to set up everything needed for BIPES
#
# Usage: bash setup.sh

set -e

echo "========================================="
echo "  BIPES Deployment Setup"
echo "========================================="
echo ""

# Create directory structure
echo "[1/5] Creating directory structure..."
mkdir -p config ssl

# Copy config files if they don't exist
echo "[2/5] Setting up configuration files..."

# Mosquitto config
cat > config/mosquitto.conf << 'CONF'
# Mosquitto configuration for BIPES
persistence true
persistence_location /mosquitto/data/
log_dest file /mosquitto/log/mosquitto.log
log_dest stdout
log_type all
allow_anonymous false
password_file /mosquitto/config/mosquitto_passwd
listener 1883
protocol mqtt
listener 9001
protocol websockets
CONF

# Nginx config
cat > config/nginx.conf << 'CONF'
# Rate limiting for auth endpoints
limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/m;

# HTTP server - redirect to HTTPS
server {
    listen 80;
    server_name _;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name _;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;

    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    client_max_body_size 10m;

    # Rate-limited auth endpoints
    location /api/auth/ {
        limit_req zone=auth burst=10 nodelay;
        proxy_pass http://web:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Dynamic static files - proxy to Flask
    location ~ ^/static/(style\.css|libs/bipes\.umd\.js|page/.*/toolbox\.umd\.js|page/blocks/blocks\.umd\.js|page/blocks/pythonic\.umd\.js)$ {
        proxy_pass http://web:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Serve regular static files directly from nginx
    location /static/ {
        alias /usr/share/nginx/html/static/;
        expires 1h;
        add_header Cache-Control "public, must-revalidate";
        access_log off;
    }

    # IDE page - disable caching
    location = /ide {
        proxy_pass http://web:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0" always;
        add_header Pragma "no-cache" always;
        expires -1;
    }

    # Login/register pages - disable caching
    location ~ ^/(login|register)$ {
        proxy_pass http://web:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        add_header Cache-Control "no-store, no-cache, must-revalidate" always;
        expires -1;
    }

    # Proxy everything else to Flask
    location / {
        proxy_pass http://web:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # WebSocket support for MQTT
    location /mqtt {
        proxy_pass http://web:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
CONF

# Init DB SQL (for full auth mode)
cat > config/init-db.sql << 'SQL'
CREATE TABLE IF NOT EXISTS teachers (
  teacher_id SERIAL PRIMARY KEY,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  created_at NUMERIC(16,6) NOT NULL DEFAULT(EXTRACT(EPOCH FROM CURRENT_TIMESTAMP::TIMESTAMP WITH TIME ZONE)::NUMERIC(16,6)),
  last_login NUMERIC(16,6),
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS students (
  student_id SERIAL PRIMARY KEY,
  student_name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  initial_password TEXT,
  password_changed BOOLEAN DEFAULT FALSE,
  created_at NUMERIC(16,6) NOT NULL DEFAULT(EXTRACT(EPOCH FROM CURRENT_TIMESTAMP::TIMESTAMP WITH TIME ZONE)::NUMERIC(16,6)),
  created_by_teacher_id INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  FOREIGN KEY (created_by_teacher_id) REFERENCES teachers(teacher_id)
);

CREATE TABLE IF NOT EXISTS classes (
  class_id SERIAL PRIMARY KEY,
  class_name VARCHAR(100) NOT NULL,
  class_code VARCHAR(8) UNIQUE NOT NULL,
  teacher_id INTEGER NOT NULL,
  description TEXT,
  created_at NUMERIC(16,6) NOT NULL DEFAULT(EXTRACT(EPOCH FROM CURRENT_TIMESTAMP::TIMESTAMP WITH TIME ZONE)::NUMERIC(16,6)),
  is_active BOOLEAN DEFAULT TRUE,
  FOREIGN KEY (teacher_id) REFERENCES teachers(teacher_id)
);

CREATE TABLE IF NOT EXISTS enrollments (
  enrollment_id SERIAL PRIMARY KEY,
  class_id INTEGER NOT NULL,
  student_id INTEGER NOT NULL,
  enrolled_at NUMERIC(16,6) NOT NULL DEFAULT(EXTRACT(EPOCH FROM CURRENT_TIMESTAMP::TIMESTAMP WITH TIME ZONE)::NUMERIC(16,6)),
  is_active BOOLEAN DEFAULT TRUE,
  FOREIGN KEY (class_id) REFERENCES classes(class_id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
  UNIQUE(class_id, student_id)
);

CREATE TABLE IF NOT EXISTS projects (
  uid VARCHAR(32) PRIMARY KEY,
  author VARCHAR(100),
  name VARCHAR(200) NOT NULL,
  data TEXT,
  last_edited NUMERIC(16,6) NOT NULL DEFAULT(EXTRACT(EPOCH FROM CURRENT_TIMESTAMP::TIMESTAMP WITH TIME ZONE)::NUMERIC(16,6)),
  created_at NUMERIC(16,6) NOT NULL DEFAULT(EXTRACT(EPOCH FROM CURRENT_TIMESTAMP::TIMESTAMP WITH TIME ZONE)::NUMERIC(16,6))
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='student_id') THEN
        ALTER TABLE projects ADD COLUMN student_id INTEGER REFERENCES students(student_id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='teacher_id') THEN
        ALTER TABLE projects ADD COLUMN teacher_id INTEGER REFERENCES teachers(teacher_id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='assigned_class_id') THEN
        ALTER TABLE projects ADD COLUMN assigned_class_id INTEGER REFERENCES classes(class_id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_students_name ON students(student_name);
CREATE INDEX IF NOT EXISTS idx_students_email ON students(email);
CREATE INDEX IF NOT EXISTS idx_classes_code ON classes(class_code);
CREATE INDEX IF NOT EXISTS idx_classes_teacher ON classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_class ON enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_projects_student ON projects(student_id);
CREATE INDEX IF NOT EXISTS idx_projects_teacher ON projects(teacher_id);
CREATE INDEX IF NOT EXISTS idx_projects_assigned_class ON projects(assigned_class_id);
SQL

echo "[3/5] Creating Mosquitto password file..."
if [ ! -f config/mosquitto_passwd ]; then
    # Generate a random password if MOSQUITTO_PASSWORD not set
    MQTT_PASS=${MOSQUITTO_PASSWORD:-$(openssl rand -base64 12)}
    # Create password file using mosquitto container
    docker run --rm -v "$(pwd)/config:/tmp/config" eclipse-mosquitto:2.0 \
        mosquitto_passwd -b -c /tmp/config/mosquitto_passwd bipes "$MQTT_PASS"
    echo "   MQTT password: $MQTT_PASS (save this for your .env file)"
else
    echo "   mosquitto_passwd already exists, skipping"
fi

echo "[4/5] Generating SSL certificates..."
if [ ! -f ssl/cert.pem ]; then
    mkdir -p ssl
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout ssl/key.pem \
        -out ssl/cert.pem \
        -subj "/C=DK/ST=Denmark/L=Copenhagen/O=BIPES/OU=Development/CN=localhost" 2>/dev/null
    chmod 600 ssl/key.pem
    chmod 644 ssl/cert.pem
    echo "   Self-signed SSL certificates generated"
    echo "   For production, replace ssl/cert.pem and ssl/key.pem with real certificates"
else
    echo "   SSL certificates already exist, skipping"
fi

echo "[5/5] Creating .env file..."
if [ ! -f .env ]; then
    FLASK_SECRET=$(openssl rand -base64 32)
    cat > .env << EOF
# BIPES Configuration
# Auth Mode: "full" (teacher+student+guest with login) or "guest" (guest-only, no login)
# Full mode:  docker compose --profile auth up -d
# Guest mode: docker compose up -d
AUTH_MODE=guest

# Flask
FLASK_SECRET_KEY=$FLASK_SECRET

# PostgreSQL (only needed in full auth mode)
POSTGRES_DB=bipes
POSTGRES_USER=bipes_user
POSTGRES_PASSWORD=$(openssl rand -base64 16)

# Mosquitto MQTT
MOSQUITTO_PASSWORD=${MQTT_PASS:-changeme}
EOF
    echo "   .env file created with random secrets"
else
    echo "   .env already exists, skipping"
fi

echo ""
echo "========================================="
echo "  Setup complete!"
echo "========================================="
echo ""
echo "Directory structure:"
echo "  $(pwd)/"
echo "  ├── .env                  (your configuration)"
echo "  ├── docker-compose.yml    (deployment config)"
echo "  ├── config/"
echo "  │   ├── nginx.conf"
echo "  │   ├── mosquitto.conf"
echo "  │   ├── mosquitto_passwd"
echo "  │   └── init-db.sql"
echo "  └── ssl/"
echo "      ├── cert.pem"
echo "      └── key.pem"
echo ""
echo "Next steps:"
echo "  1. Edit .env to set AUTH_MODE (guest or full)"
echo "  2. Start BIPES:"
echo "     Guest mode:  docker compose up -d"
echo "     Full mode:   docker compose --profile auth up -d"
echo ""
echo "  3. Open https://localhost in your browser"
echo ""
