Blockly.Blocks["sand_table_robot__create"] = {
  init: function() {
    this.appendDummyInput().appendField("Create Sand Table Robot");
    this.appendValueInput("motor1_pins").appendField("Motor 1 Pins");
    this.appendValueInput("motor2_pins").appendField("Motor 2 Pins");
    this.appendValueInput("sensor_shoulder_pin").setCheck("Number").appendField("Sensor Shoulder Pin");
    this.appendValueInput("sensor_elbow_pin").setCheck("Number").appendField("Sensor Elbow Pin");
    this.appendValueInput("L1").setCheck("Number").appendField("L1");
    this.appendValueInput("L2").setCheck("Number").appendField("L2");
    this.appendValueInput("steps_per_rev").setCheck("Number").appendField("Steps Per Rev");
    this.appendValueInput("backlash_deg_m1").setCheck("Number").appendField("Backlash Deg M 1");
    this.appendValueInput("backlash_deg_m2").setCheck("Number").appendField("Backlash Deg M 2");
    this.appendValueInput("homing_dir_shoulder").setCheck("Number").appendField("Homing Dir Shoulder");
    this.appendValueInput("homing_dir_elbow").setCheck("Number").appendField("Homing Dir Elbow");
    this.appendValueInput("homing_clear_steps").setCheck("Number").appendField("Homing Clear Steps");
    this.appendValueInput("default_speed_ms").setCheck("Number").appendField("Default Speed Ms");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(20);
    this.setInputsInline(false);
    this.setTooltip("Create a sand table robot instance.");
    this.setHelpUrl("");
  }
};

Blockly.Blocks["sand_table_robot__off"] = {
  init: function() {
    this.appendDummyInput().appendField("Off");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(20);
    this.setInputsInline(false);
    this.setTooltip("Turn off both motors");
    this.setHelpUrl("");
  }
};

Blockly.Blocks["sand_table_robot__home"] = {
  init: function() {
    this.appendDummyInput().appendField("Home");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(20);
    this.setInputsInline(false);
    this.setTooltip("Move the robot to its home position.");
    this.setHelpUrl("");
  }
};

Blockly.Blocks["sand_table_robot__move_line"] = {
  init: function() {
    this.appendDummyInput().appendField("Move Line");
    this.appendValueInput("target_x").setCheck("Number").appendField("Target X");
    this.appendValueInput("target_y").setCheck("Number").appendField("Target Y");
    this.appendValueInput("segments").setCheck("Number").appendField("Segments");
    this.appendValueInput("speed").setCheck("Number").appendField("Speed");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(20);
    this.setInputsInline(false);
    this.setTooltip("Move the robot in a straight line to the target point.");
    this.setHelpUrl("");
  }
};

Blockly.Blocks["sand_table_robot__move_arc"] = {
  init: function() {
    this.appendDummyInput().appendField("Move Arc");
    this.appendValueInput("center_x").setCheck("Number").appendField("Center X");
    this.appendValueInput("center_y").setCheck("Number").appendField("Center Y");
    this.appendValueInput("radius").setCheck("Number").appendField("Radius");
    this.appendValueInput("start_angle").setCheck("Number").appendField("Start Angle");
    this.appendValueInput("end_angle").setCheck("Number").appendField("End Angle");
    this.appendValueInput("segments").setCheck("Number").appendField("Segments");
    this.appendValueInput("speed").setCheck("Number").appendField("Speed");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(20);
    this.setInputsInline(false);
    this.setTooltip("Draw an arc on the sand table.");
    this.setHelpUrl("");
  }
};

Blockly.Blocks["sand_table_robot__draw_spiral"] = {
  init: function() {
    this.appendDummyInput().appendField("Draw Spiral");
    this.appendValueInput("max_radius").setCheck("Number").appendField("Max Radius");
    this.appendValueInput("vindinger").setCheck("Number").appendField("Vindinger");
    this.appendValueInput("segments_pr_omgang").setCheck("Number").appendField("Segments Pr Omgang");
    this.appendValueInput("speed").setCheck("Number").appendField("Speed");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(20);
    this.setInputsInline(false);
    this.setTooltip("Draw a spiral pattern.");
    this.setHelpUrl("");
  }
};

Blockly.Blocks["sand_table_robot__draw_flower"] = {
  init: function() {
    this.appendDummyInput().appendField("Draw Flower");
    this.appendValueInput("max_radius").setCheck("Number").appendField("Max Radius");
    this.appendValueInput("petals").setCheck("Number").appendField("Petals");
    this.appendValueInput("speed").setCheck("Number").appendField("Speed");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(20);
    this.setInputsInline(false);
    this.setTooltip("Draw a flower pattern.");
    this.setHelpUrl("");
  }
};

Blockly.Blocks["sand_table_robot__run_gcode_text"] = {
  init: function() {
    this.appendDummyInput().appendField("Run Gcode Text");
    this.appendValueInput("gcode_text").appendField("Gcode Text");
    this.appendValueInput("segments").setCheck("Number").appendField("Segments");
    this.appendValueInput("draw_speed_ms").setCheck("Number").appendField("Draw Speed Ms");
    this.appendValueInput("travel_speed_ms").setCheck("Number").appendField("Travel Speed Ms");
    this.appendValueInput("reset_modal").setCheck("Boolean").appendField("Reset Modal");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(20);
    this.setInputsInline(false);
    this.setTooltip("Run G-code from a text string.");
    this.setHelpUrl("");
  }
};

Blockly.Blocks["sand_table_robot__run_gcode_file"] = {
  init: function() {
    this.appendDummyInput().appendField("Run Gcode File");
    this.appendValueInput("path").appendField("Path");
    this.appendValueInput("segments").setCheck("Number").appendField("Segments");
    this.appendValueInput("draw_speed_ms").setCheck("Number").appendField("Draw Speed Ms");
    this.appendValueInput("travel_speed_ms").setCheck("Number").appendField("Travel Speed Ms");
    this.appendValueInput("reset_modal").setCheck("Boolean").appendField("Reset Modal");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(20);
    this.setInputsInline(false);
    this.setTooltip("Run G-code from a file path.");
    this.setHelpUrl("");
  }
};
