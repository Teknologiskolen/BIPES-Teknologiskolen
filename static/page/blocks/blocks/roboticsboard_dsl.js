Blockly.Blocks["kitronik_pico_robotics__create"] = {
  init: function() {
    this.appendValueInput("I2CAddress").setCheck("Number").appendField("create robotics board address");
    this.appendValueInput("sda").setCheck("Number").appendField("sda");
    this.appendValueInput("scl").setCheck("Number").appendField("scl");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(45);
    this.setInputsInline(true);
    this.setTooltip("Create and initialize the Kitronik Pico Robotics board.");
    this.setHelpUrl("https://github.com/KitronikLtd/Kitronik-Pico-Robotics-Board-MicroPython");
  }
};

Blockly.Blocks["kitronik_pico_robotics__adjust_servos"] = {
  init: function() {
    this.appendDummyInput().appendField("Adjust Servos");
    this.appendValueInput("change").setCheck("Number").appendField("Change");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(45);
    this.setInputsInline(true);
    this.setTooltip("Adjust the global servo calibration by a small amount.");
    this.setHelpUrl("https://github.com/KitronikLtd/Kitronik-Pico-Robotics-Board-MicroPython");
  }
};

Blockly.Blocks["kitronik_pico_robotics__servo_write"] = {
  init: function() {
    this.appendValueInput("servo").setCheck("Number").appendField("turn servo");
    this.appendValueInput("degrees").setCheck("Number").appendField("to");
    this.appendDummyInput().appendField("degrees");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(45);
    this.setInputsInline(true);
    this.setTooltip("Turn a servo motor to the requested angle in degrees.");
    this.setHelpUrl("https://github.com/KitronikLtd/Kitronik-Pico-Robotics-Board-MicroPython");
  }
};

Blockly.Blocks["kitronik_pico_robotics__servo_write_radians"] = {
  init: function() {
    this.appendDummyInput().appendField("Servo Write Radians");
    this.appendValueInput("servo").setCheck("Number").appendField("Servo");
    this.appendValueInput("radians").setCheck("Number").appendField("Radians");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(45);
    this.setInputsInline(true);
    this.setTooltip("Turn a servo motor to the requested angle in radians.");
    this.setHelpUrl("https://github.com/KitronikLtd/Kitronik-Pico-Robotics-Board-MicroPython");
  }
};

Blockly.Blocks["kitronik_pico_robotics__motor_on"] = {
  init: function() {
    this.appendValueInput("motor").setCheck("Number").appendField("start dc motor");
    this.appendDummyInput().appendField("direction ").appendField(new Blockly.FieldDropdown([["Forward", "f"], ["Reverse", "r"]]), "direction");
    this.appendValueInput("speed").setCheck("Number").appendField("speed");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(45);
    this.setInputsInline(true);
    this.setTooltip("Start a DC motor with direction and speed control.");
    this.setHelpUrl("https://github.com/KitronikLtd/Kitronik-Pico-Robotics-Board-MicroPython");
  }
};

Blockly.Blocks["kitronik_pico_robotics__motor_off"] = {
  init: function() {
    this.appendValueInput("motor").setCheck("Number").appendField("stop dc motor");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(45);
    this.setInputsInline(true);
    this.setTooltip("Stop a DC motor.");
    this.setHelpUrl("https://github.com/KitronikLtd/Kitronik-Pico-Robotics-Board-MicroPython");
  }
};

Blockly.Blocks["kitronik_pico_robotics__step"] = {
  init: function() {
    this.appendDummyInput().appendField("Step");
    this.appendValueInput("motor").setCheck("Number").appendField("Motor");
    this.appendDummyInput().appendField("Direction").appendField(new Blockly.FieldDropdown([["Forward", "f"], ["Reverse", "r"]]), "direction");
    this.appendValueInput("steps").setCheck("Number").appendField("Steps");
    this.appendValueInput("speed").setCheck("Number").appendField("Speed");
    this.appendValueInput("holdPosition").setCheck("Boolean").appendField("Hold Position");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(45);
    this.setInputsInline(true);
    this.setTooltip("Step a motor a fixed number of full steps.");
    this.setHelpUrl("https://github.com/KitronikLtd/Kitronik-Pico-Robotics-Board-MicroPython");
  }
};

Blockly.Blocks["kitronik_pico_robotics__step_angle"] = {
  init: function() {
    this.appendDummyInput().appendField("Step Angle");
    this.appendValueInput("motor").setCheck("Number").appendField("Motor");
    this.appendDummyInput().appendField("Direction").appendField(new Blockly.FieldDropdown([["Forward", "f"], ["Reverse", "r"]]), "direction");
    this.appendValueInput("angle").setCheck("Number").appendField("Angle");
    this.appendValueInput("speed").setCheck("Number").appendField("Speed");
    this.appendValueInput("holdPosition").setCheck("Boolean").appendField("Hold Position");
    this.appendValueInput("stepsPerRev").setCheck("Number").appendField("Steps Per Rev");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(45);
    this.setInputsInline(false);
    this.setTooltip("Step a motor by a requested angle.");
    this.setHelpUrl("https://github.com/KitronikLtd/Kitronik-Pico-Robotics-Board-MicroPython");
  }
};
