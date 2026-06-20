"""
DFPlayer Mini MP3 Player Driver for MicroPython
Based on PicoDFPlayer by mannbro (MIT License)
https://github.com/mannbro/PicoDFPlayer
"""

from machine import UART, Pin
from time import sleep_ms


class DFPlayer:
    START_BYTE = 0x7E
    VERSION_BYTE = 0xFF
    COMMAND_LENGTH = 0x06
    ACKNOWLEDGE = 0x00  # No feedback
    END_BYTE = 0xEF

    def __init__(self, uart_id=1, tx_pin=4, rx_pin=5):
        """Initialiser DFPlayer.

        Args:
            uart_id: UART nummer (0 eller 1)
            tx_pin: GPIO pin til TX (sender til DFPlayer RX)
            rx_pin: GPIO pin til RX (modtager fra DFPlayer TX)
        """
        self.uart = UART(uart_id, baudrate=9600,
                         tx=Pin(tx_pin), rx=Pin(rx_pin))
        sleep_ms(200)  # Vent paa DFPlayer boot

    def _send(self, cmd, param1=0, param2=0):
        """Send kommando til DFPlayer."""
        checksum = -(self.VERSION_BYTE + self.COMMAND_LENGTH + cmd +
                     self.ACKNOWLEDGE + param1 + param2)
        high = (checksum >> 8) & 0xFF
        low = checksum & 0xFF

        data = bytes([
            self.START_BYTE,
            self.VERSION_BYTE,
            self.COMMAND_LENGTH,
            cmd,
            self.ACKNOWLEDGE,
            param1,
            param2,
            high,
            low,
            self.END_BYTE
        ])
        self.uart.write(data)
        sleep_ms(50)

    # Afspilning
    def play(self, track=1):
        """Afspil track nummer (1-3000)."""
        self._send(0x03, (track >> 8) & 0xFF, track & 0xFF)

    def play_folder(self, folder, track):
        """Afspil track fra en mappe (mappe 1-99, track 1-255)."""
        self._send(0x0F, folder, track)

    def play_mp3(self, track, loop=False):
        """Afspil fra /mp3 mappen (track 1-9999).

        Args:
            track: Track nummer (1-9999)
            loop: Gentag track indtil stop() kaldes
        """
        self._send(0x12, (track >> 8) & 0xFF, track & 0xFF)
        if loop:
            sleep_ms(100)  # Vent paa at afspilning starter
            self._send(0x19, 0, 0)  # Aktiver single loop

    def pause(self):
        """Pause afspilning."""
        self._send(0x0E)

    def resume(self):
        """Fortsaet afspilning."""
        self._send(0x0D)

    def stop(self):
        """Stop afspilning."""
        self._send(0x16)

    def loop_current(self, enable):
        """Aktiver eller deaktiver loop af aktuel track (True/False).
        Skal kaldes EFTER play/play_mp3."""
        self._send(0x19, 0, 0 if enable else 1)  # 0 = loop on, 1 = loop off

    def next(self):
        """Naeste track."""
        self._send(0x01)

    def prev(self):
        """Forrige track."""
        self._send(0x02)

    # Lydstyrke
    def volume(self, level):
        """Saet lydstyrke (0-30)."""
        if level < 0:
            level = 0
        if level > 30:
            level = 30
        self._send(0x06, 0, level)

    def volume_up(self):
        """Skru op."""
        self._send(0x04)

    def volume_down(self):
        """Skru ned."""
        self._send(0x05)

    # Equalizer
    def eq(self, mode):
        """Saet equalizer (0=Normal, 1=Pop, 2=Rock, 3=Jazz, 4=Classic, 5=Bass)."""
        self._send(0x07, 0, mode)

    # System
    def reset(self):
        """Reset DFPlayer."""
        self._send(0x0C)
        sleep_ms(1500)  # Vent paa reset

    def sleep(self):
        """Gaa i standby."""
        self._send(0x0A)

    def wake(self):
        """Vaagn fra standby."""
        self._send(0x0B)
