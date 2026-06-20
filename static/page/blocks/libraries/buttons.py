"""Button handling with IRQ, debounce and auto-repeat for MicroPython."""

from machine import Pin
import time

DEBOUNCE_MS = 130
HOLD_THRESHOLD_MS = 500
REPEAT_INTERVAL_MS = 120


def setup_buttons(pin1, pin2, pin3):
    """Set up three buttons with IRQ handlers and debounce.

    Returns (btn1, btn2, btn3, events) where events is a shared state dict.
    """
    btn1 = Pin(pin1, Pin.IN, Pin.PULL_DOWN)
    btn2 = Pin(pin2, Pin.IN, Pin.PULL_DOWN)
    btn3 = Pin(pin3, Pin.IN, Pin.PULL_DOWN)

    events = {
        'button1': False,
        'button2': False,
        'button2_held': False,
        'button2_hold_start': 0,
        'button3_press': False,
        'button3_release': False,
        'button3_press_time': 0,
    }

    last_interrupt_time = {
        'button1': 0,
        'button2': 0,
        'button3': 0,
    }

    def button1_handler(pin):
        current_time = time.ticks_ms()
        if time.ticks_diff(current_time, last_interrupt_time['button1']) > DEBOUNCE_MS:
            if pin.value() == 1:
                events['button1'] = True
            last_interrupt_time['button1'] = current_time

    def button2_handler(pin):
        current_time = time.ticks_ms()
        if time.ticks_diff(current_time, last_interrupt_time['button2']) > DEBOUNCE_MS:
            if pin.value() == 1:
                events['button2'] = True
                events['button2_held'] = True
                events['button2_hold_start'] = current_time
            else:
                events['button2_held'] = False
            last_interrupt_time['button2'] = current_time

    def button3_handler(pin):
        current_time = time.ticks_ms()
        if time.ticks_diff(current_time, last_interrupt_time['button3']) > DEBOUNCE_MS:
            if pin.value() == 1:
                events['button3_press'] = True
                events['button3_press_time'] = current_time
            else:
                events['button3_release'] = True
            last_interrupt_time['button3'] = current_time

    btn1.irq(trigger=Pin.IRQ_RISING, handler=button1_handler)
    btn2.irq(trigger=Pin.IRQ_RISING | Pin.IRQ_FALLING, handler=button2_handler)
    btn3.irq(trigger=Pin.IRQ_RISING | Pin.IRQ_FALLING, handler=button3_handler)

    return btn1, btn2, btn3, events


_last_repeat = [0]

def check_auto_repeat(events, btn2, hold_ms=HOLD_THRESHOLD_MS, repeat_ms=REPEAT_INTERVAL_MS):
    """Check if button 2 should auto-repeat. Returns True when a repeat fires."""
    if events['button2_held'] and btn2.value() == 1:
        current_time = time.ticks_ms()
        hold_duration = time.ticks_diff(current_time, events['button2_hold_start'])
        if hold_duration > hold_ms:
            if time.ticks_diff(current_time, _last_repeat[0]) > repeat_ms:
                _last_repeat[0] = current_time
                return True
    else:
        if events['button2_held'] and btn2.value() == 0:
            events['button2_held'] = False
    return False


# ---------------------------------------------------------------------------
# ButtonHub: object-driven buttons (any number, by pin), polled (no IRQ).
# Each query method advances every button's state machine from time.ticks_ms()
# before reading it, so no separate poll()/update() call is needed — calling a
# query twice in one loop is harmless (state advances on time + pin, not on the
# call). Edge events (pressed/released/clicked/double/repeat) are latched and
# consumed by their matching query; level queries (is_down/is_held) don't clear.
# ---------------------------------------------------------------------------

