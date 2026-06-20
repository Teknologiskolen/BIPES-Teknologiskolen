# ============================================================
# runtime_demo.py  —  flash this as blocks.py to test the runtime.
# Self-contained: uses only the onboard LED (no motor/sensor board).
#
# EXPLICIT comms model: the program wires every event itself —
#   on_start      runs once at boot (safe state)
#   on_connect    a client (the browser) connected
#   on_disconnect the client dropped (program keeps running)
#   on_message    a command arrived -> check the name, call a function
#   on_stop       the program was halted (Stop / watchdog / exit)
#   loop          an async task the runtime runs continuously
#
# Commands (send from the dashboard or terminal): led_on / led_off /
#   drive,40,40   -> on_message branches on the name
# Telemetry out: T,alive=<0|1>  (bind a gauge to "alive")
#
# Pick a transport at the bottom:
#   Serial:    run(globals())
#   Bluetooth: run(globals(), bluetooth="PicoW-Test")
#   WiFi/MQTT: run(globals(), wifi=True)   # reads /secrets.json
# ============================================================

from machine import Pin
import bipes_runtime
from bipes_runtime import send, wait, run, serial_send

led = Pin("LED", Pin.OUT)


def on_start():
    # One-time setup: known safe state.
    led.off()


def on_connect():
    serial_send("a client connected")


def on_disconnect():
    serial_send("a client disconnected")


def on_message(name, value):
    # The dispatch is explicit now — check the command name and act.
    if name == "led_on":
        led.on()
    elif name == "led_off":
        led.off()
    elif name == "drive":
        # value is a list here, e.g. [40, 40]. No motors on this board, so just
        # echo it back as telemetry to prove command intake works.
        send("drive", value)


async def loop():
    # Heartbeat telemetry. `await wait()` yields so serial / BLE / MQTT stay
    # responsive and STOP can interrupt the loop.
    send("alive", 1 if led.value() else 0)
    await wait(1000)


def on_stop():
    # Safe state on STOP / QUIT / ESTOP / watchdog / exit.
    led.off()


# Stop (LED off) if no command arrives for 10 s (dead-man's switch; raise/remove
# for a steady LED while you poke at it).
bipes_runtime.watchdog(10000)

# Launch — uncomment ONE transport.
run(globals())
# run(globals(), bluetooth="PicoW-Test")
# run(globals(), wifi=True)
