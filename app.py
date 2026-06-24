from flask import Flask, Response, jsonify, render_template
from flask import request, redirect, make_response
from flask import render_template, g

import os
import glob
import socket
import re
import secrets
from urllib.parse import urlencode
from configparser import ConfigParser
from werkzeug.middleware.proxy_fix import ProxyFix
from server.block_dsl import generate_default_artifacts
from server.common import auth as auth_module
from server.common import security as security_module

app_name = 'BIPES'
app_version = '3.0.90'


def ensure_postgres_auth_schema(app):
    """
    Ensure the auth schema exists even when PostgreSQL was started from an
    existing volume and skipped docker/init-db.sql on container bootstrap.
    """
    if app.config.get('DATABASE') != 'postgresql':
        return

    schema_path = os.path.join(app.root_path, 'docker', 'init-db.sql')
    if not os.path.exists(schema_path):
        return

    import psycopg

    db_name = app.config.get('POSTGRESQL_DATABASE_API')
    if not db_name:
        return

    url = "postgres://{user}:{password}@{host}:{port}/{database}".format(
        user=app.config['POSTGRESQL_USER'],
        password=app.config['POSTGRESQL_PASSWORD'],
        host=app.config['POSTGRESQL_HOST'],
        port=5432,
        database=db_name
    )

    with open(schema_path, 'r', encoding='utf-8') as f:
        schema_sql = f.read()

    with psycopg.connect(url, autocommit=True) as conn:
        conn.execute(schema_sql)

    print(' * Auth schema ensured')

# Default language on server mode
# Note: this is overwritten by the Makefile's lang arg on the "make release" command.
default_lang = 'da'
# Languages available, used in the templates generators.
available_lang = {
    'da':'Dansk',
    'en':'English',
    'de':'Deutsch',
    #'pt-br':'Brazilian Portuguese',
    #'es':'Spanish',
    #'fr':'French',
    #'it':'Italian',
    #'nb':'Norwegian',
    #'zh-hans':'Chinese (simplified)',
    #'zh-hant':'Chinese (traditional)'
}

# Auth-page translations live in static/msg/<lang>.js as `AuthMsg` (single source of
# truth, shared with the IDE) and are applied client-side via static/auth/preferences.js.
# Note: Default theme is in the static/base/tool.js urlDefaults function.

# Preferred order in the navigation bar
pref_order = ['blocks', 'dashboard', 'device', 'prompt', 'files', 'notification']
last_in_order = 'project'
def preferred_page_order(page):
    _page = []
    for elem in pref_order:
        if elem in page:
            _page.append(elem)
            page.remove(elem)

    _page.extend(page)

    if last_in_order in page:
        _page.remove(last_in_order)
        _page.append(last_in_order)

    return _page

# Libraries explicit set.
# Probably create a */package.json for directories, to it would be super easy to 
# implement complex plugins.
explicit_imports = [
    'page/blocks/blocks.umd',
    'page/blocks/pythonic.umd',
    'page/blocks/toolbox.umd'
]

# Language strings
lang_str = [
    # Global
    'msg/{{ lang }}.js',
    # Blockly
    'page/blocks/msg/{{ lang }}.js'
]

