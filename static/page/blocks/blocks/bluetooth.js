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
      .appendField("On Message Received")
        .appendField("with:")
        .appendField(new Blockly.FieldVariable("Message"), "message")
    this.appendStatementInput("OR")
        .setCheck(null) // Accepts any block type
    this.setColour(240);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
 this.setTooltip(" ");
 this.setHelpUrl("https://docs.micropython.org/en/latest/library/machine.Pin.html");
  }
};

Blockly.Blocks["bluetooth_send_msg"] = {
  init: function() {
    this.appendDummyInput()
        .appendField("Send Message via Bluetooth")
    this.appendValueInput("message")
        .setCheck("String")
    this.setColour(240);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
 this.setTooltip(" ");
 this.setHelpUrl("https://docs.micropython.org/en/latest/library/machine.Pin.html");
  }
};
