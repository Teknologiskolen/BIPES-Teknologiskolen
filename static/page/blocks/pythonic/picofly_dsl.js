Blockly.Python["pico_fly__create"] = function(block) {
  Blockly.Python.definitions_["import_picofly_firmware"] = "import picofly_firmware";
  var code = "board = picofly_firmware.PicoFly()" + "\n";
  return code;
};

Blockly.Python["pico_fly__motor"] = function(block) {
  Blockly.Python.definitions_["import_picofly_firmware"] = "import picofly_firmware";
  var which = JSON.stringify(block.getFieldValue("which"));
  var speed = Blockly.Python.valueToCode(block, "speed", Blockly.Python.ORDER_ATOMIC);
  var code = "board.motor(" + which + ", " + speed + ")" + "\n";
  return code;
};

Blockly.Python["pico_fly__motor_stop"] = function(block) {
  Blockly.Python.definitions_["import_picofly_firmware"] = "import picofly_firmware";
  var which = JSON.stringify(block.getFieldValue("which"));
  var code = "board.motor_stop(" + which + ")" + "\n";
  return code;
};

Blockly.Python["pico_fly__set_servo"] = function(block) {
  Blockly.Python.definitions_["import_picofly_firmware"] = "import picofly_firmware";
  var servo = String(Number(block.getFieldValue("servo")));
  var angle = Blockly.Python.valueToCode(block, "angle", Blockly.Python.ORDER_ATOMIC);
  var code = "board.set_servo(" + servo + ", " + angle + ")" + "\n";
  return code;
};
