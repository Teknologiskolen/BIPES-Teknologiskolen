Blockly.Python["kitronik_pico_robotics__create"] = function(block) {
  Blockly.Python.definitions_["import_PicoRobotics"] = "import PicoRobotics";
  var I2CAddress = Blockly.Python.valueToCode(block, "I2CAddress", Blockly.Python.ORDER_ATOMIC);
  var sda = Blockly.Python.valueToCode(block, "sda", Blockly.Python.ORDER_ATOMIC);
  var scl = Blockly.Python.valueToCode(block, "scl", Blockly.Python.ORDER_ATOMIC);
  var code = "board = PicoRobotics.KitronikPicoRobotics(" + I2CAddress + ", " + sda + ", " + scl + ")" + "\n";
  return code;
};

Blockly.Python["kitronik_pico_robotics__adjust_servos"] = function(block) {
  Blockly.Python.definitions_["import_PicoRobotics"] = "import PicoRobotics";
  var change = Blockly.Python.valueToCode(block, "change", Blockly.Python.ORDER_ATOMIC);
  var code = "board.adjustServos(" + change + ")" + "\n";
  return code;
};

Blockly.Python["kitronik_pico_robotics__motor_on"] = function(block) {
  Blockly.Python.definitions_["import_PicoRobotics"] = "import PicoRobotics";
  var motor = Blockly.Python.valueToCode(block, "motor", Blockly.Python.ORDER_ATOMIC);
  var direction = JSON.stringify(block.getFieldValue("direction"));
  var speed = Blockly.Python.valueToCode(block, "speed", Blockly.Python.ORDER_ATOMIC);
  var code = "board.motorOn(" + motor + ", " + direction + ", " + speed + ")" + "\n";
  return code;
};

Blockly.Python["kitronik_pico_robotics__motor_off"] = function(block) {
  Blockly.Python.definitions_["import_PicoRobotics"] = "import PicoRobotics";
  var motor = Blockly.Python.valueToCode(block, "motor", Blockly.Python.ORDER_ATOMIC);
  var code = "board.motorOff(" + motor + ")" + "\n";
  return code;
};

Blockly.Python["kitronik_pico_robotics__servo_write"] = function(block) {
  Blockly.Python.definitions_["import_PicoRobotics"] = "import PicoRobotics";
  var servo = Blockly.Python.valueToCode(block, "servo", Blockly.Python.ORDER_ATOMIC);
  var degrees = Blockly.Python.valueToCode(block, "degrees", Blockly.Python.ORDER_ATOMIC);
  var code = "board.servoWrite(" + servo + ", " + degrees + ")" + "\n";
  return code;
};

Blockly.Python["kitronik_pico_robotics__servo_write_radians"] = function(block) {
  Blockly.Python.definitions_["import_PicoRobotics"] = "import PicoRobotics";
  var servo = Blockly.Python.valueToCode(block, "servo", Blockly.Python.ORDER_ATOMIC);
  var radians = Blockly.Python.valueToCode(block, "radians", Blockly.Python.ORDER_ATOMIC);
  var code = "board.servoWriteRadians(" + servo + ", " + radians + ")" + "\n";
  return code;
};

Blockly.Python["kitronik_pico_robotics__step"] = function(block) {
  Blockly.Python.definitions_["import_PicoRobotics"] = "import PicoRobotics";
  var motor = Blockly.Python.valueToCode(block, "motor", Blockly.Python.ORDER_ATOMIC);
  var direction = JSON.stringify(block.getFieldValue("direction"));
  var steps = Blockly.Python.valueToCode(block, "steps", Blockly.Python.ORDER_ATOMIC);
  var speed = Blockly.Python.valueToCode(block, "speed", Blockly.Python.ORDER_ATOMIC);
  var holdPosition = Blockly.Python.valueToCode(block, "holdPosition", Blockly.Python.ORDER_ATOMIC);
  var code = "board.step(" + motor + ", " + direction + ", " + steps + ", " + speed + ", " + holdPosition + ")" + "\n";
  return code;
};

Blockly.Python["kitronik_pico_robotics__step_angle"] = function(block) {
  Blockly.Python.definitions_["import_PicoRobotics"] = "import PicoRobotics";
  var motor = Blockly.Python.valueToCode(block, "motor", Blockly.Python.ORDER_ATOMIC);
  var direction = JSON.stringify(block.getFieldValue("direction"));
  var angle = Blockly.Python.valueToCode(block, "angle", Blockly.Python.ORDER_ATOMIC);
  var speed = Blockly.Python.valueToCode(block, "speed", Blockly.Python.ORDER_ATOMIC);
  var holdPosition = Blockly.Python.valueToCode(block, "holdPosition", Blockly.Python.ORDER_ATOMIC);
  var stepsPerRev = Blockly.Python.valueToCode(block, "stepsPerRev", Blockly.Python.ORDER_ATOMIC);
  var code = "board.stepAngle(" + motor + ", " + direction + ", " + angle + ", " + speed + ", " + holdPosition + ", " + stepsPerRev + ")" + "\n";
  return code;
};
