// %{COMM} ---------------------------------------------------------------------
// UART ------------------------------------------------------------------------

Blockly.Python['uart_init'] = function(block) {
  var port = Blockly.Python.valueToCode(block, 'port', Blockly.Python.ORDER_ATOMIC) || '1';
  var baudrate = Blockly.Python.valueToCode(block, 'baudrate', Blockly.Python.ORDER_ATOMIC) || '9600';
  var bits = Blockly.Python.valueToCode(block, 'bits', Blockly.Python.ORDER_ATOMIC) || '8';
  var stop = Blockly.Python.valueToCode(block, 'stop', Blockly.Python.ORDER_ATOMIC) || '1';
  var tx = Blockly.Python.valueToCode(block, 'tx', Blockly.Python.ORDER_ATOMIC) || '0';
  var rx = Blockly.Python.valueToCode(block, 'rx', Blockly.Python.ORDER_ATOMIC) || '1';
  var timeout = Blockly.Python.valueToCode(block, 'timeout', Blockly.Python.ORDER_ATOMIC) || '1000';
  var timeoutChar = Blockly.Python.valueToCode(block, 'timeout_char', Blockly.Python.ORDER_ATOMIC) || '0';
  var parityValue = block.getFieldValue('parity');
  var parity = 'None';
  if (parityValue === 'EVEN') {
    parity = '0';
  } else if (parityValue === 'ODD') {
    parity = '1';
  }

  Blockly.Python.definitions_['import_machine_uart'] = 'from machine import Pin, UART';

  var code = 'uart = UART(' + port + ', baudrate=' + baudrate +
      ', bits=' + bits +
      ', parity=' + parity +
      ', stop=' + stop +
      ', tx=Pin(' + tx + ')' +
      ', rx=Pin(' + rx + ')' +
      ', timeout=' + timeout +
      ', timeout_char=' + timeoutChar + ')\n';

  return code;
};

Blockly.Python['uart_deinit'] = function(block) {
  var code = 'uart.deinit()\n';
  return code;
};

Blockly.Python['uart_any'] = function(block) {
  return ['uart.any()', Blockly.Python.ORDER_FUNCTION_CALL];
};

Blockly.Python['uart_write'] = function(block) {
  var buf = Blockly.Python.valueToCode(block, 'buf', Blockly.Python.ORDER_ATOMIC);

  var code = 'uart.write(' + buf + ')\n';

  return code;
};

Blockly.Python['uart_read'] = function(block) {
  var nbytes = Blockly.Python.valueToCode(block, 'nbytes', Blockly.Python.ORDER_ATOMIC);

  var code = 'uart.read(' + nbytes + ')';

  return [code, Blockly.Python.ORDER_NONE];
};


Blockly.Python['uart_read_all'] = function(block) {

  var code = 'uart.read()';

  return [code, Blockly.Python.ORDER_NONE];
};


Blockly.Python['uart_readline'] = function(block) {

  var code = 'uart.readline()';

  return [code, Blockly.Python.ORDER_NONE];
};


Blockly.Python['uart_read_into'] = function(block) {
  var b = Blockly.Python.valueToCode(block, 'buffer', Blockly.Python.ORDER_ATOMIC);

  var code = 'uart.readinto(' + b + ')';

  return [code, Blockly.Python.ORDER_NONE];
};


// SPI -------------------------------------------------------------------------

Blockly.Python["SPI.init"] = function(block) {
  var mode = block.getFieldValue('mode');
  var id = Blockly.Python.valueToCode(block, 'id', Blockly.Python.ORDER_ATOMIC) || '0';
  var baudrate = Blockly.Python.valueToCode(block, 'baudRate', Blockly.Python.ORDER_ATOMIC) || '1000000';
  var polarity = Blockly.Python.valueToCode(block, 'polarity', Blockly.Python.ORDER_ATOMIC) || '0';
  var phase = Blockly.Python.valueToCode(block, 'phase', Blockly.Python.ORDER_ATOMIC) || '0';
  var bits = Blockly.Python.valueToCode(block, 'bits', Blockly.Python.ORDER_ATOMIC) || '8';
  var sck = Blockly.Python.valueToCode(block, 'sck', Blockly.Python.ORDER_ATOMIC) || '18';
  var mosi = Blockly.Python.valueToCode(block, 'mosi', Blockly.Python.ORDER_ATOMIC) || '19';
  var miso = Blockly.Python.valueToCode(block, 'miso', Blockly.Python.ORDER_ATOMIC) || '16';
  var firstbit = block.getFieldValue('firstbit') === 'LSB' ? 'SPI.LSB' : 'SPI.MSB';

  Blockly.Python.definitions_['import_machine_spi'] = 'from machine import Pin, SPI, SoftSPI';

  if (mode === 'SOFT') {
    return 'spi = SoftSPI(baudrate=' + baudrate +
        ', polarity=' + polarity +
        ', phase=' + phase +
        ', bits=' + bits +
        ', firstbit=' + firstbit +
        ', sck=Pin(' + sck + ')' +
        ', mosi=Pin(' + mosi + ')' +
        ', miso=Pin(' + miso + '))\n';
  }

  return 'spi = SPI(' + id +
      ', baudrate=' + baudrate +
      ', polarity=' + polarity +
      ', phase=' + phase +
      ', bits=' + bits +
      ', firstbit=' + firstbit +
      ', sck=Pin(' + sck + ')' +
      ', mosi=Pin(' + mosi + ')' +
      ', miso=Pin(' + miso + '))\n';
};

