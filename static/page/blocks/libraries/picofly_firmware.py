# picofly_firmware.py
# =============================================================================
# PicoFly Firmware - MicroPython  (Raspberry Pi Pico W)
#
# PIN-MAPPING:
#   GPIO0  → Motor A IN1  (L293D pin 2 / 1A)
#   GPIO1  → Motor A IN2  (L293D pin 7 / 2A)
#   GPIO2  → Motor A EN   (L293D pin 1 / EN1,2)  ← PWM
#   GPIO3  → Motor B IN1  (L293D pin 10 / 3A)
#   GPIO4  → Motor B IN2  (L293D pin 15 / 4A)
#   GPIO5  → Motor B EN   (L293D pin 9 / EN3,4)  ← PWM
#   GPIO6  → Servo 1 (J4) ← PWM
#   GPIO7  → Servo 2 (J5) ← PWM
#   GPIO8  → Servo 3 (J6) ← PWM
#   GPIO9  → Servo 4 (J7) ← PWM
#   GPIO10-14, GPIO26-28 → Ekstra I/O
#
# BRUG:
#   from picofly_firmware import get_board
#   b = get_board()
#   b.servo1.set_angle(90)
#   b.motor_a.forward(0.5)
# =============================================================================

from machine import Pin, PWM
import time
import _thread

# ---------------------------------------------------------------------------
# Konstanter
# ---------------------------------------------------------------------------
PWM_FREQ_MOTOR  = 1000
PWM_FREQ_SERVO  = 50
PWM_MAX         = 65535
SERVO_MIN_US    = 500
SERVO_MAX_US    = 2500
SERVO_PERIOD_US = 20000

# Pins der bruger PWM
_PWM_PINS = (2, 5, 6, 7, 8, 9)


# ---------------------------------------------------------------------------
# Hjælper: ryd PWM-kanaler ud fra evt. tidligere kørsel
# ---------------------------------------------------------------------------
def _release_pwm_pins():
    for p in _PWM_PINS:
        try:
            PWM(Pin(p)).deinit()
        except Exception:
            pass


# ---------------------------------------------------------------------------
# Heartbeat-LED (kerne 2)
#
# Kører på Pico's anden kerne så den aldrig blokeres af motor/servo-kode.
# Mønster: kort blink hvert 2. sekund  →  "jeg lever"
# ---------------------------------------------------------------------------
_led            = Pin("LED", Pin.OUT)
_heartbeat_run  = False   # sættes True når board er klar, False ved stop

def _heartbeat_loop():
    """Kører på kerne 2. Må ikke kastes exceptions – crasher hele tråden."""
    while True:
        if _heartbeat_run:
            _led.on();  time.sleep_ms(80)
            _led.off(); time.sleep_ms(1920)   # blink hvert 2. sek
        else:
            _led.off(); time.sleep_ms(100)

def _start_heartbeat():
    global _heartbeat_run
    _heartbeat_run = True
    # Starter kun tråden første gang – _thread.start_new_thread kan ikke
    # stoppes, så vi lader den løbe og styrer den med flaget.
    try:
        _thread.start_new_thread(_heartbeat_loop, ())
    except Exception:
        pass   # Tråden kørte allerede (fx ved reset_board)

def heartbeat_stop():
    """Sluk heartbeat-blinket (LED slukkes)."""
    global _heartbeat_run
    _heartbeat_run = False

def heartbeat_start():
    """Tænd heartbeat-blinket igen."""
    global _heartbeat_run
    _heartbeat_run = True


# ---------------------------------------------------------------------------
# HBridge
# ---------------------------------------------------------------------------
class HBridge:
    def __init__(self, pin_in1, pin_in2, pin_en):
        self._in1    = Pin(pin_in1, Pin.OUT)
        self._in2    = Pin(pin_in2, Pin.OUT)
        self._pin_en = Pin(pin_en)
        self._en     = PWM(self._pin_en)
        self._en.freq(PWM_FREQ_MOTOR)
        self.stop()

    def forward(self, speed=1.0):
        speed = max(0.0, min(1.0, speed))
        self._in1.value(1); self._in2.value(0)
        self._en.duty_u16(int(speed * PWM_MAX))

    def backward(self, speed=1.0):
        speed = max(0.0, min(1.0, speed))
        self._in1.value(0); self._in2.value(1)
        self._en.duty_u16(int(speed * PWM_MAX))

    def brake(self):
        self._in1.value(1); self._in2.value(1)
        self._en.duty_u16(PWM_MAX)

    def stop(self):
        self._in1.value(0); self._in2.value(0)
        self._en.duty_u16(0)

    def set_speed(self, speed):
        if   speed > 0: self.forward(speed)
        elif speed < 0: self.backward(-speed)
        else:           self.stop()


