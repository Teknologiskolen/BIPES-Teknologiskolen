
import sys, time, uselect

# Bump on every meaningful change so we can confirm WHICH library a device is actually
# running (emitted as "BR,<version>" on INFO). If "Device info" doesn't show this, the
# device is running an OLD bipes_runtime.py — re-flash it over USB (library install over
# WiFi is not supported; see below).
_LIB_VERSION = "2026-06-14-tls"

try:
    import uasyncio as asyncio
except ImportError:
    import asyncio


class _Stop(BaseException):
    """Raised by wait() once the runtime is stopped, to unwind a user loop.

    Subclasses BaseException (not Exception) so a pupil's ``try/except
    Exception`` inside their loop body cannot accidentally swallow it — a
    plain ``while True: ... await wait()`` then actually halts on STOP."""
    pass


def _num(s):
    """Best-effort convert a wire token to int/float, else leave as str."""
    try:
        return int(s)
    except (ValueError, TypeError):
        try:
            return float(s)
        except (ValueError, TypeError):
            return s


class _Runtime:
    def __init__(self):
        self._ble_uart = None
        self._bluetooth_name = None
        self._mqtt_cfg = None
        self._mqtt_client = None
        self._http_host = None
        self._mode = "run"
        self._quit = False
        self._reset()

    def _reset(self):
        self._periodics = []
        self._stop_fn = None       # on_stop
        self._setup_fn = None      # on_start
        self._loop_fn = None       # async loop
        self._connect_fn = None    # on_connect
        self._disconnect_fn = None # on_disconnect
        self._message_fn = None    # on_message(name, value)
        self._subscriptions = set()  # extra MQTT topics (under prefix) -> on_message
        self._ota_url = None       # pending OTA fetch, run OUTSIDE the MQTT callback
        self._watchdog_ms = None
        self._running = True
        self._last_cmd = time.ticks_ms()
        self._outputs = []
        self._readers = []
        self._finalized = False
        self._rx = ""
        self._put_active = False
        self._put_name = None

    def _ensure_fresh(self):
        if self._finalized:
            self._reset()

    # --- explicit event hooks (also usable as decorators by hand-coders) ----------
    # The block-generated program defines top-level functions named on_start /
    # on_stop / on_connect / on_disconnect / on_message / loop; _register() below
    # wires them. These methods let a hand-written program register the same hooks.
    def on_start(self, fn):
        self._ensure_fresh(); self._setup_fn = fn; return fn

    def on_stop(self, fn):
        self._ensure_fresh(); self._stop_fn = fn; return fn

    def on_connect(self, fn):
        self._ensure_fresh(); self._connect_fn = fn; return fn

    def on_disconnect(self, fn):
        self._ensure_fresh(); self._disconnect_fn = fn; return fn

    def on_message(self, fn):
        self._ensure_fresh(); self._message_fn = fn; return fn

    def every(self, ms, fn=None):
        self._ensure_fresh()
        if fn is not None:
            self._periodics.append((ms, fn))
            return fn
        def deco(f):
            self._periodics.append((ms, f))
            return f
        return deco

    def watchdog(self, ms=500):
        self._ensure_fresh()
        self._watchdog_ms = ms

    def send(self, name, value):
        """Telemetry to the dashboard — a gauge/chart bound to <name> updates."""
        self.emit("T,%s=%s" % (name, value))

    def serial_send(self, text):
        """Send a raw line over the runtime channel (serial terminal + any peer).
        Use for free-form text / debugging, as opposed to send() which is telemetry."""
        self.emit(str(text))

    def subscribe(self, topic):
        """Listen for an extra command topic (WiFi only). It is subscribed under the
        device's COMMAND channel (prefix/commands/<topic>) — the only space a device
        is allowed to receive on — and arrives in on_message(name, value) with
        name = <topic>. (Dashboard commands already arrive via commands/#, so this is
        only needed for command names you publish yourself.) No-op on serial/BLE."""
        self._ensure_fresh()
        self._subscriptions.add(topic)
        cfg = self._mqtt_cfg
        if self._mqtt_client is not None and cfg:
            prefix = cfg.get("mqtt", {}).get("prefix", "")
            try:
                self._mqtt_client.subscribe((prefix + "/commands/" + topic).encode())
            except Exception as e:
                self.emit("ERR,subscribe,%s" % e)

    def publish(self, topic, value):
        """Publish an extra value (WiFi only) under the device's TELEMETRY channel
        (prefix/telemetry/<topic>) — the only space a device is allowed to send on, so
        the dashboard sees it like send(). No effect over serial/Bluetooth."""
        cfg = self._mqtt_cfg
        if self._mqtt_client is None or not cfg:
            return
        prefix = cfg.get("mqtt", {}).get("prefix", "")
        try:
            self._mqtt_client.publish((prefix + "/telemetry/" + topic).encode(), str(value).encode())
        except Exception as e:
            self.emit("ERR,publish,%s" % e)

    def ota(self, url):
        """Fetch new program code over HTTP, save it as blocks.py and reboot into it."""
        self._cmd_ota(url)

    def _emit_info(self):
        try:
            import os
            u = os.uname()
            self.emit("I,%s,%s" % (u.nodename, u.release))
        except Exception:
            self.emit("I,Pico,?")
        self.emit("BR,%s" % _LIB_VERSION)   # which bipes_runtime.py is actually running
        self.emit("M," + self._mode)


    def _path(self, name):
        return name if name.startswith("/") else "/" + name

    # Files the browser must NEVER be able to read or list. secrets.json holds the
    # WiFi/MQTT credentials and stays on the device only — LS hides it and GET refuses
    # it. PUT is still allowed (that is how the Device page provisions it over USB).
    _PROTECTED = ("secrets.json",)

    def _is_protected(self, name):
        n = name[1:] if name.startswith("/") else name
        return n in self._PROTECTED

    def _finish_put(self, data):
        self._put_active = False
        name = self._put_name or "blocks.py"
        try:
            with open(self._path(name), "w") as f:
                f.write(data)
            self.emit("ACK,PUT_DONE,%s" % name)
        except Exception as e:
            self.emit("ERR,put,%s" % e)

    def _cmd_ls(self):
        try:
            import os
            names = [n for n in os.listdir("/") if not self._is_protected(n)]
            self.emit("L," + ",".join(names))
        except Exception as e:
            self.emit("ERR,ls,%s" % e)

    def _cmd_del(self, name):
        try:
            import os
            os.remove(self._path(name))
            self.emit("ACK,DEL,%s" % name)
        except Exception as e:
            self.emit("ERR,del,%s" % e)

    def _cmd_get(self, name):
        if self._is_protected(name):
            self.emit("ERR,get,protected"); return
        try:
            with open(self._path(name)) as f:
                content = f.read()
        except Exception as e:
            self.emit("ERR,get,%s" % e); return
        self.emit("G,%s" % name)
        for out in self._outputs:
            try: out(content)
            except Exception: pass
        self.emit("__END__")

    async def wait(self, ms):
        """Cooperative delay — use inside an async loop so serial/ESTOP stay live.

        Sliced into short naps so STOP interrupts within ~50ms, and raises _Stop
        the moment the runtime is stopped so a `while True: ... await wait()` body
        unwinds instead of running forever."""
        if not self._running:
            raise _Stop
        remaining = ms
        while remaining > 0:
            step = 50 if remaining > 50 else remaining
            await asyncio.sleep_ms(step)
            remaining -= step
            if not self._running:
                raise _Stop


    def emit(self, line):
        data = line + "\r\n"
        for out in self._outputs:
            try:
                out(data)
            except Exception:
                pass


    def _safe_stop(self):
        if self._stop_fn:
            try:
                self._stop_fn()
            except Exception as e:
                self.emit("ERR,stop,%s" % e)

    def _dispatch(self, line):
        parts = line.split(",")
        raw = parts[0]
        name = raw.upper()
        args = parts[1:]
        if name == "ESTOP":
            self._safe_stop(); self.emit("ACK,ESTOP"); return
        if name == "STOP":
            self._safe_stop()
            if self._mode == "program":
                self.emit("ACK,STOP"); return
            self._mode = "program"; self._running = False
            self.emit("ACK,STOP"); return
        if name == "QUIT":
            self._safe_stop(); self._quit = True; self._running = False
            self.emit("ACK,QUIT"); return
        if name == "PING":
            self.emit("ACK,PING"); return
        if name == "INFO":
            self._emit_info(); return
        if name == "LS":
            self._cmd_ls(); return
        if name == "PUT":
            self._put_name = args[0] if args else "blocks.py"
            self._put_active = True
            self.emit("ACK,PUT,%s" % self._put_name); return
        if name == "GET":
            self._cmd_get(args[0] if args else ""); return
        if name == "DEL":
            self._cmd_del(args[0] if args else ""); return
        if name == "RUN":
            self._safe_stop(); self._mode = "run"; self._running = False
            self.emit("ACK,RUN"); return
        if name == "RESET":
            self._safe_stop(); self.emit("ACK,RESET")
            try:
                import machine; machine.reset()
            except Exception:
                pass
            return
        if name == "OTA":
            # Queue it — the fetch must NOT run here: this can be inside the MQTT
            # receive callback (check_msg), and opening a second socket then aborts
            # (ECONNABORTED). _ota_task runs it from its own task context.
            self._ota_url = args[0] if args else ""
            self.emit("OTA,queued"); return
        # Anything else is a user command (e.g. from a dashboard switch/button or a
        # peer). The program handles it explicitly via on_message(name, value): one
        # arg -> scalar, several -> list, none -> None. Original-case name preserved.
        self._last_cmd = time.ticks_ms()
        if self._message_fn is None:
            self.emit("ERR,unknown,%s" % raw); return
        if len(args) == 0:
            value = None
        elif len(args) == 1:
            value = _num(args[0])
        else:
            value = [_num(a) for a in args]
        try:
            self._message_fn(raw, value)
            self.emit("ACK,%s" % raw)
        except _Stop:
            raise
        except Exception as e:
            self.emit("ERR,%s,%s" % (raw, e))


    async def _watchdog_task(self):
        armed = False
        while self._running:
            if self._watchdog_ms is not None:
                stale = time.ticks_diff(time.ticks_ms(), self._last_cmd) > self._watchdog_ms
                if stale and armed:
                    self._safe_stop()
                    armed = False
                elif not stale:
                    armed = True
            await asyncio.sleep_ms(20)

    async def _periodic_task(self, ms, fn):
        while self._running:
            try:
                fn()
            except Exception as e:
                self.emit("ERR,periodic,%s" % e)
            await asyncio.sleep_ms(ms)

    async def _loop_task(self):
        while self._running:
            try:
                res = self._loop_fn()
                if res is not None and hasattr(res, "send"):
                    await res
            except _Stop:
                break
            except Exception as e:
                self.emit("ERR,loop,%s" % e)
            await asyncio.sleep_ms(1)

    def _fire_connect(self):
        if self._connect_fn:
            try:
                self._connect_fn()
            except Exception as e:
                self.emit("ERR,on_connect,%s" % e)

    def _fire_disconnect(self):
        if self._disconnect_fn:
            try:
                self._disconnect_fn()
            except Exception as e:
                self.emit("ERR,on_disconnect,%s" % e)

    async def _ota_task(self):
        # Apply a queued OTA outside the MQTT receive callback. Yields between checks
        # so the blocking HTTP fetch never runs re-entrantly with check_msg().
        while self._running:
            if self._ota_url is not None:
                url = self._ota_url
                self._ota_url = None
                self._cmd_ota(url)        # fetches, writes blocks.py, reboots (or ERRs)
            await asyncio.sleep_ms(100)

    async def _connection_monitor(self):
        # Bluetooth has real connect/disconnect events (a central joins/leaves while
        # the program keeps running) — poll the BLEUART for transitions. Serial and
        # MQTT links are up the moment we start, so fire on_connect once.
        ble = self._ble_uart
        if ble is None:
            self._fire_connect()
            while self._running:
                await asyncio.sleep_ms(250)
            return
        was = False
        while self._running:
            try:
                now = ble.is_connected()
            except Exception:
                now = was
            if now and not was:
                self._fire_connect()
            elif was and not now:
                self._fire_disconnect()
            was = now
            await asyncio.sleep_ms(150)


    def _add_transport(self, writer, reader_factory):
        self._outputs.append(writer)
        if reader_factory is not None:
            self._readers.append(reader_factory)

    def _serial_transport(self):
        wpoll = None
        try:
            wpoll = uselect.poll()
            wpoll.register(sys.stdout, uselect.POLLOUT)
        except Exception:
            wpoll = None
        def writer(text):
            try:
                if wpoll is not None and not wpoll.poll(0):
                    return
                sys.stdout.write(text)
            except Exception:
                pass
        self._add_transport(writer, lambda: self._serial_reader())

    def _feed(self, text):
        self._rx += text
        while True:
            if self._put_active:
                i = self._rx.find("__END__")
                if i < 0:
                    return
                self._finish_put(self._rx[:i])
                self._rx = self._rx[i + 7:]
                continue
            nl = -1
            for k in range(len(self._rx)):
                if self._rx[k] == "\n" or self._rx[k] == "\r":
                    nl = k; break
            if nl < 0:
                return
            line = self._rx[:nl].strip()
            self._rx = self._rx[nl + 1:]
            if line:
                self._dispatch(line)

    async def _serial_reader(self):
        poll = uselect.poll()
        poll.register(sys.stdin, uselect.POLLIN)
        while self._running:
            try:
                if poll.poll(0):
                    ch = sys.stdin.read(1)
                    if ch:
                        self._feed(ch)
            except Exception:
                pass
            await asyncio.sleep_ms(5)

    def _bluetooth_transport(self, name):
        if self._ble_uart is None:
            import bluetooth
            from ble_uart_peripheral import BLEUART
            self._ble_uart = BLEUART(bluetooth.BLE(), name=name)
        uart = self._ble_uart
        self._add_transport(lambda text: uart.write(text.encode()),
                            lambda: self._ble_reader(uart))

    async def _ble_reader(self, uart):
        while self._running:
            if uart.any():
                try:
                    self._feed(bytes(uart.read()).decode())
                except Exception:
                    pass
            await asyncio.sleep_ms(10)


    def _http_get(self, url, tries=3):
        """Minimal plain-HTTP GET (HTTP/1.0, Connection: close). Returns the response
        body as text. Used for OTA so the Pico avoids TLS overhead — the URL is
        token-gated and served on the LAN over port 80.

        NOT firmware OTA: there are no partitions or bootloader swap. This just downloads
        a .py file and writes it to the LittleFS filesystem; the caller soft-resets to
        re-run it. So a failure is always a plain HTTP/socket problem, never a flash one.

        Errors are tagged with the failing stage (connect/send/recv) so the browser can
        tell a network-unreachable port (connect) from a lost reply (recv). connect/send
        failures are retried — the GET never reached the server, so the single-use token
        is untouched; a non-200 (token already spent) is raised, not retried."""
        import usocket as socket
        rest = url.split("://", 1)[-1]
        host_port, _, path = rest.partition("/")
        path = "/" + path
        if ":" in host_port:
            host, port = host_port.split(":", 1); port = int(port)
        else:
            host, port = host_port, 80
        addr = socket.getaddrinfo(host, port)[0][-1]
        last = "connect:failed"
        for _attempt in range(tries):
            s = socket.socket()
            stage = "connect"
            try:
                try:
                    s.settimeout(15)
                except Exception:
                    pass
                s.connect(addr)
                stage = "send"
                s.send(("GET %s HTTP/1.0\r\nHost: %s\r\nConnection: close\r\n\r\n"
                        % (path, host)).encode())
                stage = "recv"
                data = b""
                while True:
                    try:
                        chunk = s.recv(512)
                    except Exception:
                        break   # recv timed out; the body may already be complete (below)
                    if not chunk:
                        break
                    data += chunk
                    # Stop as soon as the full body arrived instead of waiting for the
                    # close — don't let a missed FIN force a needless timeout.
                    i = data.find(b"\r\n\r\n")
                    if i >= 0:
                        cl = -1
                        for ln in data[:i].split(b"\r\n"):
                            if ln[:15].lower() == b"content-length:":
                                try: cl = int(ln.split(b":", 1)[1].strip())
                                except Exception: cl = -1
                        if cl >= 0 and len(data) - (i + 4) >= cl:
                            break
                i = data.find(b"\r\n\r\n")
                if i < 0:
                    last = "recv:no-response"
                    continue        # GET may not have reached the server -> retry safely
                head = data[:i].decode().split("\r\n", 1)[0]
                if "200" not in head:
                    raise OSError(head)     # consumed token / error: do NOT retry
                return data[i + 4:].decode()
            except OSError as e:
                last = "%s:%s" % (stage, e)
                if stage == "connect" or stage == "send":
                    continue                # token untouched -> safe to retry
                raise OSError(last)         # recv-stage / non-200: report it
            finally:
                try: s.close()
                except Exception: pass
        raise OSError(last)

    def _mqtt_reconnect(self):
        """Re-establish the MQTT link after we dropped it for an OTA fetch that then
        failed — so a failed OTA leaves the device running and reachable instead of
        offline. No reboot involved."""
        cfg = self._mqtt_cfg
        if self._mqtt_client is None or not cfg:
            return
        prefix = cfg.get("mqtt", {}).get("prefix", "")
        try:
            self._mqtt_client.connect()
            self._mqtt_client.subscribe((prefix + "/commands/#").encode())
            for topic in self._subscriptions:
                self._mqtt_client.subscribe((prefix + "/" + topic).encode())
            self._mqtt_client.publish((prefix + "/telemetry/online").encode(), b"1", retain=True)
            self.emit("MQTT,reconnected")
        except Exception as e:
            self.emit("ERR,mqtt,reconnect %s" % e)

    def _cmd_ota(self, target):
        """Over-the-air program update: fetch new code over HTTP and reboot into it.
        `target` is a path (e.g. /ota/<token>) resolved against the broker host, or a
        full http:// URL. Notified via MQTT (commands/ota); transfer is HTTP."""
        try:
            if target.startswith("http"):
                url = target
            else:
                host = self._http_host or "127.0.0.1"
                if not target.startswith("/"):
                    target = "/" + target
                url = "http://%s%s" % (host, target)
            self.emit("OTA,downloading %s" % url)
            # Keep WiFi awake for the fetch. The Pico W's default power-save lets a fresh
            # socket's packets get dropped while the radio dozes -> [Errno 110] ETIMEDOUT.
            try:
                import network
                network.WLAN(network.STA_IF).config(pm=0xa11140)
            except Exception:
                pass
            # Keep the MQTT link UP during the fetch. We used to disconnect it (the old
            # "socket contention" stall was really power-save, now fixed by PM_NONE), but
            # disconnecting then immediately opening a new socket makes the connect itself
            # time out on this firmware — and with MQTT down any error we emit is lost.
            # The fetch is brief and synchronous; MQTT keepalive resumes right after.
            import time as _t
            body = self._http_get(url)
            if not body:
                self.emit("ERR,ota,empty")
                return
            with open("/blocks.py", "w") as f:
                f.write(body)
            self.emit("ACK,OTA")
            self.emit("OTA,applied - rebooting")
            # SUCCESS ONLY: reboot into the new program. (This re-enumerates USB, so a
            # serial link will drop — observe the device over WiFi after an OTA.)
            import machine
            _t.sleep_ms(300)
            machine.reset()
        except Exception as e:
            # Any failure: do NOT reboot (the new code wasn't applied, and a reset would
            # re-enumerate USB and drop serial). The MQTT link is still up, so the error
            # (stage-tagged: connect/send/recv) reaches the browser directly.
            self.emit("ERR,ota,%s" % e)

    def _load_secrets(self):
        try:
            import json
            with open("/secrets.json") as f:
                return json.loads(f.read())
        except Exception:
            return None

    def _wifi_connect(self, ssid, pw, timeout_ms=15000):
        import network, time as _t
        wlan = network.WLAN(network.STA_IF)
        wlan.active(True)
        # Disable WiFi power-save. The Pico W defaults to a power-save mode that keeps an
        # already-established link alive (MQTT keepalive survives) but lets a FRESH
        # outbound TCP connect stall and time out ([Errno 110] ETIMEDOUT) — which broke
        # the OTA HTTP fetch even though MQTT to the same host worked fine. PM_NONE keeps
        # the radio responsive for new sockets. (0xa11140 == WIFI_PM_NONE.)
        try:
            wlan.config(pm=0xa11140)
        except Exception:
            pass
        if not wlan.isconnected():
            wlan.connect(ssid, pw)
            t0 = _t.ticks_ms()
            while not wlan.isconnected() and _t.ticks_diff(_t.ticks_ms(), t0) < timeout_ms:
                _t.sleep_ms(200)
        ok = wlan.isconnected()
        return (ok, wlan.ifconfig()[0] if ok else "")

    def _mqtt_on_msg(self, topic, msg, prefix):
        try:
            t = topic.decode() if isinstance(topic, bytes) else topic
            payload = msg.decode() if isinstance(msg, bytes) else msg
            rel = t[len(prefix) + 1:] if t.startswith(prefix + "/") else t
            # An extra topic the program subscribed to -> on_message(rel, payload).
            if rel in self._subscriptions:
                self._feed((rel if not payload else rel + "," + payload) + "\n")
                return
            # Otherwise it is a command (prefix/commands/<name>) -> on_message.
            name = t.rsplit("/", 1)[-1]
            self._feed((name if not payload else name + "," + payload) + "\n")
        except Exception:
            pass

    def _mqtt_pub(self, client, prefix, text):
        try:
            line = text.strip()
            if not line:
                return
            if line[:2] == "T," and "=" in line:
                name, val = line[2:].split("=", 1)
                client.publish((prefix + "/telemetry/" + name).encode(), val.encode())
            else:
                client.publish((prefix + "/telemetry/status").encode(), line.encode())
        except Exception:
            pass

    async def _mqtt_reader(self, client):
        while self._running:
            try:
                client.check_msg()
            except Exception:
                pass
            await asyncio.sleep_ms(50)

    def _wifi_connected(self):
        try:
            import network
            return network.WLAN(network.STA_IF).isconnected()
        except Exception:
            return False

    def _ssl_args(self, m):
        """Build the TLS kwargs for MQTTClient, tolerant of BOTH umqtt APIs:
          - modern: ssl=<SSLContext>  (umqtt calls ctx.wrap_socket(..., server_hostname))
          - legacy: ssl=True, ssl_params={}  (umqtt calls ussl.wrap_socket(sock))
        Passing an SSLContext as `ssl` satisfies the modern client; the legacy client
        just sees it as truthy and wraps with the (empty) ssl_params — both end up with
        an encrypted socket. If the broker cert can't be verified on this tiny device we
        ENCRYPT WITHOUT VERIFYING (stops passive sniffing of the device credentials —
        the main goal); pass a CA PEM in the WiFi config (`ca`) to also authenticate the
        broker and defeat active MITM (needs a real cert, e.g. Let's Encrypt, on the VM)."""
        if not m.get("ssl"):
            return {}
        try:
            import ssl
            ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
            ca = m.get("ca")
            if ca:
                ctx.load_verify_locations(cadata=ca)
                ctx.verify_mode = ssl.CERT_REQUIRED
            else:
                try: ctx.check_hostname = False
                except Exception: pass
                ctx.verify_mode = ssl.CERT_NONE
            return {"ssl": ctx, "ssl_params": {}}
        except Exception:
            # Old firmware without ssl.SSLContext -> legacy boolean API (encrypt-only).
            return {"ssl": True, "ssl_params": {}}

    def _wifi_mqtt_transport(self, cfg):
        m = cfg.get("mqtt", {})
        prefix = m.get("prefix", "")
        self._http_host = m.get("host")        # used to resolve relative OTA URLs

        # IMPORTANT: only bring WiFi + MQTT up the FIRST time. On a run<->program
        # switch the launcher re-enters here, but the radio is still associated and
        # the broker socket is still open — re-joining/reconnecting every time is what
        # made WiFi slow and flaky. If it's already up, just re-attach the transport
        # to the live client (cheap, quiet) and return.
        if self._mqtt_client is not None and self._wifi_connected():
            client = self._mqtt_client
            client.set_callback(lambda topic, msg: self._mqtt_on_msg(topic, msg, prefix))
            self._add_transport(lambda text: self._mqtt_pub(client, prefix, text),
                                lambda: self._mqtt_reader(client))
            return

        # First-time bring-up (these emit() lines show progress over serial).
        wifi = cfg.get("wifi", {})
        self.emit("WIFI,joining %s ..." % wifi.get("ssid", ""))
        ok, ip = self._wifi_connect(wifi.get("ssid", ""), wifi.get("pw", ""))
        if not ok:
            self.emit("ERR,wifi,timeout joining '%s'" % wifi.get("ssid", "")); return
        self.emit("WIFI,connected ip=%s" % ip)
        self.emit("MQTT,connecting %s:%s ..." % (m.get("host", "?"), m.get("port", 1883)))
        try:
            try:
                from umqtt.robust import MQTTClient
            except ImportError:
                try:
                    from umqtt.simple import MQTTClient
                except ImportError:
                    from umqtt_simple import MQTTClient   # vendored single-file fallback
            cid = m.get("client_id") or ("bipes-" + str(m.get("user", "dev")))
            use_ssl = bool(m.get("ssl"))
            port = int(m.get("port", 8883 if use_ssl else 1883))
            self._mqtt_client = MQTTClient(cid, m.get("host", "127.0.0.1"),
                                           port=port,
                                           user=m.get("user"), password=m.get("password"),
                                           keepalive=30, **self._ssl_args(m))
            # MQTT-native presence: a RETAINED last-will the broker publishes if we
            # drop ungracefully, so the browser sees offline without any heartbeat
            # or DB polling. We publish "1" (online) right after connecting.
            self._mqtt_client.set_last_will((prefix + "/telemetry/online").encode(),
                                            b"0", retain=True)
            self._mqtt_client.connect()
        except Exception as e:
            # Discard the half-created client so the NEXT setup re-creates and retries
            # instead of subscribing on a never-connected client. Code 5 = broker
            # rejected the credentials (usually a missing/stale /secrets.json).
            self._mqtt_client = None
            self.emit("ERR,mqtt,connect %s" % e); return
        client = self._mqtt_client
        client.set_callback(lambda topic, msg: self._mqtt_on_msg(topic, msg, prefix))
        try:
            client.subscribe((prefix + "/commands/#").encode())
            for topic in self._subscriptions:           # extra command topics from subscribe()
                client.subscribe((prefix + "/commands/" + topic).encode())
        except Exception as e:
            self.emit("ERR,mqtt,subscribe %s" % e)
        try:
            client.publish((prefix + "/telemetry/online").encode(), b"1", retain=True)
        except Exception:
            pass
        self.emit("MQTT,connected prefix=%s" % prefix)
        self._add_transport(lambda text: self._mqtt_pub(client, prefix, text),
                            lambda: self._mqtt_reader(client))

    # Block programs define top-level functions with these exact names; we wire each
    # to its hook. Everything else is the user's own helpers (called from on_message
    # etc.) — there is no automatic command dispatch any more (explicit on_message).
    _HOOKS = {"loop": "_loop_fn", "on_start": "_setup_fn", "on_stop": "_stop_fn",
              "on_connect": "_connect_fn", "on_disconnect": "_disconnect_fn",
              "on_message": "_message_fn"}

    def _register(self, ns):
        if isinstance(ns, dict):
            items = list(ns.items())
        else:
            items = [(n, getattr(ns, n)) for n in dir(ns)]
        for name, val in items:
            if name.startswith("_") or not callable(val):
                continue
            if type(val).__name__ not in ("function", "closure", "generator"):
                continue
            attr = self._HOOKS.get(name)
            if attr is not None:
                setattr(self, attr, val)

    async def _main(self):
        if self._setup_fn:
            try:
                self._setup_fn()
            except Exception as e:
                self.emit("ERR,on_start,%s" % e)
        tasks = [rf() for rf in self._readers]
        tasks.append(self._watchdog_task())
        tasks.append(self._connection_monitor())
        tasks.append(self._ota_task())
        for ms, fn in self._periodics:
            tasks.append(self._periodic_task(ms, fn))
        if self._loop_fn:
            tasks.append(self._loop_task())
        self.emit("READY")
        self.emit("M,run")
        await asyncio.gather(*tasks)

    async def _program_main(self):
        tasks = [rf() for rf in self._readers]
        tasks.append(self._ota_task())
        self.emit("READY")
        self.emit("M,program")
        await asyncio.gather(*tasks)

    def _run_loop(self, main_coro_factory):
        self._serial_transport()
        if self._bluetooth_name:
            self._bluetooth_transport(self._bluetooth_name)
        elif self._mqtt_cfg:
            self._wifi_mqtt_transport(self._mqtt_cfg)
        try:
            asyncio.new_event_loop()
        except AttributeError:
            pass
        try:
            import micropython
            micropython.kbd_intr(-1)
        except Exception:
            pass
        try:
            asyncio.run(main_coro_factory())
        except KeyboardInterrupt:
            self._quit = True
        except _Stop:
            pass
        finally:
            try:
                import micropython
                micropython.kbd_intr(3)
            except Exception:
                pass
            self._running = False
            self._safe_stop()
            self._finalized = True

    def start(self, bluetooth=None, mqtt=None):
        if bluetooth:
            self._bluetooth_name = bluetooth
        if mqtt:
            self._mqtt_cfg = mqtt
        self._run_loop(self._main)

    def serve_program(self):
        self._ensure_fresh()
        self._run_loop(self._program_main)



