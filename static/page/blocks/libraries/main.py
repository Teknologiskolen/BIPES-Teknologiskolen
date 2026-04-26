"""
Vaekke-ur (Alarm Clock) til Raspberry Pi Pico W
================================================
Denne fil er bygget op i TRIN, saa du kan foelge med i vejledning.md.
Proev at aendre vaerdierne i TRIN 2-5 og se hvad der sker!
"""

# ============================================================
# --- TRIN 1: Importer biblioteker ---
# "import" betyder "hent kode som andre har skrevet".
# Det er ligesom at laane en bog fra biblioteket
# — du faar adgang til funktioner du ikke selv skal skrive.
# ============================================================
from machine import Pin, SPI
import time

# Hent vores display-driver (styrer skaermen)
from st7735s import ST7735S, color565

# Hent vores ur-driver (holder styr paa tiden)
from ds1302 import DS1302

# Hent knap-funktioner (registrerer tryk paa knapper)
from buttons import setup_buttons, check_auto_repeat

# Hent MP3-afspiller driver (til alarm-lyd)
from dfplayer import DFPlayer


# ============================================================
# --- TRIN 2: Variabler — Vaelg GPIO-pins ---
# En variabel er som en aeske med et navn — du putter en vaerdi i den.
# Tegnet "=" betyder "gem denne vaerdi i aesken".
#
# GPIO-pins er de smaa ben paa din Pico, som forbinder
# den til display, ur-modul og knapper.
# ============================================================

# Display-pins (SPI)
DISPLAY_SCK_PIN = 18    # Klok-signal til skaermen
DISPLAY_MOSI_PIN = 19   # Data til skaermen
DISPLAY_RST_PIN = 20    # Reset-pin paa skaermen
DISPLAY_DC_PIN = 16     # Data/Command-pin paa skaermen
DISPLAY_CS_PIN = 17     # Chip-Select (vaelger skaermen)

# Ur-modul pins (DS1302)
RTC_CLK_PIN = 1         # Klok-signal til ur-modulet
RTC_DAT_PIN = 0         # Data til/fra ur-modulet
RTC_RST_PIN = 2         # Reset-pin paa ur-modulet

# Knap-pins
BUTTON1_PIN = 14        # Knap 1: Skift felt (Mode)
BUTTON2_PIN = 15        # Knap 2: Aendr vaerdi (+)
BUTTON3_PIN = 13        # Knap 3: Alarm / Saet ur

# DFPlayer Mini MP3 modul pins (UART)
DFPLAYER_TX_PIN = 4     # Pico TX -> DFPlayer RX
DFPLAYER_RX_PIN = 5     # Pico RX -> DFPlayer TX


# ============================================================
# --- TRIN 3: Variabler — Vaelg farver ---
# Farver paa skaermen er lavet af tre dele: Roed, Groen og Blaa.
# Hver del kan vaere fra 0 (ingen) til 255 (fuld styrke).
#
# Proev at aendre en farve og se hvad der sker!
# For eksempel: Aendr BACKGROUND_COLOR til BLUE for en blaa baggrund.
# ============================================================

# Farver brugt paa skaermen — du kan aendre dem!
TITLE_COLOR = color565(0, 255, 255)       # Cyan (lys blaa-groen)
TIME_COLOR = color565(255, 255, 255)      # Hvid
DATE_COLOR = color565(0, 255, 0)          # Groen
ALARM_COLOR = color565(255, 255, 0)       # Gul
LINE_COLOR = color565(128, 128, 128)      # Graa
BACKGROUND_COLOR = color565(0, 0, 0)      # Sort

# Proev at lave din egen farve!
# MIN_FARVE = color565(255, 100, 50)  # En orange-agtig farve


# ============================================================
# --- TRIN 4: Variabler — Vaelg tekster og positioner ---
# Her bestemmer du hvad der staar paa skaermen, og hvor det staar.
#
# Koordinatsystem:
#   x = hvor langt fra venstre (0 til 160)
#   y = hvor langt fra toppen (0 til 128)
#   (0,0) er oeverst til venstre paa skaermen.
#
#   Skriftsterrelse: 1 = lille (8 pixels), 2 = stor (16 pixels)
#
# Proev at flytte teksten ved at aendre X og Y vaerdierne!
# ============================================================

