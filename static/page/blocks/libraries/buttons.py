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

