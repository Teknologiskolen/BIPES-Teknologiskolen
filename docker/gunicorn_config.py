"""Gunicorn configuration for BIPES.

Tuned for a small all-in-one VM (1 vCPU / 2 GB RAM running web + nginx + broker +
Postgres together). On a single core, extra worker PROCESSES only add memory and
context-switching; concurrency for mostly-idle IDE requests comes from THREADS. So
we run a couple of gthread workers with several threads each rather than the
cpu*2+1 sync workers that suit a big multi-core box.

Both counts are env-overridable, so moving to bigger hardware is a config change:
    GUNICORN_WORKERS  (default 2)
    GUNICORN_THREADS  (default 8)

The Webdock production override sets these to 1 worker / 4 threads. That is a
safer baseline on one vCPU because password hashing can temporarily consume
64 MB per request.
"""

import os

# Server socket
bind = "0.0.0.0:5000"
backlog = 2048

# Worker processes / threads.
# 2 workers x 8 threads = up to 16 concurrent requests on ~2 process footprints
# (~400-500 MB), leaving room for Postgres + mosquitto + nginx + OS within 2 GB.
workers = int(os.environ.get("GUNICORN_WORKERS", "2"))
threads = int(os.environ.get("GUNICORN_THREADS", "8"))
worker_class = "gthread"
timeout = 120

# Recycle workers periodically so any slow memory creep can't accumulate on a
# RAM-constrained box (jitter avoids all workers recycling at once).
max_requests = 400
max_requests_jitter = 50

# Logging
accesslog = "/app/logs/access.log"
errorlog = "/app/logs/error.log"
loglevel = "info"

# Process naming
proc_name = "bipes"
