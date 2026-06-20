# BIPES — Block based Integrated Platform for Embedded Systems

A web-based visual programming IDE for embedded devices. Students and teachers write MicroPython programs using drag-and-drop Blockly blocks, connect to physical hardware over MQTT, and run ML/Vision pipelines — all from the browser.

---

## System Structure

```
Internet
    │
    ▼
┌─────────────┐
│   nginx     │  Ports 80 (→ HTTPS) and 443
│  (HTTPS)    │  Serves /static/* directly from disk
└──────┬──────┘  Proxies everything else to Flask
       │
       ▼
┌─────────────┐
│    Flask    │  Port 5000 (internal)
│  Gunicorn   │  Application logic, API, dynamic content
└──┬──────┬───┘
   │      │
   ▼      ▼
PostgreSQL  Mosquitto
 (database)  (MQTT broker)
```

All four containers share a private bridge network. Only nginx is exposed to the host.

### Key directories

| Path | Purpose |
|---|---|
| `app.py` | Flask entry point — routes, startup, dynamic file generation |
| `server/block_dsl/` | Block DSL pipeline (textX grammar → Blockly JS artefacts) |
| `server/common/` | Auth utilities, API Blueprint, MQTT integration |
| `server/postgresql/` | PostgreSQL query implementations |
| `server/sqlite/` | SQLite fallback (development only) |
| `static/page/` | Frontend page modules (blocks, dashboard, device, ml, vision, …) |
| `static/base/` | Core JS framework (channel, dataflow, navigation, dom) |
| `templates/` | Jinja2 HTML templates |
| `docker/` | Container configuration (nginx, Gunicorn, Mosquitto, Dockerfile) |
| `Information/` | Project documentation |

### User types

| Type | Access |
|---|---|
| Guest | IDE only — projects saved in browser localStorage |
| Student | IDE + their projects — created by a teacher |
| Teacher | IDE + class management + student creation — accounts created server-side (see [First-time setup](#3-first-time-setup--create-a-teacher)) |

---

## Development

### First run

```bash
make
```

Installs dependencies, fetches JavaScript libraries, and starts a dev server on port 5001.

```
http://127.0.0.1:5001/ide
```

Language variants: `ide-da` (Danish), `ide-de` (German), `ide-en` (English), etc.

### Subsequent runs

```bash
make run
```

Flask serves everything directly — no nginx, no Gunicorn. Uses PostgreSQL by default (required for teacher/student/class auth); pass `database=sqlite AUTH_MODE=guest` for the guest-only IDE without a database server.

---

## Production Deployment

### Prerequisites

- Docker and Docker Compose
- Ports 80 and 443 free (HTTP/HTTPS)
- Port 8883 free when physical devices use MQTT over TLS

### 1. Configure environment

```bash
cp .env.example .env
nano .env
```

Set these values:

```env
FLASK_SECRET_KEY=<random-secret-at-least-32-chars>
PASSWORD_PEPPER=<random-pepper-string>
POSTGRES_PASSWORD=<strong-database-password>
MOSQUITTO_PASSWORD=<mqtt-bridge-password>
MOSQUITTO_DYNSEC_ADMIN_PASSWORD=<mqtt-admin-password>
```

### 2. Deploy

For an Ubuntu VM with a public domain:

```bash
sudo ./deploy.sh --domain bipes.example.com
```

This installs Docker when needed, creates secure secrets, obtains and renews
Let's Encrypt certificates, configures UFW, enables a small swap file, schedules
backups, applies the 1-vCPU/2-GB production limits, and starts the stack.
Generated secrets are 256-bit unpadded Base32 values, including the teacher
registration code printed after deployment.

Unsafe `/api` requests are protected with a signed double-submit CSRF token.
The server issues a `SameSite=Strict` token cookie and the frontend adds the
matching `X-CSRF-Token` header to same-origin POST, PUT, PATCH, and DELETE calls.

For local production-mode testing with the existing `.env`:

```bash
make deploy-prod
```

See [Webdock VM deployment](docs/deploy/webdock-vm.md) for DNS, first deployment,
updates, restore testing, and disk maintenance.

### 3. First-time setup — create a teacher

There is **no self-registration**. Teacher accounts are created server-side with a small
script run inside the web container:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml \
  exec web python scripts/add_teacher.py "teacher@school.dk" "Full Name"
```

It prints the email and a generated initial password (pass a third argument to set your
own instead). Hand those to the teacher — they are **forced to change the password on
first login** (the same `/setup` flow students use). Run the command again for each
additional teacher.

> Both teachers and students can change their password any time afterwards via the
> **Change password** link in the IDE nav (it routes through `/setup`).

### Management commands

```bash
make deploy-prod       # Build and start
make deploy-restart    # Restart without rebuild
make deploy-down       # Stop and remove containers
make deploy-logs       # Tail logs from all containers
./docker/backup-db.sh  # Back up PostgreSQL and MQTT security state
```

### SSL — Let's Encrypt (public domain)

```bash
sudo certbot certonly --standalone -d yourdomain.com

sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem docker/ssl/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem  docker/ssl/key.pem
sudo chmod 644 docker/ssl/cert.pem
sudo chmod 600 docker/ssl/key.pem

make deploy-restart
```

### Development vs Production

| Feature | `make run` | `make deploy-prod` |
|---|---|---|
| Web server | Flask dev server | Gunicorn |
| Database | PostgreSQL (default) | PostgreSQL |
| HTTPS | No | Yes (nginx) |
| Static files | Flask | nginx (fast path) |
| Auto-reload | Yes | No |

> **Database:** the teacher/student/class/auth schema is PostgreSQL-only (`docker/init-db.sql`), so full auth mode requires PostgreSQL — this is now the default for `make run`. SQLite has no auth schema and is only supported for the guest-only IDE: `make run database=sqlite AUTH_MODE=guest`. Starting full auth mode on SQLite fails fast with a clear error.

---

## Documentation

Full documentation lives in [`Information/`](Information/):

| Document | Contents |
|---|---|
| [`system_overview.md`](Information/system_overview.md) | Architecture, request flow, auth, database, frontend, Block DSL, MQTT, ML pipeline |
| [`blockdef_dsl_reference.md`](Information/blockdef_dsl_reference.md) | `.blockdef` grammar, metamodel, syntax guide, implementation walkthrough |
