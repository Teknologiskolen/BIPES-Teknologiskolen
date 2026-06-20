// %{COMM} ---------------------------------------------------------------------
// UART ------------------------------------------------------------------------
Blockly.Blocks['uart_init'] = {
  init: function() {
    this.setColour(135);
    this.appendDummyInput()
        .appendField("Initialize UART");

    this.appendValueInput("port")
        .setCheck("Number")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField("Port");

    this.appendValueInput("baudrate")
        .setCheck("Number")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField("Baud Rate");

    this.appendValueInput("bits")
        .setCheck("Number")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField("Bits");

    this.appendValueInput("stop")
        .setCheck("Number")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField("Stop Bits");

    this.appendDummyInput()
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField("Parity")
        .appendField(new Blockly.FieldDropdown([
          ["None", "NONE"],
          ["Even", "EVEN"],
          ["Odd", "ODD"]
        ]), "parity");

    this.appendValueInput("tx")
        .setCheck("Number")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField("TX Pin");

    this.appendValueInput("rx")
        .setCheck("Number")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField("RX Pin");

    this.appendValueInput("timeout")
        .setCheck("Number")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField("Timeout (ms)");

    this.appendValueInput("timeout_char")
        .setCheck("Number")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField("Timeout Char (ms)");

    this.setPreviousStatement(true);
    this.setNextStatement(true);

    this.setInputsInline(false);
    this.setTooltip('Initialize a UART object using the MicroPython machine.UART API.');
    this.setHelpUrl('https://docs.micropython.org/en/latest/library/machine.UART.html');
  }
};

Blockly.Blocks['uart_deinit'] = {
  init: function() {
    this.setColour(135);
    this.appendDummyInput()
        .appendField("Deinitialize UART");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setInputsInline(true);
    this.setTooltip('Turn off the UART bus.');
    this.setHelpUrl('https://docs.micropython.org/en/latest/library/machine.UART.html');
  }
};

Blockly.Blocks['uart_any'] = {
  init: function() {
    this.setColour(135);
    this.appendDummyInput()
        .appendField("UART Available Bytes");
    this.setOutput(true, "Number");
    this.setInputsInline(true);
    this.setTooltip('Return the number of bytes that can be read without blocking.');
    this.setHelpUrl('https://docs.micropython.org/en/latest/library/machine.UART.html');
  }
};

Blockly.Blocks['uart_write'] = {
  init: function() {
    this.setColour(135);
    this.appendDummyInput()
        .appendField("UART Write");

    this.appendValueInput("buf")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField("Data");

    this.setPreviousStatement(true);
    this.setNextStatement(true);

    this.setInputsInline(true);
    this.setTooltip('Write bytes or text to UART.');
    this.setHelpUrl('https://docs.micropython.org/en/latest/library/machine.UART.html');
  }
};

Blockly.Blocks['uart_read'] = {
  init: function() {
    this.setColour(135);
    this.appendDummyInput()
        .appendField("UART Read");

    this.appendValueInput("nbytes")
        .setCheck("Number")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField("Bytes");

    this.setOutput(true);
    this.setInputsInline(true);
    this.setTooltip('Read up to the requested number of bytes from UART.');
    this.setHelpUrl('https://docs.micropython.org/en/latest/library/machine.UART.html');
  }
};

Blockly.Blocks['uart_read_all'] = {
  init: function() {
    this.setColour(135);
    this.appendDummyInput()
        .appendField("UART Read All");

    this.setOutput(true);
    this.setInputsInline(true);
    this.setTooltip('Read all available UART bytes.');
    this.setHelpUrl('https://docs.micropython.org/en/latest/library/machine.UART.html');
  }
};

Blockly.Blocks['uart_readline'] = {
  init: function() {
    this.setColour(135);
    this.appendDummyInput()
        .appendField("UART Read Line");

    this.setOutput(true);
    this.setInputsInline(true);
    this.setTooltip('Read a line from UART.');
    this.setHelpUrl('https://docs.micropython.org/en/latest/library/machine.UART.html');
  }
};

Blockly.Blocks['uart_read_into'] = {
  init: function() {
    this.setColour(135);
    this.appendDummyInput()
        .appendField("UART Read Into Buffer");

    this.appendValueInput("buffer")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField("Buffer");

    this.setOutput(true, "Number");
    this.setInputsInline(true);
    this.setTooltip('Read bytes into the provided buffer and return the count read.');
    this.setHelpUrl('https://docs.micropython.org/en/latest/library/machine.UART.html');
  }
};

// SPI -------------------------------------------------------------------------


