Blockly.Python["sand_table_robot__create"] = function(block) {
  Blockly.Python.definitions_["import_sand_table_robot"] = "import sand_table_robot";
  Blockly.Python.definitions_["registry_sand_table_robot_instances"] = "sand_table_robot_instances = {}";
  var id = Blockly.Python.valueToCode(block, "id", Blockly.Python.ORDER_ATOMIC);
  var motor1_pins = Blockly.Python.valueToCode(block, "motor1_pins", Blockly.Python.ORDER_ATOMIC);
  var motor2_pins = Blockly.Python.valueToCode(block, "motor2_pins", Blockly.Python.ORDER_ATOMIC);
  var sensor_shoulder_pin = Blockly.Python.valueToCode(block, "sensor_shoulder_pin", Blockly.Python.ORDER_ATOMIC);
  var sensor_elbow_pin = Blockly.Python.valueToCode(block, "sensor_elbow_pin", Blockly.Python.ORDER_ATOMIC);
  var L1 = Blockly.Python.valueToCode(block, "L1", Blockly.Python.ORDER_ATOMIC);
  var L2 = Blockly.Python.valueToCode(block, "L2", Blockly.Python.ORDER_ATOMIC);
  var steps_per_rev = Blockly.Python.valueToCode(block, "steps_per_rev", Blockly.Python.ORDER_ATOMIC);
  var backlash_deg_m1 = Blockly.Python.valueToCode(block, "backlash_deg_m1", Blockly.Python.ORDER_ATOMIC);
  var backlash_deg_m2 = Blockly.Python.valueToCode(block, "backlash_deg_m2", Blockly.Python.ORDER_ATOMIC);
  var homing_dir_shoulder = Blockly.Python.valueToCode(block, "homing_dir_shoulder", Blockly.Python.ORDER_ATOMIC);
  var homing_dir_elbow = Blockly.Python.valueToCode(block, "homing_dir_elbow", Blockly.Python.ORDER_ATOMIC);
  var homing_clear_steps = Blockly.Python.valueToCode(block, "homing_clear_steps", Blockly.Python.ORDER_ATOMIC);
  var default_speed_ms = Blockly.Python.valueToCode(block, "default_speed_ms", Blockly.Python.ORDER_ATOMIC);
  var code = "sand_table_robot_instances[" + id + "] = sand_table_robot.SandTableRobot(" + id + ", " + motor1_pins + ", " + motor2_pins + ", " + sensor_shoulder_pin + ", " + sensor_elbow_pin + ", " + L1 + ", " + L2 + ", " + steps_per_rev + ", " + backlash_deg_m1 + ", " + backlash_deg_m2 + ", " + homing_dir_shoulder + ", " + homing_dir_elbow + ", " + homing_clear_steps + ", " + default_speed_ms + ")" + "\n";
  return code;
};

Blockly.Python["sand_table_robot__off"] = function(block) {
  Blockly.Python.definitions_["import_sand_table_robot"] = "import sand_table_robot";
  Blockly.Python.definitions_["registry_sand_table_robot_instances"] = "sand_table_robot_instances = {}";
  var id = Blockly.Python.valueToCode(block, "id", Blockly.Python.ORDER_ATOMIC);
  var code = "sand_table_robot_instances[" + id + "].off()" + "\n";
  return code;
};

Blockly.Python["sand_table_robot__home"] = function(block) {
  Blockly.Python.definitions_["import_sand_table_robot"] = "import sand_table_robot";
  Blockly.Python.definitions_["registry_sand_table_robot_instances"] = "sand_table_robot_instances = {}";
  var id = Blockly.Python.valueToCode(block, "id", Blockly.Python.ORDER_ATOMIC);
  var code = "sand_table_robot_instances[" + id + "].home()" + "\n";
  return code;
};

Blockly.Python["sand_table_robot__move_line"] = function(block) {
  Blockly.Python.definitions_["import_sand_table_robot"] = "import sand_table_robot";
  Blockly.Python.definitions_["registry_sand_table_robot_instances"] = "sand_table_robot_instances = {}";
  var id = Blockly.Python.valueToCode(block, "id", Blockly.Python.ORDER_ATOMIC);
  var target_x = Blockly.Python.valueToCode(block, "target_x", Blockly.Python.ORDER_ATOMIC);
  var target_y = Blockly.Python.valueToCode(block, "target_y", Blockly.Python.ORDER_ATOMIC);
  var segments = Blockly.Python.valueToCode(block, "segments", Blockly.Python.ORDER_ATOMIC);
  var speed = Blockly.Python.valueToCode(block, "speed", Blockly.Python.ORDER_ATOMIC);
  var code = "sand_table_robot_instances[" + id + "].move_line(" + target_x + ", " + target_y + ", " + segments + ", " + speed + ")" + "\n";
  return code;
};

