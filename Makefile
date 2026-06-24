PROJECT=bipes

lang ?= "en"
path ?= "/var/www/bipes3"
chown ?= "www-data:www-data"
# PostgreSQL is the default: it carries the full teacher/student/class/auth schema.
# SQLite only supports guest-only mode (run with database=sqlite AUTH_MODE=guest).
database ?= "postgresql"

DEPS = python pip npm mosquitto
UBUNTU_DEPS = python3 python3-pip python3-venv npm mosquitto
FEDORA_DEPS = python3 python3-pip npm mosquitto
SUSE_DEPS = python python3-pip npm17 mosquitto
NPM_DEPS = jsdoc

BLOCKLY_VERSION = 7.20211209.4

all: yn-dependencies umd-deps unpkg blockly pip conf-ini yn-mosquitto licenses greeting run

yn-dependencies:
	@printf "$(NC)The dependencies $(PURPLE)$(DEPS) $(NPM_DEPS)$(NC) are needed.\n"
	@read -p "Install dependencies? (requires sudo) [y/N]: " dep ; \
	if [ "$$dep" = 'y' ] || [ "$$dep" = 'Y' ] ; \
	then \
	make dependencies --no-print-directory ; \
	else  \
	printf "$(BLUE)Depedencies install skipped.$(NC)\n" ; \
	fi

dependencies:
	@if [ -n "$$(command -v dnf)" ] ; \
	then \
	printf "$(BLUE)Installing $(DEPS) with dnf.$(NC)\n" ; \
	sudo dnf install $(FEDORA_DEPS) ; \
	elif [ -n "$$(command -v apt)" ] ; \
	then \
	printf "$(BLUE)Installing $(DEPS) with apt.$(NC)\n" ; \
	sudo apt install $(UBUNTU_DEPS) ; \
	elif [ -n "$$(command -v zypper)" ] ; \
	then \
	printf "$(BLUE)Installing $(DEPS) with zypper.$(NC)\n" ; \
	sudo zypper install $(SUSE_DEPS) ; \
	else \
	printf "$(RED)No package installed! Neither dnf, apt or zypper package \
	managers have been found.$(NC)" ; \
	fi
	@printf "$(BLUE)Installing $(NPM_DEPS) with npm.$(NC)\n"
	@sudo npm install -g $(NPM_DEPS)

greeting:
	@printf "😄 $(NC)Thanks for giving $(PURPLE)BIPES$(NC) a try!\n"

umd-deps:
	@printf "Fetching and building $(PURPLE)rollup$(NC) and \
	$(PURPLE)codemirror$(NC) with npm.\n"
	@npm install rollup@2.79.1 \
	rollup-plugin-terser@7.0.2 \
	@rollup/plugin-node-resolve@14.1.0 \
	codemirror@6.0.1 \
	@codemirror/lang-python@6.0.2 \
	@codemirror/lang-markdown@6.0.1 \
	@codemirror/theme-one-dark@6.1.0
	@node_modules/.bin/rollup -c templates/libs/rollup.config.codemirror.js

unpkg:
	@printf "Fetching $(PURPLE)xterm.js chart.js murri dash.js paho-mqtt shortcuts.js$(NC).\n"
	@wget -O static/libs/xterm.umd.js https://unpkg.com/xterm@4.15.0/lib/xterm.js
	@wget -O static/libs/chart.umd.js https://cdn.jsdelivr.net/npm/chart.js@3.7.1/dist/chart.min.js
	@wget -O static/libs/chart-adapter-date-fns.bundle.umd.js https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns/dist/chartjs-adapter-date-fns.bundle.min.js
	@wget -O static/libs/muuri.umd.js https://raw.githubusercontent.com/haltu/muuri/master/dist/muuri.js
	@wget -O static/libs/dash.umd.js  http://cdn.dashjs.org/latest/dash.all.min.js
	@wget -O static/libs/paho-mqtt.umd.js  https://cdnjs.cloudflare.com/ajax/libs/paho-mqtt/1.0.1/mqttws31.min.js
	@wget -O static/libs/shortcuts.umd.js  http://www.openjs.com/scripts/events/keyboard_shortcuts/shortcut.js

