Blockly.Blocks["sand_table_robot__create"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_CREATE_SAND_TABLE_ROBOT"]||"Create Sand Table Robot"));
    this.appendValueInput("motor1_pins").appendField((Blockly.Msg["BLBL_MOTOR_1_PINS"]||"Motor 1 Pins"));
    this.appendValueInput("motor2_pins").appendField((Blockly.Msg["BLBL_MOTOR_2_PINS"]||"Motor 2 Pins"));
    this.appendValueInput("sensor_shoulder_pin").setCheck("Number").appendField((Blockly.Msg["BLBL_SENSOR_SHOULDER_PIN"]||"Sensor Shoulder Pin"));
    this.appendValueInput("sensor_elbow_pin").setCheck("Number").appendField((Blockly.Msg["BLBL_SENSOR_ELBOW_PIN"]||"Sensor Elbow Pin"));
    this.appendValueInput("L1").setCheck("Number").appendField((Blockly.Msg["BLBL_L1"]||"L1"));
    this.appendValueInput("L2").setCheck("Number").appendField((Blockly.Msg["BLBL_L2"]||"L2"));
    this.appendValueInput("steps_per_rev").setCheck("Number").appendField((Blockly.Msg["BLBL_STEPS_PER_REV"]||"Steps Per Rev"));
    this.appendValueInput("backlash_deg_m1").setCheck("Number").appendField((Blockly.Msg["BLBL_BACKLASH_DEG_M_1"]||"Backlash Deg M 1"));
    this.appendValueInput("backlash_deg_m2").setCheck("Number").appendField((Blockly.Msg["BLBL_BACKLASH_DEG_M_2"]||"Backlash Deg M 2"));
    this.appendValueInput("homing_dir_shoulder").setCheck("Number").appendField((Blockly.Msg["BLBL_HOMING_DIR_SHOULDER"]||"Homing Dir Shoulder"));
    this.appendValueInput("homing_dir_elbow").setCheck("Number").appendField((Blockly.Msg["BLBL_HOMING_DIR_ELBOW"]||"Homing Dir Elbow"));
    this.appendValueInput("homing_clear_steps").setCheck("Number").appendField((Blockly.Msg["BLBL_HOMING_CLEAR_STEPS"]||"Homing Clear Steps"));
    this.appendValueInput("default_speed_ms").setCheck("Number").appendField((Blockly.Msg["BLBL_DEFAULT_SPEED_MS"]||"Default Speed Ms"));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(30);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_SAND_TABLE_ROBOT_CREATE"]||"Create the sand-table SCARA robot (motor pins, sensors, arm geometry)."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["sand_table_robot__home"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_HOME"]||"Home"));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(30);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_SAND_TABLE_ROBOT_HOME"]||"Home the robot to its reference position."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["sand_table_robot__off"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_OFF"]||"Off"));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(30);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_SAND_TABLE_ROBOT_OFF"]||"Power off both stepper motors."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["sand_table_robot__move_line"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_MOVE_LINE"]||"Move Line"));
    this.appendValueInput("target_x").setCheck("Number").appendField((Blockly.Msg["BLBL_TARGET_X"]||"Target X"));
    this.appendValueInput("target_y").setCheck("Number").appendField((Blockly.Msg["BLBL_TARGET_Y"]||"Target Y"));
    this.appendValueInput("segments").setCheck("Number").appendField((Blockly.Msg["BLBL_SEGMENTS"]||"Segments"));
    this.appendValueInput("speed").setCheck("Number").appendField((Blockly.Msg["BLBL_SPEED"]||"Speed"));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(30);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_SAND_TABLE_ROBOT_MOVE_LINE"]||"Move in a straight line to (x, y)."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["sand_table_robot__move_arc"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_MOVE_ARC"]||"Move Arc"));
    this.appendValueInput("center_x").setCheck("Number").appendField((Blockly.Msg["BLBL_CENTER_X"]||"Center X"));
    this.appendValueInput("center_y").setCheck("Number").appendField((Blockly.Msg["BLBL_CENTER_Y"]||"Center Y"));
    this.appendValueInput("radius").setCheck("Number").appendField((Blockly.Msg["BLBL_RADIUS"]||"Radius"));
    this.appendValueInput("start_angle").setCheck("Number").appendField((Blockly.Msg["BLBL_START_ANGLE"]||"Start Angle"));
    this.appendValueInput("end_angle").setCheck("Number").appendField((Blockly.Msg["BLBL_END_ANGLE"]||"End Angle"));
    this.appendValueInput("segments").setCheck("Number").appendField((Blockly.Msg["BLBL_SEGMENTS"]||"Segments"));
    this.appendValueInput("speed").setCheck("Number").appendField((Blockly.Msg["BLBL_SPEED"]||"Speed"));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(30);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_SAND_TABLE_ROBOT_MOVE_ARC"]||"Draw an arc around a centre point."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["sand_table_robot__draw_spiral"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_DRAW_SPIRAL"]||"Draw Spiral"));
    this.appendValueInput("max_radius").setCheck("Number").appendField((Blockly.Msg["BLBL_MAX_RADIUS"]||"Max Radius"));
    this.appendValueInput("vindinger").setCheck("Number").appendField((Blockly.Msg["BLBL_VINDINGER"]||"Vindinger"));
    this.appendValueInput("segments_pr_omgang").setCheck("Number").appendField((Blockly.Msg["BLBL_SEGMENTS_PR_OMGANG"]||"Segments Pr Omgang"));
    this.appendValueInput("speed").setCheck("Number").appendField((Blockly.Msg["BLBL_SPEED"]||"Speed"));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(30);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_SAND_TABLE_ROBOT_DRAW_SPIRAL"]||"Draw a spiral."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["sand_table_robot__draw_flower"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_DRAW_FLOWER"]||"Draw Flower"));
    this.appendValueInput("max_radius").setCheck("Number").appendField((Blockly.Msg["BLBL_MAX_RADIUS"]||"Max Radius"));
    this.appendValueInput("petals").setCheck("Number").appendField((Blockly.Msg["BLBL_PETALS"]||"Petals"));
    this.appendValueInput("speed").setCheck("Number").appendField((Blockly.Msg["BLBL_SPEED"]||"Speed"));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(30);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_SAND_TABLE_ROBOT_DRAW_FLOWER"]||"Draw a flower pattern."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["sand_table_robot__run_gcode_text"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_RUN_GCODE_TEXT"]||"Run Gcode Text"));
    this.appendValueInput("gcode_text").setCheck("String").appendField((Blockly.Msg["BLBL_GCODE_TEXT"]||"Gcode Text"));
    this.appendValueInput("segments").setCheck("Number").appendField((Blockly.Msg["BLBL_SEGMENTS"]||"Segments"));
    this.appendValueInput("draw_speed_ms").setCheck("Number").appendField((Blockly.Msg["BLBL_DRAW_SPEED_MS"]||"Draw Speed Ms"));
    this.appendValueInput("travel_speed_ms").setCheck("Number").appendField((Blockly.Msg["BLBL_TRAVEL_SPEED_MS"]||"Travel Speed Ms"));
    this.appendValueInput("reset_modal").setCheck("Boolean").appendField((Blockly.Msg["BLBL_RESET_MODAL"]||"Reset Modal"));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(30);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_SAND_TABLE_ROBOT_RUN_GCODE_TEXT"]||"Run G-code from a text string."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["sand_table_robot__run_gcode_file"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_RUN_GCODE_FILE"]||"Run Gcode File"));
    this.appendValueInput("path").setCheck("String").appendField((Blockly.Msg["BLBL_PATH"]||"Path"));
    this.appendValueInput("segments").setCheck("Number").appendField((Blockly.Msg["BLBL_SEGMENTS"]||"Segments"));
    this.appendValueInput("draw_speed_ms").setCheck("Number").appendField((Blockly.Msg["BLBL_DRAW_SPEED_MS"]||"Draw Speed Ms"));
    this.appendValueInput("travel_speed_ms").setCheck("Number").appendField((Blockly.Msg["BLBL_TRAVEL_SPEED_MS"]||"Travel Speed Ms"));
    this.appendValueInput("reset_modal").setCheck("Boolean").appendField((Blockly.Msg["BLBL_RESET_MODAL"]||"Reset Modal"));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(30);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_SAND_TABLE_ROBOT_RUN_GCODE_FILE"]||"Run G-code from a file on the device."));
    this.setHelpUrl("https://github.com/bipes");
  }
};