# Create app for development mode.
# Default to PostgreSQL: it is the only backend with the full teacher/student/class/auth
# schema (docker/init-db.sql). SQLite is supported for guest-only mode (AUTH_MODE=guest).
def create_app(database="postgresql"):
    assert database == "sqlite" or database == "postgresql" or database == None, \
           'Invalid database engine "' + database + '"'

    app = Flask(__name__)

    # Keep DSL-generated Blockly artifacts in sync with annotated libraries.
    try:
        generate_default_artifacts(app.root_path)
    except Exception as e:
        print(f' * Block DSL generation warning: {e}')

    # Trust proxy headers (for nginx reverse proxy)
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_port=1)

    # Get Flask secret key from environment or conf.ini
    flask_secret = os.environ.get('FLASK_SECRET_KEY')

    if not flask_secret:
        # Production (full/postgres auth) MUST supply the key via env — never fall back
        # to the conf.ini constant, which is a fixed value that also derives every user's
        # MQTT session prefix (mqtt.py HMAC). A predictable SECRET_KEY = forgeable
        # sessions + guessable device topics. Hard-fail instead.
        if database == 'postgresql':
            raise RuntimeError('FLASK_SECRET_KEY must be set (env) in full/postgres mode')
        # Local development (sqlite): parse server/conf.ini.
        conf = ConfigParser()
        conf.read(os.path.join(app.root_path,'server/conf.ini'))
        assert len(conf) > 0,\
            'Config file server/conf.ini does not exist, do make conf to generate it'
        assert 'flask' in conf and 'password' in conf['flask'], \
            'No flask password provided in server/conf.ini'
        flask_secret = conf['flask']['password']
    else:
        # Docker deployment - create minimal conf for compatibility
        conf = ConfigParser()
        conf.read(os.path.join(app.root_path,'server/conf.ini'))

    password_pepper = os.environ.get('PASSWORD_PEPPER')
    if database == 'postgresql' and not password_pepper:
        raise RuntimeError('PASSWORD_PEPPER must be set when AUTH_MODE=full')

    # Refuse to start with a known-compromised or placeholder pepper / secret key. The
    # pepper below was committed to .env in public git history (commits 2ecd643/d31f58c)
    # and is therefore burned forever — deploying it would let anyone who reads the repo
    # mount offline attacks on a leaked password DB. deploy.sh generates a fresh secret;
    # this is a backstop in case a stale .env carrying the leaked value is ever reused.
    _BURNED_SECRETS = {
        'b3u52PXzCKRakSV4BlNpvk/XbVN8YoD9b1k4fI6G5cA',  # leaked PASSWORD_PEPPER (git history)
    }
    if database == 'postgresql':
        for _label, _val in (('PASSWORD_PEPPER', password_pepper),
                             ('FLASK_SECRET_KEY', flask_secret)):
            _v = (_val or '').strip()
            if _v in _BURNED_SECRETS:
                raise RuntimeError(
                    f'{_label} is a known-leaked value (present in public git history). '
                    'Generate a fresh secret (e.g. `openssl rand -base64 32`) and rotate.')
            if _v.lower().startswith('change-this') or _v.lower() in ('changeme', 'change-me'):
                raise RuntimeError(
                    f'{_label} is still a placeholder ({_v!r}). Set a real secret in .env.')

    app.config.from_mapping(
      SECRET_KEY = flask_secret,
      PASSWORD_PEPPER = password_pepper,
      # Cap request bodies in Flask itself, not only in nginx (client_max_body_size 10m).
      # If Flask is ever reached directly (e.g. a misconfigured firewall exposing :5000),
      # this prevents an unbounded-body memory-exhaustion DoS. 16 MB > nginx's 10 MB, so
      # nginx stays the effective limit for normal traffic and nothing legit is rejected.
      MAX_CONTENT_LENGTH = 16 * 1024 * 1024,
      AUTH_SESSION_COOKIE_NAME = 'bipes_session',
      AUTH_SESSION_LIFETIME_SECONDS = 3600,
      AUTH_SESSION_ROTATE_INTERVAL_SECONDS = 900,
      # Hard upper bound on a session's age regardless of activity (sliding-window
      # idle expiry is AUTH_SESSION_LIFETIME_SECONDS). Forces periodic re-login so a
      # session left open on a shared school machine can't live indefinitely. 12h
      # comfortably covers a full school day.
      AUTH_SESSION_ABSOLUTE_LIFETIME_SECONDS = 12 * 60 * 60,
      PASSWORD_ARGON2_TIME_COST = 3,
      PASSWORD_ARGON2_MEMORY_COST = 65536,
      PASSWORD_ARGON2_PARALLELISM = 4,
      PASSWORD_ARGON2_HASH_LEN = 32,
      PASSWORD_ARGON2_SALT_LEN = 16,
      # Session cookie settings
      SESSION_COOKIE_SECURE = True,  # Only send over HTTPS
      SESSION_COOKIE_HTTPONLY = True,  # Not accessible via JavaScript
      SESSION_COOKIE_SAMESITE = 'Lax',  # Prevent CSRF
      PERMANENT_SESSION_LIFETIME = 3600,  # 1 hour session timeout
    )

    def _csp_nonce():
        # One nonce per request, shared between the inline <script nonce="{{ csp_nonce }}">
        # tags in our templates (injected via the context processor below) and the CSP
        # header set in add_security_headers. token_urlsafe(16) = 128 bits.
        if not hasattr(g, 'csp_nonce'):
            g.csp_nonce = secrets.token_urlsafe(16)
        return g.csp_nonce

    @app.context_processor
    def inject_csp_nonce():
        return {'csp_nonce': _csp_nonce()}

    @app.before_request
    def enforce_csrf():
        return security_module.protect_request()

    @app.after_request
    def add_security_headers(response):
        response.headers.setdefault('X-Content-Type-Options', 'nosniff')
        response.headers.setdefault('Referrer-Policy', 'strict-origin-when-cross-origin')
        # script-src is NONCE-based: every inline <script> in our templates carries
        # nonce="{{ csp_nonce }}", so an injected inline <script>/event-handler (XSS)
        # lacking the per-request nonce is refused by the browser. 'unsafe-eval' stays
        # because Blockly and TF.js (ML/Vision) compile code/WASM at runtime — it does
        # NOT re-enable inline-handler injection, so the XSS protection still holds. We
        # deliberately do NOT restrict connect-src/img-src/style-src (MQTT-over-wss,
        # camera blob:/data: frames and Blockly's injected inline styles must keep working).
        nonce = _csp_nonce()
        script_src = f"script-src 'self' 'nonce-{nonce}' 'unsafe-eval'"
        # The /embed routes must be framable by EXTERNAL lesson sites. For them, allow
        # framing (CSP frame-ancestors *) and do NOT send X-Frame-Options — SAMEORIGIN
        # would block cross-origin framing even with the permissive CSP. Everything else
        # keeps SAMEORIGIN.
        if request.path == '/embed' or request.path.startswith('/embed/'):
            response.headers['Content-Security-Policy'] = (
                f"{script_src}; object-src 'none'; base-uri 'self'; frame-ancestors *")
            response.headers.pop('X-Frame-Options', None)
        else:
            response.headers.setdefault('X-Frame-Options', 'SAMEORIGIN')
            response.headers.setdefault(
                'Content-Security-Policy',
                f"{script_src}; object-src 'none'; base-uri 'self'; frame-ancestors 'self'")
        if request.path.startswith('/static/') and request.path.endswith('.js'):
            response.headers['Cache-Control'] = 'no-store'
        response = auth_module.finalize_auth_response(response)
        return security_module.ensure_csrf_cookie(response)

    def canonical_ide_redirect(path_lang=None):
        args = request.args.to_dict(flat=True)
        if path_lang and 'lang' not in args:
            args['lang'] = path_lang
        if args.get('lang') and args['lang'] not in available_lang:
            args['lang'] = default_lang
        query = urlencode(args)
        return redirect('/ide' + (f'?{query}' if query else ''))

    if database == "postgresql":
        # Check for environment variables first (Docker), then fall back to conf.ini
        pg_host = os.environ.get('POSTGRES_HOST')
        pg_db = os.environ.get('POSTGRES_DB')
        pg_user = os.environ.get('POSTGRES_USER')
        pg_pass = os.environ.get('POSTGRES_PASSWORD')

        if pg_host and pg_db and pg_user and pg_pass:
            # Using environment variables (Docker deployment)
            app.config.from_mapping(
              DATABASE = 'postgresql',
              POSTGRESQL_HOST = pg_host,
              POSTGRESQL_DATABASE_API = pg_db,
              POSTGRESQL_DATABASE_MQTT = pg_db,
              POSTGRESQL_USER = pg_user,
              POSTGRESQL_PASSWORD = pg_pass,
              API = 'api',
              MQTT = 'mqtt'
            )
            print(f' * Database: postgresql (host={pg_host}, db={pg_db})')
        else:
            # Using conf.ini (local development)
            assert 'postgresql' in conf and \
                set(['host','database_api','database_mqtt','user','password']) \
                    .issubset(set(conf['postgresql'])), \
                'No postgresql host, database, user or password provided in server/conf.ini'
            app.config.from_mapping(
              DATABASE = 'postgresql',
              POSTGRESQL_HOST = conf['postgresql']['host'],
              POSTGRESQL_DATABASE_API = conf['postgresql']['database_api'],
              POSTGRESQL_DATABASE_MQTT = conf['postgresql']['database_mqtt'],
              POSTGRESQL_USER = conf['postgresql']['user'],
              POSTGRESQL_PASSWORD = conf['postgresql']['password'],
              API = 'api',
              MQTT = 'mqtt'
            )
            print(' * Database: postgresql')
    elif database == 'sqlite':
        app.config.from_mapping(
          DATABASE = 'sqlite',
          API = os.path.join(app.root_path, 'server/api.db'),
          MQTT = os.path.join(app.root_path, 'server/mqtt.db')
        )
        print(' * Database: sqlite')

    if app.config.get('DATABASE') == 'postgresql':
        try:
            ensure_postgres_auth_schema(app)
        except Exception as e:
            print(f' * Auth schema ensure warning: {e}')

    # Auth mode: "full" (teacher+student+guest) or "guest" (guest-only)
    auth_mode = os.environ.get('AUTH_MODE', 'full').lower()
    app.config['AUTH_MODE'] = auth_mode
    print(f' * Auth mode: {auth_mode}')

    # The teacher/student/class/auth schema is PostgreSQL-only (see docker/init-db.sql).
    # SQLite has no equivalent, so full auth on SQLite would 500 at request time with
    # "no such table: teachers". Fail fast with an actionable message instead.
    if database == 'sqlite' and auth_mode == 'full':
        raise RuntimeError(
            "Full auth mode requires PostgreSQL (the teacher/student/class schema is "
            "PostgreSQL-only). Run with database=postgresql, or set AUTH_MODE=guest for "
            "the SQLite-backed guest-only IDE."
        )

    if database is not None:
        from server.common import api, mqtt
        from server.common import database as _dbase
        app.register_blueprint(api.bp)
        # Guarantee DB connections are released when the app/request context ends.
        # Previously routes closed explicitly and the MQTT bridge handler relied on GC,
        # which let connections build up under load (a hard limit at scale). This makes
        # release deterministic so connections don't accumulate toward max_connections.
        app.teardown_appcontext(_dbase.close)

        if auth_mode == 'full':
            from server.common import auth_api, auth, devices
            app.register_blueprint(auth_api.bp)
            app.register_blueprint(devices.bp)

    if auth_mode == 'full':
        from server.common import auth

        def no_store_response(response):
            response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
            response.headers['Pragma'] = 'no-cache'
            response.headers['Expires'] = '0'
            return response

        def auth_page_context():
            theme = request.args.get('theme', 'light')
            if theme not in ('light', 'dark'):
                theme = 'light'
            lang = request.args.get('lang', default_lang)
            if lang not in available_lang:
                lang = default_lang
            return {
                'available_lang': available_lang,
                'app_version': app_version,
                'lang': lang,
                'theme': theme,
            }

        @app.route("/")
        def root():
            context = auth_page_context()
            return redirect(f"/ide?theme={context['theme']}&lang={context['lang']}")

        # Authentication routes - no-cache to prevent stale auth state
        @app.route("/login")
        def landing():
            return no_store_response(make_response(render_template(
                'landing.html',
                **auth_page_context()
            )))

        @app.route("/login/teacher")
        def login_teacher():
            if auth.is_authenticated():
                return redirect("/ide")
            return no_store_response(make_response(render_template(
                'login.html',
                **auth_page_context()
            )))

        @app.route("/login/student")
        def login_student():
            if auth.is_authenticated():
                return redirect("/ide")
            return no_store_response(make_response(render_template(
                'login.html',
                **auth_page_context()
            )))

        @app.route("/setup")
        def setup():
            # Forced first-login password change for students AND teachers (both are
            # created with an initial password); also reachable voluntarily to change
            # password later. Any authenticated user; guests go to the landing page.
            user = auth.get_current_user()
            if not user:
                return redirect('/')
            return no_store_response(make_response(render_template(
                'setup.html',
                user_type=user['user_type'],
                **auth_page_context()
            )))

        @app.route("/classes")
        @auth.require_teacher_page()
        def classes_page():
            return no_store_response(make_response(render_template(
                'classes.html',
                **auth_page_context()
            )))

        # Return "compiled" html file. No-cache to prevent stale auth state.
        @app.route("/ide")
        def call_ide(import_type='module'):
            return no_store_response(make_response(ide(import_type=import_type)))

        @app.route("/ide-<lang>")
        def call_ide_legacy(lang=None):
            return no_store_response(make_response(canonical_ide_redirect(lang)))

    else:
        # Guest-only mode: / and /ide both go straight to the IDE
        @app.route("/")
        @app.route("/ide")
        def call_ide(import_type='module'):
            response = make_response(ide(import_type=import_type))
            response.headers['Cache-Control'] = 'no-store'
            return response

        @app.route("/ide-<lang>")
        def call_ide_legacy(lang=None):
            response = make_response(canonical_ide_redirect(lang))
            response.headers['Cache-Control'] = 'no-store'
            return response
        
    # Return concatanate styles.
    @app.route("/static/style.css")
    def style():
        response = Response(
            concat_files("static/style/*.css") + \
            concat_files("static/page/*/style.css"),
            mimetype='text/css')
        response.headers['Cache-Control'] = 'no-store'
        return response

    # Return "compiled" toolboxes xml embedded in a js file.
    @app.route("/static/page/blocks/toolbox.umd.js")
    def blockly_toolbox():
        return Response(blockly_toolbox_generator(), mimetype='application/javascript')
        
    # Return concatanate blocks.
    @app.route("/static/page/blocks/blocks.umd.js")
    def blockly_blocks():
        return Response(concat_files("static/page/blocks/blocks/*.js"), mimetype='application/javascript')
        
    # Return concatanate pythonic generators.
    @app.route("/static/page/blocks/pythonic.umd.js")
    def blockly_pythonic():
        return Response(concat_files("static/page/blocks/pythonic/*.js","basic.js"), mimetype='application/javascript')
    
    @app.route("/static/libs/bipes.umd.js")
    def bipes():
        response = Response(bipes_imports(), mimetype='application/javascript')
        response.headers['Cache-Control'] = 'no-store'
        return response
    
    
    @app.route("/empty")
    def test(name=None):
        return render_template('empty.html')

    # Read-only blocks view for embedding in lessons (MakeCode-style).
    #   /embed              -> built-in sample
    #   /embed?uid=<id>     -> a shared (public) project's blocks
    #   /embed?xml=<base64> -> inline blocks XML
    @app.route("/embed")
    @app.route("/embed/<uid>")
    def embed(uid=None):
        # Block labels follow ?lang= (validated), so an embed can be shown in Danish,
        # English, … — defaults to the server default language.
        lang = request.args.get('lang', default_lang)
        if lang not in available_lang:
            lang = default_lang
        resp = make_response(render_template('embed.html', lang=lang))
        # Allow this page to be framed by external lesson sites.
        resp.headers['Content-Security-Policy'] = "frame-ancestors *"
        resp.headers.pop('X-Frame-Options', None)
        return resp

    # A tiny standalone "lesson" page that embeds the blocks via an <iframe>,
    # so you can verify embedding end-to-end. Open /embed-test.
    @app.route("/embed-test")
    def embed_test():
        return render_template('embed_test.html')


    # Return serviceworker.
    @app.route("/serviceworker.js")
    def service_worker():
        response = make_response(service_worker_imports(import_type='module'))
        response.headers['Content-Type'] = 'application/javascript'
        response.headers['Service-Worker-Allowed'] = '/'
        return response

    if database is None:
        return app

    # Init mqtt subscriber - check env vars first (Docker), then conf.ini
    mosquitto_password = os.environ.get('MOSQUITTO_PASSWORD')
    mosquitto_host = os.environ.get('MOSQUITTO_HOST', 'localhost')
    mosquitto_port = os.environ.get('MOSQUITTO_PORT', '1883')
    mosquitto_username = os.environ.get('MOSQUITTO_USERNAME', 'bipes-server')
    is_main = os.environ.get("WERKZEUG_RUN_MAIN") == "true" or os.environ.get("FLASK_ENV") == "production"

    if mosquitto_password and is_main:
        try:
            if os.environ.get('MOSQUITTO_DYNSEC_ENABLED', 'false').lower() in ('1', 'true', 'yes'):
                from server.common import mqtt_dynsec
                mqtt_dynsec.ensure_server_bridge_client(app)

            # Publish-only MQTT client (used for OTA notify). No worker subscribes or
            # stores telemetry — the browser reads it live over its own websocket.
            mqtt.listen(app, {
                'password': mosquitto_password,
                'host': mosquitto_host,
                'broker_port': mosquitto_port,
                'username': mosquitto_username
            })
        except Exception as e:
            app.logger.warning(f'Mosquitto connection failed: {e}')
    elif 'mosquitto' in conf and 'password' in conf['mosquitto']:
        if os.environ.get("WERKZEUG_RUN_MAIN") == "true":
            try:
                mqtt.listen(app, conf['mosquitto'])
            except Exception as e:
                app.logger.warning(f'Mosquitto connection failed: {e}')
    else:
        app.logger.warning('No mosquitto config found, skipping MQTT')
      
    return app

