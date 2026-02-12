# BIPES Hybrid Configuration Guide

This guide explains how nginx, Gunicorn, and Flask are configured for the hybrid static/dynamic setup.

## Architecture Flow

```
Browser
   ↓
nginx (Port 443/HTTPS)
   ↓
   ├── /static/* → Serve directly from disk (STATIC)
   └── /* → Proxy to Gunicorn (DYNAMIC)
            ↓
       Gunicorn (Port 5000)
            ↓
       Flask Application
            ↓
       PostgreSQL + Mosquitto
```

---

## 1. nginx Configuration

**File**: `docker/nginx.conf`

### Purpose
- **Reverse proxy** for HTTPS termination
- **Static file server** for `/static/*` content
- **Load balancer** (if you scale Gunicorn workers)

### Key Sections

#### A. HTTPS Redirect
```nginx
# Redirect HTTP → HTTPS
server {
    listen 80;
    return 301 https://$host$request_uri;
}
```

#### B. Static File Serving
```nginx
server {
    listen 443 ssl http2;

    # Serve static files directly (FAST!)
    location /static/ {
        alias /usr/share/nginx/html/static/;
        expires 1y;                              # Cache for 1 year
        add_header Cache-Control "public, immutable";
        access_log off;                          # Don't log static files
    }
}
```

**What this does:**
- Request: `GET /static/libs/xterm.umd.js`
- nginx reads: `/usr/share/nginx/html/static/libs/xterm.umd.js`
- Returns file **directly** (no Flask involved)
- Browser caches for 1 year

#### C. Dynamic Content Proxy
```nginx
# Everything else → Flask
location / {
    proxy_pass http://web:5000;                  # Forward to Gunicorn
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;  # https

    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
}
```

**What this does:**
- Request: `GET /ide-en`
- nginx forwards to: `http://web:5000/ide-en`
- Passes client IP, protocol (https), host
- Flask can see original request details

#### D. WebSocket Support
```nginx
# MQTT WebSocket support
location /mqtt {
    proxy_pass http://web:5000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";

    # Long timeouts for persistent connections
    proxy_connect_timeout 7d;
    proxy_send_timeout 7d;
    proxy_read_timeout 7d;
}
```

**What this does:**
- Upgrades HTTP → WebSocket
- Keeps connection open for days
- Allows real-time MQTT communication

### Configuration in Docker

**docker-compose.prod.yml:**
```yaml
nginx:
  volumes:
    - ./docker/nginx.conf:/etc/nginx/conf.d/default.conf:ro  # nginx config
    - ./docker/ssl:/etc/nginx/ssl:ro                         # SSL certs
    - ./static:/usr/share/nginx/html/static:ro               # Static files
  ports:
    - "80:80"
    - "443:443"
```

---

## 2. Gunicorn Configuration

**File**: `docker/gunicorn_config.py`

### Purpose
- **Production WSGI server** for running Flask
- **Process manager** for worker processes
- **Request handler** for concurrent connections

### Key Settings

```python
import multiprocessing

# Bind to all interfaces on port 5000
bind = "0.0.0.0:5000"
backlog = 2048

# Worker processes (handles concurrent requests)
workers = multiprocessing.cpu_count() * 2 + 1
worker_class = "sync"
timeout = 120

# Logging
accesslog = "/app/logs/access.log"
errorlog = "/app/logs/error.log"
loglevel = "info"

# Process naming
proc_name = "bipes"
```

### Worker Calculation

**Formula**: `(CPU cores × 2) + 1`

| CPU Cores | Workers | Concurrent Requests |
|-----------|---------|---------------------|
| 2 cores   | 5       | 5 simultaneous      |
| 4 cores   | 9       | 9 simultaneous      |
| 8 cores   | 17      | 17 simultaneous     |

**Why this formula?**
- Each worker can handle 1 request at a time (sync mode)
- More workers = more RAM usage
- `× 2` accounts for I/O wait (database, disk)
- `+ 1` ensures odd number for load balancing

### Worker Types

**sync** (current):
- Simple, one request per worker
- Good for CPU-bound tasks
- Lower memory usage

**gevent** (alternative):
- Async, many requests per worker
- Good for I/O-bound tasks
- Requires: `pip install gunicorn[gevent]`

To switch to gevent:
```python
worker_class = "gevent"
worker_connections = 1000  # Connections per worker
```

### Timeouts

```python
timeout = 120  # 2 minutes
```

**What this means:**
- Worker killed if request takes > 2 minutes
- Prevents hanging requests
- Adjust based on longest operation

### Configuration in Docker