Blockly.Python["SPI.deinit"] = function(block) {
  var code = "spi.deinit()\n";
  return code;
};

Blockly.Python["SPI.read"] = function(block) {
  var bytes = Blockly.Python.valueToCode(block, 'bytes', Blockly.Python.ORDER_ATOMIC) || '1';
  var writeByte = Blockly.Python.valueToCode(block, 'write_byte', Blockly.Python.ORDER_ATOMIC) || '0x00';
  var code = 'spi.read(' + bytes + ', ' + writeByte + ')';
  return [code, Blockly.Python.ORDER_NONE];
};

Blockly.Python["SPI.readinto"] = function(block) {
  var buffer = Blockly.Python.valueToCode(block, 'buffer', Blockly.Python.ORDER_ATOMIC);
  var writeByte = Blockly.Python.valueToCode(block, 'write_byte', Blockly.Python.ORDER_ATOMIC) || '0x00';
  var code = 'spi.readinto(' + buffer + ', ' + writeByte + ')\n';
  return code;
};

Blockly.Python["SPI.write"] = function(block) {
  var message = Blockly.Python.valueToCode(block, 'message', Blockly.Python.ORDER_ATOMIC);
  var code = 'spi.write(' + message + ')\n';
  return code;
};

Blockly.Python["SPI.write_readinto"] = function(block) {
  var message = Blockly.Python.valueToCode(block, 'message', Blockly.Python.ORDER_ATOMIC);
  var buffer = Blockly.Python.valueToCode(block, 'buffer', Blockly.Python.ORDER_ATOMIC);
  var code = 'spi.write_readinto(' + message + ', ' + buffer + ')\n';
  return code;
};

// GSM Modem -------------------------------------------------------------------

Blockly.Python['gsm_modem_init'] = function(block) {
  var tx = Blockly.Python.valueToCode(block, 'tx', Blockly.Python.ORDER_ATOMIC);
  var rx = Blockly.Python.valueToCode(block, 'rx', Blockly.Python.ORDER_ATOMIC);
  var bps = Blockly.Python.valueToCode(block, 'bps', Blockly.Python.ORDER_ATOMIC);

  var code = '#init GSM Module \n';

  return code;
};

Blockly.Python['gsm_modem_send_at'] = function(block) {
  var cmd = Blockly.Python.valueToCode(block, 'cmd', Blockly.Python.ORDER_ATOMIC);

  var code = '#init GSM Module AT \n';

  return code;
};

Blockly.Python['gsm_modem_send_sms'] = function(block) {
  var dst = Blockly.Python.valueToCode(block, 'dst', Blockly.Python.ORDER_ATOMIC);
  var msg = Blockly.Python.valueToCode(block, 'msg', Blockly.Python.ORDER_ATOMIC);

  var code = '#Send SMS \n';

  return code;
};

Blockly.Python['gsm_modem_http_get'] = function(block) {
  var cmd = Blockly.Python.valueToCode(block, 'cmd', Blockly.Python.ORDER_ATOMIC);

  var code = '#GSM Module HTTP GET\n';

  return code;
};


Blockly.Python['gsm_modem_response'] = function(block) {
  var timeout = Blockly.Python.valueToCode(block, 'timeout', Blockly.Python.ORDER_ATOMIC);

  var code = '#GSM Module Response \n';

  return [code, Blockly.Python.ORDER_NONE];
};

