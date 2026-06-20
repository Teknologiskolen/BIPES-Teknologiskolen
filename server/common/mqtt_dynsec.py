"""
Mosquitto Dynamic Security helpers.

The browser never receives broker credentials. Flask uses these helpers to
create scoped MQTT clients for devices and one server-side bridge client.
"""

from __future__ import annotations

import os
import secrets
import subprocess
from dataclasses import dataclass

from flask import current_app


class DynsecError(RuntimeError):
    pass


@dataclass
class DynsecConfig:
    host: str
    port: str
    admin_username: str
    admin_password: str
    server_username: str
    server_password: str


def is_enabled() -> bool:
    return os.environ.get("MOSQUITTO_DYNSEC_ENABLED", "false").lower() in ("1", "true", "yes")


def _config() -> DynsecConfig:
    admin_password = os.environ.get("MOSQUITTO_DYNSEC_ADMIN_PASSWORD")
    server_password = os.environ.get("MOSQUITTO_PASSWORD")

    if not admin_password:
        raise DynsecError("MOSQUITTO_DYNSEC_ADMIN_PASSWORD is not configured")
    if not server_password:
        raise DynsecError("MOSQUITTO_PASSWORD is not configured")

    return DynsecConfig(
        host=os.environ.get("MOSQUITTO_HOST", "broker"),
        port=os.environ.get("MOSQUITTO_PORT", "1883"),
        admin_username=os.environ.get("MOSQUITTO_DYNSEC_ADMIN_USERNAME", "admin"),
        admin_password=admin_password,
        server_username=os.environ.get("MOSQUITTO_USERNAME", "bipes-server"),
        server_password=server_password,
    )


def _run_dynsec(command, *args, input_text=None, check=True):
    conf = _config()
    cmd = [
        "mosquitto_ctrl",
        "-h",
        conf.host,
        "-p",
        str(conf.port),
        "-u",
        conf.admin_username,
        "-P",
        conf.admin_password,
        "dynsec",
        command,
        *[str(arg) for arg in args],
    ]

    try:
        result = subprocess.run(
            cmd,
            input=input_text,
            text=True,
            capture_output=True,
            timeout=10,
            check=False,
        )
    except FileNotFoundError as exc:
        raise DynsecError("mosquitto_ctrl was not found in the web container") from exc
    except subprocess.TimeoutExpired as exc:
        raise DynsecError(f"mosquitto_ctrl dynsec {command} timed out") from exc

    if check and result.returncode != 0:
        details = (result.stderr or result.stdout or "").strip()
        raise DynsecError(f"mosquitto_ctrl dynsec {command} failed: {details}")

    return result


def _dynsec_missing(result):
    # mosquitto_ctrl's get* subcommands exit 0 even when the entity is absent
    # (printing "Error: ... not found"), so the return code can't be trusted for
    # existence — inspect the output text instead.
    text = (result.stdout or "") + (result.stderr or "")
    return "not found" in text.lower()


def _ensure_role(role_name):
    if not _dynsec_missing(_run_dynsec("getRole", role_name, check=False)):
        return

    _run_dynsec("createRole", role_name, check=False)


def _ensure_client(username, password):
    if _dynsec_missing(_run_dynsec("getClient", username, check=False)):
        # createClient prompts for the new client password twice. Use a throwaway
        # password, then set the real one non-interactively below.
        temp_password = secrets.token_urlsafe(16)
        _run_dynsec("createClient", username, input_text=f"{temp_password}\n{temp_password}\n", check=False)

    _run_dynsec("setClientPassword", username, password, check=False)
    _run_dynsec("enableClient", username, check=False)


def _add_acl(role_name, acl_type, topic_filter, priority=10):
    _run_dynsec("addRoleACL", role_name, acl_type, topic_filter, "allow", priority, check=False)


def _assign_role(username, role_name, priority=10):
    _run_dynsec("addClientRole", username, role_name, priority, check=False)


def ensure_server_bridge_client(app=None):
    if not is_enabled():
        return

    conf = _config()
    role_name = "bipes-server-bridge"

    _ensure_role(role_name)
    _add_acl(role_name, "publishClientSend", "+/devices/+/commands/#", 20)
    _add_acl(role_name, "publishClientSend", "+/devices/+/telemetry/#", 10)
    _add_acl(role_name, "publishClientReceive", "+/devices/+/telemetry/#", 20)
    _add_acl(role_name, "subscribePattern", "+/devices/+/telemetry/#", 20)
    _add_acl(role_name, "unsubscribePattern", "+/devices/+/telemetry/#", 20)
    # The bridge is the trusted server-side storage client: it subscribes to "+/#"
    # to persist ALL session traffic (device telemetry for the online dot + legacy
    # EasyMQTT topics). Without a matching broad subscribe/receive ACL the broker
    # denies the "+/#" subscription and nothing is ever stored. "+/#" never matches
    # $SYS, so this stays scoped to application sessions.
    _add_acl(role_name, "subscribePattern", "+/#", 5)
    _add_acl(role_name, "publishClientReceive", "+/#", 5)
    _ensure_client(conf.server_username, conf.server_password)
    _assign_role(conf.server_username, role_name, 20)

    if app:
        app.logger.info("Ensured Mosquitto Dynamic Security server bridge client")


def create_device_client(username, password, session, device_uid):
    role_name = f"bipes-device-{device_uid}"
    telemetry = f"{session}/devices/{device_uid}/telemetry/#"
    commands = f"{session}/devices/{device_uid}/commands/#"

    _ensure_role(role_name)
    _add_acl(role_name, "publishClientSend", telemetry, 20)
    _add_acl(role_name, "publishClientReceive", commands, 20)
    _add_acl(role_name, "subscribePattern", commands, 20)
    _add_acl(role_name, "unsubscribePattern", commands, 20)
    _ensure_client(username, password)
    _assign_role(username, role_name, 20)


def create_browser_client(session):
    """Mint a browser MQTT client scoped to ONE teacher session.

    The client may only subscribe to / receive device telemetry and publish device
    commands within its own session — never broker admin, never other sessions. The
    password is rotated on every call and returned to the caller (never stored), so
    the browser holds a short-lived, narrowly-scoped credential.
    """
    username = f"ui-{session}"
    role_name = f"bipes-ui-{session}"
    telemetry = f"{session}/devices/+/telemetry/#"
    commands = f"{session}/devices/+/commands/#"

    _ensure_role(role_name)
    _add_acl(role_name, "subscribePattern", telemetry, 20)
    _add_acl(role_name, "unsubscribePattern", telemetry, 20)
    _add_acl(role_name, "publishClientReceive", telemetry, 20)
    _add_acl(role_name, "publishClientSend", commands, 20)

    password = generate_device_password()
    _ensure_client(username, password)
    _assign_role(username, role_name, 20)
    return username, password


def rotate_device_password(username):
    password = generate_device_password()
    _run_dynsec("setClientPassword", username, password)
    _run_dynsec("enableClient", username, check=False)
    return password


def delete_device(username, device_uid):
    role_name = f"bipes-device-{device_uid}"
    _run_dynsec("deleteClient", username, check=False)
    _run_dynsec("deleteRole", role_name, check=False)


def generate_device_password():
    return secrets.token_urlsafe(24)
