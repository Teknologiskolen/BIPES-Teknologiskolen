# BIPES Authentication System - Backend Deployment Guide

## Overview
This guide will help you deploy the BIPES authentication system on your server with:
- **Nginx** (reverse proxy)
- **PostgreSQL** (database)
- **Mosquitto** (MQTT broker)
- **Flask/Gunicorn** (Python application server)

---

## Prerequisites

Your server should have:
- Ubuntu/Debian Linux
- PostgreSQL installed and running
- Nginx installed and running
- Mosquitto installed and running
- Python 3.8+
- pip and virtualenv

---

## Step 1: PostgreSQL Database Setup

### 1.1 Create Database and User

```bash
# Switch to postgres user
sudo -u postgres psql

# In PostgreSQL prompt:
CREATE DATABASE bipes_api;
CREATE DATABASE bipes_mqtt;
CREATE USER bipes_user WITH PASSWORD 'your_secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE bipes_api TO bipes_user;
GRANT ALL PRIVILEGES ON DATABASE bipes_mqtt TO bipes_user;
\q
```

### 1.2 Configure BIPES Database Connection

Edit `server/conf.ini`:

```ini
[flask]
password = your_flask_secret_key_here

[postgresql]
host = localhost
database_api = bipes_api
database_mqtt = bipes_mqtt
user = bipes_user
password = your_secure_password_here

[mosquitto]
host = localhost
password = your_mosquitto_password_here
```

Generate a secure Flask secret key:
```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

### 1.3 Initialize Authentication Tables

Run the authentication schema setup:

```bash
cd /path/to/BIPES-Teknologiskolen
python3 -c "from server.postgresql import auth; auth.make()"
```

This will create the following tables:
- `teachers` - Teacher accounts
- `students` - Student accounts
- `classes` - Classes created by teachers
- `enrollments` - Student-to-class relationships
- Modified `projects` table with authentication foreign keys

---

## Step 2: Python Dependencies

### 2.1 Create Virtual Environment

```bash
cd /path/to/BIPES-Teknologiskolen
python3 -m venv venv
source venv/bin/activate
```

### 2.2 Install Dependencies

```bash
pip install --upgrade pip
pip install Flask flask-mqtt paho-mqtt psycopg werkzeug gunicorn
```

Or use the Makefile:
```bash
make pip
```

---

## Step 3: Gunicorn Configuration

### 3.1 Create Gunicorn Config

Create `gunicorn_config.py`:

```python
# Gunicorn configuration file
import multiprocessing

# Server socket
bind = "127.0.0.1:5000"
backlog = 2048

# Worker processes
workers = multiprocessing.cpu_count() * 2 + 1
worker_class = 'sync'
worker_connections = 1000
timeout = 30
keepalive = 2

# Logging
accesslog = '/var/log/bipes/access.log'
errorlog = '/var/log/bipes/error.log'
loglevel = 'info'

# Process naming
proc_name = 'bipes'

# Server mechanics
daemon = False
pidfile = '/var/run/bipes/bipes.pid'
user = 'www-data'
group = 'www-data'
```

### 3.2 Create Log Directory

```bash
sudo mkdir -p /var/log/bipes
sudo mkdir -p /var/run/bipes
sudo chown -R www-data:www-data /var/log/bipes
sudo chown -R www-data:www-data /var/run/bipes
```

### 3.3 Create Systemd Service

Create `/etc/systemd/system/bipes.service`:

```ini
[Unit]
Description=BIPES Flask Application
After=network.target postgresql.service

[Service]
Type=notify
User=www-data
Group=www-data
WorkingDirectory=/path/to/BIPES-Teknologiskolen
Environment="PATH=/path/to/BIPES-Teknologiskolen/venv/bin"
ExecStart=/path/to/BIPES-Teknologiskolen/venv/bin/gunicorn \
    --config gunicorn_config.py \
    --bind 127.0.0.1:5000 \
    'app:create_app("postgresql")'

Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### 3.4 Enable and Start Service

```bash
sudo systemctl daemon-reload
sudo systemctl enable bipes
sudo systemctl start bipes
sudo systemctl status bipes
```

---

## Step 4: Nginx Configuration

### 4.1 Create Nginx Site Config

Create `/etc/nginx/sites-available/bipes`:

```nginx
# Upstream to Flask/Gunicorn
upstream bipes_backend {
    server 127.0.0.1:5000 fail_timeout=0;
}

# HTTP Server (redirect to HTTPS)
server {
    listen 80;
    server_name your-domain.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

# HTTPS Server
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL Certificate (use Let's Encrypt certbot)
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Max upload size
    client_max_body_size 10M;

    # Root and index
    root /path/to/BIPES-Teknologiskolen;

    # Proxy to Flask backend
    location / {
        proxy_pass http://bipes_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_redirect off;

        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Static files (served directly by Nginx)
    location /static {
        alias /path/to/BIPES-Teknologiskolen/static;
        expires 30d;
        access_log off;
    }

    # Favicon
    location /favicon.ico {
        alias /path/to/BIPES-Teknologiskolen/static/media/favicon.ico;
        access_log off;
    }

    # Logging
    access_log /var/log/nginx/bipes_access.log;
    error_log /var/log/nginx/bipes_error.log;
}
```

### 4.2 Enable Site

