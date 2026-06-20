# System Overview

BIPES (Block based Integrated Platform for Embedded Systems) is a web-based visual programming IDE for embedded devices. It allows students and teachers to write MicroPython programs using drag-and-drop Blockly blocks, connect to physical hardware over MQTT, and run ML/Vision pipelines — all from the browser.

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla JavaScript (ES6 modules) |
| Visual programming | Google Blockly |
| Code editor | CodeMirror 6 |
| Backend | Python 3.11 + Flask |
| WSGI server | Gunicorn |
| Reverse proxy | nginx |
| Database (dev) | SQLite |
| Database (prod) | PostgreSQL 15 |
| Device communication | Eclipse Mosquitto 2.0 (MQTT) |
| Containerisation | Docker + Docker Compose |
| Block DSL | textX (Python meta-language) |

---

## Repository Structure

```
BIPES-Teknologiskolen/
├── app.py                              Main Flask application
├── server/
│   ├── block_dsl/                      Block definition DSL pipeline
│   │   ├── block_grammar.tx            textX grammar for .blockdef files
│   │   ├── blockdef_parser.py          .blockdef → BlockSpec pipeline
│   │   ├── builder.py                  Python-annotation → BlockSpec pipeline
│   │   ├── emitters.py                 BlockSpec → JS/MD artefacts
│   │   ├── integrate.py                Target registry and entry point
│   │   └── pipeline.py                 Python-annotation pipeline orchestrator
│   ├── common/
│   │   ├── auth.py                     Authentication utilities
│   │   ├── auth_api.py                 Auth/class management API Blueprint
│   │   └── mqtt.py                     MQTT broker integration
│   ├── postgresql/                     PostgreSQL query implementations
│   ├── sqlite/                         SQLite query implementations (dev fallback)
│   └── release.py                      Lightweight app factory for serverless builds
├── static/
│   ├── base/                           Core framework JS modules
│   ├── page/                           Page-specific JS modules
│   │   ├── blocks/                     Blockly IDE page
│   │   │   ├── blocks/                 Block visual definitions (*_dsl.js)
│   │   │   ├── pythonic/               Code generators (*_dsl.js)
│   │   │   ├── libraries/              MicroPython library files + .blockdef files
│   │   │   └── definitions/            ← see Templates below
│   │   ├── dashboard/                  MQTT dashboard page
│   │   ├── device/                     Device management page
│   │   ├── ml/                         ML pipeline page
│   │   ├── vision/                     Vision pipeline page
│   │   ├── notification/               Notifications and news
│   │   └── project/                    Project management
│   ├── auth/                           Authentication UI
│   └── style/                          Global CSS
├── templates/
│   ├── ide.html                        Main IDE shell
│   ├── landing.html                    Landing / login page
│   ├── classes.html                    Teacher class management
│   └── page/blocks/
│       ├── definitions/                Blockly toolbox XML fragments (*.md)
│       └── devices/                    Device pinout definitions (*.md)
├── docker/                             Production container configuration
├── Information/                        Project documentation (this folder)
└── generated/                          Auto-generated artefacts
```

---

## Request Flow

### Static file (fast path)

```
Browser → GET /static/libs/xterm.umd.js
    nginx:  matches /static/ → reads from disk → returns (no Flask involved)
    Cache-Control: 1 year
    Response time: ~5 ms
```

### Dynamic page

```
Browser → GET /ide-en
    nginx:  no /static/ match → proxy_pass to web:5000
    Gunicorn: assigns a worker
    Flask:  route /ide-<lang> matches
            scans static/page/*/main.js for page modules
            renders ide.html
    Response time: ~100–200 ms
```

### API call

```
Browser → POST /api/auth/login  {email, password}
    nginx → Gunicorn → Flask
    Flask: Blueprint /api/ handles it
           queries PostgreSQL
           creates session cookie
           returns JSON
    Response time: ~50–100 ms
```

---

## Application Layer — app.py

