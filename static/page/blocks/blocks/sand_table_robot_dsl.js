Blockly.Blocks["sand_table_robot__create"] = {
  init: function() {
    this.appendValueInput("motor1_pins").appendField("create sand robot shoulder motor pins");
    this.appendValueInput("motor2_pins").appendField("elbow motor pins");
    this.appendValueInput("sensor_shoulder_pin").setCheck("Number").appendField("shoulder sensor");
    this.appendValueInput("sensor_elbow_pin").setCheck("Number").appendField("elbow sensor");
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
    this.setInputsInline(true);
    this.setTooltip("Turn off both stepper motors.");
    this.setHelpUrl("");
  }
};

Blockly.Blocks["sand_table_robot__home"] = {
  init: function() {
    this.appendDummyInput().appendField("Home");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(20);
    this.setInputsInline(true);
    this.setTooltip("Move the robot to its home position using limit sensors.");
    this.setHelpUrl("");
  }
};

Blockly.Blocks["sand_table_robot__move_line"] = {
  init: function() {
    this.appendValueInput("target_x").setCheck("Number").appendField("move line to x");
    this.appendValueInput("target_y").setCheck("Number").appendField("y");
    this.appendValueInput("segments").setCheck("Number").appendField("segments");
    this.appendValueInput("speed").setCheck("Number").appendField("speed");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(20);
    this.setInputsInline(true);
    this.setTooltip("Move the robot in a straight line to the target point.");
    this.setHelpUrl("");
  }
};

Blockly.Blocks["sand_table_robot__move_arc"] = {
  init: function() {
    this.appendValueInput("center_x").setCheck("Number").appendField("move arc center x");
    this.appendValueInput("center_y").setCheck("Number").appendField("center y");
    this.appendValueInput("radius").setCheck("Number").appendField("radius");
    this.appendValueInput("start_angle").setCheck("Number").appendField("start angle");
    this.appendValueInput("end_angle").setCheck("Number").appendField("end angle");
    this.appendValueInput("segments").setCheck("Number").appendField("segments");
    this.appendValueInput("speed").setCheck("Number").appendField("speed");
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
    this.appendValueInput("max_radius").setCheck("Number").appendField("draw spiral max radius");
    this.appendValueInput("vindinger").setCheck("Number").appendField("turns");
    this.appendValueInput("segments_pr_omgang").setCheck("Number").appendField("segments per turn");
    this.appendValueInput("speed").setCheck("Number").appendField("speed");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(20);
    this.setInputsInline(true);
    this.setTooltip("Draw a spiral pattern.");
    this.setHelpUrl("");
  }
};

Blockly.Blocks["sand_table_robot__draw_flower"] = {
  init: function() {
    this.appendValueInput("max_radius").setCheck("Number").appendField("draw flower radius");
    this.appendValueInput("petals").setCheck("Number").appendField("petals");
    this.appendValueInput("speed").setCheck("Number").appendField("speed");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(20);
    this.setInputsInline(true);
    this.setTooltip("Draw a flower pattern.");
    this.setHelpUrl("");
  }
};

Blockly.Blocks["sand_table_robot__run_gcode_text"] = {
  init: function() {
    this.appendValueInput("gcode_text").setCheck("String").appendField("run gcode text");
    this.appendValueInput("segments").setCheck("Number").appendField("segments");
    this.appendValueInput("draw_speed_ms").setCheck("Number").appendField("draw speed");
    this.appendValueInput("travel_speed_ms").setCheck("Number").appendField("travel speed");
    this.appendValueInput("reset_modal").setCheck("Boolean").appendField("reset modal");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(20);
    this.setInputsInline(true);
    this.setTooltip("Run G-code from a text string.");
    this.setHelpUrl("");
  }
};

Blockly.Blocks["sand_table_robot__run_gcode_file"] = {
  init: function() {
    this.appendValueInput("path").setCheck("String").appendField("run gcode file");
    this.appendValueInput("segments").setCheck("Number").appendField("segments");
    this.appendValueInput("draw_speed_ms").setCheck("Number").appendField("draw speed");
    this.appendValueInput("travel_speed_ms").setCheck("Number").appendField("travel speed");
    this.appendValueInput("reset_modal").setCheck("Boolean").appendField("reset modal");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(20);
    this.setInputsInline(true);
    this.setTooltip("Run G-code from a file path on the device.");
    this.setHelpUrl("");
  }
};
