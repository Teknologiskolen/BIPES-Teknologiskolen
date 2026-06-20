Blockly.Python["music__create"] = function(block) {
  Blockly.Python.definitions_["import_buzzer_music"] = "import buzzer_music";
  var songString = Blockly.Python.valueToCode(block, "songString", Blockly.Python.ORDER_ATOMIC);
  var looping = Blockly.Python.valueToCode(block, "looping", Blockly.Python.ORDER_ATOMIC);
  var tempo = Blockly.Python.valueToCode(block, "tempo", Blockly.Python.ORDER_ATOMIC);
  var duty = Blockly.Python.valueToCode(block, "duty", Blockly.Python.ORDER_ATOMIC);
  var pin = Blockly.Python.valueToCode(block, "pin", Blockly.Python.ORDER_ATOMIC);
  var code = "buzzer = buzzer_music.music(" + songString + ", " + looping + ", " + tempo + ", " + duty + ", " + pin + ")" + "\n";
  return code;
};

Blockly.Python["music__tick"] = function(block) {
  Blockly.Python.definitions_["import_buzzer_music"] = "import buzzer_music";
  var code = "buzzer.tick()" + "\n";
  return code;
};

Blockly.Python["music__stop"] = function(block) {
  Blockly.Python.definitions_["import_buzzer_music"] = "import buzzer_music";
  var code = "buzzer.stop()" + "\n";
  return code;
};

Blockly.Python["music__restart"] = function(block) {
  Blockly.Python.definitions_["import_buzzer_music"] = "import buzzer_music";
  var code = "buzzer.restart()" + "\n";
  return code;
};

Blockly.Python["music__resume"] = function(block) {
  Blockly.Python.definitions_["import_buzzer_music"] = "import buzzer_music";
  var code = "buzzer.resume()" + "\n";
  return code;
};
