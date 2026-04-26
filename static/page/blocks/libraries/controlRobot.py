import utime
from machine import Pin
from BLEPeripheral import BLEPeripheral
from sand_table_robot import SandTableRobot

robot = SandTableRobot(
    motor1_pins=(17, 16, 15, 14),
    motor2_pins=(21, 20, 19, 18),
    sensor_shoulder_pin=1,
    sensor_elbow_pin=22,
    L1=31.0,
    L2=31.0
)

try:
    robot.home()
    utime.sleep(1)

except KeyboardInterrupt:
    robot.off()


led = Pin("LED", Pin.OUT)


def send_message(message):
    if ble_peripheral.connected:
        ble_peripheral.send(str(message))


def on_connect():
    led.on()
    print("Bluetooth connected")


def on_disconnect():
    led.off()
    print("Bluetooth disconnected")


def Home(message):
    if message == "homing":
        print("Homing")
        try:
            robot.home()
            utime.sleep(1)

        except KeyboardInterrupt:
            robot.off()

        
def DrawSpiral(message):
    if message == "drawSpiral":
        print("Drawing Spiral")
        try:
            robot.draw_spiral(max_radius=60, vindinger=10)
            utime.sleep(1)

        except KeyboardInterrupt:
            robot.off()

def DrawFlower(message):
    if message == "drawFlower":
        print("Drawing Flower")
        try:
            robot.draw_flower(max_radius=50, petals=4)
            utime.sleep(1)

        except KeyboardInterrupt:
            robot.off()

def Drawing(message):
    if message == "drawFlower":
        print("Drawing Flower")
        try:
            robot.draw_flower(max_radius=50, petals=4)
            utime.sleep(1)

        except KeyboardInterrupt:
            robot.off()


def Off(message):
    if message == "off":
        print("Robot Off")
        robot.off()


COMMANDS = {
    "Home": Home,
    "home": Home,
    "homing": Home,
    "DrawSpiral": DrawSpiral,
    "drawSpiral": DrawSpiral,
    "DrawFlower": DrawFlower,
    "drawFlower": DrawFlower,
    "Drawing": Drawing,
    "Off": Off,
    "off": Off,
}


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

    return message, message


def on_message_received(message):
    name, value = parse_command(message)
    print("Bluetooth RX:", name, value)

    if name not in COMMANDS:
        print("Unknown Bluetooth command:", name)
        send_message("error:unknown_command:" + name)
        return

    try:
        COMMANDS[name](value)
        send_message("ok:" + name)
    except Exception as error:
        print("Bluetooth command failed:", error)
        send_message("error:" + name)


ble_peripheral = BLEPeripheral()
ble_peripheral.on_write(on_message_received)
ble_peripheral.on_connect(on_connect)
ble_peripheral.on_disconnect(on_disconnect)


while True:
    utime.sleep_ms(100)
    
