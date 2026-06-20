"""
Device management API.

Devices get individual MQTT credentials scoped through Mosquitto Dynamic
Security. Passwords are returned only at creation/rotation time.
"""

from __future__ import annotations

import re
import secrets
import time

from flask import Blueprint, Response, current_app, g, jsonify, request

from server.common import auth
from server.common import database as dbase
from server.common import mqtt
from server.common import mqtt_dynsec
from server.common import security


bp = Blueprint("devices_api", __name__, url_prefix="/api/devices")
_db = "API"
_TOPIC_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_./-]{0,120}$")
_MAX_DEVICES_PER_USER = 5   # cap per teacher/student (broker state + connections)


def _device_uid():
    return secrets.token_urlsafe(12).replace("-", "").replace("_", "")[:16]


def _device_username(device_uid):
    return f"dev-{device_uid}"


def _current_owner():
    user = auth.get_current_user()
    return user["user_type"], user["user_id"]


def _fetch_device(device_uid):
    owner_type, owner_id = _current_owner()
    db = dbase.get_db(_db)
    sql = dbase._s(
        """
        SELECT device_uid, display_name, mqtt_username, mqtt_topic_prefix,
               is_active, created_at, last_rotated_at, revoked_at
        FROM mqtt_devices
        WHERE device_uid = %s
          AND owner_user_type = %s
          AND owner_user_id = %s
        """
    )
    row = db.execute(sql, (device_uid, owner_type, owner_id)).fetchone()
    db.close()
    g.pop("db", None)
    return row


def _row_to_json(row):
    return {
        "device_uid": row[0],
        "display_name": row[1],
        "mqtt_username": row[2],
        "mqtt_topic_prefix": row[3],
        "is_active": row[4],
        "created_at": row[5],
        "last_rotated_at": row[6],
        "revoked_at": row[7],
    }


@bp.route("", methods=["GET"])
@auth.require_login()
def list_devices():
    owner_type, owner_id = _current_owner()
    db = dbase.get_db(_db)
    sql = dbase._s(
        """
        SELECT device_uid, display_name, mqtt_username, mqtt_topic_prefix,
               is_active, created_at, last_rotated_at, revoked_at
        FROM mqtt_devices
        WHERE owner_user_type = %s AND owner_user_id = %s
        ORDER BY created_at DESC
        """
    )
    rows = db.execute(sql, (owner_type, owner_id)).fetchall()
    db.close()
    g.pop("db", None)
    return jsonify({"devices": [_row_to_json(row) for row in rows]})


@bp.route("/browser-credentials", methods=["POST"])
@auth.require_login()
@security.require_same_origin()
def browser_credentials():
    """Mint short-lived, session-scoped MQTT credentials for the browser so it can
    connect to the broker over WebSocket and talk to its own WiFi devices (subscribe
    telemetry, publish commands). Never returns admin or cross-session access."""
    try:
        user = auth.get_current_user()
        session = mqtt.server_session_for_user(user)
        username, password = mqtt_dynsec.create_browser_client(session)
    except mqtt_dynsec.DynsecError as exc:
        try: current_app.logger.exception('browser MQTT provisioning failed: %s', exc)
        except Exception: pass
        return jsonify({"success": False, "error": "Could not provision MQTT access"}), 500

    return jsonify(
        {
            "success": True,
            "session": session,
            "mqtt_username": username,
            "mqtt_password": password,
        }
    )


# --- OTA (over-the-air program update) ----------------------------------------
# Flow: teacher POSTs the new program -> we store it under a single-use token and
# notify the device over MQTT (commands/ota = the fetch path). The device pulls the
# code over plain HTTP (port 80, token-gated) and reboots into it. The pending store
# is in the DB (not memory) so any gunicorn worker can serve the device's fetch.
_OTA_TTL = 180          # seconds a pending OTA stays fetchable
_OTA_MAX = 256 * 1024   # max program size


def _ensure_ota_table(db):
    db.execute(dbase._s(
        """
        CREATE TABLE IF NOT EXISTS ota_pending (
          token text PRIMARY KEY,
          device_uid text NOT NULL,
          code text NOT NULL,
          filename text,
          expiry double precision NOT NULL
        )
        """
    ))


