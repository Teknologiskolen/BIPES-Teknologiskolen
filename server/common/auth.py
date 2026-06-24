"""
Core authentication module for BIPES.
Provides password hashing, database-backed session management, and helpers.
"""

from __future__ import annotations

import hashlib
import os
import secrets
import string
import time
from collections import defaultdict, deque
from functools import wraps

from flask import current_app, g, jsonify, redirect, request, url_for
from werkzeug.security import check_password_hash

from server.common import database as dbase

_RATE_LIMIT_STORE = defaultdict(deque)
_SESSION_COOKIE_NAME = "bipes_session"
_DEFAULT_SESSION_LIFETIME = 60 * 60
_DEFAULT_SESSION_ROTATE_INTERVAL = 15 * 60
_DEFAULT_SESSION_ABSOLUTE_LIFETIME = 12 * 60 * 60
# Hard upper bound on an accepted password. Argon2 pre-hashes the ENTIRE input, so a
# multi-megabyte password burns CPU + 64 MB of RAM per attempt — a cheap DoS on the
# 1-vCPU/2 GB box. Enforced on every hashing path (login, change-password, dummy verify),
# not only at registration. 128 chars comfortably covers any real passphrase.
PASSWORD_MAX_LENGTH = 128


#------------------------------------------------------------------------
# Password Management
#------------------------------------------------------------------------

def _get_password_pepper() -> str:
    pepper = current_app.config.get("PASSWORD_PEPPER")
    if not pepper:
        raise RuntimeError("PASSWORD_PEPPER is not configured")
    return pepper


def _pepper_password(password: str) -> str:
    return f"{password}{_get_password_pepper()}"


def _argon2_hasher():
    try:
        from argon2 import PasswordHasher
        from argon2.low_level import Type
    except ModuleNotFoundError as exc:
        raise RuntimeError(
            "argon2-cffi is required for password hashing. Install it in the app environment."
        ) from exc

    return PasswordHasher(
        time_cost=current_app.config.get("PASSWORD_ARGON2_TIME_COST", 3),
        memory_cost=current_app.config.get("PASSWORD_ARGON2_MEMORY_COST", 65536),
        parallelism=current_app.config.get("PASSWORD_ARGON2_PARALLELISM", 4),
        hash_len=current_app.config.get("PASSWORD_ARGON2_HASH_LEN", 32),
        salt_len=current_app.config.get("PASSWORD_ARGON2_SALT_LEN", 16),
        type=Type.ID,
    )


def hash_password(password: str) -> str:
    """
    Hash a password using Argon2id and an application-level pepper.
    """
    return _argon2_hasher().hash(_pepper_password(password))


def verify_password(password: str, password_hash: str) -> bool:
    """
    Verify a password against a stored hash.

    Supports legacy Werkzeug PBKDF2 hashes so old accounts can migrate on login.
    """
    if not password_hash:
        return False

    peppered = _pepper_password(password)
    if password_hash.startswith("$argon2id$"):
        try:
            return _argon2_hasher().verify(password_hash, peppered)
        except Exception:
            return False

    return check_password_hash(password_hash, peppered) or check_password_hash(password_hash, password)


def password_hash_needs_upgrade(password_hash: str) -> bool:
    if not password_hash or not password_hash.startswith("$argon2id$"):
        return True

    try:
        return _argon2_hasher().check_needs_rehash(password_hash)
    except Exception:
        return True


_DUMMY_PASSWORD_HASH = None


def dummy_password_verify(password: str) -> None:
    """Run a constant-cost Argon2 verification against a throwaway hash.

    Login handlers return immediately when the account doesn't exist, so an attacker
    can tell a real email/student from a fake one by timing the response (only real
    accounts pay the Argon2 cost). Call this on the not-found branch to equalise the
    timing and close that user-enumeration oracle. The hash is computed once and cached.
    """
    global _DUMMY_PASSWORD_HASH
    try:
        if _DUMMY_PASSWORD_HASH is None:
            _DUMMY_PASSWORD_HASH = hash_password("bipes-timing-equaliser")
        # Cap the input here too so the not-found branch can't be used to force an
        # unbounded Argon2 pre-hash (defence in depth — handlers also reject early).
        _argon2_hasher().verify(_DUMMY_PASSWORD_HASH, _pepper_password((password or "")[:PASSWORD_MAX_LENGTH]))
    except Exception:
        pass


