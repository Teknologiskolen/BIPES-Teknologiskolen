"""
Security helpers for audit logging and basic request validation.
"""

import json
from functools import wraps

from flask import current_app, jsonify, request

from server.common import auth
from server.common import database as dbase


def get_client_ip():
    forwarded_for = request.headers.get('X-Forwarded-For')
    if forwarded_for:
        return forwarded_for.split(',')[0].strip()
    return request.remote_addr


def require_same_origin():
    """
    Lightweight CSRF mitigation for cookie-authenticated write requests.
    Allows requests without an Origin header (some same-origin browser cases),
    but rejects explicit cross-origin writes.
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