Blockly.Blocks['SPI.init'] = {
  init: function() {
    this.appendDummyInput()
        .appendField("Initialize SPI")
        .appendField(new Blockly.FieldDropdown([
          ["Hardware", "HARD"],
          ["Software", "SOFT"]
        ]), "mode");

    this.appendValueInput("id")
        .setCheck("Number")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField("ID");

    this.appendValueInput("baudRate")
        .setCheck("Number")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField("Baud Rate");

    this.appendValueInput("polarity")
        .setCheck("Number")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField("Polarity");

    this.appendValueInput("phase")
        .setCheck("Number")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField("Phase");

    this.appendValueInput("bits")
        .setCheck("Number")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField("Bits");

    this.appendDummyInput()
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField("First Bit")
        .appendField(new Blockly.FieldDropdown([
          ["MSB", "MSB"],
          ["LSB", "LSB"]
        ]), "firstbit");

    this.appendValueInput("sck")
        .setCheck("Number")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField("SCK Pin");

    this.appendValueInput("mosi")
        .setCheck("Number")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField("MOSI Pin");

    this.appendValueInput("miso")
        .setCheck("Number")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField("MISO Pin");

    this.setColour(15);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setInputsInline(false);
    this.setTooltip("Initialize a hardware SPI or SoftSPI bus.");
    this.setHelpUrl("https://docs.micropython.org/en/latest/library/machine.SPI.html");
  }
};



Blockly.Blocks["SPI.deinit"] = {
  init: function() {
    this.appendDummyInput()
        .appendField("Deinitialize SPI");
    this.setColour(15);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setInputsInline(true);
    this.setTooltip("Turn off the SPI bus.");
    this.setHelpUrl("https://docs.micropython.org/en/latest/library/machine.SPI.html");
  }
};



Blockly.Blocks["SPI.read"] = {
  init: function() {
    this.appendDummyInput()
        .appendField("SPI Read");
    this.appendValueInput("bytes")
        .setCheck("Number")
        .appendField("Bytes");
    this.appendValueInput("write_byte")
        .setCheck("Number")
        .appendField("Write Byte");
    this.setColour(15);
    this.setOutput(true, null);
    this.setInputsInline(true);
    this.setTooltip("Read bytes while continuously writing a filler byte.");
    this.setHelpUrl("https://docs.micropython.org/en/latest/library/machine.SPI.html");
  }
};



Blockly.Blocks["SPI.readinto"] = {
  init: function() {
    this.appendDummyInput()
        .appendField("SPI Read Into Buffer");
    this.appendValueInput("buffer")
        .appendField("Buffer");
    this.appendValueInput("write_byte")
        .setCheck("Number")
        .appendField("Write Byte");
    this.setColour(15);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setInputsInline(true);
    this.setTooltip("Read into a buffer while continuously writing a filler byte.");
    this.setHelpUrl("https://docs.micropython.org/en/latest/library/machine.SPI.html");
  }
};



Blockly.Blocks["SPI.write"] = {
  init: function() {
    this.appendDummyInput()
        .appendField("SPI Write");
    this.appendValueInput("message")
        .appendField("Buffer");
    this.setColour(15);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setInputsInline(true);
    this.setTooltip("Write bytes to the SPI bus.");
    this.setHelpUrl("https://docs.micropython.org/en/latest/library/machine.SPI.html");
  }
};



Blockly.Blocks["SPI.write_readinto"] = {
  init: function() {
    this.appendDummyInput()
        .appendField("SPI Write And Read Into");
    this.appendValueInput("message")
        .appendField("Write Buffer");
    this.appendValueInput("buffer")
        .appendField("Read Buffer");
    this.setColour(15);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setInputsInline(true);
    this.setTooltip("Write bytes from one buffer while reading into another buffer.");
    this.setHelpUrl("https://docs.micropython.org/en/latest/library/machine.SPI.html");
  }
};

// GSM Modem -------------------------------------------------------------------
Blockly.Blocks['gsm_modem_init'] = {
  init: function() {
    this.setColour(55);
    this.appendDummyInput()
        .appendField("Init SIM800/900 GSM MODEM");

    this.appendValueInput("tx")
        .setCheck("Number")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField("TX Pin:");

    this.appendValueInput("rx")
        .setCheck("Number")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField("RX Pin:");

    this.appendValueInput("bps")
        .setCheck("Number")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField("Baud rate:");

    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setInputsInline(true);
    this.setTooltip('');
  }
};