# ---------------------------------------------------------------------------
# Servo
# ---------------------------------------------------------------------------
class Servo:
    def __init__(self, pin):
        self._pin   = Pin(pin)        # eksplicit ref – forhindrer GC
        self._pwm   = PWM(self._pin)
        self._pwm.freq(PWM_FREQ_SERVO)
        self._angle = 90.0
        self.set_angle(90)

    def _us_to_duty(self, us):
        return int((us / SERVO_PERIOD_US) * PWM_MAX)

    def set_angle(self, angle):
        angle = max(0.0, min(180.0, float(angle)))
        self._angle = angle
        us = SERVO_MIN_US + (SERVO_MAX_US - SERVO_MIN_US) * (angle / 180.0)
        self._pwm.duty_u16(self._us_to_duty(us))

    def set_us(self, us):
        us = max(float(SERVO_MIN_US), min(float(SERVO_MAX_US), float(us)))
        self._pwm.duty_u16(self._us_to_duty(us))

    @property
    def angle(self):
        return self._angle

    def detach(self):
        self._pwm.duty_u16(0)

    def attach(self):
        self._pwm.freq(PWM_FREQ_SERVO)
        self.set_angle(self._angle)


# ---------------------------------------------------------------------------
# PicoFly
# ---------------------------------------------------------------------------
class PicoFly:
    def __init__(self):
        # Frigør PWM-kanaler fra en evt. tidligere kørsel FØR vi laver nye,
        # så programmet kan køres igen uden et hardware-reset
        # (ellers: "PWM already in use").
        _release_pwm_pins()
        self.motor_a = HBridge(0, 1, 2)
        self.motor_b = HBridge(3, 4, 5)
        self.servo1  = Servo(6)
        self.servo2  = Servo(7)
        self.servo3  = Servo(8)
        self.servo4  = Servo(9)
        self.gpio    = {n: Pin(n, Pin.IN, Pin.PULL_DOWN)
                        for n in (10, 11, 12, 13, 14, 26, 27, 28)}
        _start_heartbeat()   # LED blinker = board klar

    @property
    def servos(self):
        return [None, self.servo1, self.servo2, self.servo3, self.servo4]

    def stop_all(self):
        self.motor_a.stop()
        self.motor_b.stop()
        for s in [self.servo1, self.servo2, self.servo3, self.servo4]:
            s.set_angle(90)

    # -----------------------------------------------------------------
    # Hjælpere til blok-editoren
    #
    # De visuelle blokke vælger motor/servo med en dropdown, så de kalder
    # disse board-metoder i stedet for board.motor_a.forward(...) direkte.
    # -----------------------------------------------------------------
    def motor(self, which="a", speed=1.0):
        """Kør motor 'a' eller 'b'.
        speed: -1.0 til 1.0  (positiv = fremad, negativ = baglæns, 0 = stop)."""
        (self.motor_b if which == "b" else self.motor_a).set_speed(speed)

    def motor_stop(self, which="a"):
        """Stop motor 'a' eller 'b'."""
        (self.motor_b if which == "b" else self.motor_a).stop()

    def set_servo(self, servo=1, angle=90):
        """Sæt servo 1-4 til en vinkel (0-180 grader)."""
        self.servos[int(servo)].set_angle(angle)


# ---------------------------------------------------------------------------
# Singleton via get_board()
#
# Vi bruger en funktion i stedet for en modul-global variabel.
# Fordel: hvis oprettelsen fejler første gang, kan man kalde get_board()
# igen efter at have rettet problemet – uden at genindlæse hele modulet.
# Ulempe: ingen.  En modul-global crashede import-linjen og gav en
# uforklarlig "can't import name board"-fejl.
# ---------------------------------------------------------------------------
_board_instance = None

def get_board():
    """
    Returnerer den globale PicoFly-instans.
    Opretter den første gang (eller hvis den ikke eksisterer endnu).
    PWM-pins frigøres automatisk inden oprettelse.
    """
    global _board_instance
    if _board_instance is None:
        # PicoFly.__init__ frigør selv PWM-pins og starter heartbeat.
        _board_instance = PicoFly()
        print("PicoFly: board oprettet OK  (LED blinker = klar)")
    return _board_instance


def reset_board():
    """
    Tving genoprettelse af board (fx hvis hardware skal reinitialiseres).
    """
    global _board_instance
    _board_instance = None
    return get_board()
