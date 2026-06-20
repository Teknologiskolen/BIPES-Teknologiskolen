Blockly.Python["hcsr04__create"] = function(block) {
  Blockly.Python.definitions_["import_hcsr04"] = "import hcsr04";
  Blockly.Python.definitions_["registry_hcsr04_instances"] = "hcsr04_instances = {}";
  var id = Blockly.Python.valueToCode(block, "id", Blockly.Python.ORDER_ATOMIC);
  var trigger_pin = Blockly.Python.valueToCode(block, "trigger_pin", Blockly.Python.ORDER_ATOMIC);
  var echo_pin = Blockly.Python.valueToCode(block, "echo_pin", Blockly.Python.ORDER_ATOMIC);
  var echo_timeout_us = Blockly.Python.valueToCode(block, "echo_timeout_us", Blockly.Python.ORDER_ATOMIC);
  var code = "hcsr04_instances[" + id + "] = hcsr04.HCSR04(" + trigger_pin + ", " + echo_pin + ", " + echo_timeout_us + ")" + "\n";
  return code;
};

Blockly.Python["hcsr04__distance_cm"] = function(block) {
  Blockly.Python.definitions_["import_hcsr04"] = "import hcsr04";
  Blockly.Python.definitions_["registry_hcsr04_instances"] = "hcsr04_instances = {}";
  var id = Blockly.Python.valueToCode(block, "id", Blockly.Python.ORDER_ATOMIC);
  var code = "hcsr04_instances[" + id + "].distance_cm()" + "\n";
  return [code.trimEnd(), Blockly.Python.ORDER_NONE];
};

Blockly.Python["hcsr04__distance_mm"] = function(block) {
  Blockly.Python.definitions_["import_hcsr04"] = "import hcsr04";
  Blockly.Python.definitions_["registry_hcsr04_instances"] = "hcsr04_instances = {}";
  var id = Blockly.Python.valueToCode(block, "id", Blockly.Python.ORDER_ATOMIC);
  var code = "hcsr04_instances[" + id + "].distance_mm()" + "\n";
  return [code.trimEnd(), Blockly.Python.ORDER_NONE];
};
