Blockly.Python["state_machine__create"] = function(block) {
  Blockly.Python.definitions_["import_app_core"] = "import app_core";
  var start = Blockly.Python.valueToCode(block, "start", Blockly.Python.ORDER_ATOMIC);
  var code = "sm = app_core.StateMachine(" + start + ")" + "\n";
  return code;
};

Blockly.Python["state_machine__add_rule"] = function(block) {
  Blockly.Python.definitions_["import_app_core"] = "import app_core";
  var state = Blockly.Python.valueToCode(block, "state", Blockly.Python.ORDER_ATOMIC);
  var event = Blockly.Python.valueToCode(block, "event", Blockly.Python.ORDER_ATOMIC);
  var next_state = Blockly.Python.valueToCode(block, "next_state", Blockly.Python.ORDER_ATOMIC);
  var code = "sm.add_rule(" + state + ", " + event + ", " + next_state + ")" + "\n";
  return code;
};

Blockly.Python["state_machine__feed"] = function(block) {
  Blockly.Python.definitions_["import_app_core"] = "import app_core";
  var event = Blockly.Python.valueToCode(block, "event", Blockly.Python.ORDER_ATOMIC);
  var code = "sm.feed(" + event + ")" + "\n";
  return code;
};

Blockly.Python["state_machine__go"] = function(block) {
  Blockly.Python.definitions_["import_app_core"] = "import app_core";
  var name = Blockly.Python.valueToCode(block, "name", Blockly.Python.ORDER_ATOMIC);
  var code = "sm.go(" + name + ")" + "\n";
  return code;
};

Blockly.Python["state_machine__state"] = function(block) {
  Blockly.Python.definitions_["import_app_core"] = "import app_core";
  var code = "sm.state()" + "\n";
  return [code.trimEnd(), Blockly.Python.ORDER_NONE];
};

Blockly.Python["state_machine__is_state"] = function(block) {
  Blockly.Python.definitions_["import_app_core"] = "import app_core";
  var name = Blockly.Python.valueToCode(block, "name", Blockly.Python.ORDER_ATOMIC);
  var code = "sm.is_state(" + name + ")" + "\n";
  return [code.trimEnd(), Blockly.Python.ORDER_NONE];
};

Blockly.Python["state_machine__entered"] = function(block) {
  Blockly.Python.definitions_["import_app_core"] = "import app_core";
  var name = Blockly.Python.valueToCode(block, "name", Blockly.Python.ORDER_ATOMIC);
  var code = "sm.entered(" + name + ")" + "\n";
  return [code.trimEnd(), Blockly.Python.ORDER_NONE];
};

Blockly.Python["state_machine__changed"] = function(block) {
  Blockly.Python.definitions_["import_app_core"] = "import app_core";
  var code = "sm.changed()" + "\n";
  return [code.trimEnd(), Blockly.Python.ORDER_NONE];
};

Blockly.Python["state_machine__tick"] = function(block) {
  Blockly.Python.definitions_["import_app_core"] = "import app_core";
  var code = "sm.tick()" + "\n";
  return code;
};