**docker-compose.prod.yml:**
```yaml
web:
  command: gunicorn --config /app/docker/gunicorn_config.py 'app:create_app("postgresql")'
```

**Dockerfile.prod:**
```dockerfile
CMD ["gunicorn", "--config", "/app/docker/gunicorn_config.py", "app:create_app('postgresql')"]
```

---

## 3. Flask Configuration

**File**: `app.py`

### Purpose
- **Application logic** (routes, templates, database)
- **Dynamic content generation**
- **API endpoints**

### Key Configuration

#### A. Proxy Headers Support

```python
from werkzeug.middleware.proxy_fix import ProxyFix

app = Flask(__name__)

# Trust nginx proxy headers
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_port=1)
```

**What this does:**
- `X-Forwarded-For`: Client's real IP (not nginx IP)
- `X-Forwarded-Proto`: Original protocol (https)
- `X-Forwarded-Host`: Original host header
- `X-Forwarded-Port`: Original port (443)

**Why needed?**
Without this, Flask sees:
- `request.remote_addr` = `172.18.0.3` (nginx container IP) ❌
- `request.scheme` = `http` ❌

With ProxyFix:
- `request.remote_addr` = `192.168.1.100` (real client) ✅
- `request.scheme` = `https` ✅
- `url_for(..., _external=True)` = `https://...` ✅

#### B. Dynamic Routes

**Static file concatenation:**
```python
@app.route("/static/style.css")
def style():
    # Combine all CSS files
    return Response(
        concat_files("static/style/*.css") +
        concat_files("static/page/*/style.css"),
        mimetype='text/css')
```

**Note**: Even though path is `/static/*`, nginx doesn't serve it because:
1. It's not a real file on disk
2. Flask generates it dynamically

**IDE generation:**
```python
@app.route("/ide")
@app.route("/ide-<lang>")
def call_ide(lang=None):
    return ide(lang, import_type='module')

def ide(lang=None, import_type='module'):
    # Scan for page modules
    page = get_files_names("static/page/*/main.js", ...)

    # Render template
    return render_template('ide.html',
                          page=page,
                          lang=lang or default_lang)
```

#### C. Database Configuration

```python
app.config.from_mapping(
    DATABASE = 'postgresql',
    POSTGRESQL_HOST = 'postgres',  # Docker service name
    POSTGRESQL_DATABASE_API = 'bipes',
    POSTGRESQL_USER = 'tsdbuser',
    POSTGRESQL_PASSWORD = 'tsdbpass'
)
```

**In Docker:**
- `POSTGRESQL_HOST = 'postgres'` (service name in docker-compose.prod.yml)
- Docker DNS resolves `postgres` → container IP

---

## 4. Request Flow Examples

### Example 1: Static File (Fast Path)

```
1. Browser: GET https://localhost/static/libs/xterm.umd.js

2. nginx:
   - Matches location /static/
   - Reads /usr/share/nginx/html/static/libs/xterm.umd.js
   - Returns file directly
   - Sets cache headers (1 year)

3. Browser: Caches file, won't request again

⏱️ Response time: ~5ms (disk read only)
```

### Example 2: Dynamic Content (Full Stack)

```
1. Browser: GET https://localhost/ide-en

2. nginx:
   - No match for /static/
   - Matches location /
   - proxy_pass to http://web:5000/ide-en
   - Adds headers: X-Forwarded-Proto: https

3. Gunicorn:
   - Worker #3 picks up request
   - Calls Flask app

4. Flask:
   - ProxyFix processes headers
   - Route /ide-<lang> matches
   - Scans static/page/*/main.js
   - Finds: blocks, dashboard, device, project
   - Renders ide.html with lang=en
   - Returns HTML

5. Gunicorn:
   - Sends response to nginx

6. nginx:
   - Forwards to browser

7. Browser:
   - Parses HTML
   - Requests /static/libs/xterm.umd.js (goes to Example 1)

⏱️ Response time: ~100-200ms (filesystem scan + template rendering)
```

### Example 3: API Call (Future)

```
1. Browser: POST https://localhost/api/auth/login
   Body: {"email": "teacher@test.com", "password": "pass"}

2. nginx:
   - Matches location /
   - Proxies to Gunicorn

3. Gunicorn:
   - Worker #5 picks up request

4. Flask:
   - Route /api/auth/login matches
   - Queries PostgreSQL
   - Validates password
   - Creates session
   - Returns JSON

⏱️ Response time: ~50-100ms (database query)
```

---

## 5. Performance Optimization

### Current Setup