```bash
sudo ln -s /etc/nginx/sites-available/bipes /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 4.3 SSL Certificate (Optional but Recommended)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## Step 5: Update Flask for Production

### 5.1 Enable Secure Cookies

Edit `app.py` line 119:

```python
SESSION_COOKIE_SECURE=True,  # Change from False to True (requires HTTPS)
```

---

## Step 6: Testing

### 6.1 Test Database Connection

```python
from server.common import database as dbase
from flask import Flask

app = Flask(__name__)
app.config['DATABASE'] = 'postgresql'
app.config['POSTGRESQL_HOST'] = 'localhost'
app.config['POSTGRESQL_DATABASE_API'] = 'bipes_api'
app.config['POSTGRESQL_DATABASE_MQTT'] = 'bipes_mqtt'
app.config['POSTGRESQL_USER'] = 'bipes_user'
app.config['POSTGRESQL_PASSWORD'] = 'your_password'
app.config['API'] = 'api'
app.config['MQTT'] = 'mqtt'

with app.app_context():
    db = dbase.connect('API')
    result = db.execute("SELECT 1").fetchone()
    print("Database connection successful!" if result else "Failed")
    db.close()
```

### 6.2 Test Authentication Endpoints

```bash
# Test teacher registration
curl -X POST https://your-domain.com/api/auth/teacher/register \
  -H "Content-Type: application/json" \
  -d '{"full_name":"Test Teacher","email":"test@school.com","password":"test12345"}'

# Test teacher login
curl -X POST https://your-domain.com/api/auth/teacher/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@school.com","password":"test12345"}'
```

### 6.3 Access Landing Page

Visit: `https://your-domain.com/`

You should see the landing page with three options:
- Login as Teacher
- Login as Student
- Continue as Guest

---

## Step 7: Monitoring and Logs

### 7.1 View Application Logs

```bash
# Systemd logs
sudo journalctl -u bipes -f

# Application logs
tail -f /var/log/bipes/error.log
tail -f /var/log/bipes/access.log

# Nginx logs
tail -f /var/log/nginx/bipes_error.log
tail -f /var/log/nginx/bipes_access.log
```

### 7.2 PostgreSQL Logs

```bash
sudo tail -f /var/log/postgresql/postgresql-*-main.log
```

---

## Step 8: Backup Strategy

### 8.1 Database Backup Script

Create `/usr/local/bin/backup-bipes-db.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/bipes"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup API database
pg_dump -U bipes_user bipes_api | gzip > $BACKUP_DIR/bipes_api_$DATE.sql.gz

# Backup MQTT database
pg_dump -U bipes_user bipes_mqtt | gzip > $BACKUP_DIR/bipes_mqtt_$DATE.sql.gz

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
```

```bash
sudo chmod +x /usr/local/bin/backup-bipes-db.sh
```

### 8.2 Cron Job for Daily Backup

```bash
sudo crontab -e

# Add this line (backup at 2 AM daily):
0 2 * * * /usr/local/bin/backup-bipes-db.sh >> /var/log/bipes/backup.log 2>&1
```

---

## Troubleshooting

### Issue: Flask not connecting to PostgreSQL

**Check:**
1. PostgreSQL is running: `sudo systemctl status postgresql`
2. Database exists: `sudo -u postgres psql -l`
3. User has permissions: `sudo -u postgres psql -d bipes_api -c "\du"`
4. `server/conf.ini` has correct credentials

### Issue: 502 Bad Gateway

**Check:**
1. Gunicorn is running: `sudo systemctl status bipes`
2. Gunicorn listening on correct port: `sudo netstat -tulpn | grep 5000`
3. Check Gunicorn logs: `sudo journalctl -u bipes -n 50`

### Issue: Sessions not persisting

**Check:**
1. Flask SECRET_KEY is set in `server/conf.ini`
2. Cookies are being sent (check browser dev tools)
3. HTTPS is enabled if SESSION_COOKIE_SECURE=True

### Issue: CORS errors

The authentication API doesn't need CORS since it's same-origin. If you see CORS errors, ensure Nginx is properly proxying requests.

---

## Next Steps

1. ✅ **Backend Setup Complete**
2. **Create First Teacher Account**: Visit `/register`
3. **Teacher Creates Class**: Login and create a class
4. **Add Students**: Teacher adds students to class
5. **Students Login**: Students use class code + name + password
6. **Test Project Storage**: Create and save projects

---

## Summary of What We Built

### Backend Files Created:
- `server/postgresql/auth.py` - Database schema
- `server/common/auth.py` - Authentication logic
- `server/common/auth_api.py` - API endpoints (25+ endpoints)
- `app.py` - Flask routes (modified)

### Frontend Files Created:
- `templates/landing.html` - Landing page
- `templates/login.html` - Login page
- `templates/register.html` - Teacher registration
- `templates/setup.html` - Student first-time setup
- `static/auth/style.css` - Authentication styles
- `static/auth/login.js` - Login logic
- `static/auth/register.js` - Registration logic
- `static/auth/setup.js` - Setup logic

### API Endpoints Available:
- `POST /api/auth/teacher/register`
- `POST /api/auth/teacher/login`
- `POST /api/auth/student/login/class`
- `POST /api/auth/student/login/email`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/classes/create`
- `GET /api/classes/my-classes`
- And 17 more endpoints for class/student/project management!

---

## Questions?

If you encounter issues, check:
1. System logs: `sudo journalctl -u bipes`
2. Application logs: `/var/log/bipes/error.log`
3. PostgreSQL logs: `/var/log/postgresql/`
4. Nginx logs: `/var/log/nginx/bipes_error.log`
