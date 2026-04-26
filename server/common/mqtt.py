
from flask import (
      Blueprint, request, current_app
)
from flask_mqtt import Mqtt
import base64
import hashlib
import hmac
import json
import re

from server.common import auth
from server.common import security
from server.common import database as dbase
#--------------------------------------------------------------------------
# Blueprint
bp = Blueprint('mqtt', __name__, url_prefix='/mqtt')
_db = 'MQTT'
_SESSION_RE = re.compile(r"^[A-Za-z][A-Za-z0-9_-]{0,15}$")

#---------------------------------------------------------------------------

def _is_valid_session(session):
    return bool(_SESSION_RE.fullmatch(session or ""))


def _auth_required_if_full():
    if current_app.config.get('AUTH_MODE') == 'full' and not auth.is_authenticated():
        return {'error':'Authentication required'}, 401

    return None


def server_session_for_user(user=None):
    user = user or auth.get_current_user()
    if not user:
        return None

    secret = current_app.config.get('SECRET_KEY') or current_app.config.get('FLASK_SECRET_KEY')
    message = f"{user['user_type']}:{user['user_id']}".encode('utf-8')
    digest = hmac.new(str(secret).encode('utf-8'), message, hashlib.sha256).digest()
    token = base64.b32encode(digest).decode('ascii').lower().rstrip('=')[:15]
    return f"u{token}"


def _session_allowed(session):
    if current_app.config.get('AUTH_MODE') != 'full':
        return True

    return session == server_session_for_user()


def _validate_session_access(session):
    if not _is_valid_session(session):
        return {'error':'Invalid EasyMQTT session'}, 400

    if not _session_allowed(session):
        return {'error':'EasyMQTT session access denied'}, 403

    return None


def publish(topic, payload):
    mqtt_client = current_app.extensions.get('bipes_mqtt')
    if mqtt_client is None:
        return False

    mqtt_client.publish(topic, payload)
    return True


def listen(app, conf):
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

    @mqtt.on_message()
    def handle_mqtt_message(client, userdata, msg):
        full_topic = msg.topic.split("/", 1)

        if len(full_topic) < 2:
            return

        session = full_topic[0]
        topic = full_topic[1]
        data = msg.payload.decode()

        if not _is_valid_session(session):
            return

        if app.config['DATABASE'] == 'sqlite':
            from server.sqlite.mqtt import sql_macro_table
        elif app.config['DATABASE'] == 'postgresql':
            from server.postgresql.mqtt import sql_macro_table

        with app.app_context():
            db = dbase.connect(_db)
            if not dbase.has_table(db, (session,)):
                dbase.exec(db, sql_macro_table, session)

            if app.config['DATABASE'] == 'sqlite':
                import uuid
                dbase.insert(db, session,
                    ['uuid','topic','data'],
                    (uuid.uuid1().bytes, topic, data))
            elif app.config['DATABASE'] == 'postgresql':
                dbase.insert(db, session,
                    ['topic','data'],
                    (topic, data))
        return

    @mqtt.on_connect()
    def handle_connect(client, userdata, flags, rc):
        # EasyMQTT stores data by session/topic. Avoid root/$SYS topics.
        mqtt.subscribe('+/#')

    mqtt.init_app(app)
    app.extensions['bipes_mqtt'] = mqtt
    return

# Get current password and connection config
@bp.route('/public_conf', methods=('POST', 'GET'))
def mqtt_public_conf():
    auth_response = _auth_required_if_full()
    if auth_response:
        return auth_response

    if 'MQTT_PASSWORD' not in current_app.config:
        return {'easyMQTT':{'password':False}}

    if current_app.config.get('AUTH_MODE') == 'full':
        return {
            'easyMQTT':{
                'password':False,
                'serverBridge':True,
                'serverOwnedSession':True,
                'session':server_session_for_user()
            }
        }

    return {
        'easyMQTT':{
            'password':False,
            'serverBridge':True,
            'serverOwnedSession':False
        }
    }

