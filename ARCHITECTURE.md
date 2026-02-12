# BIPES System Architecture Documentation

**Last Updated:** 2025-12-11
**Version:** 3.0.13

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Docker Infrastructure](#docker-infrastructure)
3. [Application Layer](#application-layer)
4. [Authentication System](#authentication-system)
5. [Frontend Architecture](#frontend-architecture)
6. [Database Schema](#database-schema)
7. [Module Loading System](#module-loading-system)
8. [Request Flow](#request-flow)
9. [Security](#security)
10. [Deployment](#deployment)

---

## System Overview

BIPES (Block based Integrated Platform for Embedded Systems) is a web-based visual programming IDE with authentication and class management capabilities. The system supports two types of users:

- **Guest Users**: Anonymous users who can create and save projects locally
- **Authenticated Users**: Teachers and students with accounts and class management

### Technology Stack

- **Backend**: Python 3.11 + Flask
- **Web Server**: Nginx (reverse proxy with SSL)
- **Application Server**: Gunicorn
- **Database**: PostgreSQL 15
- **MQTT Broker**: Eclipse Mosquitto 2.0
- **Containerization**: Docker + Docker Compose
- **Frontend**: Vanilla JavaScript (ES6 modules)
- **Visual Programming**: Google Blockly
- **Code Editor**: CodeMirror 6

---

## Docker Infrastructure

The system runs as 4 Docker containers orchestrated by Docker Compose:

### Container Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Internet                                                │
└────────────────┬────────────────────────────────────────┘
                 │
         ┌───────▼────────┐
         │  nginx:alpine  │  (Port 80→443)
         │  SSL/TLS       │  - HTTPS termination
         │  Reverse Proxy │  - Static file serving
         └───────┬────────┘  - Request routing
                 │
         ┌───────▼─────────────────────┐
         │  bipes_web (Flask)          │  (Port 5000)
         │  + Gunicorn WSGI            │  - Application logic
         │  + Python 3.11-slim         │  - Dynamic content
         └───┬─────────────────────┬───┘  - API endpoints
             │                     │
    ┌────────▼────────┐   ┌───────▼─────────┐
    │  postgres:15    │   │  mosquitto:2.0  │
    │  PostgreSQL DB  │   │  MQTT Broker    │
    │  (Port 5432)    │   │  (Port 1883)    │
    └─────────────────┘   └─────────────────┘
```

### Service Definitions

#### 1. **nginx** (bipes_nginx)
- **Image**: `nginx:alpine`
- **Ports**: 80 (HTTP→HTTPS redirect), 443 (HTTPS)
- **Purpose**:
  - SSL/TLS termination
  - Static file serving (most `/static/*` files)
  - Reverse proxy to Flask app
  - Security headers injection
- **Volumes**:
  - `/docker/nginx.conf` → nginx configuration
  - `/docker/ssl/` → SSL certificates
  - `/static/` → static files (read-only)
- **Key Features**:
  - Redirects all HTTP to HTTPS
  - Serves most static files directly for performance
  - Proxies dynamic static files to Flask (bipes.umd.js, style.css, toolboxes)
  - WebSocket support for MQTT

#### 2. **web** (bipes_web)
- **Image**: Custom (built from `docker/Dockerfile.prod`)
- **Base**: `python:3.11-slim`
- **Port**: 5000 (internal only)
- **Purpose**: Main application server
- **Environment Variables**:
  - `FLASK_ENV=production`
  - `POSTGRES_HOST=postgres`
  - `POSTGRES_DB=bipes`
  - `POSTGRES_USER=tsdbuser`
  - `POSTGRES_PASSWORD=tsdbpass`
  - `MOSQUITTO_HOST=broker`
  - `FLASK_SECRET_KEY` (for session encryption)
- **Dependencies**: Flask, gunicorn, flask-mqtt, paho-mqtt, psycopg
- **Startup**: Gunicorn with custom config (`docker/gunicorn_config.py`)

#### 3. **postgres** (postgres)
- **Image**: `postgres:15-alpine`
- **Port**: 5432 (internal only)
- **Purpose**: Persistent data storage
- **Initialization**: Runs `/docker/init-db.sql` on first start
- **Volumes**: `postgres_data` (persistent storage)

#### 4. **mosquitto** (broker)
- **Image**: `eclipse-mosquitto:2.0`
- **Ports**: 1884 (MQTT), 9002 (WebSocket)
- **Purpose**: MQTT message broker for IoT device communication
- **Config**: `/docker/mosquitto.conf`
- **Volumes**: `mosquitto_data`, `mosquitto_logs`

### Network Architecture

All containers communicate via a private bridge network called `bipes_network`. Only nginx exposes ports to the host:

```
Host Machine
├─ Port 80  → nginx:80  (HTTP redirect)
├─ Port 443 → nginx:443 (HTTPS)
└─ bipes_network (internal)
   ├─ nginx → web:5000
   ├─ web → postgres:5432
   └─ web → mosquitto:1883
```

---

## Application Layer

### Flask Application Structure

```
BIPES-Teknologiskolen/
├── app.py                    # Main Flask application entry point
├── server/
│   ├── common/
│   │   ├── auth.py          # Authentication core utilities
│   │   ├── auth_api.py      # API endpoints for auth (Blueprint)
│   │   └── database.py      # Database connection utilities
│   ├── postgresql/
│   │   └── auth.py          # PostgreSQL-specific auth queries
│   └── sqlite/
│       └── (legacy sqlite support)
├── templates/
│   ├── landing.html         # Landing page (login/register)
│   ├── login.html           # Login form
│   ├── register.html        # Teacher registration
│   ├── setup.html           # Initial setup wizard
│   ├── classes.html         # Class management page
│   ├── ide.html             # Main IDE interface
│   └── libs/
│       ├── bipes.js         # Dynamic module loader template
│       └── serviceworker.js # Service worker template
├── static/
│   ├── base/                # Core framework modules
│   ├── page/                # Page-specific modules
│   ├── auth/                # Authentication UI
│   └── libs/                # External libraries
└── docker/
    ├── Dockerfile.prod      # Production Docker image
    ├── gunicorn_config.py   # Gunicorn WSGI config
    ├── nginx.conf           # Nginx reverse proxy config
    └── init-db.sql          # Database initialization
```

### Key Application Files

#### **app.py** (Main Flask App)
- Initializes Flask app with PostgreSQL support
- Registers authentication API blueprint
- Defines core routes:
  - `/` → Landing page (if not authenticated)
  - `/login` → Login page
  - `/register` → Teacher registration
  - `/setup` → Initial setup (first teacher)
  - `/classes` → Class management (authenticated only)
  - `/ide` → Main IDE interface
  - `/api/*` → API endpoints (via Blueprint)
- Generates dynamic static files:
  - `/static/libs/bipes.umd.js` → Module imports (filtered by auth)
  - `/static/style.css` → Theme-based CSS
  - Toolbox files for Blockly

#### **server/common/auth.py**
Core authentication utilities:
- `hash_password()` → PBKDF2-SHA256 password hashing
- `verify_password()` → Password verification
- `generate_initial_password()` → Random student passwords
- `generate_class_code()` → Unique class codes (ABC123XY)
- `is_authenticated()` → Check session status
- `get_user_info()` → Get current user data
- `require_auth()` → API endpoint decorator
- `require_auth_page()` → Page route decorator

#### **server/common/auth_api.py**
API endpoints (Blueprint with `/api` prefix):
- `POST /api/auth/setup` → First teacher setup
- `GET /api/auth/setup-status` → Check if setup needed
- `POST /api/auth/register` → Teacher registration
- `POST /api/auth/login` → User login
- `POST /api/auth/logout` → User logout
- `GET /api/auth/me` → Get current user info
- `GET /api/classes/my-classes` → Get teacher's classes
- `POST /api/classes/create` → Create new class
- `GET /api/classes/:classId/students` → Get class students
- `POST /api/classes/:classId/students` → Add student to class
- `DELETE /api/classes/:classId` → Delete class
- `DELETE /api/classes/:classId/students/:studentId` → Remove student

#### **server/postgresql/auth.py**
Database query functions:
- `setup_first_teacher()` → Initialize first teacher
- `is_setup_complete()` → Check if any teachers exist
- `register_teacher()` → Create teacher account
- `login_user()` → Authenticate user (teacher/student)
- `get_teacher_classes()` → Get classes taught by teacher
- `create_class()` → Create new class
- `add_student_to_class()` → Enroll student
- `get_class_students()` → Get enrolled students
- Database connection pooling per Flask request

---

## Authentication System

### User Types

1. **Guest Users**
   - No account required
   - Can access project page (`/ide?page=project`)
   - Projects saved in browser localStorage
   - Cannot access class management

2. **Teachers**
   - Registered accounts with email/password
   - Can create and manage classes
   - Can add students to classes
   - Access class management page (`/classes`)
   - Cannot access guest project page

3. **Students**
   - Created by teachers
   - Initial password provided by teacher
   - Must change password on first login
   - Enrolled in classes
   - Can access IDE and their projects

### Session Management

Sessions are stored server-side using Flask's secure session cookies:

```python
# Session structure
session = {
    'user_id': 123,              # Teacher/student ID
    'user_type': 'teacher',      # 'teacher' or 'student'
    'email': 'user@example.com',
    'full_name': 'John Doe',
    # Student-specific:
    'student_name': 'John Doe',
    'password_changed': True
}
```

**Session Security:**
- Encrypted with `FLASK_SECRET_KEY`
- HttpOnly cookies (JavaScript cannot access)
- Secure flag (HTTPS only)
- SameSite=Lax (CSRF protection)

### Authentication Flow

#### Teacher Registration Flow
```
User → /register (GET) → Display registration form
     → /register (POST) → Validate input
                        → Hash password (PBKDF2-SHA256)
                        → Insert into teachers table
                        → Create session
                        → Redirect to /classes
```

#### Login Flow
```
User → /login (GET) → Display login form
     → /login (POST) → Query database (email lookup)
                     → Verify password hash
                     → Create session
                     → Update last_login timestamp
                     → Redirect based on user type
                          ├─ Teacher → /classes
                          └─ Student → /ide
```

#### First-Time Setup Flow
```
New Deployment → Check database for teachers
               → If empty: Redirect to /setup
               → Display setup form
               → Create first teacher account
               → Create session
               → Redirect to /classes
```

### Password Security

- **Hashing Algorithm**: PBKDF2-SHA256 (via Werkzeug)
- **Salt**: Automatically generated per password
- **Iterations**: 260,000 (default for PBKDF2-SHA256)
- **Student Passwords**: 8-character random (1 upper, 1 lower, 1 digit)
- **Initial Password Storage**: Encrypted, shown once to teacher

### Authorization Decorators

Two decorators control access:

1. **`@auth.require_auth()`** (API endpoints)
   ```python
   @bp.route('/classes/my-classes')
   @auth.require_auth()
   def get_my_classes():
       # Only authenticated users can access
       pass
   ```
   - Returns 401 Unauthorized if not authenticated
   - Used for API endpoints

2. **`@auth.require_auth_page()`** (Page routes)
   ```python
   @app.route("/classes")
   @auth.require_auth_page()
   def classes_page():
       # Only authenticated users can access
       pass
   ```
   - Redirects to landing page if not authenticated
   - Used for HTML pages

---

## Frontend Architecture

### Module System

BIPES uses a custom ES6 module system with dynamic imports based on authentication status.

#### Module Types

1. **Base Modules** (`static/base/`)
   - Core framework functionality
   - Loaded for all users
   - Examples:
     - `navigation.js` → Tab navigation system
     - `dom.js` → DOM manipulation utilities
     - `channel.js` → Cross-tab communication
     - `command.js` → Command pattern implementation
     - `session.js` → Session state management
     - `storage.js` → localStorage wrapper
     - `tool.js` → Utility functions

2. **Page Modules** (`static/page/*/main.js`)
   - Feature-specific modules
   - Each represents a tab in the IDE
   - Loaded for all users, but navigation tabs filtered
   - Examples:
     - `blocks` → Visual programming (Blockly)
     - `dashboard` → Serial monitor
     - `device` → Device/board selection
     - `prompt` → Python REPL
     - `files` → File management
     - `notification` → Notifications
     - `project` → Project management (guest-focused)
     - `classes` → Class management (auth-only)

### Dynamic Module Loading

The system generates `bipes.umd.js` dynamically based on user authentication:

```javascript
// Generated by templates/libs/bipes.js

// Import base modules (all users)
import { navigation } from '../../static/base/navigation.js'
import { channel } from '../../static/base/channel.js'
// ... other base modules

// Import page modules (all users - needed for dependencies)
import { blocks } from '../../static/page/blocks/main.js'
import { project } from '../../static/page/project/main.js'
import { classes } from '../../static/page/classes/main.js'
// ... other page modules

export default function Bipes() {
  window.bipes = {}

  // Make modules accessible
  bipes.navigation = navigation
  bipes.page.blocks = blocks
  bipes.page.project = project
  bipes.page.classes = classes

  // Initialize project page (only if available)
  if (bipes.page.project) {
    bipes.page.project._init()
  }

  bipes.navigation.init(languages)
}

Bipes()
```

**Key Points:**
- ALL modules are imported for everyone (needed for dependencies)
- Navigation tabs are filtered in `app.py` `ide()` function
- Module constructors check if their DOM section exists before attaching
- Navigation skips modules without DOM elements

### Page Module Pattern

Each page module follows this pattern:

```javascript
class ModuleName {
  constructor() {
    this.name = 'module'
    this.$ = {}  // DOM references
    this.inited = false

    // Create DOM structure
    let $ = this.$ = {}
    $.container = new DOM('div', { className: 'container' })

    // Only attach if section exists (for auth-filtered pages)
    const sectionElement = DOM.get('section#module')
    if (sectionElement) {
      $.section = new DOM(sectionElement).append($.container)
    }
  }

  init() {
    // Called by navigation when tab is activated
    // Perform auth checks and redirects here
    if (!shouldShowToUser()) {
      window.location.href = '/appropriate-page'
      return
    }

    // Initialize module
    this.inited = true
  }

  deinit() {
    // Called by navigation when tab is deactivated
    // Clean up resources
  }
}

export let module = new ModuleName()
```

**Lifecycle:**
1. **Constructor**: Runs immediately when imported
   - Creates DOM structure
   - Conditionally attaches to section element
   - Does NOT call `init()`
2. **init()**: Called by navigation when user clicks tab
   - Performs authentication checks
   - Redirects if unauthorized
   - Initializes functionality
3. **deinit()**: Called when user switches tabs
   - Cleanup (event listeners, timers, etc.)

### Navigation System

The navigation system (`static/base/navigation.js`) manages tab switching:

```javascript
class Navigation {
  init(languages) {
    // Loop through all imported modules
    for (let module in bipes.page) {
      let a = DOM.get(`a#${module}`, this.$.panels)

      // Skip modules without navigation elements (filtered by auth)
      if (!a) continue

      // Set up tab
      a.innerText = Msg[`Page${Tool.firstUpper(module)}`]
      a.onclick = () => this.handleLink(module)
    }
  }

  handleLink(pageName) {
    // Turn off current page
    turnOff(currentPage)

    // Turn on new page
    turnOn(pageName)
  }
}
```

**Tab Filtering:**
- Guest users: Navigation shows `project` tab, hides `classes` tab
- Authenticated users: Navigation shows `classes` tab, hides `project` tab
- Filtering done in `app.py` `ide()` function by removing from `page` list
- Navigation safely skips modules without DOM elements

### Session Management (Frontend)

The `static/base/session.js` module provides client-side session management:

```javascript
class Session {
  constructor() {
    this.user = null
    this.checkSession()
  }

  async checkSession() {
    const response = await fetch('/api/auth/me')
    if (response.ok) {
      this.user = await response.json()
      this.dispatchEvent('sessionchange', { isAuthenticated: true })
    } else {
      this.user = null
      this.dispatchEvent('sessionchange', { isAuthenticated: false })
    }
  }

  isLoggedIn() {
    return this.user !== null
  }

  getUserType() {
    return this.user?.user_type
  }
}

export const session = new Session()
```

**Usage in Modules:**
```javascript
init() {
  // Redirect guests
  if (!session.isLoggedIn()) {
    window.location.href = '/'
    return
  }

  // Redirect non-teachers
  if (session.getUserType() !== 'teacher') {
    window.location.href = '/ide'
    return
  }
}
```

---

## Database Schema

### Entity Relationship Diagram

```
┌─────────────────┐
│    teachers     │
│─────────────────│
│ teacher_id (PK) │──┐
│ email           │  │
│ password_hash   │  │
│ full_name       │  │
│ created_at      │  │
│ last_login      │  │
│ is_active       │  │
└─────────────────┘  │
                     │
         ┌───────────┼───────────┐
         │           │           │
         ▼           ▼           ▼
┌─────────────────┐ ┌──────────┐ ┌──────────┐
│    classes      │ │ students │ │ projects │
│─────────────────│ │──────────│ │──────────│
│ class_id (PK)   │ │ student_id│ │ uid (PK) │
│ class_name      │ │ (PK)      │ │ author   │
│ class_code      │ │ student_  │ │ name     │
│ teacher_id (FK) │─┤ name      │ │ xml      │
│ description     │ │ email     │ │ lastEdit │
│ created_at      │ │ password_ │ │ createdAt│
│ is_active       │ │ hash      │ │ student_ │
└─────────────────┘ │ created_  │ │ id (FK)  │
         │          │ by_(FK)   │ │ teacher_ │
         │          │ is_active │ │ id (FK)  │
         │          └──────────┘ │ assigned_│
         │                 │     │ class(FK)│
         │                 │     └──────────┘
         │                 │
         └────────┬────────┘
                  ▼
         ┌─────────────────┐
         │   enrollments   │
         │─────────────────│
         │ enrollment_id   │
         │ class_id (FK)   │
         │ student_id (FK) │
         │ enrolled_at     │
         │ is_active       │
         └─────────────────┘
```

### Table Definitions

#### **teachers**
Stores teacher accounts.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| teacher_id | SERIAL | PRIMARY KEY | Auto-incrementing ID |
| email | VARCHAR(100) | UNIQUE NOT NULL | Login email |
| password_hash | VARCHAR(255) | NOT NULL | PBKDF2-SHA256 hash |
| full_name | VARCHAR(100) | NOT NULL | Display name |
| created_at | NUMERIC(16,6) | NOT NULL | Unix timestamp |
| last_login | NUMERIC(16,6) | NULL | Last login timestamp |
| is_active | BOOLEAN | DEFAULT TRUE | Account status |

#### **students**
Stores student accounts (created by teachers).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| student_id | SERIAL | PRIMARY KEY | Auto-incrementing ID |
| student_name | VARCHAR(100) | NOT NULL | Display name |
| email | VARCHAR(100) | UNIQUE | Optional login email |
| password_hash | VARCHAR(255) | NOT NULL | PBKDF2-SHA256 hash |
| initial_password | TEXT | NULL | Encrypted initial password |
| password_changed | BOOLEAN | DEFAULT FALSE | First login flag |
| created_at | NUMERIC(16,6) | NOT NULL | Creation timestamp |
| created_by_teacher_id | INTEGER | FK → teachers | Creating teacher |
| is_active | BOOLEAN | DEFAULT TRUE | Account status |

#### **classes**
Stores classes/courses managed by teachers.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| class_id | SERIAL | PRIMARY KEY | Auto-incrementing ID |
| class_name | VARCHAR(100) | NOT NULL | Class name |
| class_code | VARCHAR(8) | UNIQUE NOT NULL | Join code (ABC123XY) |
| teacher_id | INTEGER | FK → teachers | Class owner |
| description | TEXT | NULL | Optional description |
| created_at | NUMERIC(16,6) | NOT NULL | Creation timestamp |
| is_active | BOOLEAN | DEFAULT TRUE | Class status |

#### **enrollments**
Many-to-many relationship: students ↔ classes.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| enrollment_id | SERIAL | PRIMARY KEY | Auto-incrementing ID |
| class_id | INTEGER | FK → classes | Enrolled class |
| student_id | INTEGER | FK → students | Enrolled student |
| enrolled_at | NUMERIC(16,6) | NOT NULL | Enrollment timestamp |
| is_active | BOOLEAN | DEFAULT TRUE | Enrollment status |

**Constraints:**
- `UNIQUE(class_id, student_id)` → Student can't enroll twice
- `ON DELETE CASCADE` → Deleting class/student removes enrollments

#### **projects**
Stores user projects (Blockly XML, code, etc.).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| uid | VARCHAR(32) | PRIMARY KEY | Project unique ID |
| author | VARCHAR(100) | NULL | Author name (legacy) |
| name | VARCHAR(200) | NOT NULL | Project name |
| xml | TEXT | NULL | Blockly workspace XML |
| lastEdited | NUMERIC(16,6) | NOT NULL | Last edit timestamp |
| createdAt | NUMERIC(16,6) | NOT NULL | Creation timestamp |
| student_id | INTEGER | FK → students | Student owner (NULL for guests) |
| teacher_id | INTEGER | FK → teachers | Teacher owner (NULL for non-teachers) |
| assigned_class_id | INTEGER | FK → classes | Assigned class (NULL if not assigned) |

**Notes:**
- Guest projects: `student_id` and `teacher_id` are NULL
- Student projects: `student_id` is set
- Teacher projects: `teacher_id` is set
- `assigned_class_id` links projects to specific classes

### Indexes

Performance indexes created on:
- `students(student_name)` → Fast name lookups
- `students(email)` → Fast login lookups
- `classes(class_code)` → Fast class join
- `classes(teacher_id)` → Fast teacher class list
- `enrollments(class_id)` → Fast class roster
- `enrollments(student_id)` → Fast student class list
- `projects(student_id)` → Fast student project list
- `projects(teacher_id)` → Fast teacher project list
- `projects(assigned_class_id)` → Fast class project list

---

## Module Loading System

### The Problem: Circular Dependencies

The authentication system introduced a challenge:

- **Project module** manages projects (for guests)
- **Classes module** manages classes (for authenticated users)
- **Blocks, Dashboard, Device, Files** modules depend on the Project module

Initial approach: Filter module imports based on authentication
- Guests: Import `project`, don't import `classes`
- Teachers: Import `classes`, don't import `project`

**Problem:** Blocks/Dashboard/Device/Files need Project module, so it must be imported for everyone!

### The Solution: Import All, Filter Navigation

Current approach (implemented):

1. **Import ALL modules for everyone** (in `bipes_imports()`)
   - Guest users get: `project`, `classes`, `blocks`, etc.
   - Authenticated users get: `project`, `classes`, `blocks`, etc.

2. **Filter navigation tabs** (in `ide()` function)
   - Guest users see: `blocks`, `device`, `project` (no `classes` tab)
   - Authenticated users see: `blocks`, `device`, `classes` (no `project` tab)

3. **Conditional DOM attachment** (in module constructors)
   ```javascript
   // Only attach if section element exists
   const sectionElement = DOM.get('section#project')
   if (sectionElement) {
     $.section = new DOM(sectionElement).append($.container)
   }
   ```

4. **Navigation safety check**
   ```javascript
   // Skip modules without navigation elements
   if (!a) continue
   ```

5. **Authentication checks in init()**
   ```javascript
   init() {
     // Redirect unauthorized users
     if (!session.isLoggedIn()) {
       window.location.href = '/'
       return
     }
   }
   ```

### Code Flow

#### Server-Side (app.py)

```python
@app.route("/ide")
def ide():
    # Get all page modules
    page = get_files_names("static/page/*/main.js", r"^static/page/(.*)/main.js")
    page = preferred_page_order(page)

    # Filter navigation tabs (not module imports!)
    is_authenticated = auth.is_authenticated()
    if is_authenticated:
        # Remove 'project' tab for authenticated users
        page = [p for p in page if p != 'project']
    else:
        # Remove 'classes' tab for guests
        page = [p for p in page if p != 'classes']

    # Render IDE with filtered tab list
    return render_template('ide.html', page=page, ...)

def bipes_imports():
    # Get all modules
    page = get_files_names("static/page/*/main.js", ...)

    # DO NOT FILTER - import everything!
    # Project module needed by blocks/dashboard/device/files

    return render_template('libs/bipes.js', page=page, ...)
```

#### Client-Side (templates/libs/bipes.js)

```jinja2
{# Import ALL page modules #}
{% for item in page -%}
import { {{item}} } from '../../static/page/{{item}}/main.js'
{% endfor %}

export default function Bipes() {
  {# Make all modules accessible #}
  {% for item in page -%}
  bipes.page.{{item}} = {{item}}
  {% endfor %}

  {# Only initialize project if it exists #}
  if (bipes.page.project) {
    bipes.page.project._init()
  }

  bipes.navigation.init(languages)
}
```

#### Navigation (static/base/navigation.js)

```javascript
init(languages) {
  for (let module in bipes.page) {
    let a = DOM.get(`a#${module}`, this.$.panels)

    // Skip modules without navigation tabs (filtered by server)
    if (!a) continue

    a.innerText = Msg[`Page${Tool.firstUpper(module)}`]
    a.onclick = () => this.handleLink(module)
  }
}
```

#### Module Constructors (e.g., static/page/project/main.js)

```javascript
constructor() {
  this.name = 'project'
  this.$ = {}

  // Create DOM structure
  let $ = this.$ = {}
  $.container = new DOM('div', { className: 'container' })
  $.contextMenu = new DOM('div')

  // Only attach if section exists (may not exist for authenticated users)
  const sectionElement = DOM.get('section#project')
  if (sectionElement) {
    $.section = new DOM(sectionElement)
      .append([$.container, $.contextMenu])
  }
}
```

---

## Request Flow

### Guest User Accessing IDE

```
1. Browser → https://localhost/
             ↓
2. nginx → HTTP 301 redirect to HTTPS
             ↓
3. Browser → https://localhost/ (HTTPS)
             ↓
4. nginx → Proxy to web:5000
             ↓
5. Flask → Check session (not authenticated)
         → Render landing.html
             ↓
6. Browser → Display landing page
         → User clicks "Continue as Guest"
             ↓
7. Browser → https://localhost/ide
             ↓
8. nginx → Proxy to web:5000
             ↓
9. Flask → ide() function
         → Check authentication: guest
         → Filter pages: remove 'classes'
         → Render ide.html with page=['blocks','device','project',...]
             ↓
10. Browser → Parse ide.html
          → Request /static/libs/bipes.umd.js
              ↓
11. nginx → Dynamic file → Proxy to web:5000
              ↓
12. Flask → bipes_imports() function
          → Import ALL modules (no filtering)
          → Render templates/libs/bipes.js
              ↓
13. Browser → Execute bipes.umd.js
          → Import all modules
          → Navigation.init() skips 'classes' (no DOM element)
          → Project._init() runs
              ↓
14. User clicks "Project" tab
              ↓
15. Navigation → turnOn('project')
               → project.init()
               → Display project management UI
```

### Teacher Accessing Classes

```
1. Browser → https://localhost/
             ↓
2. Flask → Check session (not authenticated)
         → Render landing.html
             ↓
3. Browser → User clicks "Login"
             ↓
4. Browser → https://localhost/login
             ↓
5. Flask → Render login.html
             ↓
6. Browser → User enters email/password → Submit
             ↓
7. Browser → POST https://localhost/api/auth/login
             ↓
8. Flask → auth_api.login()
         → Query database for teacher
         → Verify password hash
         → Create session
         → Return 200 OK
             ↓
9. Browser → Redirect to /classes
             ↓
10. Flask → classes_page() function
          → @auth.require_auth_page() checks session
          → Render classes.html
              ↓
11. Browser → Parse classes.html
          → Request /static/page/classes/main.js
          → Execute classes module
          → Fetch /api/classes/my-classes
              ↓
12. Flask → get_my_classes() function
          → @auth.require_auth() checks session
          → Query database for teacher's classes
          → Return JSON
              ↓
13. Browser → Display classes in UI
```

### API Request Flow

```
Client → POST /api/classes/create
         {
           "className": "Math 101",
           "description": "Intro to Math"
         }
           ↓
nginx → Proxy to web:5000
           ↓
Flask → auth_api.create_class()
      → @auth.require_auth() decorator
         ├─ Check session.get('user_id')
         ├─ If not authenticated: Return 401
         └─ If authenticated: Continue
           ↓
      → Validate request data
      → Generate class code (ABC123XY)
      → Insert into database
           ↓
PostgreSQL → INSERT INTO classes (...)
           → Return class_id
           ↓
Flask → Return 201 Created
      → {
           "class_id": 42,
           "class_code": "ABC123XY",
           ...
         }
           ↓
Client → Display success message
       → Refresh class list
```

---

## Security

### Transport Layer Security (TLS/SSL)

- **Protocol**: TLS 1.2 and 1.3 only
- **Certificate**: Self-signed (development) or Let's Encrypt (production)
- **Location**: `/docker/ssl/cert.pem` and `/docker/ssl/key.pem`
- **Generation**: `docker/generate-ssl.sh` script
- **HTTP**: Automatically redirects to HTTPS (nginx)

### Password Security

- **Algorithm**: PBKDF2-SHA256
- **Iterations**: 260,000 (Werkzeug default)
- **Salt**: Automatic per-password (stored in hash)
- **Storage**: Never stored in plain text
- **Student passwords**: Generated randomly, shown once to teacher

### Session Security

- **Storage**: Server-side (Flask sessions)
- **Encryption**: AES-256 via `FLASK_SECRET_KEY`
- **Cookie attributes**:
  - `HttpOnly`: JavaScript cannot access
  - `Secure`: HTTPS only
  - `SameSite=Lax`: CSRF protection
- **Expiration**: Browser session (closed tab/browser)

### SQL Injection Prevention

- **Method**: Parameterized queries (psycopg3)
- **Example**:
  ```python
  # SAFE - parameterized
  cursor.execute(
      "SELECT * FROM teachers WHERE email = %s",
      (email,)
  )

  # UNSAFE - string concatenation (NEVER DO THIS)
  cursor.execute(
      f"SELECT * FROM teachers WHERE email = '{email}'"
  )
  ```

### XSS Prevention

- **Template Engine**: Jinja2 with auto-escaping
- **API Responses**: JSON (not HTML)
- **User Input**: Escaped before rendering

### CSRF Protection

- **Method**: SameSite cookies + origin validation
- **API calls**: Require authentication via session
- **No state-changing GET requests**

### Authorization Checks

- **API endpoints**: `@auth.require_auth()` decorator
- **Page routes**: `@auth.require_auth_page()` decorator
- **Frontend**: Session checks + redirects in `init()`

### Database Security

- **Access**: Internal Docker network only (no external port)
- **Credentials**: Environment variables (not hardcoded)
- **Permissions**: Separate user (`tsdbuser`) with limited privileges
- **Backups**: Volume persistence (`postgres_data`)

### Security Headers (nginx)

```nginx
add_header Strict-Transport-Security "max-age=31536000" always;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
```

- **HSTS**: Force HTTPS for 1 year
- **X-Frame-Options**: Prevent clickjacking
- **X-Content-Type-Options**: Prevent MIME sniffing

---

## Deployment

### Production Deployment Steps

1. **Clone repository**
   ```bash
   git clone https://github.com/your-org/bipes.git
   cd bipes
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   nano .env
   ```

   Set secure values:
   ```bash
   FLASK_SECRET_KEY=<random-64-char-string>
   POSTGRES_PASSWORD=<strong-password>
   MOSQUITTO_PASSWORD=<strong-password>
   ```

3. **Generate SSL certificates**
   ```bash
   # Self-signed (development)
   bash docker/generate-ssl.sh

   # Or use Let's Encrypt (production)
   # Configure nginx.conf for your domain
   # Run certbot to obtain certificates
   ```

4. **Build and start containers**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d --build
   ```

5. **Verify services**
   ```bash
   docker ps  # All 4 containers should be running
   docker logs bipes_web  # Check for errors
   ```

6. **Access application**
   ```
   https://localhost/  (or your domain)
   ```

7. **Initial setup**
   - First visit: Redirected to `/setup`
   - Create first teacher account
   - Login and start creating classes

### Container Management

```bash
# View logs
docker logs bipes_web
docker logs postgres
docker logs broker
docker logs bipes_nginx

# Restart a service
docker-compose -f docker-compose.prod.yml restart web

# Rebuild after code changes
docker-compose -f docker-compose.prod.yml up -d --build web

# Stop all services
docker-compose -f docker-compose.prod.yml down

# Stop and remove volumes (WARNING: deletes data)
docker-compose -f docker-compose.prod.yml down -v
```

### Database Backup

```bash
# Backup
docker exec postgres pg_dump -U tsdbuser bipes > backup.sql

# Restore
docker exec -i postgres psql -U tsdbuser bipes < backup.sql
```

### Monitoring

- **Nginx logs**: `docker logs bipes_nginx`
- **Flask logs**: `docker logs bipes_web`
- **PostgreSQL logs**: `docker logs postgres`
- **Mosquitto logs**: `docker logs broker`

### Performance Tuning

- **Gunicorn workers**: Adjust in `docker/gunicorn_config.py`
  ```python
  workers = 4  # 2-4 x CPU cores
  ```

- **PostgreSQL connections**: Adjust `max_connections` in PostgreSQL config
- **Nginx caching**: Configured for static files (1 year cache)

---

## Troubleshooting

### Common Issues

#### 1. **Container won't start**
```bash
# Check logs
docker logs bipes_web

# Common causes:
# - Missing environment variables
# - PostgreSQL not ready (add depends_on + healthcheck)
# - Port conflict (change in docker-compose.prod.yml)
```

#### 2. **Database connection errors**
```bash
# Error: "connection refused"
# Solution: Check POSTGRES_HOST=postgres (not localhost)

# Error: "database does not exist"
# Solution: Check POSTGRES_DB matches init-db.sql

# Error: "the connection is closed"
# Solution: Add g.pop('db', None) after db.close()
```

#### 3. **SSL certificate errors**
```bash
# ServiceWorker fails to register
# Cause: Self-signed certificate (expected in development)
# Solution: Accept certificate in browser or use Let's Encrypt

# Generate new self-signed certificate:
bash docker/generate-ssl.sh
docker-compose -f docker-compose.prod.yml restart nginx
```

#### 4. **Module loading errors**
```bash
# Error: "Cannot read properties of undefined (reading '_init')"
# Cause: Module filtered but hardcoded initialization
# Solution: Wrap in conditional: if (bipes.page.project) { ... }

# Error: "Cannot read properties of null (reading 'appendChild')"
# Cause: Module constructor tries to attach to missing DOM element
# Solution: Check if element exists before attaching:
#   const elem = DOM.get('section#module')
#   if (elem) { $.section = new DOM(elem).append(...) }
```

#### 5. **Authentication errors**
```bash
# Error: 401 Unauthorized
# Cause: Session expired or not set
# Solution: Check session creation in login endpoint

# Error: Redirect loop
# Cause: Auth decorator on landing page
# Solution: Don't use @require_auth_page() on public routes
```

### Debug Mode

Enable Flask debug mode (development only):

```python
# In app.py
if __name__ == '__main__':
    app = create_app(database="postgresql")
    app.run(debug=True, host='0.0.0.0', port=5000)
```

**Warning**: Never enable debug mode in production!

---

## Architecture Decisions

### Why Docker Compose?

- **Isolation**: Each service in its own container
- **Portability**: Same environment dev/staging/production
- **Scalability**: Easy to add services (Redis, Celery, etc.)
- **Networking**: Automatic service discovery

### Why Nginx + Gunicorn?

- **Nginx**: Fast static file serving, SSL termination, reverse proxy
- **Gunicorn**: Production-grade WSGI server for Flask
- **Separation of concerns**: Nginx handles HTTP, Gunicorn handles Python

### Why PostgreSQL over SQLite?

- **Concurrency**: Better multi-user support
- **Production-ready**: Proven at scale
- **Features**: Full SQL support, JSON columns, transactions
- **Backups**: Volume persistence + pg_dump

### Why Import All Modules?

**Problem**: Circular dependencies
- `blocks` depends on `project`
- `project` should only load for guests
- **Solution**: Import all modules, filter navigation tabs

**Alternative considered**: Dynamic imports
```javascript
if (session.isLoggedIn()) {
  await import('./classes/main.js')
} else {
  await import('./project/main.js')
}
```
**Rejected because**: Blocks/dashboard/device already import project statically

### Why Session-Based Auth (Not JWT)?

- **Simplicity**: Built-in Flask sessions
- **Security**: Server-side storage (can't be tampered)
- **Revocation**: Easy to invalidate (clear session)
- **Use case**: Web app, not API-first

**Trade-off**: Not ideal for mobile apps or microservices (consider JWT for those)

---

## Future Enhancements

### Potential Improvements

1. **Redis Session Store**
   - Current: Flask sessions (file-based)
   - Improvement: Redis for better performance and scalability

2. **Email Verification**
   - Current: Teachers can register without verification
   - Improvement: Send confirmation email with activation link

3. **Password Reset**
   - Current: No password reset flow
   - Improvement: Email-based password reset

4. **Student Self-Registration**
   - Current: Teachers create student accounts
   - Improvement: Students self-register with class code

5. **Project Sharing**
   - Current: Projects are private
   - Improvement: Share projects with class or make public

6. **Real-time Collaboration**
   - Current: Single-user editing
   - Improvement: Multiple users edit same project (WebRTC, Operational Transform)

7. **Analytics Dashboard**
   - Current: No usage metrics
   - Improvement: Teacher dashboard with student progress, project statistics

8. **API Rate Limiting**
   - Current: No rate limits
   - Improvement: Prevent abuse (Flask-Limiter)

9. **Automated Backups**
   - Current: Manual backups
   - Improvement: Scheduled database backups to S3/cloud storage

10. **OAuth Integration**
    - Current: Email/password only
    - Improvement: Google, GitHub, Microsoft SSO

---

## Glossary

- **BIPES**: Block based Integrated Platform for Embedded Systems
- **Flask**: Python web framework
- **Gunicorn**: Python WSGI HTTP Server
- **Nginx**: Web server and reverse proxy
- **PostgreSQL**: Relational database
- **Mosquitto**: MQTT message broker
- **Docker**: Containerization platform
- **MQTT**: Message Queuing Telemetry Transport (IoT protocol)
- **WSGI**: Web Server Gateway Interface (Python standard)
- **SSL/TLS**: Secure Sockets Layer / Transport Layer Security
- **PBKDF2**: Password-Based Key Derivation Function 2
- **CSRF**: Cross-Site Request Forgery
- **XSS**: Cross-Site Scripting
- **JWT**: JSON Web Token
- **UMD**: Universal Module Definition
- **ES6**: ECMAScript 2015 (JavaScript standard)

---

## Conclusion

BIPES is a well-architected web application with:

- ✅ **Containerized deployment** (Docker Compose)
- ✅ **Production-ready stack** (Nginx, Gunicorn, PostgreSQL)
- ✅ **Secure authentication** (PBKDF2, sessions, SSL)
- ✅ **Role-based access** (guests, teachers, students)
- ✅ **Modular frontend** (ES6 modules, dynamic loading)
- ✅ **Scalable database** (PostgreSQL with indexes)
- ✅ **IoT integration** (MQTT broker)

The architecture balances simplicity with functionality, making it suitable for educational environments while remaining extensible for future features.

---

**Document Version:** 1.0
**Author:** BIPES Development Team
**Last Updated:** 2025-12-11
