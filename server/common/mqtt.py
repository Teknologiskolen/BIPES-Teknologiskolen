
from flask import current_app
from flask_mqtt import Mqtt
import base64
import hashlib
import hmac

from server.common import auth

#--------------------------------------------------------------------------
# Server-side MQTT client.
#
# The browser talks to the broker directly over websockets (nginx /wss) using
# short-lived, per-device credentials; physical devices connect over TLS (8883).
# The Flask app itself only needs to PUBLISH (e.g. the OTA-notify in devices.py) —
# it does not subscribe to or store any telemetry. The legacy EasyMQTT HTTP
# store/relay (the /mqtt/<session>/... endpoints and the "+/#" subscriber) was
# removed; only the publish client and the per-user session helper remain.
#--------------------------------------------------------------------------


def server_session_for_user(user=None):
    """Stable per-user MQTT session id: an HMAC of the user's identity under the
    app SECRET_KEY. Used by devices.py to scope a user's device topic prefixes so
    they aren't guessable/forgeable."""
    user = user or auth.get_current_user()
    if not user:
        return None

    secret = current_app.config.get('SECRET_KEY') or current_app.config.get('FLASK_SECRET_KEY')
    message = f"{user['user_type']}:{user['user_id']}".encode('utf-8')
    digest = hmac.new(str(secret).encode('utf-8'), message, hashlib.sha256).digest()
    token = base64.b32encode(digest).decode('ascii').lower().rstrip('=')[:15]
    return f"u{token}"


def publish(topic, payload):
    mqtt_client = current_app.extensions.get('bipes_mqtt')
    if mqtt_client is None:
        return False

    mqtt_client.publish(topic, payload)
    return True


def listen(app, conf):
    """Initialise a PUBLISH-ONLY MQTT client on the app (no subscription, no storage).
    Every gunicorn worker can publish (OTA notify); none subscribe."""
    if conf['password'] is None:
        print("No password provided, skipping mqtt.")
        return

    if 'host' in conf:
        app.config['MQTT_BROKER_URL'] = conf['host']
    else:
        app.config['MQTT_BROKER_URL'] = '127.0.0.1'
    if 'ws_port' in conf:
        app.config['MQTT_BROKER_WS_PORT'] = int(conf['ws_port'])
    else:
        app.config['MQTT_BROKER_WS_PORT'] = 9001
    if 'broker_port' in conf:
        app.config['MQTT_BROKER_PORT'] = int(conf['broker_port'])
    else:
        app.config['MQTT_BROKER_PORT'] = 1883
    if 'username' in conf:
        app.config['MQTT_USERNAME'] = conf['username']
    else:
        app.config['MQTT_USERNAME'] = 'bipes'

    app.config['MQTT_PASSWORD'] = conf['password'].strip()
    if 'ssl' in conf:
        app.config['MQTT_SSL'] = True if conf['ssl'] == 'true' or conf['ssl'] == '1' else False
    else:
        app.config['MQTT_SSL'] = False
    app.config['MQTT_KEEPALIVE'] = 5
    if 'tls_enabled' in conf:
        app.config['MQTT_TLS_ENABLED'] = True if conf['tls_enabled'] == 'true' or conf['tls_enabled'] == '1' else False
    else:
        app.config['MQTT_TLS_ENABLED'] = False

    mqtt = Mqtt()
    mqtt.init_app(app)
    app.extensions['bipes_mqtt'] = mqtt
    return