blockly:
	@printf "Fetching $(PURPLE)blockly$(NC).\n"
	@rm -rf blockly
	git clone -b $(BLOCKLY_VERSION) https://github.com/google/blockly.git --depth 1
	@cp blockly/blockly_compressed.js static/libs/blockly.umd.js
	@cp blockly/blocks_compressed.js static/page/blocks/blocks/logic.umd.js
	@mkdir -p static/page/blocks/msg
	@cp blockly/msg/js/en.js static/page/blocks/msg/en.js
	@cp blockly/msg/js/de.js static/page/blocks/msg/de.js
	@cp blockly/msg/js/pt-br.js static/page/blocks/msg/pt-br.js
	@cp blockly/msg/js/es.js static/page/blocks/msg/es.js
	@cp blockly/msg/js/fr.js static/page/blocks/msg/fr.js
	@cp blockly/msg/js/it.js static/page/blocks/msg/it.js
	@cp blockly/msg/js/nb.js static/page/blocks/msg/nb.js
	@cp blockly/msg/js/zh-hans.js static/page/blocks/msg/zh-hans.js
	@cp blockly/msg/js/zh-hant.js static/page/blocks/msg/zh-hant.js
	@mkdir -p static/page/blocks/media
	@cp blockly/media/* static/page/blocks/media
	@rm -rf blockly

pip:
	@printf "Creating enviroment and installing $(PURPLE)flask \
	flask-mqtt paho psycopg sphinx sphinx-js furo$(NC).\n"
	@python3 -m venv venv
	@. venv/bin/activate && \
	pip install Flask flask-mqtt paho-mqtt sphinx sphinx-js furo psycopg && \
	exit

conf-ini:
	@KEY=$$(cat /proc/sys/kernel/random/uuid | sed 's/[-]//g' | head -c 20) ; \
	. venv/bin/activate && \
	python -c "import app; app.conf_ini(flask_passwd='$$KEY')" && \
	exit

yn-mosquitto:
	@printf "$(PURPLE)BIPES$(NC) uses a $(PURPLE)mosquitto$(NC) MQTT broker.\n"
	@read -p "Setup mosquitto? (requires sudo) [y/N]: " mos ; \
	if [ "$$mos" = 'y' ] || [ "$$mos" = 'Y' ] ; \
	then \
	make mosquitto --no-print-directory ; \
	else  \
	printf "$(BLUE)Mosquitto setup skipped, setup later with $(PURPLE)make mosquitto.$(NC)\n" ; \
	fi


MOSQ_BIPES_CONF = /etc/mosquitto/conf.d/bipes.conf

mosquitto:
ifndef WSLENV
	@read -s -p "New password (mosquitto): " pwd ; \
	printf "\n" ; \
	sudo mosquitto_passwd -c -b /etc/mosquitto/conf.d/passwd bipes $$pwd ; \
	. venv/bin/activate && \
	python -c "import app; app.conf_ini(mosquitto_passwd='$$pwd')" && \z
	exit
else
	@KEY2=$$(cat /proc/sys/kernel/random/uuid | sed 's/[-]//g' | head -c 10) ; \
	echo "$(RED)Attention:$(NC) Password $$KEY2 auto set for Mosquitto under WSL2, you can change at server/conf.ini and /etc/mosquitto/conf.d/passwd." && \
	sudo bash -c 'printf  "$$KEY2" > /etc/mosquitto/conf.d/passwd' && \
	. venv/bin/activate && \
	python -c "import app; app.conf_ini(mosquitto_passwd='$$KEY2')" && \
	exit 
endif
	@sudo bash -c 'printf  "allow_anonymous false\nlistener 1883\n\nlistener 9001\nprotocol websockets\npassword_file /etc/mosquitto/conf.d/passwd" > $(MOSQ_BIPES_CONF)'
	@printf "\n"
ifndef WSLENV
	@read -p "Open port 1883 and 9001? (\"N\" will close them if already open) [y/N]: " mos2 ; \
	if [ "$$mos2" = 'y' ] || [ "$$mos2" = 'Y' ] ; \
	then \
	sudo sudo firewall-cmd --zone=public --add-port=1883/tcp && \
	sudo sudo firewall-cmd --zone=public --add-port=9001/tcp && \
	sudo firewall-cmd --runtime-to-permanent ; \
	else \
	sudo sudo firewall-cmd --zone=public --remove-port=1883/tcp && \
	sudo sudo firewall-cmd --zone=public --remove-port=9001/tcp && \
	sudo firewall-cmd --runtime-to-permanent ; \
	fi
endif
ifdef WSLENV
	@read -p "Start mosquitto service? (\"N\" will stop it if already running) [y/N]: " mos3 ; \
	if [ "$$mos3" = 'y' ] || [ "$$mos3" = 'Y' ] ; \
	then \
	sudo service mosquitto start; \
	else \
	sudo service mosquitto stop ; \
	fi
else
	@read -p "Enable and start mosquitto service? (\"N\" will disable it if already enabled) [y/N]: " mos3 ; \
	if [ "$$mos3" = 'y' ] || [ "$$mos3" = 'Y' ] ; \
	then \
	sudo systemctl enable mosquitto && \
	sudo systemctl start  mosquitto  ; \
	else \
	sudo systemctl disable mosquitto && \
	sudo systemctl stop    mosquitto  ; \
	fi
endif

licenses:
	@mkdir -p licenses
	@wget -O licenses/xtermjs.xterm.js-LICENSE https://raw.githubusercontent.com/xtermjs/xterm.js/master/LICENSE
	@wget -O licenses/chartjs.chart.js-LICENSE https://raw.githubusercontent.com/chartjs/Chart.js/master/LICENSE.md
	@wget -O licenses/muuri.muuri.js-LICENSE https://raw.githubusercontent.com/haltu/muuri/master/LICENSE.md
	@wget -O licenses/eclipse.mosquitto_paho-LICENSE https://raw.githubusercontent.com/eclipse/mosquitto/master/LICENSE.txt
	@wget -O licenses/google.blockly-LICENSE https://raw.githubusercontent.com/google/blockly/master/LICENSE
	@wget -O licenses/codemirror.codemirror6-LICENSE  https://raw.githubusercontent.com/codemirror/codemirror.next/master/LICENSE

run:
	@printf "Running $(PURPLE)BIPES$(NC) in development mode.\n"
	@. venv/bin/activate && \
	export FLASK_DEBUG=1 && \
	export FLASK_APP="app:create_app('$(database)')" && \
	flask run --port=5001 --host=0.0.0.0


#------------------------------------------------------------------------------
# Help&appearance stuff
#------------------------------------------------------------------------------

help:
	@printf "$(NC)Usage: make [options] $(PURPLE)[params]$(NC) ...\n"
	@printf "  Development (from source):\n\
    all                     Build BIPES from source and run ${BLUE}[default]${NC}.\n\
                            Installs deps, fetches libs, builds bundles, runs.\n\
    run $(PURPLE)database=DB$(NC)         Run in development mode (Flask dev server).\n\
    mosquitto               Setup a local mosquitto MQTT broker (dev).\n\
    \n\
  Production deployment (Docker):\n\
    deploy-prod             Build and start the production stack.\n\
    deploy-restart          Restart the stack without rebuilding.\n\
    deploy-down             Stop and remove the containers.\n\
    deploy-logs             Tail logs from all containers.\n\
    \n\
  Parameters:\n\
    database=DB             The $(PURPLE)database$(NC): $(BLUE)sqlite$(NC) or $(BLUE)postgresql$(NC) (default $(BLUE)postgresql$(NC)).\n\
                            $(BLUE)sqlite$(NC) only supports guest mode (AUTH_MODE=guest).\n\
    lang=LANG               The dev start-page $(PURPLE)lang$(NC)uage (default $(BLUE)en$(NC)).\n"

BLUE=\033[0;34m
PURPLE=\033[0;35m
RED=\033[0;31m
NC=\033[0m

#------------------------------------------------------------------------------
# Production deployment
#------------------------------------------------------------------------------

PROD_COMPOSE = docker compose -f docker-compose.yml -f docker-compose.prod.yml

deploy-prod: deploy-check deploy-ssl deploy-up
	@printf "$(PURPLE)BIPES$(NC) production deployment complete!\n"
	@printf "Access at: https://localhost\n"

deploy-check:
	@printf "$(BLUE)Checking deployment prerequisites...$(NC)\n"
	@if [ ! -f .env ]; then \
		printf "$(RED)Error: .env file not found!$(NC)\n"; \
		printf "Copy .env.example to .env and configure:\n"; \
		printf "  cp .env.example .env\n"; \
		printf "  nano .env\n"; \
		exit 1; \
	fi
	@printf "✅ Environment file found\n"
	@if grep -qE '^(FLASK_SECRET_KEY|PASSWORD_PEPPER|POSTGRES_PASSWORD|MOSQUITTO_PASSWORD|MOSQUITTO_DYNSEC_ADMIN_PASSWORD)=(change-this|changeme)' .env; then \
		printf "$(RED)Error: .env still contains placeholder secrets (change-this.../changeme)!$(NC)\n"; \
		printf "Replace EVERY change-this-* value with a real secret, e.g. generate one with:\n"; \
		printf "  openssl rand -base64 32\n"; \
		exit 1; \
	fi
	@printf "✅ No placeholder secrets in .env\n"

deploy-ssl:
	@if [ ! -f docker/ssl/cert.pem ] || [ ! -f docker/ssl/key.pem ]; then \
		printf "$(BLUE)Generating SSL certificates...$(NC)\n"; \
		./docker/generate-ssl.sh; \
	else \
		printf "✅ SSL certificates found\n"; \
	fi

deploy-up:
	@printf "$(BLUE)Starting production containers...$(NC)\n"
	@$(PROD_COMPOSE) up -d --build
	@printf "$(BLUE)Waiting for services to be ready...$(NC)\n"
	@sleep 5
	@$(PROD_COMPOSE) ps

deploy-down:
	@printf "$(BLUE)Stopping production containers...$(NC)\n"
	@$(PROD_COMPOSE) down

deploy-logs:
	@$(PROD_COMPOSE) logs -f

deploy-restart:
	@$(PROD_COMPOSE) restart

