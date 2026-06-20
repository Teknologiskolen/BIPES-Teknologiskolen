Blockly.Python["button_hub__create"] = function(block) {
  Blockly.Python.definitions_["import_buttons"] = "import buttons";
  var code = "buttons_hub = buttons.ButtonHub()" + "\n";
  return code;
};

Blockly.Python["button_hub__add"] = function(block) {
  Blockly.Python.definitions_["import_buttons"] = "import buttons";
  var pin = Blockly.Python.valueToCode(block, "pin", Blockly.Python.ORDER_ATOMIC);
  var pull = JSON.stringify(block.getFieldValue("pull"));
  var debounce_ms = Blockly.Python.valueToCode(block, "debounce_ms", Blockly.Python.ORDER_ATOMIC);
  var hold_ms = Blockly.Python.valueToCode(block, "hold_ms", Blockly.Python.ORDER_ATOMIC);
  var repeat_ms = Blockly.Python.valueToCode(block, "repeat_ms", Blockly.Python.ORDER_ATOMIC);
  var double_ms = Blockly.Python.valueToCode(block, "double_ms", Blockly.Python.ORDER_ATOMIC);
  var code = "buttons_hub.add(" + pin + ", " + pull + ", " + debounce_ms + ", " + hold_ms + ", " + repeat_ms + ", " + double_ms + ")" + "\n";
  return code;
};

Blockly.Python["button_hub__was_pressed"] = function(block) {
  Blockly.Python.definitions_["import_buttons"] = "import buttons";
  var pin = Blockly.Python.valueToCode(block, "pin", Blockly.Python.ORDER_ATOMIC);
  var code = "buttons_hub.was_pressed(" + pin + ")" + "\n";
  return [code.trimEnd(), Blockly.Python.ORDER_NONE];
};

Blockly.Python["button_hub__was_double_clicked"] = function(block) {
  Blockly.Python.definitions_["import_buttons"] = "import buttons";
  var pin = Blockly.Python.valueToCode(block, "pin", Blockly.Python.ORDER_ATOMIC);
  var code = "buttons_hub.was_double_clicked(" + pin + ")" + "\n";
  return [code.trimEnd(), Blockly.Python.ORDER_NONE];
};

Blockly.Python["button_hub__was_clicked"] = function(block) {
  Blockly.Python.definitions_["import_buttons"] = "import buttons";
  var pin = Blockly.Python.valueToCode(block, "pin", Blockly.Python.ORDER_ATOMIC);
  var code = "buttons_hub.was_clicked(" + pin + ")" + "\n";
  return [code.trimEnd(), Blockly.Python.ORDER_NONE];
};

Blockly.Python["button_hub__was_released"] = function(block) {
  Blockly.Python.definitions_["import_buttons"] = "import buttons";
  var pin = Blockly.Python.valueToCode(block, "pin", Blockly.Python.ORDER_ATOMIC);
  var code = "buttons_hub.was_released(" + pin + ")" + "\n";
  return [code.trimEnd(), Blockly.Python.ORDER_NONE];
};

Blockly.Python["button_hub__is_down"] = function(block) {
  Blockly.Python.definitions_["import_buttons"] = "import buttons";
  var pin = Blockly.Python.valueToCode(block, "pin", Blockly.Python.ORDER_ATOMIC);
  var code = "buttons_hub.is_down(" + pin + ")" + "\n";
  return [code.trimEnd(), Blockly.Python.ORDER_NONE];
};

Blockly.Python["button_hub__is_held"] = function(block) {
  Blockly.Python.definitions_["import_buttons"] = "import buttons";
  var pin = Blockly.Python.valueToCode(block, "pin", Blockly.Python.ORDER_ATOMIC);
  var code = "buttons_hub.is_held(" + pin + ")" + "\n";
  return [code.trimEnd(), Blockly.Python.ORDER_NONE];
};

Blockly.Python["button_hub__repeated"] = function(block) {
  Blockly.Python.definitions_["import_buttons"] = "import buttons";
  var pin = Blockly.Python.valueToCode(block, "pin", Blockly.Python.ORDER_ATOMIC);
  var code = "buttons_hub.repeated(" + pin + ")" + "\n";
  return [code.trimEnd(), Blockly.Python.ORDER_NONE];
};
