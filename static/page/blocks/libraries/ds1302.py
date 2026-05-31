"""DS1302 RTC Driver for MicroPython (3-wire interface)"""

from machine import Pin
import time


class DS1302:
    REG_SECOND = 0x80
    REG_MINUTE = 0x82
    REG_HOUR = 0x84
    REG_DAY = 0x86
    REG_MONTH = 0x88
    REG_YEAR = 0x8C
    REG_WP = 0x8E

    def __init__(self, clk, dat, rst):
        self.clk = clk
        self.dat = dat
        self.rst = rst
        self.rst.value(0)
        self.clk.value(0)
        self._write_byte(self.REG_WP, 0x00)
        sec = self._read_byte(self.REG_SECOND | 0x01)
        if sec & 0x80:
            print("Enabling DS1302 oscillator...")
            self._write_byte(self.REG_SECOND, sec & 0x7F)

    def _write_raw(self, byte):
        self.dat.init(Pin.OUT)
        for _ in range(8):
            self.dat.value(byte & 0x01)
            byte >>= 1
            time.sleep_us(1)
            self.clk.value(1)
            time.sleep_us(1)
            self.clk.value(0)

    def _read_raw(self):
        self.dat.init(Pin.IN)
        byte = 0
        for i in range(8):
            if self.dat.value():
                byte |= (1 << i)
            time.sleep_us(1)
            self.clk.value(1)
            time.sleep_us(1)
            self.clk.value(0)
        return byte

    def _write_byte(self, cmd, data):
        self.rst.value(1)
        time.sleep_us(4)
        self._write_raw(cmd)
        self._write_raw(data)
        self.rst.value(0)
        time.sleep_us(4)

    def _read_byte(self, cmd):
        self.rst.value(1)
        time.sleep_us(4)
        self._write_raw(cmd)
        result = self._read_raw()
        self.rst.value(0)
        time.sleep_us(4)
        return result

    def bcd_to_dec(self, bcd):
        return (bcd // 16) * 10 + (bcd % 16)

    def dec_to_bcd(self, dec):
        return (dec // 10) * 16 + (dec % 10)

    def get_time(self):
        second = self.bcd_to_dec(self._read_byte(self.REG_SECOND | 0x01) & 0x7F)
        minute = self.bcd_to_dec(self._read_byte(self.REG_MINUTE | 0x01))
        hour = self.bcd_to_dec(self._read_byte(self.REG_HOUR | 0x01) & 0x3F)
        day = self.bcd_to_dec(self._read_byte(self.REG_DAY | 0x01))
        month = self.bcd_to_dec(self._read_byte(self.REG_MONTH | 0x01))
        year = self.bcd_to_dec(self._read_byte(self.REG_YEAR | 0x01)) + 2000
        return (year, month, day, hour, minute, second)

    def set_time(self, year, month, day, hour, minute, second):
        self._write_byte(self.REG_WP, 0x00)
        self._write_byte(self.REG_SECOND, self.dec_to_bcd(second))
        self._write_byte(self.REG_MINUTE, self.dec_to_bcd(minute))
        self._write_byte(self.REG_HOUR, self.dec_to_bcd(hour))
        self._write_byte(self.REG_DAY, self.dec_to_bcd(day))
        self._write_byte(self.REG_MONTH, self.dec_to_bcd(month))
        self._write_byte(self.REG_YEAR, self.dec_to_bcd(year - 2000))
        self._write_byte(self.REG_WP, 0x80)