Blockly.Blocks['gsm_modem_send_sms'] = {
  init: function() {
    this.setColour(55);
    this.appendDummyInput()
        .appendField("Send SMS Message");

    this.appendValueInput("dst")
        .setCheck("Number")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField("Destination:");

    this.appendValueInput("msg")
        .setCheck("String")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField("Message:");

    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setInputsInline(true);
    this.setTooltip('');
  }
};


Blockly.Blocks['gsm_modem_send_at'] = {
  init: function() {
    this.setColour(55);
    this.appendDummyInput()
        .appendField("Send AT Command");

    this.appendValueInput("cmd")
        .setCheck("Number")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField("Command:");

    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setInputsInline(true);
    this.setTooltip('');
  }
};

Blockly.Blocks['gsm_modem_http_get'] = {
  init: function() {
    this.setColour(55);
    this.appendDummyInput()
        .appendField("GSM: Send HTTP GET Request");

    this.appendValueInput("cmd")
        .setCheck("String")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField("Request:");

    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setInputsInline(true);
    this.setTooltip('');
  }
};

Blockly.Blocks['gsm_modem_response'] = {
  init: function() {
    this.setColour(55);
    this.appendDummyInput()
        .appendField("Get GSM Modem Response");

    this.appendValueInput("timeout")
        .setCheck("Number")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField("Timeout:");

    this.setOutput(true);
    this.setInputsInline(true);
    this.setTooltip('');
  }
};


// I2C -------------------------------------------------------------------------


Blockly.Blocks["machine.I2C_I2C.init"] = {
  init: function() {
    this.appendDummyInput()
        .appendField("Initialize I2C")
        .appendField(new Blockly.FieldDropdown([
          ["Hardware", "HARD"],
          ["Software", "SOFT"]
        ]), "mode");
    this.appendValueInput("id")
        .setCheck("Number")
        .appendField("ID");
    this.appendValueInput("scl")
        .setCheck("Number")
        .appendField("SCL Pin");
    this.appendValueInput("sda")
        .setCheck("Number")
        .appendField("SDA Pin");
    this.appendValueInput("freq")
        .setCheck("Number")
        .appendField(Msg["field_frequency"]);
    this.appendValueInput("timeout")
        .setCheck("Number")
        .appendField("Timeout (us)");
    this.setColour(175);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setInputsInline(true);
    this.setTooltip("Initialize a hardware I2C or SoftI2C bus.");
    this.setHelpUrl("https://docs.micropython.org/en/latest/library/machine.I2C.html");
  }
};



Blockly.Blocks["machine.I2C_I2C.deinit"] = {
  init: function() {
    this.appendDummyInput()
        .appendField("I2C Deinitialize");
    this.setColour(175);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setInputsInline(true);
    this.setTooltip("Turn off the I2C bus.");
    this.setHelpUrl("https://docs.micropython.org/en/latest/library/machine.I2C.html");
  }
};



Blockly.Blocks["machine.I2C_I2C.scan"] = {
  init: function() {
    this.appendDummyInput()
        .appendField("I2C Scan");
    this.setColour(175);
    this.setOutput(true);
    this.setInputsInline(true);
    this.setTooltip("Scan the bus and return a list of responding addresses.");
    this.setHelpUrl("https://docs.micropython.org/en/latest/library/machine.I2C.html");
  }
};



Blockly.Blocks["machine.I2C_I2C.start"] = {
  init: function() {
    this.appendDummyInput()
        .appendField("I2C Start");
    this.setColour(175);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setInputsInline(true);
    this.setTooltip("Generate a START condition. Typically used with SoftI2C primitive operations.");
    this.setHelpUrl("https://docs.micropython.org/en/latest/library/machine.I2C.html");
  }
};



Blockly.Blocks["machine.I2C_I2C.stop"] = {
  init: function() {
    this.appendDummyInput()
        .appendField("I2C Stop");
    this.setColour(175);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setInputsInline(true);
    this.setTooltip("Generate a STOP condition. Typically used with SoftI2C primitive operations.");
    this.setHelpUrl("https://docs.micropython.org/en/latest/library/machine.I2C.html");
  }
};



Blockly.Blocks["machine.I2C_I2C.readinto"] = {
  init: function() {
    this.appendDummyInput()
        .appendField("I2C Read Into");
    this.appendValueInput("buffer")
        .appendField("Buffer");
    this.appendDummyInput()
        .appendField("NACK Last Byte")
        .appendField(new Blockly.FieldDropdown([
          ["True", "TRUE"],
          ["False", "FALSE"]
        ]), "nack");
    this.setColour(175);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setInputsInline(true);
    this.setTooltip("Read bytes into a buffer using primitive I2C operations.");
    this.setHelpUrl("https://docs.micropython.org/en/latest/library/machine.I2C.html");
  }
};



