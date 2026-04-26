# BIPES Production Deployment

This guide explains how to deploy BIPES in production using Docker Compose with nginx, PostgreSQL, and Mosquitto MQTT.

## Architecture

```
                 ┌──────────────┐
Internet ────────┤ nginx (HTTPS)│
                 └───────┬──────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
    ┌────▼────┐    ┌─────▼─────┐  ┌─────▼──────┐
    │  Flask  │    │PostgreSQL │  │ Mosquitto  │
    │(Gunicorn│    │           │  │   (MQTT)   │
    └─────────┘    └───────────┘  └────────────┘
```

**Hybrid Setup (Option C):**
- **nginx**: Serves static files (`/static/*`) directly and proxies dynamic requests to Flask
- **Flask (Gunicorn)**: Handles dynamic content, API endpoints, authentication
- **PostgreSQL**: Database for user data, projects, classes
- **Mosquitto**: MQTT broker for device communication

## Prerequisites

- Docker and Docker Compose installed
- Port 80 and 443 available
- Port 1883 and 9001 available (for MQTT)

## Quick Start

### 1. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit with your values
nano .env
```

Update these values in `.env`:
```env
FLASK_SECRET_KEY=your-random-secret-key-here
POSTGRES_PASSWORD=your-postgres-password
MOSQUITTO_PASSWORD=your-server-bridge-mqtt-password
MOSQUITTO_DYNSEC_ADMIN_PASSWORD=your-dynamic-security-admin-password
```

### 2. Deploy

```bash
# Deploy everything
make deploy-prod
```

This will:
1. Check for `.env` file
2. Generate self-signed SSL certificates (if not present)
3. Build and start all containers
4. Show container status

### 3. Access BIPES

- **HTTPS**: https://localhost (or your domain)
- **HTTP**: http://localhost (redirects to HTTPS)

## SSL Certificates

### Development (Self-Signed)

The deployment automatically generates self-signed certificates:
```bash
docker/ssl/cert.pem
docker/ssl/key.pem
```

⚠️ **Browsers will show security warnings for self-signed certificates**

### Production (Let's Encrypt)

For production with a real domain:

```bash
# Install certbot
sudo apt install certbot

# Generate certificates
sudo certbot certonly --standalone -d yourdomain.com

# Copy to docker/ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem docker/ssl/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem docker/ssl/key.pem
sudo chmod 644 docker/ssl/cert.pem
sudo chmod 600 docker/ssl/key.pem

# Restart nginx
make deploy-restart
```

## Management Commands

```bash
# View logs
make deploy-logs

# Stop all containers
make deploy-down

# Restart containers
make deploy-restart

# Rebuild and restart
make deploy-prod
```

## Container Details

### Services

- **postgres**: PostgreSQL 15 database
  - Container: `postgres`
  - Internal port: 5432
  - Data: `postgres_data` volume

- **mosquitto**: Eclipse Mosquitto 2.0 MQTT broker
  - Container: `broker`
  - Ports: 1883 (MQTT), 9001 (WebSocket)
  - Config: `docker/mosquitto.conf`

- **web**: Flask application with Gunicorn
  - Container: `bipes_web`
  - Internal port: 5000
  - Logs: `web_logs` volume

- **nginx**: Nginx reverse proxy
  - Container: `bipes_nginx`
  - Ports: 80 (HTTP), 443 (HTTPS)
  - Config: `docker/nginx.conf`

### Docker Commands

```bash
# View all containers
docker-compose -f docker-compose.prod.yml ps

# View specific logs
docker logs bipes_nginx
docker logs bipes_web
docker logs postgres
docker logs broker

# Access container shell
docker exec -it bipes_web /bin/bash
docker exec -it postgres psql -U tsdbuser -d bipes

