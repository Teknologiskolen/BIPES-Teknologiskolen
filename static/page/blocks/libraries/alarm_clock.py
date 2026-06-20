"""Alarm-clock framework for the Pico W kit (ST7735S + DS1302 + 3 buttons).

Designed to be driven at THREE grains, so you can teach from coarse to fine:

  COARSE  - one call does everything:
              clock.update()                  # read + buttons + alarm + default screen
              if clock.alarm_started(): ...    # your sound

  MID     - you write the loop, the SCREEN and the BUTTON mapping; the engine keeps
            the hard parts (RTC, edit-math, mode state, alarm match, partial redraw):
              clock.read()
              if clock.field_pressed():        clock.next_field()
              if clock.plus_pressed():         clock.increase()
              if clock.mode_double_clicked():  clock.set_clock_mode()
              if clock.mode_clicked():         clock.save()
              clock.begin_screen()             # clears on mode change
              if clock.in_normal():
                  clock.draw_clock(16, 40, WHITE, 2)
                  clock.draw_date(40, 95, GREEN)
              clock.check_alarm()

  FINE    - raw getters, draw it all yourself with display blocks:
              clock.now_hour() / clock.time_text() / clock.field() / clock.flash_on()

Buttons are configured by the constructor pins; what each one DOES is up to you
(map the *_pressed/*_clicked queries to the engine commands). The big block-by-block
example stays as the fully-exposed reference.
"""

from st7735s import ST7735S
from ds1302 import DS1302
from buttons import ButtonHub
import time


def _c(r, g, b):
    return ((r & 0xF8) << 8) | ((g & 0xFC) << 3) | (b >> 3)


NORMAL, SET_ALARM, SET_CLOCK, RINGING = 0, 1, 2, 3

_WHITE = _c(255, 255, 255)
_CYAN = _c(0, 255, 255)
_GREEN = _c(0, 255, 0)
_YELLOW = _c(255, 255, 0)
_MAGENTA = _c(255, 0, 255)
_RED = _c(255, 0, 0)
_GRAY = _c(128, 128, 128)


