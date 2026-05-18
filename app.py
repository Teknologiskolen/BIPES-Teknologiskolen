from flask import Flask, Response, jsonify, render_template
from flask import request, redirect, make_response
from flask import render_template

import os
import glob
import socket
import re
from urllib.parse import urlencode
from configparser import ConfigParser
from werkzeug.middleware.proxy_fix import ProxyFix
from server.block_dsl import generate_default_artifacts
from server.common import auth as auth_module

app_name = 'BIPES'
app_version = '3.0.74'


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
default_lang = 'en'
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

auth_text = {
    'en': {
        'app_title': 'Block based Integrated Platform for Embedded Systems',
        'welcome': 'Welcome to BIPES',
        'teacher_login': 'Teacher Login',
        'teacher_login_help': 'Manage classes and share projects with students',
        'student_login': 'Student Login',
        'student_login_help': 'Access your projects from any device',
        'guest_login': 'Continue as Guest',
        'guest_login_help': 'Start coding without an account',
        'forum': 'Forum',
        'mode': 'Mode',
        'change_theme': 'Change theme',
        'language': 'Language',
        'login': 'Login',
        'login_subtitle': 'Access your BIPES account',
        'teacher_subtitle': 'Manage classes and shared projects',
        'student_subtitle': 'Sign in with your class code, username, and password',
        'email': 'Email',
        'password': 'Password',
        'login_as_teacher': 'Login as Teacher',
        'class_code': 'Class Code',
        'username': 'Username',
        'back_home': 'Back to Home',
        'register_prompt': "Don't have an account?",
        'register_here': 'Register here',
        'loading': 'Loading...',
        'login_success': 'Login successful! Redirecting...',
        'login_failed': 'Login failed',
        'network_error': 'Network error. Please try again.',
        'setup_welcome': 'Welcome! Please set up your account...',
        'register_title': 'Teacher Registration',
        'register_subtitle': 'Create your teacher account to manage classes',
        'full_name': 'Full Name',
        'confirm_password': 'Confirm Password',
        'minimum_password': 'Minimum 8 characters',
        'terms': 'I agree to the Terms of Service',
        'create_account': 'Create Account',
        'creating_account': 'Creating Account...',
        'already_account': 'Already have an account?',
        'login_here': 'Login here',
        'passwords_no_match': 'Passwords do not match',
        'password_min': 'Password must be at least 8 characters',
        'registration_success': 'Registration successful! Redirecting...',
        'registration_failed': 'Registration failed',
        'setup_title': 'Welcome!',
        'setup_subtitle': 'Please set up your account',
        'setup_info_label': 'First-time setup required:',
        'setup_info': 'Please change your password to secure your account.',
        'current_password': 'Current Password',
        'current_password_placeholder': 'Your teacher-provided password',
        'new_password': 'New Password',
        'new_password_placeholder': 'Choose a new password',
        'confirm_new_password': 'Confirm New Password',
        'confirm_new_password_placeholder': 'Confirm your new password',
        'complete_setup': 'Complete Setup',
        'setting_up': 'Setting up...',
        'required_fields': '* Required fields',
        'new_password_min': 'New password must be at least 8 characters',
        'password_change_failed': 'Failed to change password',
        'setup_complete': 'Account setup complete! Redirecting to IDE...'
    },
    'da': {
        'app_title': 'Blockbaseret integreret platform til indlejrede systemer',
        'welcome': 'Velkommen til BIPES',
        'teacher_login': 'Lærerlogin',
        'teacher_login_help': 'Administrer klasser og del projekter med elever',
        'student_login': 'Elevlogin',
        'student_login_help': 'Få adgang til dine projekter fra enhver enhed',
        'guest_login': 'Fortsæt som gæst',
        'guest_login_help': 'Begynd at kode uden en konto',
        'forum': 'Forum',
        'mode': 'Tilstand',
        'change_theme': 'Skift tema',
        'language': 'Sprog',
        'login': 'Log ind',
        'login_subtitle': 'Få adgang til din BIPES-konto',
        'teacher_subtitle': 'Administrer klasser og delte projekter',
        'student_subtitle': 'Log ind med klassekode, brugernavn og adgangskode',
        'email': 'E-mail',
        'password': 'Adgangskode',
        'login_as_teacher': 'Log ind som lærer',
        'class_code': 'Klassekode',
        'username': 'Brugernavn',
        'back_home': 'Tilbage til forsiden',
        'register_prompt': 'Har du ikke en konto?',
        'register_here': 'Registrer dig her',
        'loading': 'Indlæser...',
        'login_success': 'Login lykkedes! Sender dig videre...',
        'login_failed': 'Login mislykkedes',
        'network_error': 'Netværksfejl. Prøv igen.',
        'setup_welcome': 'Velkommen! Opsæt venligst din konto...',
        'register_title': 'Lærerregistrering',
        'register_subtitle': 'Opret din lærerkonto for at administrere klasser',
        'full_name': 'Fulde navn',
        'confirm_password': 'Bekræft adgangskode',
        'minimum_password': 'Mindst 8 tegn',
        'terms': 'Jeg accepterer servicevilkårene',
        'create_account': 'Opret konto',
        'creating_account': 'Opretter konto...',
        'already_account': 'Har du allerede en konto?',
        'login_here': 'Log ind her',
        'passwords_no_match': 'Adgangskoderne er ikke ens',
        'password_min': 'Adgangskoden skal være mindst 8 tegn',
        'registration_success': 'Registrering lykkedes! Sender dig videre...',
        'registration_failed': 'Registrering mislykkedes',
        'setup_title': 'Velkommen!',
        'setup_subtitle': 'Opsæt venligst din konto',
        'setup_info_label': 'Førstegangsopsætning kræves:',
        'setup_info': 'Skift din adgangskode for at sikre din konto.',
        'current_password': 'Nuværende adgangskode',
        'current_password_placeholder': 'Adgangskoden fra din lærer',
        'new_password': 'Ny adgangskode',
        'new_password_placeholder': 'Vælg en ny adgangskode',
        'confirm_new_password': 'Bekræft ny adgangskode',
        'confirm_new_password_placeholder': 'Bekræft din nye adgangskode',
        'complete_setup': 'Fuldfør opsætning',
        'setting_up': 'Opsætter...',
        'required_fields': '* Obligatoriske felter',
        'new_password_min': 'Den nye adgangskode skal være mindst 8 tegn',
        'password_change_failed': 'Kunne ikke ændre adgangskode',
        'setup_complete': 'Kontoopsætning fuldført! Sender dig til IDE...'
    },
    'de': {
        'app_title': 'Blockbasierte integrierte Plattform für eingebettete Systeme',
        'welcome': 'Willkommen bei BIPES',
        'teacher_login': 'Lehrer-Login',
        'teacher_login_help': 'Klassen verwalten und Projekte mit Schülern teilen',
        'student_login': 'Schüler-Login',
        'student_login_help': 'Von jedem Gerät auf deine Projekte zugreifen',
        'guest_login': 'Als Gast fortfahren',
        'guest_login_help': 'Ohne Konto direkt mit dem Programmieren beginnen',
        'forum': 'Forum',
        'mode': 'Modus',
        'change_theme': 'Design wechseln',
        'language': 'Sprache',
        'login': 'Anmelden',
        'login_subtitle': 'Melde dich bei deinem BIPES-Konto an',
        'teacher_subtitle': 'Klassen und geteilte Projekte verwalten',
        'student_subtitle': 'Mit Klassencode, Benutzername und Passwort anmelden',
        'email': 'E-Mail',
        'password': 'Passwort',
        'login_as_teacher': 'Als Lehrer anmelden',
        'class_code': 'Klassencode',
        'username': 'Benutzername',
        'back_home': 'Zur Startseite',
        'register_prompt': 'Du hast noch kein Konto?',
        'register_here': 'Hier registrieren',
        'loading': 'Wird geladen...',
        'login_success': 'Anmeldung erfolgreich! Weiterleitung...',
        'login_failed': 'Anmeldung fehlgeschlagen',
        'network_error': 'Netzwerkfehler. Bitte erneut versuchen.',
        'setup_welcome': 'Willkommen! Bitte richte dein Konto ein...',
        'register_title': 'Lehrerregistrierung',
        'register_subtitle': 'Erstelle dein Lehrerkonto, um Klassen zu verwalten',
        'full_name': 'Vollständiger Name',
        'confirm_password': 'Passwort bestätigen',
        'minimum_password': 'Mindestens 8 Zeichen',
        'terms': 'Ich akzeptiere die Nutzungsbedingungen',
        'create_account': 'Konto erstellen',
        'creating_account': 'Konto wird erstellt...',
        'already_account': 'Du hast bereits ein Konto?',
        'login_here': 'Hier anmelden',
        'passwords_no_match': 'Die Passwörter stimmen nicht überein',
        'password_min': 'Das Passwort muss mindestens 8 Zeichen lang sein',
        'registration_success': 'Registrierung erfolgreich! Weiterleitung...',
        'registration_failed': 'Registrierung fehlgeschlagen',
        'setup_title': 'Willkommen!',
        'setup_subtitle': 'Bitte richte dein Konto ein',
        'setup_info_label': 'Ersteinrichtung erforderlich:',
        'setup_info': 'Bitte ändere dein Passwort, um dein Konto zu sichern.',
        'current_password': 'Aktuelles Passwort',
        'current_password_placeholder': 'Das Passwort von deiner Lehrkraft',
        'new_password': 'Neues Passwort',
        'new_password_placeholder': 'Wähle ein neues Passwort',
        'confirm_new_password': 'Neues Passwort bestätigen',
        'confirm_new_password_placeholder': 'Bestätige dein neues Passwort',
        'complete_setup': 'Einrichtung abschließen',
        'setting_up': 'Einrichtung läuft...',
        'required_fields': '* Pflichtfelder',
        'new_password_min': 'Das neue Passwort muss mindestens 8 Zeichen lang sein',
        'password_change_failed': 'Passwort konnte nicht geändert werden',
        'setup_complete': 'Kontoeinrichtung abgeschlossen! Weiterleitung zur IDE...'
    }
}
# Note: Default theme is in the static/base/tool.js urlDefaults function.