@bp.route("/<device_uid>/ota", methods=["POST"])
@auth.require_login()
@security.require_same_origin()
def push_ota(device_uid):
    row = _fetch_device(device_uid)
    if row is None:
        return jsonify({"success": False, "error": "device not found"}), 404

    obj = request.json or {}
    code = obj.get("code")
    if not isinstance(code, str) or not code:
        return jsonify({"success": False, "error": "missing code"}), 400
    if len(code) > _OTA_MAX:
        return jsonify({"success": False, "error": "program too large"}), 413
    filename = obj.get("filename") or "blocks.py"

    token = secrets.token_urlsafe(24)
    prefix = row[3]   # mqtt_topic_prefix

    db = dbase.get_db(_db)
    _ensure_ota_table(db)
    db.execute(dbase._s("DELETE FROM ota_pending WHERE expiry < %s"), (time.time(),))
    db.execute(
        dbase._s("INSERT INTO ota_pending (token, device_uid, code, filename, expiry) VALUES (%s, %s, %s, %s, %s)"),
        (token, device_uid, code, filename, time.time() + _OTA_TTL),
    )
    db.commit()
    db.close()
    g.pop("db", None)

    # Notify the device over MQTT; it fetches the code over HTTP (port 80).
    if not mqtt.publish(f"{prefix}/commands/ota", f"/api/devices/ota/{token}"):
        return jsonify({"success": False, "error": "broker not connected"}), 503

    return jsonify({"success": True})


@bp.route("/ota/<token>", methods=["GET"])
def fetch_ota(token):
    """Token-gated, single-use program fetch for the device. No login (the device has
    no session); the token is delivered to it over the authenticated MQTT link and is
    served over plain HTTP on the LAN so the Pico avoids TLS."""
    db = dbase.get_db(_db)
    _ensure_ota_table(db)
    # Atomic claim: DELETE ... RETURNING fetches and consumes the token in one statement,
    # so two concurrent fetches can't both get the same single-use token (the old
    # SELECT-then-DELETE had a race across workers/threads).
    row = db.execute(
        dbase._s("DELETE FROM ota_pending WHERE token = %s RETURNING code, expiry"), (token,)
    ).fetchone()
    db.commit()
    db.close()
    g.pop("db", None)

    if row is None or row[1] < time.time():
        return Response("not found", status=404, mimetype="text/plain")
    return Response(row[0], mimetype="text/plain")


@bp.route("", methods=["POST"])
@auth.require_login()
@security.require_same_origin()
def create_device():
    try:
        obj = request.json or {}
        display_name = (obj.get("display_name") or "Pico device").strip()[:100]
        user = auth.get_current_user()
        owner_type, owner_id = user["user_type"], user["user_id"]

        # Per-user device cap (teacher AND student). Bounds broker state (one dynsec
        # client+role+ACLs per device), connection count, and provisioning cost.
        db = dbase.get_db(_db)
        count = db.execute(
            dbase._s(
                "SELECT count(*) FROM mqtt_devices "
                "WHERE owner_user_type = %s AND owner_user_id = %s"
            ),
            (owner_type, owner_id),
        ).fetchone()[0]
        db.close()
        g.pop("db", None)
        if count >= _MAX_DEVICES_PER_USER:
            return jsonify({
                "success": False,
                "error": f"device limit reached ({_MAX_DEVICES_PER_USER} per user) — remove one first",
            }), 409

        device_uid = _device_uid()
        mqtt_username = _device_username(device_uid)
        mqtt_password = mqtt_dynsec.generate_device_password()
        session = mqtt.server_session_for_user(user)
        topic_prefix = f"{session}/devices/{device_uid}"
        timestamp = auth.get_timestamp()

        mqtt_dynsec.create_device_client(mqtt_username, mqtt_password, session, device_uid)

        db = dbase.get_db(_db)
        sql = dbase._s(
            """
            INSERT INTO mqtt_devices
            (device_uid, owner_user_type, owner_user_id, display_name,
             mqtt_username, mqtt_topic_prefix, created_at, last_rotated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """
        )
        db.execute(
            sql,
            (
                device_uid,
                owner_type,
                owner_id,
                display_name,
                mqtt_username,
                topic_prefix,
                timestamp,
                timestamp,
            ),
        )
        db.commit()
        db.close()
        g.pop("db", None)

        security.log_auth_event(
            "mqtt_device_created",
            owner_type,
            owner_id,
            {"device_uid": device_uid, "mqtt_username": mqtt_username},
        )

        return jsonify(
            {
                "success": True,
                "device": {
                    "device_uid": device_uid,
                    "display_name": display_name,
                    "mqtt_username": mqtt_username,
                    "mqtt_password": mqtt_password,
                    "mqtt_topic_prefix": topic_prefix,
                    "telemetry_topic": f"{topic_prefix}/telemetry/<name>",
                    "command_topic": f"{topic_prefix}/commands/<name>",
                },
                "password_notice": "This MQTT password is shown once. Rotate it if you lose it.",
            }
        ), 201
    except Exception as exc:
        return security.server_error(exc)