# Get all data
@bp.route('/<session>/grep', methods=('POST', 'GET'))
def mqtt_select(session):
    auth_response = _auth_required_if_full()
    if auth_response:
        return auth_response

    session_response = _validate_session_access(session)
    if session_response:
        return session_response

    obj = request.json
    cols = ['topic','data']

    db = dbase.connect(_db)
    if not dbase.has_table(db, (session,)):
        return {session:[]}

    if obj != None and 'from' in obj and 'limit' in obj:
        return dbase.rows_to_json(dbase.select(db, session, cols, obj['from'], obj['limit']))
    else:
        return dbase.rows_to_json(dbase.select(db, session, cols))


# List topics
@bp.route('/<session>/ls', methods=('POST', 'GET'))
def mqtt_select_distinct(session):
    auth_response = _auth_required_if_full()
    if auth_response:
        return auth_response

    session_response = _validate_session_access(session)
    if session_response:
        return session_response

    obj = request.json
    cols = ['topic']
    db = dbase.connect(_db)
    if not dbase.has_table(db, (session,)):
        return {session:[]}

    if obj != None and 'from' in obj and 'limit' in obj:
        return dbase.rows_to_json(dbase.select_distinct(db, session, cols, obj['from'], obj['limit']))
    else:
        return dbase.rows_to_json(dbase.select_distinct(db, session, cols))


# Get data from topic
@bp.route('/<session>/<topic>/grep', methods=('POST', 'GET'))
def mqtt_select_topic(session, topic):
    auth_response = _auth_required_if_full()
    if auth_response:
        return auth_response

    session_response = _validate_session_access(session)
    if session_response:
        return session_response

    obj = request.json
    cols = ['lastEdited','data']
    db = dbase.connect(_db)
    topic = topic.replace('$','/')

    if not dbase.has_table(db, (session,)):
        return {session:[]}

    if obj != None and 'from' in obj and 'limit' in obj:
        return dbase.rows_to_json(dbase.select_where(db, session, ['topic', topic], cols, obj['from'], obj['limit']))
    else:
        return dbase.rows_to_json(dbase.select_where(db, session, ['topic', topic],  cols))


@bp.route('/<session>/<topic>/latest', methods=('POST',))
def mqtt_select_topic_latest(session, topic):
    auth_response = _auth_required_if_full()
    if auth_response:
        return auth_response

    session_response = _validate_session_access(session)
    if session_response:
        return session_response

    obj = request.json or {}
    limit = int(obj.get('limit', 20))
    limit = max(1, min(limit, 100))
    topic = topic.replace('$','/')

    db = dbase.connect(_db)
    if not dbase.has_table(db, (session,)):
        return {session:[]}

    if current_app.config['DATABASE'] == 'postgresql':
        from psycopg import sql
        query = sql.SQL(
            'select lastEdited, data from {} where topic = %s order by lastEdited desc limit %s'
        ).format(sql.Identifier(session))
    else:
        query = f'select lastEdited, data from {session} where topic = %s order by lastEdited desc limit %s'

    rows = db.execute(dbase._s(query), (topic, limit)).fetchall()
    db.close()
    return dbase.rows_to_json((session, ['lastEdited','data'], rows))


@bp.route('/<session>/<topic>/pub', methods=('POST',))
@security.require_same_origin()
def mqtt_publish(session, topic):
    auth_response = _auth_required_if_full()
    if auth_response:
        return auth_response

    session_response = _validate_session_access(session)
    if session_response:
        return session_response

    obj = request.json or {}
    payload = str(obj.get('payload', ''))
    topic = topic.replace('$','/')

    if not publish(f'{session}/{topic}', payload):
        return {'error':'EasyMQTT broker is not connected'}, 503

    return {'success':True}


# Remove  topic
@bp.route('/<session>/<topic>/rm', methods=('POST',))
@security.require_same_origin()
def mqtt_delete(session, topic):
    auth_response = _auth_required_if_full()
    if auth_response:
        return auth_response

    session_response = _validate_session_access(session)
    if session_response:
        return session_response

    obj = request.json
    db = dbase.connect(_db)
    topic = topic.replace('$','/')

    if not dbase.has_table(db, (session,)):
        return {session:[]}

    dbase.delete(db, session, ['topic'], [topic])

    return {session:[]}