`app.py` is the Flask entry point. It:

- Initialises the app with SQLite (dev) or PostgreSQL (prod) depending on the `DATABASE` config value
- Registers the `auth_api` Blueprint (`/api/` prefix)
- Runs `generate_default_artifacts()` at startup to regenerate Blockly block JS from `.blockdef` and annotated Python source files
- Serves dynamic routes:

| Route | Description |
|---|---|
| `/` | Landing page (redirects authenticated users) |
| `/ide`, `/ide-<lang>` | Main IDE (scans page modules dynamically) |
| `/classes` | Teacher class management (auth required) |
| `/login`, `/register`, `/setup` | Auth pages |
| `/static/style.css` | Concatenated CSS (generated at request time) |
| `/static/libs/bipes.umd.js` | Dynamic module import list (filtered by auth) |
| `/static/page/blocks/toolbox*` | Blockly toolbox XML (assembled from definition files) |

---

## Authentication

### User types

| Type | Access |
|---|---|
| **Guest** | IDE only (projects saved in browser localStorage) |
| **Student** | IDE + their own projects; created by a teacher |
| **Teacher** | IDE + class management + student creation |

### Session structure

Sessions are server-side Flask sessions, encrypted with `FLASK_SECRET_KEY`:

```python
session = {
    'user_id':        123,
    'user_type':      'teacher',      # 'teacher' | 'student'
    'email':          'user@school.dk',
    'full_name':      'Jane Doe',
    'password_changed': True          # students only
}
```

Sessions use `HttpOnly`, `Secure`, and `SameSite=Lax` cookie flags.

### Auth flows

**First deployment** — `/setup` creates the first teacher account. Subsequent teachers use `/register`.

**Login** — password verified with PBKDF2-SHA256 (Werkzeug). On success a session is created and the user is redirected: teachers → `/classes`, students → `/ide`.

**Student creation** — teachers create students from the class management UI. The system generates an initial password; students must change it on first login.

### API endpoints (`/api/`)

| Method | Path | Action |
|---|---|---|
| `POST` | `/api/auth/setup` | First teacher setup |
| `POST` | `/api/auth/register` | Register teacher |
| `POST` | `/api/auth/login` | Login |
| `POST` | `/api/auth/logout` | Logout |
| `GET` | `/api/auth/me` | Current user info |
| `GET` | `/api/classes/my-classes` | Teacher's classes |
| `POST` | `/api/classes/create` | Create class |
| `GET` | `/api/classes/:id/students` | List students |
| `POST` | `/api/classes/:id/students` | Add student |
| `DELETE` | `/api/classes/:id` | Delete class |
| `DELETE` | `/api/classes/:id/students/:sid` | Remove student |

---

## Database

The app selects its database backend from the `DATABASE` config key:

| Mode | Backend | When |
|---|---|---|
| `sqlite` | `server/sqlite/` | Development (`make run`) |
| `postgresql` | `server/postgresql/` | Production (`make deploy-prod`) |

Both backends implement the same interface so the application code is unchanged.

### PostgreSQL schema (abbreviated)

Initialised from `docker/init-db.sql` on first container start:

- `teachers` — teacher accounts (id, full_name, email, password_hash, created_at, last_login)
- `students` — student accounts (id, student_name, initial_password, password_hash, password_changed, created_at, last_login)
- `classes` — class records (id, teacher_id, class_name, class_code, created_at)
- `class_students` — enrolment join table (class_id, student_id)

---

## Frontend Architecture

The frontend is a Single Page Application shell (`ide.html`) that dynamically loads ES6 modules.

### Page modules

Each page lives in `static/page/<name>/main.js`. Flask scans this directory at request time and injects the module list into the HTML. Active pages for this deployment:

