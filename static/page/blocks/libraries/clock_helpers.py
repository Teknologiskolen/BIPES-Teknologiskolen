from machine import Pin, SPI


# @block {
#   "category": "Clock Helpers DSL",
#   "color": 200,
#   "kind": "value",
#   "params": {
#     "spi_id": {"checkType": "Number", "defaultValue": 0},
#     "sck_pin": {"checkType": "Number", "defaultValue": 18},
#     "mosi_pin": {"checkType": "Number", "defaultValue": 19},
#     "baudrate": {"checkType": "Number", "defaultValue": 40000000},
#     "polarity": {"checkType": "Number", "defaultValue": 0},
#     "phase": {"checkType": "Number", "defaultValue": 0}
#   }
# }
# Create an SPI object for display and device wrappers.
def create_spi(spi_id=0, sck_pin=18, mosi_pin=19, baudrate=40000000, polarity=0, phase=0):
    return SPI(
        spi_id,
        baudrate=baudrate,
        polarity=polarity,
        phase=phase,
        sck=Pin(sck_pin),
        mosi=Pin(mosi_pin),
    )
