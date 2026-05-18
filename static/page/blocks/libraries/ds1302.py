"""DS1302 RTC Driver for MicroPython (3-wire interface)"""

from machine import Pin
import time


# @block {
#   "category": "DS1302 DSL",
#   "color": 35,
#   "url": "https://github.com/micropython/micropython",
#   "instanceMode": "singleton",
#   "instanceName": "ds1302",
#   "methodInstanceMode": "key_input"
# }
# DS1302 real-time clock blocks generated from the Python library.
class DS1302:
    REG_SECOND = 0x80
    REG_MINUTE = 0x82
    REG_HOUR = 0x84
    REG_DAY = 0x86
    REG_MONTH = 0x88
    REG_YEAR = 0x8C
    REG_WP = 0x8E

    # @block {
    #   "params": {
    #     "clk_pin": {"checkType": "Number"},
    #     "dat_pin": {"checkType": "Number"},
    #     "rst_pin": {"checkType": "Number"}
    #   }
    # }
    # Create a DS1302 RTC instance.
    def __init__(self, clk_pin, dat_pin, rst_pin):
        self.clk = Pin(clk_pin, Pin.OUT)
        self.dat = Pin(dat_pin)
        self.rst = Pin(rst_pin, Pin.OUT)
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

    # @block {
    #   "kind": "value"
    # }
    # Read the current time tuple from the RTC.
    def get_time(self):
        second = self.bcd_to_dec(self._read_byte(self.REG_SECOND | 0x01) & 0x7F)
        minute = self.bcd_to_dec(self._read_byte(self.REG_MINUTE | 0x01))
        hour = self.bcd_to_dec(self._read_byte(self.REG_HOUR | 0x01) & 0x3F)
        day = self.bcd_to_dec(self._read_byte(self.REG_DAY | 0x01))
        month = self.bcd_to_dec(self._read_byte(self.REG_MONTH | 0x01))
        year = self.bcd_to_dec(self._read_byte(self.REG_YEAR | 0x01)) + 2000
        return (year, month, day, hour, minute, second)

    # @block {
    #   "kind": "value"
    # }
    # Read the current year from the RTC.
    def get_year(self):
        return self.get_time()[0]

    # @block {
    #   "kind": "value"
    # }
    # Read the current month from the RTC.
    def get_month(self):
        return self.get_time()[1]

    # @block {
    #   "kind": "value"
    # }
    # Read the current day from the RTC.
    def get_day(self):
        return self.get_time()[2]

    # @block {
    #   "kind": "value"
    # }
    # Read the current hour from the RTC.
    def get_hour(self):
        return self.get_time()[3]

    # @block {
    #   "kind": "value"
    # }
    # Read the current minute from the RTC.
    def get_minute(self):
        return self.get_time()[4]

    # @block {
    #   "kind": "value"
    # }
    # Read the current second from the RTC.
    def get_second(self):
        return self.get_time()[5]

    # @block {
    #   "kind": "value",
    #   "params": {
    #     "show_seconds": {"checkType": "Boolean", "defaultValue": true}
    #   }
    # }
    # Format the current time as text.
    def get_time_text(self, show_seconds=True):
        _, _, _, hour, minute, second = self.get_time()
        if show_seconds:
            return "%02d:%02d:%02d" % (hour, minute, second)
        return "%02d:%02d" % (hour, minute)

    # @block {
    #   "kind": "value"
    # }
    # Format the current date as text.
    def get_date_text(self):
        year, month, day, _, _, _ = self.get_time()
        return "%02d/%02d/%04d" % (day, month, year)

    # @block {
    #   "params": {
    #     "year": {"checkType": "Number"},
    #     "month": {"checkType": "Number"},
    #     "day": {"checkType": "Number"},
    #     "hour": {"checkType": "Number"},
    #     "minute": {"checkType": "Number"},
    #     "second": {"checkType": "Number"}
    #   }
    # }
    # Set the RTC date and time.
    def set_time(self, year, month, day, hour, minute, second):
        self._write_byte(self.REG_WP, 0x00)
        self._write_byte(self.REG_SECOND, self.dec_to_bcd(second))
        self._write_byte(self.REG_MINUTE, self.dec_to_bcd(minute))
        self._write_byte(self.REG_HOUR, self.dec_to_bcd(hour))
        self._write_byte(self.REG_DAY, self.dec_to_bcd(day))
        self._write_byte(self.REG_MONTH, self.dec_to_bcd(month))
        self._write_byte(self.REG_YEAR, self.dec_to_bcd(year - 2000))
        self._write_byte(self.REG_WP, 0x80)
