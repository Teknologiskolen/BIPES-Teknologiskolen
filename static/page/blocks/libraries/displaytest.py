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

# ============================================================
# --- TRIN 6: Opsaet hardware ---
# Nu bruger vi vores variabler fra TRIN 2 til at forbinde
# programmet til det fysiske udstyr.
# Det er her variablerne "bruges" — de blev "oprettet" i TRIN 2.
# ============================================================

# Opsaet SPI-forbindelse til skaermen
spi = SPI(0, baudrate=40000000, polarity=0, phase=0,
          sck=Pin(DISPLAY_SCK_PIN), mosi=Pin(DISPLAY_MOSI_PIN))
dc = Pin(DISPLAY_DC_PIN, Pin.OUT)
rst = Pin(DISPLAY_RST_PIN, Pin.OUT)
cs = Pin(DISPLAY_CS_PIN, Pin.OUT)

# Opret display-objekt
display = ST7735S(spi, dc, rst, cs, width=160, height=128)

# Ryd skaermen foer vi starter
display.fill(BLACK)  

#Her kan i skrive jeres egen kode!

    