| Page | Path | Purpose |
|---|---|---|
| blocks | `static/page/blocks/` | Blockly visual programming IDE |
| dashboard | `static/page/dashboard/` | MQTT dashboard with widgets |
| device | `static/page/device/` | Device connection and management |
| ml | `static/page/ml/` | Machine learning pipeline |
| vision | `static/page/vision/` | Computer vision pipeline |
| project | `static/page/project/` | Project save/load |
| notification | `static/page/notification/` | News and notifications |
| prompt | `static/page/prompt/` | AI prompt integration |
| architecture | `static/page/architecture/` | System architecture view |

### Core modules (`static/base/`)

| Module | Purpose |
|---|---|
| `channel.js` | MQTT channel abstraction |
| `dataflow.js` | Dataflow / pipeline engine |
| `dom.js` | DOM helpers |
| `navigation.js` | Page routing and navigation |

### Blockly integration (`static/page/blocks/`)

Block definitions and code generators are generated by the Block DSL pipeline (see below). They are loaded as plain JS files:

- `blocks/*_dsl.js` — visual block shapes (what the block looks like)
- `pythonic/*_dsl.js` — code generators (what Python the block emits)
- `definitions/*.md` — toolbox XML (where the block appears in the sidebar)

---

## Block DSL Pipeline

BIPES uses a custom textX-based DSL to define Blockly blocks from simple `.blockdef` description files, without touching the underlying Python library source.

Full reference: [blockdef_dsl_reference.md](blockdef_dsl_reference.md)

### Quick summary

A `.blockdef` file describes a library's API in a clean, language-agnostic syntax:

```
module ds1302
import "ds1302"
url "https://github.com/micropython/micropython"

category "DS1302 DSL" color=35 {
    class DS1302 as singleton named "ds1302" {
        block __init__ tooltip="Create a DS1302 RTC instance." {
            param clk_pin type=Number pin
        }
        block get_time kind=value tooltip="Read the current time tuple."
    }
}
```

The pipeline (`server/block_dsl/`) reads this file and emits:

1. **`blocks/*_dsl.js`** — Blockly block visual definitions
2. **`pythonic/*_dsl.js`** — JavaScript code generators
3. **`templates/page/blocks/definitions/*_dsl.md`** — Toolbox XML fragments

This runs automatically at Flask startup via `generate_default_artifacts()`.

### Supported library targets

| Library | Source | Pipeline |
|---|---|---|
| DS1302 RTC | `ds1302.blockdef` | textX (.blockdef) |
| DFPlayer audio | `dfplayer.py` (annotated) | Python annotations |
| ST7735S display | `st7735s.py` (annotated) | Python annotations |
| Sand table robot | `sand_table_robot.py` (annotated) | Python annotations |
| Robotics board | `PicoRobotics.py` (annotated) | Python annotations |

New libraries should use `.blockdef` files. The Python-annotation pipeline is kept for backward compatibility.

---

## MQTT / Device Communication

Devices connect to the Mosquitto broker over MQTT. The browser connects via WebSocket (port 9001 in production, proxied through nginx at `/mqtt`).

- The Flask app creates **scoped device credentials** through the Mosquitto Dynamic Security plugin
- Each device gets a limited credential that can only publish/subscribe to its own topic namespace
- The browser dashboard subscribes to device topics and receives sensor data in real time
- Code blocks generated from Blockly are sent to devices as MQTT messages

---

## ML / Vision Pipeline

The ML and Vision pages implement a node-graph pipeline with four stages:

1. **Source** — camera input, file upload, or device stream
2. **Train** — image classifier, pose detector, or audio classifier
3. **Test** — live inference preview
4. **Deploy** — export as Python code blocks or run client-assisted (browser infers, sends results to device via MQTT)

Each project can contain multiple independent pipelines, each with its own source, training settings, and deploy target.

---

## Serverless / Release Build

```bash
make release
```

Generates a static `BIPES.zip` containing pre-rendered HTML files (`ide-en.html`, `ide-de.html`, etc.) and all static assets. This version runs without a server — useful for offline demos or distribution. Authentication and class management are not available in serverless mode.
