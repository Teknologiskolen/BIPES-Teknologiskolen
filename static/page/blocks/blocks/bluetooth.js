Blockly.Blocks["bluetooth_init"] = {
  init: function() {
    this.appendDummyInput()
      .appendField("Initialize Bluetooth")
    this.appendDummyInput()
      .appendField("On Connect");
    this.appendStatementInput("OC")
        .setCheck(null) // Accepts any block type
    this.appendDummyInput()
      .appendField("On Disconnect");
    this.appendStatementInput("OD")
        .setCheck(null) // Accepts any block type
    this.appendDummyInput()
      .appendField("On Message Received");
    this.appendStatementInput("OR")
        .setCheck(null) // Accepts any block type
    this.setInputsInline(true);
    this.setColour(245);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
 this.setTooltip(" ");
 this.setHelpUrl("https://docs.micropython.org/en/latest/library/machine.Pin.html");
  }
};

Blockly.Blocks["bluetooth_last_msg"] = {
  init: function() {
    this.appendDummyInput()
        .appendField("Bluetooth Last Message");
    this.setInputsInline(true);
    this.setColour(245);
    this.setOutput(true, "String");
 this.setTooltip("Read the latest received Bluetooth message.");
 this.setHelpUrl("https://docs.micropython.org/en/latest/library/ubluetooth.html");
  }
};

Blockly.Blocks["bluetooth_has_msg"] = {
  init: function() {
    this.appendDummyInput()
        .appendField("Bluetooth Has Message");
    this.setInputsInline(true);
    this.setColour(245);
    this.setOutput(true, "Boolean");
 this.setTooltip("Check whether a Bluetooth message is waiting in the queue.");
 this.setHelpUrl("https://docs.micropython.org/en/latest/library/ubluetooth.html");
  }
};

Blockly.Blocks["bluetooth_pop_msg"] = {
  init: function() {
    this.appendDummyInput()
        .appendField("Bluetooth Pop Message");
    this.setInputsInline(true);
    this.setColour(245);
    this.setOutput(true, "String");
 this.setTooltip("Read and remove the oldest queued Bluetooth message.");
 this.setHelpUrl("https://docs.micropython.org/en/latest/library/ubluetooth.html");
  }
};

Blockly.Blocks["bluetooth_send_msg"] = {
  init: function() {
    this.appendDummyInput()
        .appendField("Send Message via Bluetooth")
    this.appendValueInput("message")
        .setCheck("String")
    this.setInputsInline(true);
    this.setColour(245);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
 this.setTooltip(" ");
 this.setHelpUrl("https://docs.micropython.org/en/latest/library/machine.Pin.html");
  }
};
