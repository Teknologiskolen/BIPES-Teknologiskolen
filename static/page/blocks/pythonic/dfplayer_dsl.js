Blockly.Python["dfplayer__create"] = function(block) {
  Blockly.Python.definitions_["import_dfplayer"] = "import dfplayer";
  Blockly.Python.definitions_["registry_dfplayer_instances"] = "dfplayer_instances = {}";
  var id = Blockly.Python.valueToCode(block, "id", Blockly.Python.ORDER_ATOMIC);
  var uart_id = Blockly.Python.valueToCode(block, "uart_id", Blockly.Python.ORDER_ATOMIC);
  var tx_pin = Blockly.Python.valueToCode(block, "tx_pin", Blockly.Python.ORDER_ATOMIC);
  var rx_pin = Blockly.Python.valueToCode(block, "rx_pin", Blockly.Python.ORDER_ATOMIC);
  var code = "dfplayer_instances[" + id + "] = dfplayer.DFPlayer(" + id + ", " + uart_id + ", " + tx_pin + ", " + rx_pin + ")" + "\n";
  return code;
};

Blockly.Python["dfplayer__play"] = function(block) {
  Blockly.Python.definitions_["import_dfplayer"] = "import dfplayer";
  Blockly.Python.definitions_["registry_dfplayer_instances"] = "dfplayer_instances = {}";
  var id = Blockly.Python.valueToCode(block, "id", Blockly.Python.ORDER_ATOMIC);
  var track = Blockly.Python.valueToCode(block, "track", Blockly.Python.ORDER_ATOMIC);
  var code = "dfplayer_instances[" + id + "].play(" + track + ")" + "\n";
  return code;
};

Blockly.Python["dfplayer__play_folder"] = function(block) {
  Blockly.Python.definitions_["import_dfplayer"] = "import dfplayer";
  Blockly.Python.definitions_["registry_dfplayer_instances"] = "dfplayer_instances = {}";
  var id = Blockly.Python.valueToCode(block, "id", Blockly.Python.ORDER_ATOMIC);
  var folder = Blockly.Python.valueToCode(block, "folder", Blockly.Python.ORDER_ATOMIC);
  var track = Blockly.Python.valueToCode(block, "track", Blockly.Python.ORDER_ATOMIC);
  var code = "dfplayer_instances[" + id + "].play_folder(" + folder + ", " + track + ")" + "\n";
  return code;
};

Blockly.Python["dfplayer__play_mp3"] = function(block) {
  Blockly.Python.definitions_["import_dfplayer"] = "import dfplayer";
  Blockly.Python.definitions_["registry_dfplayer_instances"] = "dfplayer_instances = {}";
  var id = Blockly.Python.valueToCode(block, "id", Blockly.Python.ORDER_ATOMIC);
  var track = Blockly.Python.valueToCode(block, "track", Blockly.Python.ORDER_ATOMIC);
  var loop = Blockly.Python.valueToCode(block, "loop", Blockly.Python.ORDER_ATOMIC);
  var code = "dfplayer_instances[" + id + "].play_mp3(" + track + ", " + loop + ")" + "\n";
  return code;
};

Blockly.Python["dfplayer__pause"] = function(block) {
  Blockly.Python.definitions_["import_dfplayer"] = "import dfplayer";
  Blockly.Python.definitions_["registry_dfplayer_instances"] = "dfplayer_instances = {}";
  var id = Blockly.Python.valueToCode(block, "id", Blockly.Python.ORDER_ATOMIC);
  var code = "dfplayer_instances[" + id + "].pause()" + "\n";
  return code;
};

Blockly.Python["dfplayer__resume"] = function(block) {
  Blockly.Python.definitions_["import_dfplayer"] = "import dfplayer";
  Blockly.Python.definitions_["registry_dfplayer_instances"] = "dfplayer_instances = {}";
  var id = Blockly.Python.valueToCode(block, "id", Blockly.Python.ORDER_ATOMIC);
  var code = "dfplayer_instances[" + id + "].resume()" + "\n";
  return code;
};

Blockly.Python["dfplayer__stop"] = function(block) {
  Blockly.Python.definitions_["import_dfplayer"] = "import dfplayer";
  Blockly.Python.definitions_["registry_dfplayer_instances"] = "dfplayer_instances = {}";
  var id = Blockly.Python.valueToCode(block, "id", Blockly.Python.ORDER_ATOMIC);
  var code = "dfplayer_instances[" + id + "].stop()" + "\n";
  return code;
};

