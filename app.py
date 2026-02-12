from flask import Flask, Response, jsonify, render_template
from flask import request, redirect, make_response
from flask import render_template

import os
import glob
import socket
import re
from configparser import ConfigParser
from werkzeug.middleware.proxy_fix import ProxyFix

app_name = 'BIPES'
app_version = '3.0.13'

# Default language on server mode
# Note: this is overwritten by the Makefile's lang arg on the "make release" command.
default_lang = 'en'
# Languages available, used in the templates generators.
available_lang = {
    'da':'Dansk',
    'en':'English'
    #'pt-br':'Brazilian Portuguese',
    #'de':'German',
    #'es':'Spanish',
    #'fr':'French',
    #'it':'Italian',
    #'nb':'Norwegian',
    #'zh-hans':'Chinese (simplified)',
    #'zh-hant':'Chinese (traditional)'
}
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

# Create app for developemnt mode
def create_app(database="sqlite"):
    assert database == "sqlite" or database == "postgresql" or database == None, \
           'Invalid database engine "' + database + '"'

    app = Flask(__name__)

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

    app.config.from_mapping(
      SECRET_KEY = flask_secret,
      # Session cookie settings
      SESSION_COOKIE_SECURE = True,  # Only send over HTTPS
      SESSION_COOKIE_HTTPONLY = True,  # Not accessible via JavaScript
      SESSION_COOKIE_SAMESITE = 'Lax',  # Prevent CSRF
      PERMANENT_SESSION_LIFETIME = 3600,  # 1 hour session timeout
    )

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

    # Auth mode: "full" (teacher+student+guest) or "guest" (guest-only)
    auth_mode = os.environ.get('AUTH_MODE', 'full').lower()
    app.config['AUTH_MODE'] = auth_mode
    print(f' * Auth mode: {auth_mode}')

    if database is not None:
        from server.common import api, mqtt
        app.register_blueprint(api.bp)
        app.register_blueprint(mqtt.bp)

        if auth_mode == 'full':
            from server.common import auth_api, auth
            app.register_blueprint(auth_api.bp)

    if auth_mode == 'full':
        from server.common import auth

        # Authentication routes - no-cache to prevent stale auth state
        @app.route("/")
        def landing():
            response = make_response(render_template('landing.html'))
            response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
            return response

        @app.route("/login/teacher")
        def login_teacher():
            return render_template('login.html')

        @app.route("/login/student")
        def login_student():
            return render_template('login.html')

        @app.route("/register")
        def register():
            return render_template('register.html')

        @app.route("/setup")
        def setup():
            return render_template('setup.html')

        @app.route("/classes")
        @auth.require_auth_page()
        def classes_page():
            return render_template('classes.html')

        # Return "compiled" html file. No-cache to prevent stale auth state.
        @app.route("/ide")
        @app.route("/ide-<lang>")
        def call_ide(lang=None, import_type='module'):
            response = make_response(ide(lang, import_type))
            response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
            response.headers['Pragma'] = 'no-cache'
            response.headers['Expires'] = '0'
            return response

    else:
        # Guest-only mode: / and /ide both go straight to the IDE
        @app.route("/")
        @app.route("/ide")
        @app.route("/ide-<lang>")
        def call_ide(lang=None, import_type='module'):
            response = make_response(ide(lang, import_type))
            response.headers['Cache-Control'] = 'no-store'
            return response
        
    # Return concatanate styles.
    @app.route("/static/style.css")
    def style():
        return Response(
            concat_files("static/style/*.css") + \
            concat_files("static/page/*/style.css"),
            mimetype='text/css')

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
        return Response(bipes_imports(), mimetype='application/javascript')
    
    
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
    is_main = os.environ.get("WERKZEUG_RUN_MAIN") == "true" or os.environ.get("FLASK_ENV") == "production"

    if mosquitto_password and is_main:
        try:
            mqtt.listen(app, {'password': mosquitto_password, 'host': mosquitto_host})
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
    # "Compile" ide template as ide/index.html (default filename for servers)
    with app.app_context():
        for ln in available_lang:
            with open('ide-' + ln + '.html','w') as f:
                f.write(ide(import_type='text/javascript', lang=ln))

    with open("templates/libs/bipes.temp.js",'w') as f:
        with app.app_context():
            f.write(bipes_imports(import_type='text/javascript'))
    # Build service worker
    with open("static/libs/serviceworker.temp.js",'w') as f:
        with app.app_context():
            f.write(service_worker_imports(import_type='text/javascript'))


# Generate the ide html file
def ide(lang=None, import_type='module'):
    lang = default_lang if lang == None else lang

    lang_imports = render_lang(lang)
    page = get_files_names("static/page/*/main.js", r"^static/page/(.*)/main.js")
    imports = get_files_names("static/libs/*.umd.js", r"^static/libs/(.*).js")

    page = preferred_page_order(page)

    # Filter pages based on authentication status
    auth_mode = os.environ.get('AUTH_MODE', 'full').lower()
    if auth_mode == 'full':
        from server.common import auth
        is_authenticated = auth.is_authenticated()
        user = auth.get_current_user()
        if not is_authenticated:
            page = [p for p in page if p != 'classes']
    else:
        user = None
        page = [p for p in page if p != 'classes']

    return render_template('ide.html', app_name=app_name, app_version=app_version,
                           page=page, imports=imports, explicit_imports=explicit_imports,
                           lang_imports=lang_imports, lang=lang,
                           import_type=import_type, user=user)

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
    dict = {}

    # Build the definitions dictionary
    for d in definitions:
        f = open(d,'r')
        a = f.read()
        pattern = re.compile(r"^# (.*)$", re.MULTILINE)

        m = ''
        l = (0,0)
        for match in pattern.finditer(a):
            i = l[1]
            l = match.span()
            if l[0] - 1 == -1:
                dict[m] = a[i+1:l[0]]
            else:
                dict[m] = a[i+1:l[0]-1]

            m = match.group(1)
            dict[m] = a[i+1:l[0]-1]

    # toolbox.umd.js string
    js = "let blockly_toolbox = {}\n"

    # Build the toolboxes per device
    for dev in devices:
        match = re.match(r"^templates/page/blocks/devices/(.*).md", dev)
        dev_name = match.group(1)

        with open (dev) as f:
            lines = f.readlines()

        xml = ''
        for i in lines:
            xml += dict[i[0:len(i)-1]]

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
                           available_lang=available_lang)

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