# Titel (oeverst paa skaermen)
TITLE_TEXT = "ALARM CLOCK"
TITLE_X = 36
TITLE_Y = 5
TITLE_SIZE = 1

# Klokkeslaet (midt paa skaermen)
# SHOW_SECONDS = True  -> viser TT:MM:SS (8 tegn)
# SHOW_SECONDS = False -> viser TT:MM (5 tegn) — proev med TIME_SIZE = 3!
SHOW_SECONDS = True
TIME_X = 16
TIME_Y = 40
TIME_SIZE = 2

# Dato (under klokkeslaettet)
DATE_X = 40
DATE_Y = 95
DATE_SIZE = 1

# Alarm-tekst (nederst)
ALARM_TEXT_X = 52
ALARM_TEXT_Y = 110

# Streg under titlen
LINE_X = 10
LINE_Y = 18
LINE_WIDTH = 140


# ============================================================
# --- TRIN 5: Alarm-standardvaerdier ---
# Her saetter du hvad alarmen starter med naar uret taendes.
# ============================================================

DEFAULT_ALARM_HOUR = 7      # Alarm-time (0-23)
DEFAULT_ALARM_MINUTE = 0    # Alarm-minut (0-59)
ALARM_ON_AT_START = False   # Skal alarmen vaere aktiv fra start? (True/False)

# Alarm-lyd indstillinger
ALARM_VOLUME = 20           # Lydstyrke (0-30)
ALARM_TRACK = 1             # Hvilken MP3-fil der afspilles (fra /mp3/0001.mp3)
ALARM_LOOP = True           # Gentag lyden indtil alarmen stoppes? (True/False)
ALARM_LOOP_SECONDS = 5     # Hvor mange sekunder mellem hver gentagelse


# ============================================================
# --- TRIN 6: Opsaet hardware ---
# Nu bruger vi vores variabler fra TRIN 2 til at forbinde
# programmet til det fysiske udstyr.
# Det er her variablerne "bruges" — de blev "oprettet" i TRIN 2.
# ============================================================

print("\n=== Vaekke-ur starter ===\n")

# Opsaet SPI-forbindelse til skaermen
spi = SPI(0, baudrate=40000000, polarity=0, phase=0,
          sck=Pin(DISPLAY_SCK_PIN), mosi=Pin(DISPLAY_MOSI_PIN))
dc = Pin(DISPLAY_DC_PIN, Pin.OUT)
rst = Pin(DISPLAY_RST_PIN, Pin.OUT)
cs = Pin(DISPLAY_CS_PIN, Pin.OUT)

# Opret display-objekt
display = ST7735S(spi, dc, rst, cs, width=160, height=128)

# Opsaet ur-modul
rtc_clk = Pin(RTC_CLK_PIN, Pin.OUT)
rtc_dat = Pin(RTC_DAT_PIN)
rtc_rst = Pin(RTC_RST_PIN, Pin.OUT)
rtc_rst.value(0)
rtc_clk.value(0)
rtc = DS1302(rtc_clk, rtc_dat, rtc_rst)
print("DS1302 RTC configured (CLK=GP1, DAT=GP0, RST=GP2)")

# Opsaet knapper
button1, button2, button3, button_events = setup_buttons(
    BUTTON1_PIN, BUTTON2_PIN, BUTTON3_PIN
)

# Opsaet MP3-afspiller
# SD-kortet skal have en mappe /mp3 med filer som 0001.mp3, 0002.mp3 osv.
mp3 = DFPlayer(uart_id=1, tx_pin=DFPLAYER_TX_PIN, rx_pin=DFPLAYER_RX_PIN)
mp3.volume(ALARM_VOLUME)
print("DFPlayer MP3 configured (TX=GP4, RX=GP5)")


# ============================================================
# --- TRIN 7: Funktioner — Hjaelpefunktioner til skaermen ---
# En funktion er som en opskrift — den har et navn og trin den foelger.
# Naar du "kalder" funktionen, udforer den alle trinene.
# Det der staar i parenteserne er "ingredienserne" (parametre).
# ============================================================

