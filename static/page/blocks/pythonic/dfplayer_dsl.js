Blockly.Python["dfplayer__create"] = function(block) {
  Blockly.Python.definitions_["from_dfplayer_DFPlayer"] = "from dfplayer import DFPlayer";
  var uart_id = Blockly.Python.valueToCode(block, "uart_id", Blockly.Python.ORDER_ATOMIC);
  var tx_pin = Blockly.Python.valueToCode(block, "tx_pin", Blockly.Python.ORDER_ATOMIC);
  var rx_pin = Blockly.Python.valueToCode(block, "rx_pin", Blockly.Python.ORDER_ATOMIC);
  var code = "dfplayer = DFPlayer(" + uart_id + ", " + tx_pin + ", " + rx_pin + ")" + "\n";
  return code;
};

Blockly.Python["dfplayer__play"] = function(block) {
  Blockly.Python.definitions_["from_dfplayer_DFPlayer"] = "from dfplayer import DFPlayer";
  var track = Blockly.Python.valueToCode(block, "track", Blockly.Python.ORDER_ATOMIC);
  var code = "dfplayer.play(" + track + ")" + "\n";
  return code;
};

Blockly.Python["dfplayer__play_folder"] = function(block) {
  Blockly.Python.definitions_["from_dfplayer_DFPlayer"] = "from dfplayer import DFPlayer";
  var folder = Blockly.Python.valueToCode(block, "folder", Blockly.Python.ORDER_ATOMIC);
  var track = Blockly.Python.valueToCode(block, "track", Blockly.Python.ORDER_ATOMIC);
  var code = "dfplayer.play_folder(" + folder + ", " + track + ")" + "\n";
  return code;
};

Blockly.Python["dfplayer__play_mp3"] = function(block) {
  Blockly.Python.definitions_["from_dfplayer_DFPlayer"] = "from dfplayer import DFPlayer";
  var track = Blockly.Python.valueToCode(block, "track", Blockly.Python.ORDER_ATOMIC);
  var loop = Blockly.Python.valueToCode(block, "loop", Blockly.Python.ORDER_ATOMIC);
  var code = "dfplayer.play_mp3(" + track + ", " + loop + ")" + "\n";
  return code;
};

Blockly.Python["dfplayer__pause"] = function(block) {
  Blockly.Python.definitions_["from_dfplayer_DFPlayer"] = "from dfplayer import DFPlayer";
  var code = "dfplayer.pause()" + "\n";
  return code;
};

Blockly.Python["dfplayer__resume"] = function(block) {
  Blockly.Python.definitions_["from_dfplayer_DFPlayer"] = "from dfplayer import DFPlayer";
  var code = "dfplayer.resume()" + "\n";
  return code;
};

Blockly.Python["dfplayer__stop"] = function(block) {
  Blockly.Python.definitions_["from_dfplayer_DFPlayer"] = "from dfplayer import DFPlayer";
  var code = "dfplayer.stop()" + "\n";
  return code;
};

Blockly.Python["dfplayer__loop_current"] = function(block) {
  Blockly.Python.definitions_["from_dfplayer_DFPlayer"] = "from dfplayer import DFPlayer";
  var enable = Blockly.Python.valueToCode(block, "enable", Blockly.Python.ORDER_ATOMIC);
  var code = "dfplayer.loop_current(" + enable + ")" + "\n";
  return code;
};

Blockly.Python["dfplayer__next"] = function(block) {
  Blockly.Python.definitions_["from_dfplayer_DFPlayer"] = "from dfplayer import DFPlayer";
  var code = "dfplayer.next()" + "\n";
  return code;
};

Blockly.Python["dfplayer__prev"] = function(block) {
  Blockly.Python.definitions_["from_dfplayer_DFPlayer"] = "from dfplayer import DFPlayer";
  var code = "dfplayer.prev()" + "\n";
  return code;
};

Blockly.Python["dfplayer__volume"] = function(block) {
  Blockly.Python.definitions_["from_dfplayer_DFPlayer"] = "from dfplayer import DFPlayer";
  var level = Blockly.Python.valueToCode(block, "level", Blockly.Python.ORDER_ATOMIC);
  var code = "dfplayer.volume(" + level + ")" + "\n";
  return code;
};

Blockly.Python["dfplayer__volume_up"] = function(block) {
  Blockly.Python.definitions_["from_dfplayer_DFPlayer"] = "from dfplayer import DFPlayer";
  var code = "dfplayer.volume_up()" + "\n";
  return code;
};

Blockly.Python["dfplayer__volume_down"] = function(block) {
  Blockly.Python.definitions_["from_dfplayer_DFPlayer"] = "from dfplayer import DFPlayer";
  var code = "dfplayer.volume_down()" + "\n";
  return code;
};

Blockly.Python["dfplayer__eq"] = function(block) {
  Blockly.Python.definitions_["from_dfplayer_DFPlayer"] = "from dfplayer import DFPlayer";
  var mode = JSON.stringify(block.getFieldValue("mode"));
  var code = "dfplayer.eq(" + mode + ")" + "\n";
  return code;
};

Blockly.Python["dfplayer__reset"] = function(block) {
  Blockly.Python.definitions_["from_dfplayer_DFPlayer"] = "from dfplayer import DFPlayer";
  var code = "dfplayer.reset()" + "\n";
  return code;
};

Blockly.Python["dfplayer__sleep"] = function(block) {
  Blockly.Python.definitions_["from_dfplayer_DFPlayer"] = "from dfplayer import DFPlayer";
  var code = "dfplayer.sleep()" + "\n";
  return code;
};

Blockly.Python["dfplayer__wake"] = function(block) {
  Blockly.Python.definitions_["from_dfplayer_DFPlayer"] = "from dfplayer import DFPlayer";
  var code = "dfplayer.wake()" + "\n";
  return code;
};