#------------------------------------------------------------------------
# Class / Student Password Generation
#------------------------------------------------------------------------

def generate_initial_password() -> str:
    chars = string.ascii_uppercase + string.ascii_lowercase + string.digits
    rng = secrets.SystemRandom()
    password = [
        secrets.choice(string.ascii_uppercase),
        secrets.choice(string.ascii_lowercase),
        secrets.choice(string.digits),
    ]
    password += [secrets.choice(chars) for _ in range(5)]
    rng.shuffle(password)
    return "".join(password)


def generate_class_code() -> str:
    letters_1 = "".join(secrets.choice(string.ascii_uppercase) for _ in range(3))
    digits = "".join(secrets.choice(string.digits) for _ in range(3))
    letters_2 = "".join(secrets.choice(string.ascii_uppercase) for _ in range(2))
    return f"{letters_1}{digits}{letters_2}"


#------------------------------------------------------------------------
# Session Management
#------------------------------------------------------------------------

def _session_cookie_name() -> str:
    return current_app.config.get("AUTH_SESSION_COOKIE_NAME", _SESSION_COOKIE_NAME)


def _session_lifetime() -> int:
    return int(current_app.config.get("AUTH_SESSION_LIFETIME_SECONDS", _DEFAULT_SESSION_LIFETIME))


def _session_rotate_interval() -> int:
    return int(
        current_app.config.get(
            "AUTH_SESSION_ROTATE_INTERVAL_SECONDS",
            _DEFAULT_SESSION_ROTATE_INTERVAL,
        )
    )


def _session_absolute_lifetime() -> int:
    return int(
        current_app.config.get(
            "AUTH_SESSION_ABSOLUTE_LIFETIME_SECONDS",
            _DEFAULT_SESSION_ABSOLUTE_LIFETIME,
        )
    )