| Content Type | Handler | Speed | Cache |
|--------------|---------|-------|-------|
| `/static/*.js` | nginx | ⚡⚡⚡ Very Fast | 1 year |
| `/static/*.css` | nginx | ⚡⚡⚡ Very Fast | 1 year |
| `/static/style.css` | Flask | ⚡⚡ Fast | None |
| `/ide-en` | Flask | ⚡ Moderate | None |
| `/api/*` | Flask | ⚡ Moderate | None |

### Optimization Tips

**1. Pre-build dynamic files**

For production, run `make release` to pre-generate:
```bash
make release  # Creates static files
```

This converts:
- `/static/style.css` → Real file (nginx can serve)
- `/static/page/blocks/toolbox.umd.js` → Real file
- `/ide-en` → `ide-en.html` file

**2. Add caching headers to Flask**

```python
@app.route("/ide-<lang>")
def call_ide(lang=None):
    response = make_response(ide(lang))
    response.headers['Cache-Control'] = 'public, max-age=3600'  # 1 hour
    return response
```

**3. Enable gzip in nginx**

Already enabled in `docker/nginx.conf`:
```nginx
gzip on;
gzip_types text/plain text/css text/javascript application/json;
```

**4. Database connection pooling**

For high traffic, use connection pooling:
```python
# In Flask config
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
    'pool_size': 10,
    'pool_recycle': 3600,
}
```

---

## 6. Monitoring and Debugging

### View Request Flow

**nginx access log:**
```bash
docker exec bipes_nginx tail -f /var/log/nginx/access.log
```

Example output:
```
192.168.1.100 - - [10/Dec/2024] "GET /static/libs/xterm.umd.js" 200 158000
192.168.1.100 - - [10/Dec/2024] "GET /ide-en" 200 45890
```

**Gunicorn access log:**
```bash
docker exec bipes_web tail -f /app/logs/access.log
```

**Flask debug output:**
```python
# In development
export FLASK_DEBUG=1
flask run
```

### Performance Testing

**Test static files (should be fast):**
```bash
time curl -k https://localhost/static/libs/xterm.umd.js > /dev/null
# Should be < 50ms
```

**Test dynamic content:**
```bash
time curl -k https://localhost/ide-en > /dev/null
# Should be < 500ms
```

**Load testing:**
```bash
# Install apache bench
sudo apt install apache2-utils

# Test static file
ab -n 1000 -c 10 https://localhost/static/libs/xterm.umd.js

# Test dynamic content
ab -n 100 -c 5 https://localhost/ide-en
```

---

## 7. Configuration Summary

### nginx (docker/nginx.conf)
✅ HTTPS termination
✅ Static file serving (`/static/*`)
✅ Proxy to Gunicorn (`/*`)
✅ WebSocket support (`/mqtt`)
✅ Caching headers
✅ Gzip compression

### Gunicorn (docker/gunicorn_config.py)
✅ Worker processes: `(cores × 2) + 1`
✅ Bind: `0.0.0.0:5000`
✅ Timeout: 120s
✅ Logging: `/app/logs/`

### Flask (app.py)
✅ ProxyFix middleware
✅ Dynamic routes
✅ Template rendering
✅ PostgreSQL connection
✅ Session management

### Docker (docker-compose.prod.yml)
✅ nginx: ports 80, 443
✅ web: Gunicorn + Flask
✅ postgres: Database
✅ mosquitto: MQTT broker
✅ Shared network
✅ Persistent volumes

---

## 8. Common Issues

### Issue: nginx serves 404 for /static/

**Cause**: Volume mount incorrect

**Fix:**
```yaml
nginx:
  volumes:
    - ./static:/usr/share/nginx/html/static:ro  # Check this path
```

### Issue: Flask sees wrong IP address

**Cause**: Missing ProxyFix

**Fix:**
```python
from werkzeug.middleware.proxy_fix import ProxyFix
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1)
```

### Issue: Gunicorn workers timeout

**Cause**: Request takes too long

**Fix:**
```python
# Increase timeout in gunicorn_config.py
timeout = 300  # 5 minutes
```

### Issue: Too many connections to database

**Cause**: Too many Gunicorn workers

**Fix:**
```python
# Reduce workers in gunicorn_config.py
workers = 4  # Instead of 9
```

---

## Next Steps

1. **Test the setup**: Access https://localhost
2. **Monitor logs**: `make deploy-logs`
3. **Load test**: Use `ab` or similar tools
4. **Optimize**: Run `make release` for production
5. **Scale**: Add more Gunicorn workers if needed

For more details, see [DEPLOYMENT.md](DEPLOYMENT.md)
