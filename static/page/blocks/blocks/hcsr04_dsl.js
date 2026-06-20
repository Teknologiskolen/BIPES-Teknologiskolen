Blockly.Blocks["hcsr04__create"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_CREATE_HCSR04"]||"Create HCSR04"));
    this.appendValueInput("id").setCheck("Number").appendField((Blockly.Msg["BLBL_ID"]||"ID #"));
    this.appendValueInput("trigger_pin").setCheck("Number").appendField((Blockly.Msg["BLBL_TRIGGER_PIN"]||"Trigger Pin"));
    this.appendValueInput("echo_pin").setCheck("Number").appendField((Blockly.Msg["BLBL_ECHO_PIN"]||"Echo Pin"));
    this.appendValueInput("echo_timeout_us").setCheck("Number").appendField((Blockly.Msg["BLBL_ECHO_TIMEOUT_US"]||"Echo Timeout Us"));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(330);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_HCSR04_CREATE"]||"Create an HC-SR04 sensor (trigger + echo pins)."));
    this.setHelpUrl("https://github.com/rsc1975/micropython-hcsr04");
  }
};

Blockly.Blocks["hcsr04__distance_cm"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_DISTANCE_CM"]||"Distance Cm"));
    this.appendValueInput("id").setCheck("Number").appendField((Blockly.Msg["BLBL_ID"]||"ID #"));
    this.setOutput(true, null);
    this.setColour(330);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_HCSR04_DISTANCE_CM"]||"Measure the distance in centimetres."));
    this.setHelpUrl("https://github.com/rsc1975/micropython-hcsr04");
  }
};

Blockly.Blocks["hcsr04__distance_mm"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_DISTANCE_MM"]||"Distance Mm"));
    this.appendValueInput("id").setCheck("Number").appendField((Blockly.Msg["BLBL_ID"]||"ID #"));
    this.setOutput(true, null);
    this.setColour(330);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_HCSR04_DISTANCE_MM"]||"Measure the distance in millimetres."));
    this.setHelpUrl("https://github.com/rsc1975/micropython-hcsr04");
  }
};
