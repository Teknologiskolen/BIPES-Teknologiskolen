Blockly.Blocks["kitronik_pico_robotics__create"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_CREATE_KITRONIK_PICO_ROBOTICS"]||"Create Kitronik Pico Robotics"));
    this.appendValueInput("I2CAddress").setCheck("Number").appendField((Blockly.Msg["BLBL_I2C_ADDRESS"]||"I2C Address"));
    this.appendValueInput("sda").setCheck("Number").appendField((Blockly.Msg["BLBL_SDA"]||"SDA"));
    this.appendValueInput("scl").setCheck("Number").appendField((Blockly.Msg["BLBL_SCL"]||"SCL"));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(30);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_KITRONIK_PICO_ROBOTICS_CREATE"]||"Create the Kitronik Robotics board (I2C address + SDA/SCL pins)."));
    this.setHelpUrl("https://kitronik.co.uk");
  }
};

Blockly.Blocks["kitronik_pico_robotics__adjust_servos"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_ADJUST_SERVOS"]||"Adjust Servos"));
    this.appendValueInput("change").setCheck("Number").appendField((Blockly.Msg["BLBL_CHANGE"]||"Change"));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(30);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_KITRONIK_PICO_ROBOTICS_ADJUST_SERVOS"]||"Calibrate the servo pulse range."));
    this.setHelpUrl("https://kitronik.co.uk");
  }
};

Blockly.Blocks["kitronik_pico_robotics__motor_on"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_MOTOR_ON"]||"Motor On"));
    this.appendValueInput("motor").setCheck("Number").appendField((Blockly.Msg["BLBL_MOTOR"]||"Motor"));
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_DIRECTION"]||"Direction")).appendField(new Blockly.FieldDropdown([["forward", "f"], ["reverse", "r"]]), "direction");
    this.appendValueInput("speed").setCheck("Number").appendField((Blockly.Msg["BLBL_SPEED"]||"Speed"));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(30);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_KITRONIK_PICO_ROBOTICS_MOTOR_ON"]||"Drive a motor (1-4) in a direction at a speed (0-100)."));
    this.setHelpUrl("https://kitronik.co.uk");
  }
};

Blockly.Blocks["kitronik_pico_robotics__motor_off"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_MOTOR_OFF"]||"Motor Off"));
    this.appendValueInput("motor").setCheck("Number").appendField((Blockly.Msg["BLBL_MOTOR"]||"Motor"));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(30);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_KITRONIK_PICO_ROBOTICS_MOTOR_OFF"]||"Stop a motor (1-4)."));
    this.setHelpUrl("https://kitronik.co.uk");
  }
};

Blockly.Blocks["kitronik_pico_robotics__servo_write"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_SERVO_WRITE"]||"Servo Write"));
    this.appendValueInput("servo").setCheck("Number").appendField((Blockly.Msg["BLBL_SERVO"]||"Servo"));
    this.appendValueInput("degrees").setCheck("Number").appendField((Blockly.Msg["BLBL_DEGREES"]||"Degrees"));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(30);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_KITRONIK_PICO_ROBOTICS_SERVO_WRITE"]||"Move a servo (1-8) to an angle in degrees (0-180)."));
    this.setHelpUrl("https://kitronik.co.uk");
  }
};

Blockly.Blocks["kitronik_pico_robotics__servo_write_radians"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_SERVO_WRITE_RADIANS"]||"Servo Write Radians"));
    this.appendValueInput("servo").setCheck("Number").appendField((Blockly.Msg["BLBL_SERVO"]||"Servo"));
    this.appendValueInput("radians").setCheck("Number").appendField((Blockly.Msg["BLBL_RADIANS"]||"Radians"));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(30);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_KITRONIK_PICO_ROBOTICS_SERVO_WRITE_RADIANS"]||"Move a servo (1-8) to an angle in radians."));
    this.setHelpUrl("https://kitronik.co.uk");
  }
};

Blockly.Blocks["kitronik_pico_robotics__step"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_STEP"]||"Step"));
    this.appendValueInput("motor").setCheck("Number").appendField((Blockly.Msg["BLBL_MOTOR"]||"Motor"));
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_DIRECTION"]||"Direction")).appendField(new Blockly.FieldDropdown([["forward", "f"], ["reverse", "r"]]), "direction");
    this.appendValueInput("steps").setCheck("Number").appendField((Blockly.Msg["BLBL_STEPS"]||"Steps"));
    this.appendValueInput("speed").setCheck("Number").appendField((Blockly.Msg["BLBL_SPEED"]||"Speed"));
    this.appendValueInput("holdPosition").setCheck("Boolean").appendField((Blockly.Msg["BLBL_HOLD_POSITION"]||"Hold Position"));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(30);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_KITRONIK_PICO_ROBOTICS_STEP"]||"Step a stepper motor by a number of steps in a direction."));
    this.setHelpUrl("https://kitronik.co.uk");
  }
};

Blockly.Blocks["kitronik_pico_robotics__step_angle"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_STEP_ANGLE"]||"Step Angle"));
    this.appendValueInput("motor").setCheck("Number").appendField((Blockly.Msg["BLBL_MOTOR"]||"Motor"));
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_DIRECTION"]||"Direction")).appendField(new Blockly.FieldDropdown([["forward", "f"], ["reverse", "r"]]), "direction");
    this.appendValueInput("angle").setCheck("Number").appendField((Blockly.Msg["BLBL_ANGLE"]||"Angle"));
    this.appendValueInput("speed").setCheck("Number").appendField((Blockly.Msg["BLBL_SPEED"]||"Speed"));
    this.appendValueInput("holdPosition").setCheck("Boolean").appendField((Blockly.Msg["BLBL_HOLD_POSITION"]||"Hold Position"));
    this.appendValueInput("stepsPerRev").setCheck("Number").appendField((Blockly.Msg["BLBL_STEPS_PER_REV"]||"Steps Per Rev"));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(30);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_KITRONIK_PICO_ROBOTICS_STEP_ANGLE"]||"Step a stepper motor by an angle in degrees."));
    this.setHelpUrl("https://kitronik.co.uk");
  }
};