# Preferred order in the navigation bar
pref_order = ['blocks', 'dashboard', 'architecture', 'device', 'prompt', 'files', 'notification']
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

# Create app for developemnt mode
def create_app(database="sqlite"):
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
        # Parse server/conf.ini (local development)
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

    app.config.from_mapping(
      SECRET_KEY = flask_secret,
      PASSWORD_PEPPER = password_pepper,
      AUTH_SESSION_COOKIE_NAME = 'bipes_session',
      AUTH_SESSION_LIFETIME_SECONDS = 3600,
      AUTH_SESSION_ROTATE_INTERVAL_SECONDS = 900,
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

    @app.after_request
    def add_security_headers(response):
        response.headers.setdefault('X-Content-Type-Options', 'nosniff')
        response.headers.setdefault('X-Frame-Options', 'SAMEORIGIN')
        response.headers.setdefault('Referrer-Policy', 'strict-origin-when-cross-origin')
        if request.path.startswith('/static/') and request.path.endswith('.js'):
            response.headers['Cache-Control'] = 'no-store'
        return auth_module.finalize_auth_response(response)

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

    if database is not None:
        from server.common import api, mqtt
        app.register_blueprint(api.bp)
        app.register_blueprint(mqtt.bp)

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
                'lang': lang,
                'theme': theme,
                't': auth_text.get(lang, auth_text[default_lang])
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

        @app.route("/register")
        def register():
            return no_store_response(make_response(render_template(
                'register.html',
                **auth_page_context()
            )))

        @app.route("/setup")
        @auth.require_student_page()
        def setup():
            return no_store_response(make_response(render_template(
                'setup.html',
                **auth_page_context()
            )))

        @app.route("/classes")
        @auth.require_teacher_page()
        def classes_page():
            return no_store_response(make_response(render_template('classes.html')))

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

def add_cors(response):
    response.headers['Access-Control-Allow-Origin'] = 'http://localhost:5001'
    response.headers['Access-Control-Allow-Methods'] = 'GET,POST,PUT,DELETE,OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization'
    return response

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
            xml += definitions_map[key]

        js += "blockly_toolbox." + dev_name + " = `\n<xml>\n" + xml + "</xml>\n`\n\n"

    return js

# Return BIPES imports.
def bipes_imports(import_type='module'):
    base = get_files_names("static/base/*.js", r"^static/base/(.*).js")
    base.remove('dom'); base.remove('tool')
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







