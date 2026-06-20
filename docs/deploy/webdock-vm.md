# Webdock VM deployment

This deployment profile targets an Ubuntu VM with 1 vCPU, 2 GB RAM, a 15 GB
SSD, and a public IPv4 address.

## Before connecting

1. Create an Ubuntu LTS server in Webdock.
2. Create an `A` record such as `bipes.example.com` pointing to the VM IPv4.
3. Wait until the record resolves publicly.
4. Add an SSH public key in Webdock and confirm you can log in.
5. Keep a Webdock snapshot or another off-VM backup. Backups stored on the VM
   do not protect against deletion or disk failure.

The public ports are:

- `22/tcp` for SSH
- `80/tcp` for redirects and Let's Encrypt validation
- `443/tcp` for the application and browser MQTT WebSockets
- `8883/tcp` for physical-device MQTT over TLS

Do not expose PostgreSQL `5432`, internal MQTT `1883`, WebSockets `9001`, or
Gunicorn `5000`.

## First deployment

Install Git, clone the repository, and run the deployment script:

```bash
sudo apt-get update
sudo apt-get install -y git
sudo mkdir -p /opt/bipes
sudo chown "$USER":"$USER" /opt/bipes
git clone YOUR_REPOSITORY_URL /opt/bipes
cd /opt/bipes
sudo ./deploy.sh --domain bipes.example.com
```

The script:

- installs Docker and the Compose plugin;
- creates a 1 GB swap file if the VM has no swap;
- generates `/opt/bipes/.env` with restrictive permissions and random secrets;
- obtains a Let's Encrypt certificate and installs a renewal hook;
- opens only SSH, HTTP, HTTPS, and MQTT TLS in UFW;
- starts the explicit production Compose stack;
- schedules daily database/MQTT backups and weekly Docker cleanup.

After deployment, the script prints the randomly generated teacher registration
code. You can retrieve it again with:

```bash
sudo grep '^TEACHER_REGISTRATION_CODE=' /opt/bipes/.env
```

Visit `https://bipes.example.com/register` and create the first teacher using
that code. Clear `TEACHER_REGISTRATION_CODE` and restart `web` if registration
should close after the first account.

All generated secrets use 256 random bits encoded as unpadded Base32. This keeps
the values safe for unquoted `.env` assignments while avoiding shell-sensitive
Base64 characters.

The application also enforces CSRF tokens on every unsafe `/api` request. If a
custom client calls the API directly, first make a same-origin GET request,
retain the `bipes_csrf` cookie, and send the same value in the
`X-CSRF-Token` header.

## Resource profile

`docker-compose.prod.yml` limits the containers to leave memory for Ubuntu and
Docker:

| Service | Memory limit |
|---|---:|
| Web/Gunicorn | 768 MB |
| PostgreSQL | 384 MB |
| Mosquitto | 192 MB |
| Nginx | 128 MB |
| Mosquitto initializer | 96 MB |

Gunicorn uses one process and four threads. Increase these only after increasing
VM memory or CPU.

## Updating

Back up first, pull the intended revision, then rebuild:

```bash
cd /opt/bipes
sudo ./docker/backup-db.sh
git pull --ff-only
sudo docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build --remove-orphans
sudo docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
```

Avoid plain `docker compose up` on the VM because it automatically loads
`docker-compose.override.yml`, which is development-only.

## Backups

Manual backup:

```bash
cd /opt/bipes
sudo ./docker/backup-db.sh
sudo ls -lh backups/
```

The backup contains:

- a compressed PostgreSQL dump;
- Mosquitto's dynamic-security state, including provisioned MQTT clients.

Daily local backups are retained for seven days by default. Copy them off the VM
or combine them with scheduled Webdock snapshots.

Test that a database dump is readable:

```bash
gzip -t backups/bipes_YYYYMMDD_HHMMSS.sql.gz
```

Before a real restore, stop writes and take a VM snapshot. Restore into a test
database first whenever possible.

## Operations

```bash
cd /opt/bipes

# Status and resource use
sudo docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
sudo docker stats --no-stream
free -h
df -h /

# Logs
sudo docker compose -f docker-compose.yml -f docker-compose.prod.yml logs --tail=200

# Validate certificate renewal
sudo certbot renew --dry-run

# Restart without rebuilding
sudo docker compose -f docker-compose.yml -f docker-compose.prod.yml restart
```

Keep at least 2 GB free on the 15 GB SSD. Never run `docker system prune
--volumes`; the named volumes contain the database and MQTT state.
