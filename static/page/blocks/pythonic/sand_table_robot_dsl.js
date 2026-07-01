Blockly.Python["sand_table_robot__create"] = function(block) {
  Blockly.Python.definitions_["import_sand_table_robot"] = "import sand_table_robot";
  var motor_shoulder_pins = Blockly.Python.valueToCode(block, "motor_shoulder_pins", Blockly.Python.ORDER_ATOMIC);
  var motor_elbow_pins = Blockly.Python.valueToCode(block, "motor_elbow_pins", Blockly.Python.ORDER_ATOMIC);
  var sensor_shoulder_pin = Blockly.Python.valueToCode(block, "sensor_shoulder_pin", Blockly.Python.ORDER_ATOMIC);
  var sensor_elbow_pin = Blockly.Python.valueToCode(block, "sensor_elbow_pin", Blockly.Python.ORDER_ATOMIC);
  var code = "sand_table_robot = sand_table_robot.SandTableRobot(" + motor_shoulder_pins + ", " + motor_elbow_pins + ", " + sensor_shoulder_pin + ", " + sensor_elbow_pin + ")" + "\n";
  return code;
};

Blockly.Python["sand_table_robot__home"] = function(block) {
  Blockly.Python.definitions_["import_sand_table_robot"] = "import sand_table_robot";
  var code = "sand_table_robot.home()" + "\n";
  return code;
};

Blockly.Python["sand_table_robot__off"] = function(block) {
  Blockly.Python.definitions_["import_sand_table_robot"] = "import sand_table_robot";
  var code = "sand_table_robot.off()" + "\n";
  return code;
};

Blockly.Python["sand_table_robot__step_motor"] = function(block) {
  Blockly.Python.definitions_["import_sand_table_robot"] = "import sand_table_robot";
  var motor = String(Number(block.getFieldValue("motor")));
  var direction = JSON.stringify(block.getFieldValue("direction"));
  var steps = Blockly.Python.valueToCode(block, "steps", Blockly.Python.ORDER_ATOMIC);
  var speed = Blockly.Python.valueToCode(block, "speed", Blockly.Python.ORDER_ATOMIC);
  var code = "sand_table_robot.step_motor(" + motor + ", " + direction + ", " + steps + ", " + speed + ")" + "\n";
  return code;
};

Blockly.Python["sand_table_robot__move_line"] = function(block) {
  Blockly.Python.definitions_["import_sand_table_robot"] = "import sand_table_robot";
  var target_x = Blockly.Python.valueToCode(block, "target_x", Blockly.Python.ORDER_ATOMIC);
  var target_y = Blockly.Python.valueToCode(block, "target_y", Blockly.Python.ORDER_ATOMIC);
  var segments = Blockly.Python.valueToCode(block, "segments", Blockly.Python.ORDER_ATOMIC);
  var speed = Blockly.Python.valueToCode(block, "speed", Blockly.Python.ORDER_ATOMIC);
  var code = "sand_table_robot.move_line(" + target_x + ", " + target_y + ", " + segments + ", " + speed + ")" + "\n";
  return code;
};

Blockly.Python["sand_table_robot__move_arc"] = function(block) {
  Blockly.Python.definitions_["import_sand_table_robot"] = "import sand_table_robot";
  var center_x = Blockly.Python.valueToCode(block, "center_x", Blockly.Python.ORDER_ATOMIC);
  var center_y = Blockly.Python.valueToCode(block, "center_y", Blockly.Python.ORDER_ATOMIC);
  var radius = Blockly.Python.valueToCode(block, "radius", Blockly.Python.ORDER_ATOMIC);
  var start_angle = Blockly.Python.valueToCode(block, "start_angle", Blockly.Python.ORDER_ATOMIC);
  var end_angle = Blockly.Python.valueToCode(block, "end_angle", Blockly.Python.ORDER_ATOMIC);
  var segments = Blockly.Python.valueToCode(block, "segments", Blockly.Python.ORDER_ATOMIC);
  var speed = Blockly.Python.valueToCode(block, "speed", Blockly.Python.ORDER_ATOMIC);
  var code = "sand_table_robot.move_arc(" + center_x + ", " + center_y + ", " + radius + ", " + start_angle + ", " + end_angle + ", " + segments + ", " + speed + ")" + "\n";
  return code;
};

