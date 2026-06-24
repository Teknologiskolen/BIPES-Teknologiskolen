"""
Security helpers for audit logging, request validation, and CSRF protection.
"""

import base64
import hashlib
import hmac
import json
import secrets
import time
from functools import wraps

from flask import current_app, jsonify, request

from server.common import auth
from server.common import database as dbase


# Per-account login lockout: after this many failed attempts for ONE identifier within
# the window, further attempts are refused until the oldest failure ages out. Backed by
# the shared auth_events table, so it bounds DISTRIBUTED guessing of a single account
# across rotating IPs — the nginx `limit_req` only caps per-IP rate, which a botnet
# sidesteps. Generous enough not to lock out a fat-fingering teacher.
LOGIN_LOCK_THRESHOLD = 10
LOGIN_LOCK_WINDOW_SECONDS = 900
CSRF_COOKIE_NAME = "bipes_csrf"
CSRF_HEADER_NAME = "X-CSRF-Token"
CSRF_COOKIE_MAX_AGE = 12 * 60 * 60
SAFE_METHODS = frozenset(("GET", "HEAD", "OPTIONS", "TRACE"))


def _csrf_sign(payload: str) -> str:
    secret = str(current_app.config["SECRET_KEY"]).encode("utf-8")
    digest = hmac.new(secret, payload.encode("ascii"), hashlib.sha256).digest()
    return base64.urlsafe_b64encode(digest).decode("ascii").rstrip("=")


def generate_csrf_token() -> str:
    """Create a random, application-signed double-submit token."""
    payload = base64.urlsafe_b64encode(secrets.token_bytes(32)).decode("ascii").rstrip("=")
    return f"{payload}.{_csrf_sign(payload)}"


def valid_csrf_token(token: str) -> bool:
    if not token or token.count(".") != 1:
        return False
    payload, supplied_signature = token.split(".", 1)
    # 32 random bytes and one SHA-256 digest are each 43 unpadded Base64URL chars.
    if len(payload) != 43 or len(supplied_signature) != 43:
        return False
    return hmac.compare_digest(supplied_signature, _csrf_sign(payload))


def ensure_csrf_cookie(response):
    """Issue a readable signed CSRF cookie when the client has none or an invalid one."""
    token = request.cookies.get(CSRF_COOKIE_NAME, "")
    if valid_csrf_token(token):
        return response

    response.set_cookie(
        CSRF_COOKIE_NAME,
        generate_csrf_token(),
        max_age=CSRF_COOKIE_MAX_AGE,
        secure=current_app.config.get("SESSION_COOKIE_SECURE", True),
        httponly=False,
        samesite="Strict",
        path="/",
    )
    return response


def protect_request():
    """Reject unsafe API requests without a valid signed double-submit token."""
    if request.method.upper() in SAFE_METHODS or not request.path.startswith("/api/"):
        return None

    origin = request.headers.get("Origin")
    if origin and origin.rstrip("/") != request.host_url.rstrip("/"):
        return jsonify({"error": "Invalid origin"}), 403

    cookie_token = request.cookies.get(CSRF_COOKIE_NAME, "")
    header_token = request.headers.get(CSRF_HEADER_NAME, "")
    if (
        not cookie_token
        or not header_token
        or not hmac.compare_digest(cookie_token, header_token)
        or not valid_csrf_token(cookie_token)
    ):
        return jsonify({"error": "Invalid CSRF token"}), 403

    return None


def login_failure_lock(event_type, lock_key,
                       threshold=LOGIN_LOCK_THRESHOLD,
                       window_seconds=LOGIN_LOCK_WINDOW_SECONDS):
    """If (event_type, lock_key) has reached `threshold` failures within `window_seconds`,
    return the seconds to wait (>0); otherwise 0. Fail-OPEN on any error so a DB/logging
    hiccup can never lock every user out."""
    if current_app.config.get('DATABASE') != 'postgresql':
        return 0
    if not dbase.has_table('API', ('auth_events',)):
        return 0
    try:
        cutoff = time.time() - window_seconds
        db = dbase.get_db('API')
        row = db.execute(dbase._s(
            "SELECT count(*), min(created_at) FROM auth_events "
            "WHERE event_type = %s AND target_id = %s AND created_at >= %s"),
            (event_type, str(lock_key), cutoff)).fetchone()
        if row and row[0] and row[0] >= threshold:
            oldest = row[1] or cutoff
            return max(1, int(window_seconds - (time.time() - oldest)))
        return 0
    except Exception:
        return 0


def server_error(exc=None, message='Internal server error'):
    """Generic 500 body, with the real exception logged server-side instead of returned
    to the client. Returning str(exc) can leak SQL fragments / internal paths to anyone
    who can trigger an error. Use: `return security.server_error(e)`."""
    try:
        if exc is not None:
            current_app.logger.exception('Unhandled error: %s', exc)
    except Exception:
        pass
    return jsonify({'error': message}), 500


def get_client_ip():
    # ProxyFix(x_for=1) already rewrites request.remote_addr to the client IP taken from
    # the RIGHT-most (trusted) X-Forwarded-For hop that our own nginx appends. Do NOT read
    # the raw header's LEFT-most value: nginx appends the real IP to whatever the client
    # sent, so the left-most entry is attacker-controlled and would let anyone forge the
    # IP recorded in auth_events. Use the proxy-resolved address instead.
    return request.remote_addr


def require_same_origin():
    """
    Defense-in-depth Origin validation for sensitive write endpoints.
    Signed CSRF-token validation is applied globally to all unsafe /api requests.
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            origin = request.headers.get('Origin')
            if origin:
                expected = request.host_url.rstrip('/')
                if origin.rstrip('/') != expected:
                    return jsonify({'error': 'Invalid origin'}), 403
            return f(*args, **kwargs)
        return decorated_function
    return decorator


def log_auth_event(event_type, target_type=None, target_id=None, details=None):
    """
    Store a security/audit event if the auth_events table exists.
    Safe to call before migrations are in place.
    """
    if current_app.config.get('DATABASE') != 'postgresql':
        return

    if not dbase.has_table('API', ('auth_events',)):
        return

    user = auth.get_current_user()
    payload = json.dumps(details or {})

    dbase.insert(
        'API',
        'auth_events',
        ['user_type', 'user_id', 'event_type', 'target_type', 'target_id', 'ip_address', 'details'],
        (
            user['user_type'] if user else None,
            user['user_id'] if user else None,
            event_type,
            target_type,
            str(target_id) if target_id is not None else None,
            get_client_ip(),
            payload
        )
    )