Blockly.Blocks["machine.I2C_I2C.write"] = {
  init: function() {
    this.appendDummyInput()
        .appendField("I2C Write");
    this.appendValueInput("buffer")
        .appendField("Buffer");
    this.setColour(175);
    this.setOutput(true, "Number");
    this.setInputsInline(true);
    this.setTooltip("Write bytes using primitive I2C operations and return the number of ACKs received.");
    this.setHelpUrl("https://docs.micropython.org/en/latest/library/machine.I2C.html");
  }
};



Blockly.Blocks["machine.I2C_I2C.readfrom"] = {
  init: function() {
    this.appendDummyInput()
        .appendField("I2C Read From");
    this.appendValueInput("addr")
        .setCheck("Number")
        .appendField("Address");
    this.appendValueInput("nbytes")
        .setCheck("Number")
        .appendField("Bytes");
    this.appendDummyInput()
        .appendField("Stop")
        .appendField(new Blockly.FieldDropdown([
          ["True", "TRUE"],
          ["False", "FALSE"]
        ]), "stop");
    this.setColour(175);
    this.setOutput(true, null);
    this.setInputsInline(true);
    this.setTooltip("Read bytes from an I2C address.");
    this.setHelpUrl("https://docs.micropython.org/en/latest/library/machine.I2C.html");
  }
};



Blockly.Blocks["machine.I2C_I2C.readfrom_into"] = {
  init: function() {
    this.appendDummyInput()
        .appendField("I2C Read From Into");
    this.appendValueInput("addr")
        .setCheck("Number")
        .appendField("Address");
    this.appendValueInput("buffer")
        .appendField("Buffer");
    this.appendDummyInput()
        .appendField("Stop")
        .appendField(new Blockly.FieldDropdown([
          ["True", "TRUE"],
          ["False", "FALSE"]
        ]), "stop");
    this.setColour(175);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setInputsInline(true);
    this.setTooltip("Read from an I2C address into a buffer.");
    this.setHelpUrl("https://docs.micropython.org/en/latest/library/machine.I2C.html");
  }
};



Blockly.Blocks["machine.I2C_I2C.writeto"] = {
  init: function() {
    this.appendDummyInput()
        .appendField("I2C Write To");
    this.appendValueInput("addr")
        .setCheck("Number")
        .appendField("Address");
    this.appendValueInput("buffer")
        .appendField("Buffer");
    this.appendDummyInput()
        .appendField("Stop")
        .appendField(new Blockly.FieldDropdown([
          ["True", "TRUE"],
          ["False", "FALSE"]
        ]), "stop");
    this.setColour(175);
    this.setOutput(true, "Number");
    this.setInputsInline(true);
    this.setTooltip("Write bytes to an I2C address and return the number of ACKs received.");
    this.setHelpUrl("https://docs.micropython.org/en/latest/library/machine.I2C.html");
  }
};



Blockly.Blocks["machine.I2C_I2C.writevto"] = {
  init: function() {
    this.appendDummyInput()
        .appendField("I2C Write Vector To");
    this.appendValueInput("addr")
        .setCheck("Number")
        .appendField("Address");
    this.appendValueInput("vector")
        .appendField("Vector");
    this.appendDummyInput()
        .appendField("Stop")
        .appendField(new Blockly.FieldDropdown([
          ["True", "TRUE"],
          ["False", "FALSE"]
        ]), "stop");
    this.setColour(175);
    this.setOutput(true, "Number");
    this.setInputsInline(true);
    this.setTooltip("Write a list of buffers to an I2C address.");
    this.setHelpUrl("https://docs.micropython.org/en/latest/library/machine.I2C.html");
  }
};



Blockly.Blocks["machine.I2C_I2C.readfrom_mem"] = {
  init: function() {
    this.appendDummyInput()
        .appendField("I2C Read From Memory");
    this.appendValueInput("addr")
        .setCheck("Number")
        .appendField("Address");
    this.appendValueInput("memaddr")
        .setCheck("Number")
        .appendField("Memory Address");
    this.appendValueInput("nbytes")
        .setCheck("Number")
        .appendField("Bytes");
    this.appendValueInput("addrsize")
        .setCheck("Number")
        .appendField("Address Size");
    this.setColour(175);
    this.setOutput(true);
    this.setInputsInline(true);
    this.setTooltip("Read bytes from a device memory address.");
    this.setHelpUrl("https://docs.micropython.org/en/latest/library/machine.I2C.html");
  }
};



