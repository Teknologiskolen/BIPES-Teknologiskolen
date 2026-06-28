Blockly.Blocks["pico_fly__create"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_START_PICOFLY_BOARD"]||"Start PicoFly board"));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(120);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_PICO_FLY_CREATE"]||"Opret PicoFly-board: motorer + servoer klarg\u00f8res og LED'en begynder at blinke."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["pico_fly__motor"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_MOTOR"]||"Motor")).appendField(new Blockly.FieldDropdown([["A", "a"], ["B", "b"]]), "which");
    this.appendValueInput("speed").setCheck("Number").appendField((Blockly.Msg["BLBL_HASTIGHED"]||"hastighed"));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(120);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_PICO_FLY_MOTOR"]||"K\u00f8r motor A eller B. Hastighed -1.0 til 1.0 (fremad positiv, bagl\u00e6ns negativ, 0 = stop)."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["pico_fly__motor_stop"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_STOP_MOTOR"]||"Stop motor")).appendField(new Blockly.FieldDropdown([["A", "a"], ["B", "b"]]), "which");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(120);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_PICO_FLY_MOTOR_STOP"]||"Stop motor A eller B."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["pico_fly__set_servo"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_SERVO"]||"Servo")).appendField(new Blockly.FieldDropdown([["1", "1"], ["2", "2"], ["3", "3"], ["4", "4"]]), "servo");
    this.appendValueInput("angle").setCheck("Number").appendField((Blockly.Msg["BLBL_VINKEL"]||"vinkel"));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(120);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_PICO_FLY_SET_SERVO"]||"S\u00e6t servo 1-4 til en vinkel (0-180 grader)."));
    this.setHelpUrl("https://github.com/bipes");
  }
};