# Generate basic server/conf.ini file
def conf_ini(flask_passwd=None, mosquitto_passwd=None, mosquitto_host=None):
    conf = ConfigParser()
    conf.read('server/conf.ini')
    # Setup file for the first time
    if flask_passwd is not None:
        conf['flask'] = {'password':flask_passwd}
    
    if 'postgresql' not in conf:
        conf['postgresql'] = {'host':'localhost',
                                'database_api':'bipes_api',
                                'database_mqtt':'bipes_mqtt',
                                'user':'postgres',
                                'password':''}
    if 'mosquitto' not in conf:
        conf['mosquitto'] = {}
            
    if mosquitto_passwd is not None:
        conf['mosquitto']['password'] = mosquitto_passwd
        
    if mosquitto_host is not None:
        conf['mosquitto']['host'] = mosquitto_host
        
    with open('server/conf.ini', 'w') as conf_file:
        conf.write(conf_file)

# Build BIPES static release
def build_release():
    try:
        generate_default_artifacts(os.path.dirname(os.path.abspath(__file__)))
    except Exception as e:
        print(f' * Block DSL generation warning: {e}')
    # Build styles
    with open("static/style.css",'w') as f:
        f.write(
            concat_files("static/style/*.css") + \
            concat_files("static/page/*/style.css")
            )
    # Build blockly toolboxes
    with open("static/page/blocks/toolbox.umd.js",'w') as f:
        f.write(blockly_toolbox_generator())
    # Build blockly blocks and generator
    with open("static/page/blocks/blocks.umd.js",'w') as f:
        f.write(concat_files("static/page/blocks/blocks/*.js", "micropython.js"))
    with open("static/page/blocks/pythonic.umd.js",'w') as f:
        f.write(concat_files("static/page/blocks/pythonic/*.js", "basic.js"))

    app = create_app(None)
    # Compile the canonical preference-style IDE entry point.
    with app.app_context():
        with open('ide.html','w') as f:
            f.write(ide(import_type='text/javascript', lang=default_lang))

    with open("templates/libs/bipes.temp.js",'w') as f:
        with app.app_context():
            f.write(bipes_imports(import_type='text/javascript'))
    # Build service worker
    with open("static/libs/serviceworker.temp.js",'w') as f:
        with app.app_context():
            f.write(service_worker_imports(import_type='text/javascript'))


