from BLEPeripheral import BLEPeripheral
from machine import ADC, Pin
import time


adc = ADC(26)

led = Pin("LED", Pin.OUT)
pin16 = Pin(16, Pin.OUT)
pin0 = Pin(0, Pin.OUT)
pin1 = Pin(1, Pin.OUT)
pin2 = Pin(2, Pin.OUT)

pin16.off()
pin0.off()
pin1.off()
pin2.off()


def send_message(message):
    if ble_peripheral.connected:
        ble_peripheral.send(str(message))


def send_datapoint(name, value):
    # BIPES dashboard-friendly format for gauges/charts over Bluetooth.
    send_message("\r\n$" + name + ":" + str(value) + "\r\n")


def on_connect():
    led.on()
    print("Bluetooth connected")


def on_disconnect():
    led.off()
    print("Bluetooth disconnected")


def pin16_control(cmd):
    cmd = cmd.lower()

    if cmd in ("turn_on", "on", "1", "true"):
        pin16.on()
        send_message("ok:pin16:on")
    elif cmd in ("turn_off", "off", "0", "false"):
        pin16.off()
        send_message("ok:pin16:off")
    elif cmd == "toggle":
        pin16.toggle()
        send_message("ok:pin16:toggle")
    else:
        send_message("error:pin16:unknown_command")


def toggle_pin(pin, name):
    pin.toggle()
    send_message("ok:" + name + ":toggle")


def parse_command(message):
    message = message.strip()

    if "(" in message and message.endswith(")"):
        name, value = message[:-1].split("(", 1)
        return name.strip(), value.strip()

    if ":" in message:
        name, value = message.split(":", 1)
        return name.strip(), value.strip()

    if " " in message:
        name, value = message.split(" ", 1)
        return name.strip(), value.strip()

    return message, "toggle"


def on_message_received(message):
    name, value = parse_command(message)
    name = name.lower()
    value = value.strip()

    print("Bluetooth RX:", name, value)

    if name == "pin16":
        pin16_control(value)
    elif name == "pin0":
        toggle_pin(pin0, "pin0")
    elif name == "pin1":
        toggle_pin(pin1, "pin1")
    elif name == "pin2":
        toggle_pin(pin2, "pin2")
    else:
        print("Unknown Bluetooth command:", name)
        send_message("error:unknown_command:" + name)


ble_peripheral = BLEPeripheral()
ble_peripheral.on_write(on_message_received)
ble_peripheral.on_connect(on_connect)
ble_peripheral.on_disconnect(on_disconnect)


while True:
    value = adc.read_u16()
    send_datapoint("adc26", value)
    print("Publishing adc26", value)
    time.sleep(0.5)