# Inspect network
docker network inspect bipes_network
```

## Configuration Files

### docker-compose.prod.yml
Main orchestration file defining all services

### docker/nginx.conf
Nginx configuration:
- HTTP → HTTPS redirect
- Static file serving from `/usr/share/nginx/html/static/`
- Proxy to Flask for dynamic content
- WebSocket support for MQTT

### docker/gunicorn_config.py
Gunicorn settings:
- Workers: `(CPU cores * 2) + 1`
- Bind: `0.0.0.0:5000`
- Logging to `/app/logs/`

### docker/mosquitto.conf
Mosquitto MQTT configuration:
- MQTT port: 1883
- WebSocket port: 9001
- Anonymous access: disabled
- Authentication/authorization: Mosquitto Dynamic Security plugin
- Runtime security state: `dynamic-security.json` inside the `mosquitto_data` Docker volume

## Troubleshooting

### Port conflicts
```bash
# Check what's using ports
sudo lsof -i :80
sudo lsof -i :443
sudo lsof -i :1883

# Stop conflicting services
sudo systemctl stop nginx
sudo systemctl stop apache2
```

### SSL certificate errors
```bash
# Regenerate certificates
rm -rf docker/ssl
./docker/generate-ssl.sh
make deploy-restart
```

### Container won't start
```bash
# Check logs
make deploy-logs

# Check specific container
docker logs bipes_web
docker logs postgres

# Restart specific service
docker-compose -f docker-compose.prod.yml restart web
```

### Database connection issues
```bash
# Verify PostgreSQL is ready
docker exec -it postgres psql -U tsdbuser -d bipes -c "SELECT 1;"

# Check environment variables
docker exec -it bipes_web env | grep POSTGRES
```

## Security Considerations

**For Production:**

1. **Change default passwords and secrets** in `.env`, including `FLASK_SECRET_KEY`, `PASSWORD_PEPPER`, `POSTGRES_PASSWORD`, `MOSQUITTO_PASSWORD`, and `MOSQUITTO_DYNSEC_ADMIN_PASSWORD`
2. **Use real SSL certificates** (Let's Encrypt)
3. **Use Mosquitto Dynamic Security**:
   ```bash
   # The production config should include:
   allow_anonymous false
   per_listener_settings false
   plugin /usr/lib/mosquitto_dynamic_security.so
   plugin_opt_config_file /mosquitto/data/dynamic-security.json
   ```
4. **Keep broker credentials out of the browser**. The Flask app creates scoped device clients through Dynamic Security, and the browser dashboard uses the authenticated server bridge.
5. **Set proper firewall rules**. Only expose TCP MQTT if devices must connect directly; otherwise keep MQTT internal and proxy only what is needed.
6. **Enable PostgreSQL password** (already configured in .env)
7. **Review nginx security headers**

## Monitoring

### Health Checks

```bash
# Check all services
docker-compose -f docker-compose.prod.yml ps

# Test HTTPS
curl -k https://localhost

# Test HTTP redirect
curl -I http://localhost

# Test MQTT with a scoped device credential from /api/devices
mosquitto_sub -h localhost -p 1883 -u '<device-user>' -P '<device-password>' -t '<session>/devices/<device-id>/commands/#'
```

### Logs

```bash
# All logs
make deploy-logs

# nginx access/error logs
docker exec bipes_nginx tail -f /var/log/nginx/access.log
docker exec bipes_nginx tail -f /var/log/nginx/error.log

# Application logs
docker exec bipes_web tail -f /app/logs/access.log
docker exec bipes_web tail -f /app/logs/error.log
```

## Backup

### Database Backup

```bash
# Backup
docker exec postgres pg_dump -U tsdbuser bipes > backup_$(date +%Y%m%d).sql

# Restore
cat backup_20231210.sql | docker exec -i postgres psql -U tsdbuser bipes
```

### Volume Backup

```bash
# Backup all volumes
docker run --rm -v postgres_data:/data -v $(pwd):/backup \
  ubuntu tar czf /backup/postgres_backup.tar.gz /data
```

## Updating BIPES

```bash
# Pull latest code
git pull

# Rebuild and restart
make deploy-down
make deploy-prod
```

## Development vs Production

| Feature | Development (`make run`) | Production (`make deploy-prod`) |
|---------|------------------------|--------------------------------|
| Server | Flask dev server | Gunicorn |
| Database | SQLite | PostgreSQL |
| HTTPS | No | Yes (nginx) |
| Static files | Flask serves | nginx serves |
| Reload | Auto | Manual restart |
| Logging | Console | Files |

## Support

For issues or questions:
- Check logs: `make deploy-logs`
- Review this documentation
- Check Docker status: `docker ps -a`