# Generate the ide html file
def ide(lang=None, import_type='module'):
    query_lang = request.args.get('lang')
    lang = query_lang or lang or default_lang
    if lang not in available_lang:
        lang = default_lang
    theme = request.args.get('theme', 'light')
    if theme not in ('light', 'dark'):
        theme = 'light'

    lang_imports = render_lang(lang)
    page = get_files_names("static/page/*/main.js", r"^static/page/(.*)/main.js")
    imports = get_files_names("static/libs/*.umd.js", r"^static/libs/(.*).js")

    page = preferred_page_order(page)

    # Vision is ENABLED as a standalone, for-fun playground (webcam / uploaded-image
    # experiments on its own page). It is deliberately NOT wired into channels or the
    # dashboard — keep it self-contained. (Was previously hidden pending camera devices;
    # re-shown on request. To hide again, re-add: page = [p for p in page if p != 'vision'].)

    # Filter IDE entry points based on authentication status and user role.
    auth_mode = os.environ.get('AUTH_MODE', 'full').lower()
    if auth_mode == 'full':
        from server.common import auth
        is_authenticated = auth.is_authenticated()
        user = auth.get_current_user()
        if not is_authenticated:
            # Guests may use Projects, ML, and Vision locally. Server-backed
            # class management and sharing still require authentication.
            blocked = {'classes'}
            page = [p for p in page if p not in blocked]
        elif user['user_type'] == 'student':
            page = [p for p in page if p != 'classes']
    else:
        user = None
        blocked = {'classes'}
        page = [p for p in page if p not in blocked]

    return render_template('ide.html', app_name=app_name, app_version=app_version,
                           page=page, imports=imports, explicit_imports=explicit_imports,
                           lang_imports=lang_imports, lang=lang,
                           theme=theme, import_type=import_type, user=user)