def vis_tekst(tekst, x, y, farve, storrelse=1):
    """Vis tekst paa skaermen paa en bestemt position."""
    display.text(tekst, x, y, farve, storrelse)

def ryd_omraade(x, y, bredde, hoejde):
    """Ryd et rektangulaert omraade paa skaermen (fyld med baggrundsfarve)."""
    display.fill_rect(x, y, bredde, hoejde, BACKGROUND_COLOR)

def vis_tid(timer, minutter, sekunder, x, y, farve, storrelse=2):
    """Vis klokkeslaet som TT:MM:SS eller TT:MM."""
    if SHOW_SECONDS:
        tid_tekst = f"{timer:02d}:{minutter:02d}:{sekunder:02d}"
    else:
        tid_tekst = f"{timer:02d}:{minutter:02d}"
    display.text(tid_tekst, x, y, farve, storrelse)

def vis_dato(dag, maaned, aar, x, y, farve):
    """Vis dato som DD/MM/AAAA."""
    dato_tekst = f"{dag:02d}/{maaned:02d}/{aar}"
    display.text(dato_tekst, x, y, farve)


# ============================================================
# --- TRIN 8: Betingelser og loekker — Hovedloekken ---
# En loekke (loop) gentager den samme kode igen og igen.
# "while True" betyder "bliv ved for evigt" (indtil vi slukker).
#
# "if" betyder "hvis" — programmet tjekker om noget er sandt.
# "elif" betyder "ellers hvis" — en ekstra betingelse.
# "else" betyder "ellers" — hvad der sker hvis intet andet passer.
# ============================================================

# Tilstande (modes) — uret kan vaere i forskellige tilstande
MODE_NORMAL = 0           # Vis tid og dato
MODE_SET_ALARM = 1        # Indstil alarm
MODE_SET_CLOCK = 2        # Indstil ur
MODE_ALARM_RINGING = 3    # Alarmen ringer!

# Start-vaerdier
current_mode = MODE_NORMAL
alarm_hour = DEFAULT_ALARM_HOUR
alarm_minute = DEFAULT_ALARM_MINUTE
alarm_enabled = ALARM_ON_AT_START
alarm_set_field = 0

set_field = 0
temp_hour = 0
temp_minute = 0
temp_day = 1
temp_month = 1
temp_year = 2025
last_repeat_time = 0
btn3_click_time = 0        # Tidspunkt for foerste klik paa knap 3
btn3_waiting = False        # Venter vi paa et muligt dobbeltklik?
DOUBLE_CLICK_MS = 400       # Maks tid mellem to klik for dobbeltklik
SET_TIMEOUT_MS = 10000      # Annuller indstilling efter 10 sekunder uden tryk
last_button_time = 0        # Tidspunkt for sidste knaptryk i indstillingstilstand

# "prev_" variabler holder styr paa hvad der sidst blev vist,
# saa vi kun opdaterer skaermen naar noget aendrer sig.
prev_second = -1
prev_minute = -1
prev_hour = -1
prev_mode = -1
prev_alarm_hour = -1
prev_alarm_minute = -1
prev_alarm_field = -1
prev_temp_hour = -1
prev_temp_minute = -1
prev_temp_day = -1
prev_temp_month = -1
prev_temp_year = -1
prev_set_field = -1

# Ryd skaermen foer vi starter
display.fill(BACKGROUND_COLOR)