// I2C -------------------------------------------------------------------------
Blockly.Python["machine.I2C_I2C.init"] = function(block) {
  var mode = block.getFieldValue('mode');
  var id = Blockly.Python.valueToCode(block, 'id', Blockly.Python.ORDER_ATOMIC) || '0';
  var scl = Blockly.Python.valueToCode(block, 'scl', Blockly.Python.ORDER_ATOMIC) || '1';
  var sda = Blockly.Python.valueToCode(block, 'sda', Blockly.Python.ORDER_ATOMIC) || '0';
  var freq = Blockly.Python.valueToCode(block, 'freq', Blockly.Python.ORDER_ATOMIC) || '400000';
  var timeout = Blockly.Python.valueToCode(block, 'timeout', Blockly.Python.ORDER_ATOMIC) || '50000';

  Blockly.Python.definitions_['import_machine_i2c'] = 'from machine import I2C, Pin, SoftI2C';

  if (mode === 'SOFT') {
    return 'i2c = SoftI2C(scl=Pin(' + scl + '), sda=Pin(' + sda + '), freq=' + freq + ', timeout=' + timeout + ')\n';
  }

  return 'i2c = I2C(' + id + ', scl=Pin(' + scl + '), sda=Pin(' + sda + '), freq=' + freq + ')\n';
};

Blockly.Python["machine.I2C_I2C.deinit"] = function(block) {
  var code = "i2c.deinit()\n";
  return code;
};

Blockly.Python["machine.I2C_I2C.scan"] = function(block) {
  return ["i2c.scan()", Blockly.Python.ORDER_FUNCTION_CALL];
};

Blockly.Python["machine.I2C_I2C.start"] = function(block) {
  return "i2c.start()\n";
};

Blockly.Python["machine.I2C_I2C.stop"] = function(block) {
  return "i2c.stop()\n";
};

Blockly.Python["machine.I2C_I2C.readinto"] = function(block) {
  var buffer = Blockly.Python.valueToCode(block, 'buffer', Blockly.Python.ORDER_ATOMIC);
  var nack = block.getFieldValue('nack') === 'TRUE' ? 'True' : 'False';
  return 'i2c.readinto(' + buffer + ', nack=' + nack + ')\n';
};

Blockly.Python["machine.I2C_I2C.write"] = function(block) {
  var buffer = Blockly.Python.valueToCode(block, 'buffer', Blockly.Python.ORDER_ATOMIC);
  return ['i2c.write(' + buffer + ')', Blockly.Python.ORDER_FUNCTION_CALL];
};

Blockly.Python["machine.I2C_I2C.readfrom"] = function(block) {
  var addr = Blockly.Python.valueToCode(block, 'addr', Blockly.Python.ORDER_ATOMIC) || '0x00';
  var nbytes = Blockly.Python.valueToCode(block, 'nbytes', Blockly.Python.ORDER_ATOMIC) || '1';
  var stop = block.getFieldValue('stop') === 'TRUE' ? 'True' : 'False';
  return ['i2c.readfrom(' + addr + ', ' + nbytes + ', stop=' + stop + ')', Blockly.Python.ORDER_FUNCTION_CALL];
};

Blockly.Python["machine.I2C_I2C.readfrom_into"] = function(block) {
  var addr = Blockly.Python.valueToCode(block, 'addr', Blockly.Python.ORDER_ATOMIC) || '0x00';
  var buffer = Blockly.Python.valueToCode(block, 'buffer', Blockly.Python.ORDER_ATOMIC);
  var stop = block.getFieldValue('stop') === 'TRUE' ? 'True' : 'False';
  return 'i2c.readfrom_into(' + addr + ', ' + buffer + ', stop=' + stop + ')\n';
};

Blockly.Python["machine.I2C_I2C.writeto"] = function(block) {
  var addr = Blockly.Python.valueToCode(block, 'addr', Blockly.Python.ORDER_ATOMIC) || '0x00';
  var buffer = Blockly.Python.valueToCode(block, 'buffer', Blockly.Python.ORDER_ATOMIC);
  var stop = block.getFieldValue('stop') === 'TRUE' ? 'True' : 'False';
  return ['i2c.writeto(' + addr + ', ' + buffer + ', stop=' + stop + ')', Blockly.Python.ORDER_FUNCTION_CALL];
};

Blockly.Python["machine.I2C_I2C.writevto"] = function(block) {
  var addr = Blockly.Python.valueToCode(block, 'addr', Blockly.Python.ORDER_ATOMIC) || '0x00';
  var vector = Blockly.Python.valueToCode(block, 'vector', Blockly.Python.ORDER_ATOMIC);
  var stop = block.getFieldValue('stop') === 'TRUE' ? 'True' : 'False';
  return ['i2c.writevto(' + addr + ', ' + vector + ', stop=' + stop + ')', Blockly.Python.ORDER_FUNCTION_CALL];
};