class AlarmClock:
    def __init__(self, spi, dc, rst, cs, clk, dat, rtc_rst,
                 field_pin, plus_pin, mode_pin, width=160, height=128):
        self.d = ST7735S(spi, dc, rst, cs, width, height)
        self.rtc = DS1302(clk, dat, rtc_rst)
        self.btn = ButtonHub()
        self.btn.add(field_pin)
        self.btn.add(plus_pin)
        self.btn.add(mode_pin, double_ms=600)
        self._field, self._plus, self._mode = field_pin, plus_pin, mode_pin

        self.mode = NORMAL
        self.a_hour, self.a_minute, self.a_on = 7, 0, False
        self.asf = 0                 # alarm edit field: 0=hour 1=minute
        self.sf = 0                  # clock edit field: 0=h 1=m 2=day 3=month 4=year
        self.cur_hour = self.cur_minute = self.cur_second = 0
        self.cur_day = self.cur_month = self.cur_year = 0
        self.t_hour = self.t_minute = 0
        self.t_day = self.t_month = 1
        self.t_year = 2025
        self._started = self._stopped = False

        # change-flags state (set by read())
        self._p_hour = self._p_minute = self._p_second = -1
        self._chg_hour = self._chg_minute = self._chg_second = False

        # default-screen partial-redraw state (used by draw_default())
        self._reset_default_prev()
        self._dd_mode = -1

        # mid-grain helper partial-redraw state ("generation" bumps on mode change)
        self._screen_gen = 0
        self._seen_mode = -1
        self._mode_just_changed = False
        self._dc_gen = self._dt_gen = self._det_gen = self._ded_gen = -1
        self._ring_gen = -1

        self.d.fill(0)

    # ===================== COARSE =========================================
    def update(self):
        """COMPOSITE (coarse only): read + default buttons + alarm + default screen.
        Not single-purpose on purpose — it just calls the testable atoms below."""
        self.read()
        self.handle_buttons()
        if self.alarm_due():
            self.start_ringing()
        self.draw_default()

    def set_alarm(self, hour, minute):
        self.a_hour, self.a_minute = hour, minute

    def enable_alarm(self, on=True):
        self.a_on = bool(on)

    def is_enabled(self):
        return self.a_on

    def is_ringing(self):
        return self.mode == RINGING

    def alarm_started(self):
        v = self._started
        self._started = False
        return v

    def alarm_stopped(self):
        v = self._stopped
        self._stopped = False
        return v

    # ===================== READ (engine) ==================================
    def read(self):
        """Read the RTC once and work out which fields changed since last read()."""
        self.cur_year = self.rtc.get_year()
        self.cur_month = self.rtc.get_month()
        self.cur_day = self.rtc.get_day()
        self.cur_hour = self.rtc.get_hour()
        self.cur_minute = self.rtc.get_minute()
        self.cur_second = self.rtc.get_second()
        self._chg_hour = self.cur_hour != self._p_hour
        self._chg_minute = self.cur_minute != self._p_minute
        self._chg_second = self.cur_second != self._p_second
        self._p_hour, self._p_minute, self._p_second = self.cur_hour, self.cur_minute, self.cur_second

    def now_hour(self):   return self.cur_hour
    def now_minute(self): return self.cur_minute
    def now_second(self): return self.cur_second
    def now_day(self):    return self.cur_day
    def now_month(self):  return self.cur_month
    def now_year(self):   return self.cur_year

    def time_text(self):
        return "%02d:%02d:%02d" % (self.cur_hour, self.cur_minute, self.cur_second)

    def date_text(self):
        return "%02d/%02d/%04d" % (self.cur_day, self.cur_month, self.cur_year)

    def hour_changed(self):   return self._chg_hour
    def minute_changed(self): return self._chg_minute
    def second_changed(self): return self._chg_second
    def flash_on(self):       return self.cur_second % 2 == 0

    # ===================== MODE ===========================================
    def in_normal(self):     return self.mode == NORMAL
    def in_set_alarm(self):  return self.mode == SET_ALARM
    def in_set_clock(self):  return self.mode == SET_CLOCK
    def in_ringing(self):    return self.mode == RINGING

    def set_alarm_mode(self):
        self.mode = SET_ALARM
        self.a_on = True
        self.asf = 0

    def set_clock_mode(self):
        self.mode = SET_CLOCK
        self.sf = 0
        self.t_year, self.t_month, self.t_day = self.cur_year, self.cur_month, self.cur_day
        self.t_hour, self.t_minute = self.cur_hour, self.cur_minute

    def go_normal(self):
        self.mode = NORMAL

    # ===================== BUTTON EVENTS (you map these) ==================
    def field_pressed(self):        return self.btn.was_pressed(self._field)
    def plus_pressed(self):         return self.btn.was_pressed(self._plus) or self.btn.repeated(self._plus)
    def mode_clicked(self):         return self.btn.was_clicked(self._mode)
    def mode_double_clicked(self):  return self.btn.was_double_clicked(self._mode)

    def handle_buttons(self):
        """COMPOSITE (coarse only): the DEFAULT button mapping. At mid grain wire the
        single-purpose event queries to the single-purpose commands yourself instead."""
        if self.field_pressed():
            self.next_field()
        if self.plus_pressed():
            self.increase()
        if self.mode_double_clicked() and self.in_normal():
            self.set_clock_mode()
        if self.mode_clicked():
            self.save()

    # ===================== EDIT / COMMIT ==================================
    def field(self):
        if self.in_set_alarm():
            return self.asf
        if self.in_set_clock():
            return self.sf
        return 0

    def next_field(self):
        if self.in_set_alarm():
            self.asf = (self.asf + 1) % 2
        elif self.in_set_clock():
            self.sf = (self.sf + 1) % 5

    def increase(self):
        if self.in_set_alarm():
            if self.asf == 0:
                self.a_hour = (self.a_hour + 1) % 24
            else:
                self.a_minute = (self.a_minute + 1) % 60
        elif self.in_set_clock():
            if self.sf == 0:
                self.t_hour = (self.t_hour + 1) % 24
            elif self.sf == 1:
                self.t_minute = (self.t_minute + 1) % 60
            elif self.sf == 2:
                self.t_day = (self.t_day % 31) + 1
            elif self.sf == 3:
                self.t_month = (self.t_month % 12) + 1
            elif self.sf == 4:
                self.t_year = self.t_year + 1
                if self.t_year > 2099:
                    self.t_year = 2025

    def save(self):
        """Context-aware: stop when ringing, commit in set screens, else open SET ALARM."""
        if self.in_ringing():
            self.stop()
        elif self.in_set_alarm():
            self.commit_alarm()
        elif self.in_set_clock():
            self.commit_clock()
        elif self.in_normal():
            self.set_alarm_mode()

    def commit_alarm(self):
        self.mode = NORMAL
        self.asf = 0

    def commit_clock(self):
        self.rtc.set_time(self.t_year, self.t_month, self.t_day, self.t_hour, self.t_minute, 0)
        self.mode = NORMAL
        self.sf = 0

    def stop(self):
        self.mode = NORMAL
        self.a_on = False
        self._stopped = True

    # ===================== ALARM ==========================================
    def alarm_hour(self):   return self.a_hour
    def alarm_minute(self): return self.a_minute

    def alarm_due(self):
        """QUERY only (no side effects): True when the alarm time is reached."""
        return (self.a_on and self.in_normal()
                and self.cur_hour == self.a_hour and self.cur_minute == self.a_minute
                and self.cur_second == 0)

    def start_ringing(self):
        """ACTION only: put the clock into the ringing state."""
        self.mode = RINGING
        self._started = True

    # ===================== MID-GRAIN DRAW HELPERS =========================
    def begin_frame(self):
        """Frame bookkeeping ONLY (draws nothing): works out whether the mode changed
        since the last frame, so mode_changed() is correct and the draw helpers repaint
        fully. Clear the screen yourself:  if clock.mode_changed(): clock.fill(0)."""
        self._mode_just_changed = self.mode != self._seen_mode
        if self._mode_just_changed:
            self._seen_mode = self.mode
            self._screen_gen += 1

    def mode_changed(self):
        return self._mode_just_changed

    # generic passthroughs for fully-custom drawing
    def draw_text(self, s, x, y, color, size=1): self.d.text(s, x, y, color, size)
    def clear(self, x, y, w, h): self.d.fill_rect(x, y, w, h, 0)
    def fill(self, color): self.d.fill(color)

    def _edit_h(self):
        return self.t_hour if self.in_set_clock() else self.a_hour

    def _edit_m(self):
        return self.t_minute if self.in_set_clock() else self.a_minute

    def draw_clock(self, x, y, color, size=2):
        """Running HH:MM:SS with partial redraw (only changed digits)."""
        cw = 8 * size
        if self._dc_gen != self._screen_gen:
            self.d.text(self.time_text(), x, y, color, size)
            self._dc_h, self._dc_m, self._dc_s = self.cur_hour, self.cur_minute, self.cur_second
            self._dc_gen = self._screen_gen
            return
        if self.cur_hour != self._dc_h:
            self.d.fill_rect(x, y, cw * 2, cw, 0)
            self.d.text("%02d" % self.cur_hour, x, y, color, size); self._dc_h = self.cur_hour
        if self.cur_minute != self._dc_m:
            self.d.fill_rect(x + cw * 3, y, cw * 2, cw, 0)
            self.d.text("%02d" % self.cur_minute, x + cw * 3, y, color, size); self._dc_m = self.cur_minute
        if self.cur_second != self._dc_s:
            self.d.fill_rect(x + cw * 6, y, cw * 2, cw, 0)
            self.d.text("%02d" % self.cur_second, x + cw * 6, y, color, size); self._dc_s = self.cur_second

    def draw_date(self, x, y, color):
        """DD/MM/YYYY with partial redraw."""
        if (self._dt_gen != self._screen_gen
                or self.cur_day != self._dt_d or self.cur_month != self._dt_mo or self.cur_year != self._dt_y):
            self.d.fill_rect(x, y, 80, 8, 0)
            self.d.text(self.date_text(), x, y, color, 1)
            self._dt_d, self._dt_mo, self._dt_y = self.cur_day, self.cur_month, self.cur_year
            self._dt_gen = self._screen_gen

    def draw_edit_time(self, x, y, color, size=2):
        """The HH:MM being edited (alarm or clock), with a ^^ cursor under the active field."""
        cw = 8 * size
        eh, em, f = self._edit_h(), self._edit_m(), self.field()
        full = self._det_gen != self._screen_gen
        if full:
            self.d.text("%02d:%02d" % (eh, em), x, y, color, size)
        else:
            if eh != self._det_h:
                self.d.fill_rect(x, y, cw * 2, cw, 0); self.d.text("%02d" % eh, x, y, color, size)
            if em != self._det_m:
                self.d.fill_rect(x + cw * 3, y, cw * 2, cw, 0); self.d.text("%02d" % em, x + cw * 3, y, color, size)
        # cursor: field 0 -> hours, field 1 -> minutes (only while editing time)
        if full or f != self._det_f:
            cy = y + cw + 9
            self.d.fill_rect(x, cy, cw * 5, cw, 0)
            if f == 0:
                self.d.text("^^", x, cy, _GREEN, size)
            elif f == 1:
                self.d.text("^^", x + cw * 3, cy, _GREEN, size)
        self._det_h, self._det_m, self._det_f = eh, em, f
        self._det_gen = self._screen_gen

    def draw_edit_date(self, x, y, color):
        """The DD/MM/YYYY being edited (set-clock), with ^^ under the active field (2/3/4)."""
        f = self.sf
        full = self._ded_gen != self._screen_gen
        if (full or self.t_day != self._ded_d or self.t_month != self._ded_mo or self.t_year != self._ded_y):
            self.d.fill_rect(x, y, 80, 8, 0)
            self.d.text("%02d/%02d/%04d" % (self.t_day, self.t_month, self.t_year), x, y, color, 1)
        if full or f != self._ded_f:
            cy = y + 10
            self.d.fill_rect(x, cy, 80, 8, 0)
            if f == 2:
                self.d.text("^^", x, cy, _GREEN, 1)
            elif f == 3:
                self.d.text("^^", x + 24, cy, _GREEN, 1)
            elif f == 4:
                self.d.text("^^", x + 48, cy, _GREEN, 1)
        self._ded_d, self._ded_mo, self._ded_y, self._ded_f = self.t_day, self.t_month, self.t_year, f
        self._ded_gen = self._screen_gen

    def draw_ringing(self):
        """Flashing red/black ALARM screen (call every loop; redraws once per second)."""
        if self._ring_gen == self._screen_gen and not self._chg_second:
            return
        self._ring_gen = self._screen_gen
        if self.cur_second % 2 == 0:
            self.d.fill(_RED)
            self.d.text("! ALARM !", 8, 40, _WHITE, 2)
            self.d.text("B3:STOP", 52, 110, _WHITE, 1)
        else:
            self.d.fill(0)
            self.d.text("B3:STOP", 52, 110, _MAGENTA, 1)

    # ===================== DEFAULT SCREEN (coarse) ========================
    def _reset_default_prev(self):
        self._ph = self._pm = self._ps = -1
        self._pah = self._pam = self._paf = -1
        self._pth = self._ptm = self._ptd = self._ptmo = self._pty = -1
        self._psf = -1

    def draw_default(self):
        """The built-in 4-screen layout with partial redraw (what update() uses)."""
        mc = self.mode != self._dd_mode
        sc = self.cur_second != self._ps
        minc = self.cur_minute != self._pm
        hc = self.cur_hour != self._ph
        if mc:
            self.d.fill(0)
            self._dd_mode = self.mode
            self._reset_default_prev()
        if self.mode == NORMAL:
            self._def_normal(mc, hc, minc, sc)
        elif self.mode == SET_ALARM:
            self._def_set_alarm(mc)
        elif self.mode == SET_CLOCK:
            self._def_set_clock(mc)
        elif self.mode == RINGING:
            self._def_ringing(sc)
        self._ps, self._pm, self._ph = self.cur_second, self.cur_minute, self.cur_hour

    def _def_normal(self, mc, hc, minc, sc):
        if mc:
            self.d.text("ALARM CLOCK", 36, 5, _CYAN, 1)
            self.d.hline(10, 18, 140, _GRAY)
            self.d.text(self.date_text(), 40, 95, _GREEN, 1)
            if self.a_on:
                self.d.text("A:%02d:%02d" % (self.a_hour, self.a_minute), 52, 110, _YELLOW, 1)
            self.d.text(self.time_text(), 16, 40, _WHITE, 2)
            return
        if hc:
            self.d.fill_rect(16, 40, 32, 16, 0); self.d.text("%02d" % self.cur_hour, 16, 40, _WHITE, 2)
        if minc:
            self.d.fill_rect(64, 40, 32, 16, 0); self.d.text("%02d" % self.cur_minute, 64, 40, _WHITE, 2)
        if sc:
            self.d.fill_rect(112, 40, 32, 16, 0); self.d.text("%02d" % self.cur_second, 112, 40, _WHITE, 2)

    def _def_set_alarm(self, mc):
        if mc:
            self.d.text("SET ALARM", 44, 10, _YELLOW, 1)
            self.d.text(":", 72, 45, _WHITE, 2)
            self.d.text("B1:FIELD", 5, 90, _CYAN, 1)
            self.d.text("B2:+", 5, 100, _YELLOW, 1)
            self.d.text("B3:SAVE", 5, 110, _MAGENTA, 1)
        if self.a_hour != self._pah or mc:
            self.d.fill_rect(40, 45, 32, 16, 0); self.d.text("%02d" % self.a_hour, 40, 45, _WHITE, 2); self._pah = self.a_hour
        if self.a_minute != self._pam or mc:
            self.d.fill_rect(88, 45, 32, 16, 0); self.d.text("%02d" % self.a_minute, 88, 45, _WHITE, 2); self._pam = self.a_minute
        if self.asf != self._paf or mc:
            self.d.fill_rect(40, 70, 80, 16, 0)
            self.d.text("^^", 40 if self.asf == 0 else 88, 70, _GREEN, 2)
            self._paf = self.asf

    def _def_set_clock(self, mc):
        if mc:
            self.d.text("SET CLOCK", 44, 5, _CYAN, 1)
            self.d.text(":", 72, 30, _WHITE, 2)
            self.d.text("B1:FIELD", 5, 90, _CYAN, 1)
            self.d.text("B2:+", 5, 100, _YELLOW, 1)
            self.d.text("B3:SAVE", 5, 110, _MAGENTA, 1)
        if self.t_hour != self._pth or mc:
            self.d.fill_rect(40, 30, 32, 16, 0); self.d.text("%02d" % self.t_hour, 40, 30, _WHITE, 2); self._pth = self.t_hour
        if self.t_minute != self._ptm or mc:
            self.d.fill_rect(88, 30, 32, 16, 0); self.d.text("%02d" % self.t_minute, 88, 30, _WHITE, 2); self._ptm = self.t_minute
        if self.t_day != self._ptd or self.t_month != self._ptmo or self.t_year != self._pty or mc:
            self.d.fill_rect(40, 68, 80, 8, 0)
            self.d.text("%02d/%02d/%04d" % (self.t_day, self.t_month, self.t_year), 40, 68, _WHITE, 1)
            self._ptd, self._ptmo, self._pty = self.t_day, self.t_month, self.t_year
        if self.sf != self._psf or mc:
            self.d.fill_rect(40, 50, 80, 16, 0)
            self.d.fill_rect(40, 78, 80, 8, 0)
            if self.sf == 0:
                self.d.text("^^", 40, 50, _GREEN, 2)
            elif self.sf == 1:
                self.d.text("^^", 88, 50, _GREEN, 2)
            elif self.sf == 2:
                self.d.text("^^", 40, 78, _GREEN, 1)
            elif self.sf == 3:
                self.d.text("^^", 64, 78, _GREEN, 1)
            elif self.sf == 4:
                self.d.text("^^", 88, 78, _GREEN, 1)
            self._psf = self.sf

    def _def_ringing(self, sc):
        if not sc:
            return
        if self.cur_second % 2 == 0:
            self.d.fill(_RED)
            self.d.text("! ALARM !", 8, 40, _WHITE, 2)
            self.d.text("B3:STOP", 52, 110, _WHITE, 1)
        else:
            self.d.fill(0)
            self.d.text("B3:STOP", 52, 110, _MAGENTA, 1)