# Render language string imports
def render_lang (lang):
    return [(src.replace('{{ lang }}', lang)) for src in lang_str]
    
    
# Concatanate files
def concat_files (rule, first=None):
    # Fetch files
    files = glob.glob(rule)
    _str = ""
    if first is not None:
        for _file in files:
            if _file.find(first) != -1:
                with open (_file) as f:
                    for line in f:
                        _str += line
                files.remove(_file)

    # Concatanate
    for _file in files:
        if _file is not first:
            with open (_file) as f:
                for line in f:
                    _str += line

    return _str

def get_files_names (bash, reg):
    files = glob.glob(bash)
    names = []

    for _file in files:
        match = re.match(reg, _file)
        names.append(match.group(1))
    return names


# Generates the toolboxes per device
def blockly_toolbox_generator ():
    # Fetch definitions and blocks per device
    definitions = glob.glob("templates/page/blocks/definitions/*.md")
    devices = glob.glob("templates/page/blocks/devices/*.md")

    # Definitions dictionary
    definitions_map = {}

    # Build the definitions dictionary
    for d in definitions:
        with open(d, 'r') as f:
            a = f.read()
        pattern = re.compile(r"^# (.*)$", re.MULTILINE)
        matches = list(pattern.finditer(a))

        for index, match in enumerate(matches):
            key = match.group(1)
            start = match.end()
            if start < len(a) and a[start] == '\n':
                start += 1

            if index + 1 < len(matches):
                end = matches[index + 1].start()
                if end > start and a[end - 1] == '\n':
                    end -= 1
            else:
                end = len(a)

            definitions_map[key] = a[start:end]

    # toolbox.umd.js string
    js = "let blockly_toolbox = {}\n"

    # Build the toolboxes per device
    for dev in devices:
        match = re.match(r"^templates/page/blocks/devices/(.*).md", dev)
        dev_name = match.group(1)

        with open (dev) as f:
            lines = f.readlines()

        xml = ''
        for line in lines:
            key = line.strip()
            if not key:
                continue
            chunk = definitions_map.get(key)
            if chunk is None:
                # A device toolbox references a block whose definition isn't present
                # (e.g. a DSL library whose .blockdef hasn't been provided yet). Skip
                # it instead of crashing the whole toolbox — the block appears as soon
                # as its definition exists.
                print(f" * Toolbox: skipping unknown block key '{key}' in {dev_name}")
                continue
            xml += chunk

        js += "blockly_toolbox." + dev_name + " = `\n<xml>\n" + xml + "</xml>\n`\n\n"

    return js