Blockly.Python["dfplayer__loop_current"] = function(block) {
  Blockly.Python.definitions_["import_dfplayer"] = "import dfplayer";
  Blockly.Python.definitions_["registry_dfplayer_instances"] = "dfplayer_instances = {}";
  var id = Blockly.Python.valueToCode(block, "id", Blockly.Python.ORDER_ATOMIC);
  var enable = Blockly.Python.valueToCode(block, "enable", Blockly.Python.ORDER_ATOMIC);
  var code = "dfplayer_instances[" + id + "].loop_current(" + enable + ")" + "\n";
  return code;
};

Blockly.Python["dfplayer__next"] = function(block) {
  Blockly.Python.definitions_["import_dfplayer"] = "import dfplayer";
  Blockly.Python.definitions_["registry_dfplayer_instances"] = "dfplayer_instances = {}";
  var id = Blockly.Python.valueToCode(block, "id", Blockly.Python.ORDER_ATOMIC);
  var code = "dfplayer_instances[" + id + "].next()" + "\n";
  return code;
};

Blockly.Python["dfplayer__prev"] = function(block) {
  Blockly.Python.definitions_["import_dfplayer"] = "import dfplayer";
  Blockly.Python.definitions_["registry_dfplayer_instances"] = "dfplayer_instances = {}";
  var id = Blockly.Python.valueToCode(block, "id", Blockly.Python.ORDER_ATOMIC);
  var code = "dfplayer_instances[" + id + "].prev()" + "\n";
  return code;
};

Blockly.Python["dfplayer__volume"] = function(block) {
  Blockly.Python.definitions_["import_dfplayer"] = "import dfplayer";
  Blockly.Python.definitions_["registry_dfplayer_instances"] = "dfplayer_instances = {}";
  var id = Blockly.Python.valueToCode(block, "id", Blockly.Python.ORDER_ATOMIC);
  var level = Blockly.Python.valueToCode(block, "level", Blockly.Python.ORDER_ATOMIC);
  var code = "dfplayer_instances[" + id + "].volume(" + level + ")" + "\n";
  return code;
};

Blockly.Python["dfplayer__volume_up"] = function(block) {
  Blockly.Python.definitions_["import_dfplayer"] = "import dfplayer";
  Blockly.Python.definitions_["registry_dfplayer_instances"] = "dfplayer_instances = {}";
  var id = Blockly.Python.valueToCode(block, "id", Blockly.Python.ORDER_ATOMIC);
  var code = "dfplayer_instances[" + id + "].volume_up()" + "\n";
  return code;
};

Blockly.Python["dfplayer__volume_down"] = function(block) {
  Blockly.Python.definitions_["import_dfplayer"] = "import dfplayer";
  Blockly.Python.definitions_["registry_dfplayer_instances"] = "dfplayer_instances = {}";
  var id = Blockly.Python.valueToCode(block, "id", Blockly.Python.ORDER_ATOMIC);
  var code = "dfplayer_instances[" + id + "].volume_down()" + "\n";
  return code;
};

Blockly.Python["dfplayer__eq"] = function(block) {
  Blockly.Python.definitions_["import_dfplayer"] = "import dfplayer";
  Blockly.Python.definitions_["registry_dfplayer_instances"] = "dfplayer_instances = {}";
  var id = Blockly.Python.valueToCode(block, "id", Blockly.Python.ORDER_ATOMIC);
  var mode = String(Number(block.getFieldValue("mode")));
  var code = "dfplayer_instances[" + id + "].eq(" + mode + ")" + "\n";
  return code;
};

Blockly.Python["dfplayer__reset"] = function(block) {
  Blockly.Python.definitions_["import_dfplayer"] = "import dfplayer";
  Blockly.Python.definitions_["registry_dfplayer_instances"] = "dfplayer_instances = {}";
  var id = Blockly.Python.valueToCode(block, "id", Blockly.Python.ORDER_ATOMIC);
  var code = "dfplayer_instances[" + id + "].reset()" + "\n";
  return code;
};

Blockly.Python["dfplayer__sleep"] = function(block) {
  Blockly.Python.definitions_["import_dfplayer"] = "import dfplayer";
  Blockly.Python.definitions_["registry_dfplayer_instances"] = "dfplayer_instances = {}";
  var id = Blockly.Python.valueToCode(block, "id", Blockly.Python.ORDER_ATOMIC);
  var code = "dfplayer_instances[" + id + "].sleep()" + "\n";
  return code;
};

Blockly.Python["dfplayer__wake"] = function(block) {
  Blockly.Python.definitions_["import_dfplayer"] = "import dfplayer";
  Blockly.Python.definitions_["registry_dfplayer_instances"] = "dfplayer_instances = {}";
  var id = Blockly.Python.valueToCode(block, "id", Blockly.Python.ORDER_ATOMIC);
  var code = "dfplayer_instances[" + id + "].wake()" + "\n";
  return code;
};