runtime = _Runtime()

def run(ns, bluetooth=None, wifi=None):
    """Wire up a pupil program (module or globals()) and start the runtime.

    Serial is always available. bluetooth=<name> (or True for a default name) adds
    the BLE NUS transport. wifi can be:
      - True   -> MQTT using credentials from /secrets.json (secure; nothing in code)
      - a dict -> literal lab config, e.g.
                  {"ssid": "...", "pw": "...", "host": "...", "port": 1884,
                   "user": "...", "password": "...", "prefix": "..."}
    Bluetooth and Wi-Fi are never enabled at the same time.
    """
    runtime._ensure_fresh()
    runtime._register(ns)
    mqtt_cfg = None
    bt = bluetooth
    if wifi:
        if isinstance(wifi, dict):
            # Lab/literal config typed into the WiFi blocks. Normalise the flat dict
            # into the {wifi:{...}, mqtt:{...}} shape the transport expects.
            # TLS on by default (ssl defaults True): the broker only publishes its TLS
            # listener now, so device credentials are encrypted in transit. A block can
            # pass ssl=False for a plain-MQTT lab broker. Port defaults to 8883 (TLS) /
            # 1883 (plain) unless given. Optional `ca` (PEM) verifies the broker.
            _ssl = wifi.get("ssl", True)
            mqtt_cfg = {
                "wifi": {"ssid": wifi.get("ssid", ""), "pw": wifi.get("pw", "")},
                "mqtt": {"host": wifi.get("host", "127.0.0.1"),
                         "port": int(wifi.get("port", 8883 if _ssl else 1883)),
                         "ssl": _ssl, "ca": wifi.get("ca"),
                         "user": wifi.get("user"), "password": wifi.get("password"),
                         "prefix": wifi.get("prefix", "")},
            }
        else:
            mqtt_cfg = runtime._load_secrets()
        if mqtt_cfg:
            bt = None                        # WiFi up -> never with BLE
        else:
            # No WiFi credentials yet -> keep running over SERIAL so the device stays
            # reachable for setup (Device page writes /secrets.json over USB). After
            # that, reboot and this same call takes the MQTT path. mqtt_cfg stays None.
            runtime.emit("ERR,wifi,no /secrets.json - set up WiFi on the Device page (over USB), then reboot")
    elif bluetooth is True:
        bt = "Pico-BIPES"
    runtime.start(bluetooth=bt, mqtt=mqtt_cfg)

def send(name, value):
    runtime.send(name, value)

def serial_send(text):
    runtime.serial_send(text)

async def wait(ms):
    await runtime.wait(ms)

def subscribe(topic):
    runtime.subscribe(topic)

def publish(topic, value):
    runtime.publish(topic, value)

def ota(url):
    runtime.ota(url)

def load_secrets():
    return runtime._load_secrets()

def every(ms, fn=None):
    return runtime.every(ms, fn)

def watchdog(ms=500):
    runtime.watchdog(ms)