Blockly.Python["sand_table_robot__move_arc"] = function(block) {
  Blockly.Python.definitions_["import_sand_table_robot"] = "import sand_table_robot";
  Blockly.Python.definitions_["registry_sand_table_robot_instances"] = "sand_table_robot_instances = {}";
  var id = Blockly.Python.valueToCode(block, "id", Blockly.Python.ORDER_ATOMIC);
  var center_x = Blockly.Python.valueToCode(block, "center_x", Blockly.Python.ORDER_ATOMIC);
  var center_y = Blockly.Python.valueToCode(block, "center_y", Blockly.Python.ORDER_ATOMIC);
  var radius = Blockly.Python.valueToCode(block, "radius", Blockly.Python.ORDER_ATOMIC);
  var start_angle = Blockly.Python.valueToCode(block, "start_angle", Blockly.Python.ORDER_ATOMIC);
  var end_angle = Blockly.Python.valueToCode(block, "end_angle", Blockly.Python.ORDER_ATOMIC);
  var segments = Blockly.Python.valueToCode(block, "segments", Blockly.Python.ORDER_ATOMIC);
  var speed = Blockly.Python.valueToCode(block, "speed", Blockly.Python.ORDER_ATOMIC);
  var code = "sand_table_robot_instances[" + id + "].move_arc(" + center_x + ", " + center_y + ", " + radius + ", " + start_angle + ", " + end_angle + ", " + segments + ", " + speed + ")" + "\n";
  return code;
};

Blockly.Python["sand_table_robot__draw_spiral"] = function(block) {
  Blockly.Python.definitions_["import_sand_table_robot"] = "import sand_table_robot";
  Blockly.Python.definitions_["registry_sand_table_robot_instances"] = "sand_table_robot_instances = {}";
  var id = Blockly.Python.valueToCode(block, "id", Blockly.Python.ORDER_ATOMIC);
  var max_radius = Blockly.Python.valueToCode(block, "max_radius", Blockly.Python.ORDER_ATOMIC);
  var vindinger = Blockly.Python.valueToCode(block, "vindinger", Blockly.Python.ORDER_ATOMIC);
  var segments_pr_omgang = Blockly.Python.valueToCode(block, "segments_pr_omgang", Blockly.Python.ORDER_ATOMIC);
  var speed = Blockly.Python.valueToCode(block, "speed", Blockly.Python.ORDER_ATOMIC);
  var code = "sand_table_robot_instances[" + id + "].draw_spiral(" + max_radius + ", " + vindinger + ", " + segments_pr_omgang + ", " + speed + ")" + "\n";
  return code;
};

Blockly.Python["sand_table_robot__draw_flower"] = function(block) {
  Blockly.Python.definitions_["import_sand_table_robot"] = "import sand_table_robot";
  Blockly.Python.definitions_["registry_sand_table_robot_instances"] = "sand_table_robot_instances = {}";
  var id = Blockly.Python.valueToCode(block, "id", Blockly.Python.ORDER_ATOMIC);
  var max_radius = Blockly.Python.valueToCode(block, "max_radius", Blockly.Python.ORDER_ATOMIC);
  var petals = Blockly.Python.valueToCode(block, "petals", Blockly.Python.ORDER_ATOMIC);
  var speed = Blockly.Python.valueToCode(block, "speed", Blockly.Python.ORDER_ATOMIC);
  var code = "sand_table_robot_instances[" + id + "].draw_flower(" + max_radius + ", " + petals + ", " + speed + ")" + "\n";
  return code;
};

Blockly.Python["sand_table_robot__run_gcode_text"] = function(block) {
  Blockly.Python.definitions_["import_sand_table_robot"] = "import sand_table_robot";
  Blockly.Python.definitions_["registry_sand_table_robot_instances"] = "sand_table_robot_instances = {}";
  var id = Blockly.Python.valueToCode(block, "id", Blockly.Python.ORDER_ATOMIC);
  var gcode_text = Blockly.Python.valueToCode(block, "gcode_text", Blockly.Python.ORDER_ATOMIC);
  var segments = Blockly.Python.valueToCode(block, "segments", Blockly.Python.ORDER_ATOMIC);
  var draw_speed_ms = Blockly.Python.valueToCode(block, "draw_speed_ms", Blockly.Python.ORDER_ATOMIC);
  var travel_speed_ms = Blockly.Python.valueToCode(block, "travel_speed_ms", Blockly.Python.ORDER_ATOMIC);
  var reset_modal = Blockly.Python.valueToCode(block, "reset_modal", Blockly.Python.ORDER_ATOMIC);
  var code = "sand_table_robot_instances[" + id + "].run_gcode_text(" + gcode_text + ", " + segments + ", " + draw_speed_ms + ", " + travel_speed_ms + ", " + reset_modal + ")" + "\n";
  return code;
};

Blockly.Python["sand_table_robot__run_gcode_file"] = function(block) {
  Blockly.Python.definitions_["import_sand_table_robot"] = "import sand_table_robot";
  Blockly.Python.definitions_["registry_sand_table_robot_instances"] = "sand_table_robot_instances = {}";
  var id = Blockly.Python.valueToCode(block, "id", Blockly.Python.ORDER_ATOMIC);
  var path = Blockly.Python.valueToCode(block, "path", Blockly.Python.ORDER_ATOMIC);
  var segments = Blockly.Python.valueToCode(block, "segments", Blockly.Python.ORDER_ATOMIC);
  var draw_speed_ms = Blockly.Python.valueToCode(block, "draw_speed_ms", Blockly.Python.ORDER_ATOMIC);
  var travel_speed_ms = Blockly.Python.valueToCode(block, "travel_speed_ms", Blockly.Python.ORDER_ATOMIC);
  var reset_modal = Blockly.Python.valueToCode(block, "reset_modal", Blockly.Python.ORDER_ATOMIC);
  var code = "sand_table_robot_instances[" + id + "].run_gcode_file(" + path + ", " + segments + ", " + draw_speed_ms + ", " + travel_speed_ms + ", " + reset_modal + ")" + "\n";
  return code;
};
