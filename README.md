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
| Teacher | IDE + class management + student creation |

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

Flask serves everything directly — no nginx, no Gunicorn, SQLite database.

---

## Production Deployment

### Prerequisites

- Docker and Docker Compose
- Ports 80 and 443 free (HTTP/HTTPS)
- Ports 1883 and 9001 free (MQTT and WebSocket)

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

```bash
make deploy-prod
```

Checks for `.env`, generates self-signed SSL certificates if absent, builds all containers, and starts the stack.

### 3. First-time setup

Navigate to `https://localhost`. The app detects an empty database and redirects to `/setup` to create the first teacher account.

### Management commands

```bash
make deploy-prod       # Build and start
make deploy-restart    # Restart without rebuild
make deploy-down       # Stop and remove containers
make deploy-logs       # Tail logs from all containers
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
| Database | SQLite | PostgreSQL |
| HTTPS | No | Yes (nginx) |
| Static files | Flask | nginx (fast path) |
| Auto-reload | Yes | No |

---

## Serverless Build

```bash
make release
```

Generates `BIPES.zip` containing pre-rendered HTML files and all static assets. Runs without a server — no authentication or class management.

---

## Documentation

Full documentation lives in [`Information/`](Information/):

| Document | Contents |
|---|---|
| [`system_overview.md`](Information/system_overview.md) | Architecture, request flow, auth, database, frontend, Block DSL, MQTT, ML pipeline |
| [`blockdef_dsl_reference.md`](Information/blockdef_dsl_reference.md) | `.blockdef` grammar, metamodel, syntax guide, implementation walkthrough |