try:
    # Hovedloekken — dette kode gentages for evigt
    while True:

        # Laes tiden fra ur-modulet
        try:
            year, month, day, hour, minute, second = rtc.get_time()
            time_str = f"{hour:02d}:{minute:02d}:{second:02d}"
            date_str = f"{day:02d}/{month:02d}/{year}"
        except:
            time_str = "RTC ERROR"
            date_str = ""

        # --- Knap-haandtering ---

        # Knap 3: Tryk registreres
        if button_events['button3_press']:
            button_events['button3_press'] = False

        # Knap 3: Slip registreres
        # Enkelt klik = indstil alarm, dobbeltklik = indstil ur
        if button_events['button3_release']:
            button_events['button3_release'] = False

            # Betingelse: Hvad skal der ske?
            if current_mode == MODE_ALARM_RINGING:
                # Hvis alarmen ringer -> stop den med det samme
                print("Alarm stopped!")
                mp3.stop()  # Stop alarm-lyden
                current_mode = MODE_NORMAL
                alarm_enabled = False
            elif current_mode == MODE_SET_ALARM:
                # Hvis vi indstiller alarm -> gem og gaa tilbage
                print(f"Alarm set to {alarm_hour:02d}:{alarm_minute:02d}")
                current_mode = MODE_NORMAL
                alarm_set_field = 0
            elif current_mode == MODE_SET_CLOCK:
                # Hvis vi indstiller uret -> gem tiden
                try:
                    rtc.set_time(temp_year, temp_month, temp_day, temp_hour, temp_minute, 0)
                    print(f"Clock set")
                except Exception as e:
                    print(f"Error: {e}")
                current_mode = MODE_NORMAL
                set_field = 0
            elif btn3_waiting:
                # Andet klik inden for tidsgraensen -> dobbeltklik!
                btn3_waiting = False
                print("Set clock mode")
                current_mode = MODE_SET_CLOCK
                set_field = 0
                last_button_time = time.ticks_ms()
                try:
                    temp_year, temp_month, temp_day, temp_hour, temp_minute, _ = rtc.get_time()
                except:
                    pass
            else:
                # Foerste klik — vent og se om der kommer et til
                btn3_waiting = True
                btn3_click_time = time.ticks_ms()

        # Hvis vi venter paa dobbeltklik og tiden er udloebet -> enkelt klik
        if btn3_waiting and time.ticks_diff(time.ticks_ms(), btn3_click_time) > DOUBLE_CLICK_MS:
            btn3_waiting = False
            print("Set alarm mode")
            current_mode = MODE_SET_ALARM
            alarm_enabled = True
            alarm_set_field = 0
            last_button_time = time.ticks_ms()

        # Knap 1: Skift felt (naar vi indstiller alarm eller ur)
        if button_events['button1']:
            button_events['button1'] = False
            last_button_time = time.ticks_ms()
            if current_mode == MODE_SET_ALARM:
                alarm_set_field = (alarm_set_field + 1) % 2
            elif current_mode == MODE_SET_CLOCK:
                set_field = (set_field + 1) % 5

        # Knap 2: Forhoej vaerdi
        if button_events['button2']:
            button_events['button2'] = False
            last_button_time = time.ticks_ms()
            if current_mode == MODE_SET_ALARM:
                if alarm_set_field == 0:
                    alarm_hour = (alarm_hour + 1) % 24
                else:
                    alarm_minute = (alarm_minute + 1) % 60
            elif current_mode == MODE_SET_CLOCK:
                if set_field == 0:
                    temp_hour = (temp_hour + 1) % 24
                elif set_field == 1:
                    temp_minute = (temp_minute + 1) % 60
                elif set_field == 2:
                    temp_day = (temp_day % 31) + 1
                elif set_field == 3:
                    temp_month = (temp_month % 12) + 1
                elif set_field == 4:
                    temp_year = temp_year + 1
                    if temp_year > 2099:
                        temp_year = 2025

        # Auto-repeat: Hvis knap 2 holdes nede, gentag automatisk
        if check_auto_repeat(button_events, button2):
            if current_mode == MODE_SET_ALARM:
                if alarm_set_field == 0:
                    alarm_hour = (alarm_hour + 1) % 24
                else:
                    alarm_minute = (alarm_minute + 1) % 60
            elif current_mode == MODE_SET_CLOCK:
                if set_field == 0:
                    temp_hour = (temp_hour + 1) % 24
                elif set_field == 1:
                    temp_minute = (temp_minute + 1) % 60
                elif set_field == 2:
                    temp_day = (temp_day % 31) + 1
                elif set_field == 3:
                    temp_month = (temp_month % 12) + 1
                elif set_field == 4:
                    temp_year = temp_year + 1
                    if temp_year > 2099:
                        temp_year = 2025

        # --- Timeout: Annuller indstilling hvis ingen knapper trykkes ---
        if current_mode in (MODE_SET_ALARM, MODE_SET_CLOCK):
            if time.ticks_diff(time.ticks_ms(), last_button_time) > SET_TIMEOUT_MS:
                print("Timeout - cancelled")
                current_mode = MODE_NORMAL

        # --- Betingelse: Tjek om alarmen skal ringe ---
        # "if" tjekker om noget er sandt
        if alarm_enabled and current_mode == MODE_NORMAL:
            if hour == alarm_hour and minute == alarm_minute and second == 0:
                print("ALARM!")
                current_mode = MODE_ALARM_RINGING
                mp3.play_mp3(ALARM_TRACK)  # Start alarm-lyden

        # --- Opdater skaermen ---
        # Vi tjekker om noget har aendret sig, saa vi ikke tegner unodigt
        mode_changed = (current_mode != prev_mode)
        second_changed = (second != prev_second)
        minute_changed = (minute != prev_minute)
        hour_changed = (hour != prev_hour)

        if mode_changed:
            display.fill(BACKGROUND_COLOR)
            prev_mode = current_mode

        # ---- NORMAL TILSTAND: Vis tid og dato ----
        if current_mode == MODE_NORMAL:
            if mode_changed:
                vis_tekst(TITLE_TEXT, TITLE_X, TITLE_Y, TITLE_COLOR, TITLE_SIZE)
                display.hline(LINE_X, LINE_Y, LINE_WIDTH, LINE_COLOR)
                vis_dato(day, month, year, DATE_X, DATE_Y, DATE_COLOR)
                if alarm_enabled:
                    alarm_str = f"A:{alarm_hour:02d}:{alarm_minute:02d}"
                    vis_tekst(alarm_str, ALARM_TEXT_X, ALARM_TEXT_Y, ALARM_COLOR)
                vis_tid(hour, minute, second, TIME_X, TIME_Y, TIME_COLOR, TIME_SIZE)

            # Opdater kun de dele af tiden der har aendret sig
            # Hvert tegn er 8 * TIME_SIZE pixels bredt
            _cw = 8 * TIME_SIZE   # tegn-bredde
            _ch = 8 * TIME_SIZE   # tegn-hoejde

            if hour_changed and not mode_changed:
                ryd_omraade(TIME_X, TIME_Y, _cw * 2, _ch)
                vis_tekst(f"{hour:02d}", TIME_X, TIME_Y, TIME_COLOR, TIME_SIZE)

            if minute_changed and not mode_changed:
                ryd_omraade(TIME_X + _cw * 3, TIME_Y, _cw * 2, _ch)
                vis_tekst(f"{minute:02d}", TIME_X + _cw * 3, TIME_Y, TIME_COLOR, TIME_SIZE)

            if SHOW_SECONDS and second_changed and not mode_changed:
                ryd_omraade(TIME_X + _cw * 6, TIME_Y, _cw * 2, _ch)
                vis_tekst(f"{second:02d}", TIME_X + _cw * 6, TIME_Y, TIME_COLOR, TIME_SIZE)

        # ---- INDSTIL ALARM ----
        elif current_mode == MODE_SET_ALARM:
            if mode_changed:
                vis_tekst("SET ALARM", 44, 10, ALARM_COLOR)
                vis_tekst(":", 72, 45, TIME_COLOR, 2)
                vis_tekst("B1:FIELD", 5, 90, TITLE_COLOR)
                vis_tekst("B2:+", 5, 100, ALARM_COLOR)
                vis_tekst("B3:SAVE", 5, 110, color565(255, 0, 255))
                prev_alarm_hour = -1
                prev_alarm_minute = -1
                prev_alarm_field = -1

            if alarm_hour != prev_alarm_hour or mode_changed:
                ryd_omraade(40, 45, 32, 16)
                vis_tekst(f"{alarm_hour:02d}", 40, 45, TIME_COLOR, 2)
                prev_alarm_hour = alarm_hour

            if alarm_minute != prev_alarm_minute or mode_changed:
                ryd_omraade(88, 45, 32, 16)
                vis_tekst(f"{alarm_minute:02d}", 88, 45, TIME_COLOR, 2)
                prev_alarm_minute = alarm_minute

            if alarm_set_field != prev_alarm_field or mode_changed:
                ryd_omraade(40, 70, 80, 16)
                if alarm_set_field == 0:
                    vis_tekst("^^", 40, 70, color565(0, 255, 0), 2)
                else:
                    vis_tekst("^^", 88, 70, color565(0, 255, 0), 2)
                prev_alarm_field = alarm_set_field

        # ---- INDSTIL UR ----
        elif current_mode == MODE_SET_CLOCK:
            if mode_changed:
                vis_tekst("SET CLOCK", 44, 5, TITLE_COLOR)
                vis_tekst(":", 72, 30, TIME_COLOR, 2)
                vis_tekst("B1:FIELD", 5, 90, TITLE_COLOR)
                vis_tekst("B2:+", 5, 100, ALARM_COLOR)
                vis_tekst("B3:SAVE", 5, 110, color565(255, 0, 255))
                prev_temp_hour = -1
                prev_temp_minute = -1
                prev_temp_day = -1
                prev_temp_month = -1
                prev_temp_year = -1
                prev_set_field = -1

            if temp_hour != prev_temp_hour or mode_changed:
                ryd_omraade(40, 30, 32, 16)
                vis_tekst(f"{temp_hour:02d}", 40, 30, TIME_COLOR, 2)
                prev_temp_hour = temp_hour

            if temp_minute != prev_temp_minute or mode_changed:
                ryd_omraade(88, 30, 32, 16)
                vis_tekst(f"{temp_minute:02d}", 88, 30, TIME_COLOR, 2)
                prev_temp_minute = temp_minute

            if (temp_day != prev_temp_day or temp_month != prev_temp_month or
                temp_year != prev_temp_year or mode_changed):
                ryd_omraade(40, 68, 80, 8)
                date_display = f"{temp_day:02d}/{temp_month:02d}/{temp_year}"
                vis_tekst(date_display, 40, 68, TIME_COLOR)
                prev_temp_day = temp_day
                prev_temp_month = temp_month
                prev_temp_year = temp_year

            if set_field != prev_set_field or mode_changed:
                ryd_omraade(40, 50, 80, 16)
                ryd_omraade(40, 78, 80, 8)
                if set_field == 0:
                    vis_tekst("^^", 40, 50, color565(0, 255, 0), 2)
                elif set_field == 1:
                    vis_tekst("^^", 88, 50, color565(0, 255, 0), 2)
                elif set_field == 2:
                    vis_tekst("^^", 40, 78, color565(0, 255, 0))
                elif set_field == 3:
                    vis_tekst("^^", 64, 78, color565(0, 255, 0))
                elif set_field == 4:
                    vis_tekst("^^^^", 88, 78, color565(0, 255, 0))
                prev_set_field = set_field

        # ---- ALARM RINGER! ----
        elif current_mode == MODE_ALARM_RINGING:
            # Genstart lyd hvis ALARM_LOOP er aktiveret
            if ALARM_LOOP and second_changed and second % ALARM_LOOP_SECONDS == 0:
                mp3.play_mp3(ALARM_TRACK)

            if second % 2 == 0:
                if second_changed:
                    display.fill(color565(255, 0, 0))
                    vis_tekst("! ALARM !", 8, 40, TIME_COLOR, 2)
                    vis_tekst(time_str, 48, 70, TIME_COLOR)
                    vis_tekst("B3:STOP", 52, 110, TIME_COLOR)
            else:
                if second_changed:
                    display.fill(BACKGROUND_COLOR)
                    vis_tekst("B3:STOP", 52, 110, color565(255, 0, 255))

        # Gem hvad vi viste, saa vi kan sammenligne naeste gang
        prev_second = second
        prev_minute = minute
        prev_hour = hour

        # Timing: Vent lidt foer vi koerer loekken igen
        # 0.01 sekunder = 10 millisekunder (1/100 sekund)
        # Uden denne pause ville Pico'en bruge al sin energi
        time.sleep(0.01)

except KeyboardInterrupt:
    print("\nStopped")
    display.fill(BACKGROUND_COLOR)
    vis_tekst("STOPPED", 50, 60, color565(255, 0, 0))