Blockly.Python["machine.I2C_I2C.readfrom_mem"] = function(block) {
  var addr = Blockly.Python.valueToCode(block, 'addr', Blockly.Python.ORDER_ATOMIC) || '0x00';
  var memaddr = Blockly.Python.valueToCode(block, 'memaddr', Blockly.Python.ORDER_ATOMIC) || '0x00';
  var nbytes = Blockly.Python.valueToCode(block, 'nbytes', Blockly.Python.ORDER_ATOMIC) || '1';
  var addrsize = Blockly.Python.valueToCode(block, 'addrsize', Blockly.Python.ORDER_ATOMIC) || '8';
  return ['i2c.readfrom_mem(' + addr + ', ' + memaddr + ', ' + nbytes + ', addrsize=' + addrsize + ')', Blockly.Python.ORDER_FUNCTION_CALL];
};

Blockly.Python["machine.I2C_I2C.readfrom_mem_into"] = function(block) {
  var addr = Blockly.Python.valueToCode(block, 'addr', Blockly.Python.ORDER_ATOMIC) || '0x00';
  var memaddr = Blockly.Python.valueToCode(block, 'memaddr', Blockly.Python.ORDER_ATOMIC) || '0x00';
  var buffer = Blockly.Python.valueToCode(block, 'buffer', Blockly.Python.ORDER_ATOMIC);
  var addrsize = Blockly.Python.valueToCode(block, 'addrsize', Blockly.Python.ORDER_ATOMIC) || '8';
  return 'i2c.readfrom_mem_into(' + addr + ', ' + memaddr + ', ' + buffer + ', addrsize=' + addrsize + ')\n';
};

Blockly.Python["machine.I2C_I2C.writeto_mem"] = function(block) {
  var addr = Blockly.Python.valueToCode(block, 'addr', Blockly.Python.ORDER_ATOMIC) || '0x00';
  var memaddr = Blockly.Python.valueToCode(block, 'memaddr', Blockly.Python.ORDER_ATOMIC) || '0x00';
  var buffer = Blockly.Python.valueToCode(block, 'buffer', Blockly.Python.ORDER_ATOMIC);
  var addrsize = Blockly.Python.valueToCode(block, 'addrsize', Blockly.Python.ORDER_ATOMIC) || '8';
  return 'i2c.writeto_mem(' + addr + ', ' + memaddr + ', ' + buffer + ', addrsize=' + addrsize + ')\n';
};


// Bus constructors -------------------------------------------------------------

Blockly.Python["spi"] = function(block) {
  Blockly.Python.definitions_["from_machine_buses"] = "from machine import SPI, I2C, UART, Pin";
  var id = Blockly.Python.valueToCode(block, "id", Blockly.Python.ORDER_ATOMIC) || '0';
  var baudrate = Blockly.Python.valueToCode(block, "baudrate", Blockly.Python.ORDER_ATOMIC) || '1000000';
  var polarity = Blockly.Python.valueToCode(block, "polarity", Blockly.Python.ORDER_ATOMIC) || '0';
  var phase = Blockly.Python.valueToCode(block, "phase", Blockly.Python.ORDER_ATOMIC) || '0';
  var bits = Blockly.Python.valueToCode(block, "bits", Blockly.Python.ORDER_ATOMIC) || '8';
  var firstbit = block.getFieldValue('firstbit') === 'LSB' ? 'SPI.LSB' : 'SPI.MSB';
  var sck_raw = Blockly.Python.valueToCode(block, "sck", Blockly.Python.ORDER_ATOMIC) || '18';
  var sck_key = sck_raw.replace(/[^a-zA-Z0-9_]/g, "");
  var sck = "sck_" + sck_key;
  Blockly.Python.definitions_["pin_sck_" + sck_key] = sck + " = Pin(" + sck_raw + ")";
  var mosi_raw = Blockly.Python.valueToCode(block, "mosi", Blockly.Python.ORDER_ATOMIC) || '19';
  var mosi_key = mosi_raw.replace(/[^a-zA-Z0-9_]/g, "");
  var mosi = "mosi_" + mosi_key;
  Blockly.Python.definitions_["pin_mosi_" + mosi_key] = mosi + " = Pin(" + mosi_raw + ")";
  var miso_raw = Blockly.Python.valueToCode(block, "miso", Blockly.Python.ORDER_ATOMIC) || '16';
  var miso_key = miso_raw.replace(/[^a-zA-Z0-9_]/g, "");
  var miso = "miso_" + miso_key;
  Blockly.Python.definitions_["pin_miso_" + miso_key] = miso + " = Pin(" + miso_raw + ")";
  var _bus_key = id.replace(/[^a-zA-Z0-9_]/g, "");
  var _bus_var = "spi_" + _bus_key;
  Blockly.Python.definitions_["bus_spi_" + _bus_key] = _bus_var + " = SPI(" + id
      + ", baudrate=" + baudrate + ", polarity=" + polarity + ", phase=" + phase
      + ", bits=" + bits + ", firstbit=" + firstbit
      + ", sck=" + sck + ", mosi=" + mosi + ", miso=" + miso + ")";
  return [_bus_var, Blockly.Python.ORDER_ATOMIC];
};