Blockly.Python["sand_table_robot__draw_spiral"] = function(block) {
  Blockly.Python.definitions_["import_sand_table_robot"] = "import sand_table_robot";
  var max_radius = Blockly.Python.valueToCode(block, "max_radius", Blockly.Python.ORDER_ATOMIC);
  var vindinger = Blockly.Python.valueToCode(block, "vindinger", Blockly.Python.ORDER_ATOMIC);
  var segments_pr_omgang = Blockly.Python.valueToCode(block, "segments_pr_omgang", Blockly.Python.ORDER_ATOMIC);
  var speed = Blockly.Python.valueToCode(block, "speed", Blockly.Python.ORDER_ATOMIC);
  var code = "sand_table_robot.draw_spiral(" + max_radius + ", " + vindinger + ", " + segments_pr_omgang + ", " + speed + ")" + "\n";
  return code;
};

Blockly.Python["sand_table_robot__draw_flower"] = function(block) {
  Blockly.Python.definitions_["import_sand_table_robot"] = "import sand_table_robot";
  var max_radius = Blockly.Python.valueToCode(block, "max_radius", Blockly.Python.ORDER_ATOMIC);
  var petals = Blockly.Python.valueToCode(block, "petals", Blockly.Python.ORDER_ATOMIC);
  var speed = Blockly.Python.valueToCode(block, "speed", Blockly.Python.ORDER_ATOMIC);
  var code = "sand_table_robot.draw_flower(" + max_radius + ", " + petals + ", " + speed + ")" + "\n";
  return code;
};

Blockly.Python["sand_table_robot__run_gcode_text"] = function(block) {
  Blockly.Python.definitions_["import_sand_table_robot"] = "import sand_table_robot";
  var gcode_text = Blockly.Python.valueToCode(block, "gcode_text", Blockly.Python.ORDER_ATOMIC);
  var segments = Blockly.Python.valueToCode(block, "segments", Blockly.Python.ORDER_ATOMIC);
  var draw_speed_ms = Blockly.Python.valueToCode(block, "draw_speed_ms", Blockly.Python.ORDER_ATOMIC);
  var travel_speed_ms = Blockly.Python.valueToCode(block, "travel_speed_ms", Blockly.Python.ORDER_ATOMIC);
  var reset_modal = Blockly.Python.valueToCode(block, "reset_modal", Blockly.Python.ORDER_ATOMIC);
  var code = "sand_table_robot.run_gcode_text(" + gcode_text + ", " + segments + ", " + draw_speed_ms + ", " + travel_speed_ms + ", " + reset_modal + ")" + "\n";
  return code;
};

Blockly.Python["sand_table_robot__run_gcode_file"] = function(block) {
  Blockly.Python.definitions_["import_sand_table_robot"] = "import sand_table_robot";
  var path = Blockly.Python.valueToCode(block, "path", Blockly.Python.ORDER_ATOMIC);
  var segments = Blockly.Python.valueToCode(block, "segments", Blockly.Python.ORDER_ATOMIC);
  var draw_speed_ms = Blockly.Python.valueToCode(block, "draw_speed_ms", Blockly.Python.ORDER_ATOMIC);
  var travel_speed_ms = Blockly.Python.valueToCode(block, "travel_speed_ms", Blockly.Python.ORDER_ATOMIC);
  var reset_modal = Blockly.Python.valueToCode(block, "reset_modal", Blockly.Python.ORDER_ATOMIC);
  var code = "sand_table_robot.run_gcode_file(" + path + ", " + segments + ", " + draw_speed_ms + ", " + travel_speed_ms + ", " + reset_modal + ")" + "\n";
  return code;
};