Blockly.Blocks["machine.I2C_I2C.readfrom_mem_into"] = {
  init: function() {
    this.appendDummyInput()
        .appendField("I2C Read From Memory Into");
    this.appendValueInput("addr")
        .setCheck("Number")
        .appendField("Address");
    this.appendValueInput("memaddr")
        .setCheck("Number")
        .appendField("Memory Address");
    this.appendValueInput("buffer")
        .appendField("Buffer");
    this.appendValueInput("addrsize")
        .setCheck("Number")
        .appendField("Address Size");
    this.setColour(175);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setInputsInline(true);
    this.setTooltip("Read from a device memory address into a buffer.");
    this.setHelpUrl("https://docs.micropython.org/en/latest/library/machine.I2C.html");
  }
};



Blockly.Blocks["machine.I2C_I2C.writeto_mem"] = {
  init: function() {
    this.appendDummyInput()
        .appendField("I2C Write To Memory");
    this.appendValueInput("addr")
        .setCheck("Number")
        .appendField("Address");
    this.appendValueInput("memaddr")
        .setCheck("Number")
        .appendField("Memory Address");
    this.appendValueInput("buffer")
        .appendField("Buffer");
    this.appendValueInput("addrsize")
        .setCheck("Number")
        .appendField("Address Size");
    this.setColour(175);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setInputsInline(true);
    this.setTooltip("Write bytes to a device memory address.");
    this.setHelpUrl("https://docs.micropython.org/en/latest/library/machine.I2C.html");
  }
};


// Bus constructors (value blocks — return SPI/I2C/UART objects) ----------------

Blockly.Blocks["spi"] = {
  init: function() {
    this.appendDummyInput().appendField("SPI");
    this.appendValueInput("id").setCheck("Number").appendField("ID #");
    this.appendValueInput("baudrate").setCheck("Number").appendField("Baudrate");
    this.appendValueInput("polarity").setCheck("Number").appendField("Polarity");
    this.appendValueInput("phase").setCheck("Number").appendField("Phase");
    this.appendValueInput("bits").setCheck("Number").appendField("Bits");
    this.appendDummyInput()
        .appendField("First Bit")
        .appendField(new Blockly.FieldDropdown([["MSB", "MSB"], ["LSB", "LSB"]]), "firstbit");
    this.appendValueInput("sck").setCheck("Number").appendField("SCK");
    this.appendValueInput("mosi").setCheck("Number").appendField("MOSI");
    this.appendValueInput("miso").setCheck("Number").appendField("MISO");
    this.setOutput(true, "SPI");
    this.setColour(15);
    this.setInputsInline(false);
    this.setTooltip("Create a hardware SPI bus object.");
    this.setHelpUrl("https://docs.micropython.org/en/latest/library/machine.SPI.html");
  }
};

Blockly.Blocks["i2_c"] = {
  init: function() {
    this.appendDummyInput().appendField("I2C");
    this.appendValueInput("id").setCheck("Number").appendField("ID #");
    this.appendValueInput("sda").setCheck("Number").appendField("SDA");
    this.appendValueInput("scl").setCheck("Number").appendField("SCL");
    this.appendValueInput("freq").setCheck("Number").appendField(Msg["field_frequency"]);
    this.setOutput(true, "I2C");
    this.setColour(175);
    this.setInputsInline(true);
    this.setTooltip("Create a hardware I2C bus object.");
    this.setHelpUrl("https://docs.micropython.org/en/latest/library/machine.I2C.html");
  }
};

Blockly.Blocks["uart"] = {
  init: function() {
    this.appendDummyInput().appendField("UART");
    this.appendValueInput("id").setCheck("Number").appendField("ID #");
    this.appendValueInput("baudrate").setCheck("Number").appendField("Baudrate");
    this.appendValueInput("bits").setCheck("Number").appendField("Bits");
    this.appendValueInput("stop").setCheck("Number").appendField("Stop Bits");
    this.appendDummyInput()
        .appendField("Parity")
        .appendField(new Blockly.FieldDropdown([["None", "NONE"], ["Even", "EVEN"], ["Odd", "ODD"]]), "parity");
    this.appendValueInput("tx").setCheck("Number").appendField("TX");
    this.appendValueInput("rx").setCheck("Number").appendField("RX");
    this.appendValueInput("timeout").setCheck("Number").appendField("Timeout");
    this.appendValueInput("timeout_char").setCheck("Number").appendField("Timeout Char");
    this.setOutput(true, "UART");
    this.setColour(135);
    this.setInputsInline(false);
    this.setTooltip("Create a hardware UART object.");
    this.setHelpUrl("https://docs.micropython.org/en/latest/library/machine.UART.html");
  }
};