Blockly.Python["i2_c"] = function(block) {
  Blockly.Python.definitions_["from_machine_buses"] = "from machine import SPI, I2C, UART, Pin";
  var id = Blockly.Python.valueToCode(block, "id", Blockly.Python.ORDER_ATOMIC);
  var sda_raw = Blockly.Python.valueToCode(block, "sda", Blockly.Python.ORDER_ATOMIC);
  var sda_key = sda_raw.replace(/[^a-zA-Z0-9_]/g, "");
  var sda = "sda_" + sda_key;
  Blockly.Python.definitions_["pin_sda_" + sda_key] = sda + " = Pin(" + sda_raw + ")";
  var scl_raw = Blockly.Python.valueToCode(block, "scl", Blockly.Python.ORDER_ATOMIC);
  var scl_key = scl_raw.replace(/[^a-zA-Z0-9_]/g, "");
  var scl = "scl_" + scl_key;
  Blockly.Python.definitions_["pin_scl_" + scl_key] = scl + " = Pin(" + scl_raw + ")";
  var freq = Blockly.Python.valueToCode(block, "freq", Blockly.Python.ORDER_ATOMIC);
  var _bus_key = id.replace(/[^a-zA-Z0-9_]/g, "");
  var _bus_var = "i2c_" + _bus_key;
  Blockly.Python.definitions_["bus_i2c_" + _bus_key] = _bus_var + " = I2C(" + id + ", sda=" + sda + ", scl=" + scl + ", freq=" + freq + ")";
  return [_bus_var, Blockly.Python.ORDER_ATOMIC];
};

Blockly.Python["uart"] = function(block) {
  Blockly.Python.definitions_["from_machine_buses"] = "from machine import SPI, I2C, UART, Pin";
  var id = Blockly.Python.valueToCode(block, "id", Blockly.Python.ORDER_ATOMIC) || '1';
  var baudrate = Blockly.Python.valueToCode(block, "baudrate", Blockly.Python.ORDER_ATOMIC) || '9600';
  var bits = Blockly.Python.valueToCode(block, "bits", Blockly.Python.ORDER_ATOMIC) || '8';
  var stop = Blockly.Python.valueToCode(block, "stop", Blockly.Python.ORDER_ATOMIC) || '1';
  var parityValue = block.getFieldValue('parity');
  var parity = parityValue === 'NONE' ? 'None' : parityValue === 'EVEN' ? '0' : '1';
  var tx_raw = Blockly.Python.valueToCode(block, "tx", Blockly.Python.ORDER_ATOMIC) || '4';
  var tx_key = tx_raw.replace(/[^a-zA-Z0-9_]/g, "");
  var tx = "tx_" + tx_key;
  Blockly.Python.definitions_["pin_tx_" + tx_key] = tx + " = Pin(" + tx_raw + ")";
  var rx_raw = Blockly.Python.valueToCode(block, "rx", Blockly.Python.ORDER_ATOMIC) || '5';
  var rx_key = rx_raw.replace(/[^a-zA-Z0-9_]/g, "");
  var rx = "rx_" + rx_key;
  Blockly.Python.definitions_["pin_rx_" + rx_key] = rx + " = Pin(" + rx_raw + ")";
  var timeout = Blockly.Python.valueToCode(block, "timeout", Blockly.Python.ORDER_ATOMIC) || '0';
  var timeout_char = Blockly.Python.valueToCode(block, "timeout_char", Blockly.Python.ORDER_ATOMIC) || '0';
  var _bus_key = id.replace(/[^a-zA-Z0-9_]/g, "");
  var _bus_var = "uart_" + _bus_key;
  Blockly.Python.definitions_["bus_uart_" + _bus_key] = _bus_var + " = UART(" + id
      + ", baudrate=" + baudrate + ", bits=" + bits + ", parity=" + parity
      + ", stop=" + stop + ", tx=" + tx + ", rx=" + rx
      + ", timeout=" + timeout + ", timeout_char=" + timeout_char + ")";
  return [_bus_var, Blockly.Python.ORDER_ATOMIC];
};