@bp.route("/block-credentials", methods=["POST"])
@auth.require_login()
@security.require_same_origin()
def block_credentials():
    """Ready-to-use MQTT credentials for auto-filling a WiFi start block, so the
    student never copies them by hand. Reuses the user's most recent WiFi device
    (rotating its password so the returned value is valid), or creates one if they
    have none. Returns user/password/prefix; the browser fills host/port itself."""
    try:
        user = auth.get_current_user()
        owner_type, owner_id = user["user_type"], user["user_id"]

        db = dbase.get_db(_db)
        row = db.execute(
            dbase._s(
                "SELECT device_uid, mqtt_username, mqtt_topic_prefix FROM mqtt_devices "
                "WHERE owner_user_type = %s AND owner_user_id = %s "
                "ORDER BY created_at DESC LIMIT 1"
            ),
            (owner_type, owner_id),
        ).fetchone()
        db.close()
        g.pop("db", None)
        timestamp = auth.get_timestamp()

        if row is not None:
            device_uid, mqtt_username, topic_prefix = row[0], row[1], row[2]
            mqtt_password = mqtt_dynsec.rotate_device_password(mqtt_username)
            db = dbase.get_db(_db)
            db.execute(
                dbase._s("UPDATE mqtt_devices SET last_rotated_at = %s, is_active = TRUE, revoked_at = NULL WHERE device_uid = %s"),
                (timestamp, device_uid),
            )
            db.commit()
            db.close()
            g.pop("db", None)
        else:
            device_uid = _device_uid()
            mqtt_username = _device_username(device_uid)
            mqtt_password = mqtt_dynsec.generate_device_password()
            session = mqtt.server_session_for_user(user)
            topic_prefix = f"{session}/devices/{device_uid}"
            mqtt_dynsec.create_device_client(mqtt_username, mqtt_password, session, device_uid)
            db = dbase.get_db(_db)
            db.execute(
                dbase._s(
                    "INSERT INTO mqtt_devices (device_uid, owner_user_type, owner_user_id, "
                    "display_name, mqtt_username, mqtt_topic_prefix, created_at, last_rotated_at) "
                    "VALUES (%s, %s, %s, %s, %s, %s, %s, %s)"
                ),
                (device_uid, owner_type, owner_id, "Pico (WiFi block)",
                 mqtt_username, topic_prefix, timestamp, timestamp),
            )
            db.commit()
            db.close()
            g.pop("db", None)

        return jsonify({
            "success": True,
            "mqtt_username": mqtt_username,
            "mqtt_password": mqtt_password,
            "mqtt_topic_prefix": topic_prefix,
        })
    except Exception as exc:
        return security.server_error(exc)


@bp.route("/<string:device_uid>", methods=["DELETE"])
@auth.require_login()
@security.require_same_origin()
def delete_device(device_uid):
    row = _fetch_device(device_uid)
    if row is None:
        return jsonify({"error": "Device not found"}), 404

    mqtt_dynsec.delete_device(row[2], device_uid)
    db = dbase.get_db(_db)
    sql = dbase._s("DELETE FROM mqtt_devices WHERE device_uid = %s")
    db.execute(sql, (device_uid,))
    db.commit()
    db.close()
    g.pop("db", None)
    return jsonify({"success": True})