class _Btn:
    def __init__(self, pin, pull, debounce_ms, hold_ms, repeat_ms, double_ms):
        if pull == "up":
            self.pin = Pin(pin, Pin.IN, Pin.PULL_UP)
            self._active = 0            # pressed = wired to GND
        elif pull == "none":
            self.pin = Pin(pin, Pin.IN)
            self._active = 1
        else:                           # "down" (default): pressed = wired to 3V3
            self.pin = Pin(pin, Pin.IN, Pin.PULL_DOWN)
            self._active = 1

        self.debounce_ms = debounce_ms
        self.hold_ms = hold_ms
        self.repeat_ms = repeat_ms
        self.double_ms = double_ms

        self.down = False               # debounced, stable state
        self._raw = False               # last raw sample
        self._raw_at = 0                # when the raw sample last changed
        self._press_at = 0              # when the current press began
        self._last_repeat = 0
        self._held_fired = False

        # latched one-shot events (cleared on consume)
        self._f_pressed = False
        self._f_released = False
        self._f_repeat = False
        self._f_clicked = False
        self._f_double = False

        # single-vs-double click tracking
        self._pending_single = False
        self._pending_at = 0
        self._last_press_at = 0

    def poll(self, now):
        raw = (self.pin.value() == self._active)
        if raw != self._raw:
            self._raw = raw
            self._raw_at = now
        # accept a debounced change of state
        if raw != self.down and time.ticks_diff(now, self._raw_at) >= self.debounce_ms:
            self.down = raw
            if raw:                                     # ----- press edge -----
                self._f_pressed = True
                self._press_at = now
                self._last_repeat = now
                self._held_fired = False
                if self._pending_single and \
                        time.ticks_diff(now, self._last_press_at) <= self.double_ms:
                    self._f_double = True               # confirmed double click
                    self._pending_single = False
                else:
                    self._pending_single = True         # maybe a single click
                    self._pending_at = now
                self._last_press_at = now
            else:                                       # ----- release edge -----
                self._f_released = True

        if self.down:                                   # hold + auto-repeat
            if not self._held_fired and time.ticks_diff(now, self._press_at) >= self.hold_ms:
                self._held_fired = True
            if self._held_fired and time.ticks_diff(now, self._last_repeat) >= self.repeat_ms:
                self._last_repeat = now
                self._f_repeat = True

        # a lone press, with no 2nd press inside the double-click window -> single click
        if self._pending_single and time.ticks_diff(now, self._pending_at) > self.double_ms:
            self._pending_single = False
            self._f_clicked = True

    def take(self, name):
        v = getattr(self, name)
        if v:
            setattr(self, name, False)
        return v


class ButtonHub:
    """Manage any number of buttons by pin. Create once, add() each button, then
    query was_pressed/was_released/was_clicked/was_double_clicked/repeated (one-shot)
    and is_down/is_held (level) — each with the button's pin number."""

    def __init__(self):
        self._btns = {}

    def add(self, pin, pull="down", debounce_ms=DEBOUNCE_MS,
            hold_ms=HOLD_THRESHOLD_MS, repeat_ms=REPEAT_INTERVAL_MS, double_ms=400):
        self._btns[pin] = _Btn(pin, pull, debounce_ms, hold_ms, repeat_ms, double_ms)

    def _tick(self):
        now = time.ticks_ms()
        for b in self._btns.values():
            b.poll(now)

    def was_pressed(self, pin):
        self._tick()
        return self._btns[pin].take("_f_pressed")

    def was_released(self, pin):
        self._tick()
        return self._btns[pin].take("_f_released")

    def was_clicked(self, pin):
        self._tick()
        return self._btns[pin].take("_f_clicked")

    def was_double_clicked(self, pin):
        self._tick()
        return self._btns[pin].take("_f_double")

    def repeated(self, pin):
        self._tick()
        return self._btns[pin].take("_f_repeat")

    def is_down(self, pin):
        self._tick()
        return self._btns[pin].down

    def is_held(self, pin):
        self._tick()
        return self._btns[pin]._held_fired
