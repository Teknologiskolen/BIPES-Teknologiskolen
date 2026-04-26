"""
Device management API.

Devices get individual MQTT credentials scoped through Mosquitto Dynamic
Security. Passwords are returned only at creation/rotation time.
"""

from __future__ import annotations

import re
import secrets

from flask import Blueprint, g, jsonify, request

from server.common import auth
from server.common import database as dbase
from server.common import mqtt
from server.common import mqtt_dynsec
from server.common import security


bp = Blueprint("devices_api", __name__, url_prefix="/api/devices")
_db = "API"
_TOPIC_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_./-]{0,120}$")


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


@bp.route("", methods=["POST"])
@auth.require_login()
@security.require_same_origin()
def create_device():
    try:
        obj = request.json or {}
        display_name = (obj.get("display_name") or "Pico device").strip()[:100]
        user = auth.get_current_user()
        owner_type, owner_id = user["user_type"], user["user_id"]
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
        return jsonify({"error": str(exc)}), 500


@bp.route("/<string:device_uid>/rotate", methods=["POST"])
@auth.require_login()
@security.require_same_origin()
def rotate_device(device_uid):
    try:
        row = _fetch_device(device_uid)
        if row is None:
            return jsonify({"error": "Device not found"}), 404

        mqtt_password = mqtt_dynsec.rotate_device_password(row[2])
        timestamp = auth.get_timestamp()
        db = dbase.get_db(_db)
        sql = dbase._s("UPDATE mqtt_devices SET last_rotated_at = %s, is_active = TRUE, revoked_at = NULL WHERE device_uid = %s")
        db.execute(sql, (timestamp, device_uid))
        db.commit()
        db.close()
        g.pop("db", None)

        owner_type, owner_id = _current_owner()
        security.log_auth_event("mqtt_device_rotated", owner_type, owner_id, {"device_uid": device_uid})
        return jsonify({"success": True, "mqtt_password": mqtt_password})
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@bp.route("/<string:device_uid>/disable", methods=["POST"])
@auth.require_login()
@security.require_same_origin()
def disable_device(device_uid):
    row = _fetch_device(device_uid)
    if row is None:
        return jsonify({"error": "Device not found"}), 404

    mqtt_dynsec.disable_device(row[2])
    timestamp = auth.get_timestamp()
    db = dbase.get_db(_db)
    sql = dbase._s("UPDATE mqtt_devices SET is_active = FALSE, revoked_at = %s WHERE device_uid = %s")
    db.execute(sql, (timestamp, device_uid))
    db.commit()
    db.close()
    g.pop("db", None)
    return jsonify({"success": True})


@bp.route("/<string:device_uid>/enable", methods=["POST"])
@auth.require_login()
@security.require_same_origin()
def enable_device(device_uid):
    row = _fetch_device(device_uid)
    if row is None:
        return jsonify({"error": "Device not found"}), 404

    mqtt_dynsec.enable_device(row[2])
    db = dbase.get_db(_db)
    sql = dbase._s("UPDATE mqtt_devices SET is_active = TRUE, revoked_at = NULL WHERE device_uid = %s")
    db.execute(sql, (device_uid,))
    db.commit()
    db.close()
    g.pop("db", None)
    return jsonify({"success": True})


@bp.route("/<string:device_uid>/command", methods=["POST"])
@auth.require_login()
@security.require_same_origin()
def send_device_command(device_uid):
    row = _fetch_device(device_uid)
    if row is None:
        return jsonify({"error": "Device not found"}), 404

    if not row[4]:
        return jsonify({"error": "Device is disabled"}), 409

    obj = request.json or {}
    command = (obj.get("command") or obj.get("topic") or "").strip().strip("/")
    payload = str(obj.get("payload", ""))

    if not _TOPIC_RE.fullmatch(command) or "+" in command or "#" in command:
        return jsonify({"error": "Invalid command topic"}), 400

    topic = f"{row[3]}/commands/{command}"
    if not mqtt.publish(topic, payload):
        return jsonify({"error": "EasyMQTT broker is not connected"}), 503

    owner_type, owner_id = _current_owner()
    security.log_auth_event(
        "mqtt_device_command_sent",
        owner_type,
        owner_id,
        {"device_uid": device_uid, "command": command},
    )
    return jsonify({"success": True, "topic": topic})


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
