import ubluetooth
from micropython import const

# Nordic UART Service UUIDs (compatible with BIPES WebBluetooth)
_NUS_UUID = ubluetooth.UUID("6e400001-b5a3-f393-e0a9-e50e24dcca9e")
_TX_UUID = ubluetooth.UUID("6e400003-b5a3-f393-e0a9-e50e24dcca9e")
_RX_UUID = ubluetooth.UUID("6e400002-b5a3-f393-e0a9-e50e24dcca9e")

_FLAG_WRITE = const(0x0008)
_FLAG_NOTIFY = const(0x0010)

_IRQ_CENTRAL_CONNECT = const(1)
_IRQ_CENTRAL_DISCONNECT = const(2)
_IRQ_GATTS_WRITE = const(3)

_ADV_TYPE_FLAGS = const(0x01)
_ADV_TYPE_NAME = const(0x09)
_ADV_TYPE_UUID128_COMPLETE = const(0x07)


def _advertising_payload(name=None, services=None):
    payload = bytearray()
    
    # Flags
    payload += bytearray([0x02, _ADV_TYPE_FLAGS, 0x06])
    
    # Complete name
    if name:
        name_bytes = name.encode()
        payload += bytearray([len(name_bytes) + 1, _ADV_TYPE_NAME]) + name_bytes
    
    return payload


class BLEPeripheral:
    def __init__(self, name="PicoW-Robot"):
        self.name = name
        self.ble = ubluetooth.BLE()
        self.ble.active(True)
        self.ble.irq(self._ble_irq)

        self.connected = False
        self.conn_handle = None

        self._on_write_callback = None
        self._on_connect_callback = None
        self._on_disconnect_callback = None

        self._register_services()
        self._advertise()
        print("BLE initialized")

    def _register_services(self):
        NUS_SERVICE = (
            _NUS_UUID,
            (
                (_TX_UUID, _FLAG_NOTIFY),
                (_RX_UUID, _FLAG_WRITE),
            ),
        )
        ((self.tx_handle, self.rx_handle),) = self.ble.gatts_register_services((NUS_SERVICE,))
        self.ble.gatts_set_buffer(self.rx_handle, 100, True)
        print("Services registered")

    def _ble_irq(self, event, data):
        if event == _IRQ_CENTRAL_CONNECT:
            self.conn_handle, _, _ = data
            self.connected = True
            print("Connected")
            if self._on_connect_callback:
                self._on_connect_callback()

        elif event == _IRQ_CENTRAL_DISCONNECT:
            self.connected = False
            self.conn_handle = None
            print("Disconnected")
            if self._on_disconnect_callback:
                self._on_disconnect_callback()
            self._advertise()

        elif event == _IRQ_GATTS_WRITE:
            conn_handle, attr_handle = data
            if attr_handle == self.rx_handle:
                rx_data = self.ble.gatts_read(self.rx_handle)
                msg = rx_data.decode().strip()
                print("RX:", msg)
                if self._on_write_callback:
                    self._on_write_callback(msg)

    def send(self, msg: str):
        if not self.connected or self.conn_handle is None:
            return
        self.ble.gatts_notify(self.conn_handle, self.tx_handle, msg.encode())

    def _advertise(self):
        payload = _advertising_payload(name=self.name)
        self.ble.gap_advertise(100_000, adv_data=payload)
        print("Advertising as:", self.name)

    def on_write(self, callback):
        self._on_write_callback = callback

    def on_connect(self, callback):
        self._on_connect_callback = callback

    def on_disconnect(self, callback):
        self._on_disconnect_callback = callback