# Return BIPES imports.
def bipes_imports(import_type='module'):
    base = get_files_names("static/base/*.js", r"^static/base/(.*).js")
    # dom/tool/imagesource export classes (DOM, Tool, ImageSource), not a
    # lowercase singleton, so they are imported directly by the modules that
    # need them rather than auto-registered as bipes.<name>.
    base.remove('dom'); base.remove('tool'); base.remove('imagesource')
    # csrf.js is a side-effect IIFE (it wraps window.fetch) loaded via a plain
    # <script> tag on every page; it has no exports, so it must NOT be auto-imported
    # as a module here — doing so caused the bundle to fail with
    # "does not provide an export named 'csrf'".
    base.remove('csrf')
    page = get_files_names("static/page/*/main.js", r"^static/page/(.*)/main.js")

    # Import ALL modules regardless of authentication
    # The project module is needed by blocks, dashboard, device, and files modules
    # Navigation tabs are filtered separately in ide() function

    return render_template('libs/bipes.js', base=base,
                           page=page, import_type=import_type,
                           available_lang=available_lang,
                           app_version=app_version)

# Return service worker imports.
def service_worker_imports(lang=None, import_type='module'):
    lang_imports = []
    for key in available_lang:
        lang_imports += render_lang(key)

    static_images = []
    for item in ['static/page/device/media', 'static/page/blocks/images', 'static/page/blocks/media']:
        _names = get_files_names(item+"/*", re.compile("^" + item + "/(.*)"))
        _names = [item[7:] + "/" + _name for _name in _names]
        static_images += _names

    imports = get_files_names("static/libs/*.umd.js", r"^static/libs/(.*).js")

    return render_template('libs/serviceworker.js', app_version=app_version,
                           imports=imports, explicit_imports=explicit_imports,
                           lang_imports=lang_imports, static_images=static_images,
                           available_lang=available_lang, import_type=import_type)