def _token_digest(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _set_pending_cookie(token: str | None) -> None:
    g.auth_cookie_to_set = token
    g.auth_cookie_to_clear = token is None


def _clear_pending_cookie() -> None:
    g.auth_cookie_to_set = None
    g.auth_cookie_to_clear = True


def _create_session_record(user_id: int, user_type: str) -> str:
    token = secrets.token_urlsafe(32)
    digest = _token_digest(token)
    now = get_timestamp()
    expires_at = now + _session_lifetime()
    db = dbase.get_db("API")
    sql = dbase._s(
        """
        INSERT INTO auth_sessions
        (session_token_hash, user_type, user_id, created_at, last_seen_at,
         expires_at, rotated_at, ip_address, user_agent)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
    )
    db.execute(
        sql,
        (
            digest,
            user_type,
            user_id,
            now,
            now,
            expires_at,
            now,
            request.headers.get("X-Forwarded-For", request.remote_addr),
            request.headers.get("User-Agent", ""),
        ),
    )
    db.commit()
    db.close()
    g.pop("db", None)
    return token


def _revoke_session_by_token(token: str | None) -> None:
    if not token:
        return
    db = dbase.get_db("API")
    sql = dbase._s(
        """
        UPDATE auth_sessions
        SET revoked_at = %s
        WHERE session_token_hash = %s AND revoked_at IS NULL
        """
    )
    db.execute(sql, (get_timestamp(), _token_digest(token)))
    db.commit()
    db.close()
    g.pop("db", None)


def _rotate_session_token(session_id: int) -> str:
    token = secrets.token_urlsafe(32)
    digest = _token_digest(token)
    now = get_timestamp()
    expires_at = now + _session_lifetime()
    db = dbase.get_db("API")
    sql = dbase._s(
        """
        UPDATE auth_sessions
        SET session_token_hash = %s,
            last_seen_at = %s,
            expires_at = %s,
            rotated_at = %s
        WHERE session_id = %s
        """
    )
    db.execute(sql, (digest, now, expires_at, now, session_id))
    db.commit()
    db.close()
    g.pop("db", None)
    return token


def _touch_session(session_id: int) -> None:
    now = get_timestamp()
    db = dbase.get_db("API")
    sql = dbase._s(
        """
        UPDATE auth_sessions
        SET last_seen_at = %s,
            expires_at = %s
        WHERE session_id = %s
        """
    )
    db.execute(sql, (now, now + _session_lifetime(), session_id))
    db.commit()
    db.close()
    g.pop("db", None)


def _load_user_from_session() -> dict | None:
    token = request.cookies.get(_session_cookie_name())
    if not token:
        return None

    db = dbase.get_db("API")
    sql = dbase._s(
        """
        SELECT s.session_id,
               s.user_type,
               s.user_id,
               s.expires_at,
               s.created_at,
               s.rotated_at,
               t.full_name,
               t.email,
               t.is_active,
               st.student_name,
               st.is_active
        FROM auth_sessions s
        LEFT JOIN teachers t
          ON s.user_type = 'teacher'
         AND t.teacher_id = s.user_id
        LEFT JOIN students st
          ON s.user_type = 'student'
         AND st.student_id = s.user_id
        WHERE s.session_token_hash = %s
          AND s.revoked_at IS NULL
        """
    )
    row = db.execute(sql, (_token_digest(token),)).fetchone()
    db.close()
    g.pop("db", None)

    if row is None:
        _clear_pending_cookie()
        return None

    (
        session_id,
        user_type,
        user_id,
        expires_at,
        created_at,
        rotated_at,
        teacher_name,
        teacher_email,
        teacher_active,
        student_name,
        student_active,
    ) = row

    now = get_timestamp()
    if expires_at is None or float(expires_at) <= now:
        _revoke_session_by_token(token)
        _clear_pending_cookie()
        return None

    # Absolute cap: even a continuously-active session is killed once it exceeds the
    # maximum age (sliding-window idle expiry above keeps extending expires_at, so
    # without this a session could live forever). Forces periodic re-authentication.
    abs_lifetime = _session_absolute_lifetime()
    if abs_lifetime and created_at is not None and (now - float(created_at)) >= abs_lifetime:
        _revoke_session_by_token(token)
        _clear_pending_cookie()
        return None

    if user_type == "teacher":
        if not teacher_active:
            _revoke_session_by_token(token)
            _clear_pending_cookie()
            return None
        user = {
            "user_id": user_id,
            "user_type": user_type,
            "name": teacher_name,
            "email": teacher_email,
        }
    else:
        if not student_active:
            _revoke_session_by_token(token)
            _clear_pending_cookie()
            return None
        user = {
            "user_id": user_id,
            "user_type": user_type,
            "name": student_name,
            "email": None,
        }

    g.auth_session_id = session_id
    g.auth_session_token = token
    g.auth_user = user

    if rotated_at is None or (now - float(rotated_at)) >= _session_rotate_interval():
        new_token = _rotate_session_token(session_id)
        _set_pending_cookie(new_token)
    else:
        _touch_session(session_id)

    return user


def get_current_user() -> dict | None:
    if hasattr(g, "auth_user"):
        return g.auth_user
    return _load_user_from_session()


def set_user_session(user_id: int, user_type: str, name: str, email: str | None = None) -> None:
    """
    Create a new opaque session token and schedule it to be set in the response cookie.
    """
    current_token = request.cookies.get(_session_cookie_name())
    if current_token:
        _revoke_session_by_token(current_token)

    token = _create_session_record(user_id, user_type)
    g.auth_user = {
        "user_id": user_id,
        "user_type": user_type,
        "name": name,
        "email": email,
    }
    _set_pending_cookie(token)


def clear_user_session() -> None:
    _revoke_session_by_token(request.cookies.get(_session_cookie_name()))
    _clear_pending_cookie()
    g.auth_user = None


def revoke_other_sessions(user_type: str, user_id: int, keep_session_id: int | None = None) -> None:
    """Revoke every live session for a user, optionally keeping one (the current one).

    Call after a password change so any other live session — including one held by an
    attacker who had the old credentials — is invalidated. Sessions are validated
    independently of the password, so without this a password change does not lock
    anyone else out.
    """
    db = dbase.get_db("API")
    now = get_timestamp()
    if keep_session_id is None:
        sql = dbase._s(
            "UPDATE auth_sessions SET revoked_at = %s "
            "WHERE user_type = %s AND user_id = %s AND revoked_at IS NULL"
        )
        params = (now, user_type, user_id)
    else:
        sql = dbase._s(
            "UPDATE auth_sessions SET revoked_at = %s "
            "WHERE user_type = %s AND user_id = %s AND revoked_at IS NULL "
            "AND session_id <> %s"
        )
        params = (now, user_type, user_id, keep_session_id)
    db.execute(sql, params)
    db.commit()
    db.close()
    g.pop("db", None)


def finalize_auth_response(response):
    cookie_name = _session_cookie_name()

    if getattr(g, "auth_cookie_to_clear", False):
        response.delete_cookie(cookie_name, path="/")

    token = getattr(g, "auth_cookie_to_set", None)
    if token:
        response.set_cookie(
            cookie_name,
            token,
            max_age=_session_lifetime(),
            secure=current_app.config.get("SESSION_COOKIE_SECURE", True),
            httponly=current_app.config.get("SESSION_COOKIE_HTTPONLY", True),
            samesite=current_app.config.get("SESSION_COOKIE_SAMESITE", "Lax"),
            path="/",
        )

    return response


def is_authenticated() -> bool:
    return get_current_user() is not None


#------------------------------------------------------------------------
# Decorators for Route Protection
#------------------------------------------------------------------------

def require_login():
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not is_authenticated():
                return jsonify({"error": "Authentication required"}), 401
            return f(*args, **kwargs)

        return decorated_function

    return decorator


def require_teacher():
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            user = get_current_user()
            if not user or user["user_type"] != "teacher":
                return jsonify({"error": "Teacher access required"}), 403
            return f(*args, **kwargs)

        return decorated_function

    return decorator


def require_student():
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            user = get_current_user()
            if not user or user["user_type"] != "student":
                return jsonify({"error": "Student access required"}), 403
            return f(*args, **kwargs)

        return decorated_function

    return decorator


def require_teacher_page():
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            user = get_current_user()
            if not user:
                return redirect(url_for("landing"))
            if user["user_type"] != "teacher":
                return redirect(url_for("call_ide"))
            return f(*args, **kwargs)

        return decorated_function

    return decorator


def require_student_page():
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            user = get_current_user()
            if not user:
                return redirect(url_for("landing"))
            if user["user_type"] != "student":
                return redirect(url_for("call_ide"))
            return f(*args, **kwargs)

        return decorated_function

    return decorator


def require_teacher_or_student():
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            user = get_current_user()
            if not user or user["user_type"] not in ["teacher", "student"]:
                return jsonify({"error": "Authentication required"}), 403
            return f(*args, **kwargs)

        return decorated_function

    return decorator


def rate_limit(limit=5, window_seconds=300, key_func=None):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            now = time.time()
            key = key_func() if callable(key_func) else f"{request.remote_addr}:{request.path}"
            bucket = _RATE_LIMIT_STORE[key]

            while bucket and now - bucket[0] >= window_seconds:
                bucket.popleft()

            if len(bucket) >= limit:
                retry_after = max(1, int(window_seconds - (now - bucket[0])))
                response = jsonify({"error": "Too many requests", "retry_after": retry_after})
                response.status_code = 429
                response.headers["Retry-After"] = str(retry_after)
                return response

            bucket.append(now)
            return f(*args, **kwargs)

        return decorated_function

    return decorator


#------------------------------------------------------------------------
# Utility Functions
#------------------------------------------------------------------------

def get_timestamp() -> float:
    return time.time()


def validate_password_strength(password: str) -> tuple[bool, str]:
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    # Upper bound: Argon2 hashing cost scales with input length, so an attacker who
    # submits a multi-megabyte "password" can burn CPU/memory (DoS) on every attempt.
    if len(password) > 128:
        return False, "Password must be at most 128 characters long"

    return True, ""


def validate_email(email: str) -> bool:
    import re

    pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
    return re.match(pattern, email) is not None


# Teacher accounts are created server-side (see scripts/add_teacher.py); there is no
# self-registration endpoint or gating.
