Blockly.Python["neopixel__create"] = function(block) {
  Blockly.Python.definitions_["import_neopixel"] = "import neopixel";
  var number = Blockly.Python.valueToCode(block, "number", Blockly.Python.ORDER_ATOMIC);
  var state_machine = Blockly.Python.valueToCode(block, "state_machine", Blockly.Python.ORDER_ATOMIC);
  var pin = Blockly.Python.valueToCode(block, "pin", Blockly.Python.ORDER_ATOMIC);
  var mode = Blockly.Python.valueToCode(block, "mode", Blockly.Python.ORDER_ATOMIC);
  var code = "neopixel = neopixel.Neopixel(" + number + ", " + state_machine + ", " + pin + ", " + mode + ")" + "\n";
  return code;
};

Blockly.Python["neopixel__brightness"] = function(block) {
  Blockly.Python.definitions_["import_neopixel"] = "import neopixel";
  var brightness = Blockly.Python.valueToCode(block, "brightness", Blockly.Python.ORDER_ATOMIC);
  var code = "neopixel.brightness(" + brightness + ")" + "\n";
  return code;
};

Blockly.Python["neopixel__set_pixel"] = function(block) {
  Blockly.Python.definitions_["import_neopixel"] = "import neopixel";
  var pixel_num = Blockly.Python.valueToCode(block, "pixel_num", Blockly.Python.ORDER_ATOMIC);
  var rgb_w = Blockly.Python.valueToCode(block, "rgb_w", Blockly.Python.ORDER_ATOMIC);
  var how_bright = Blockly.Python.valueToCode(block, "how_bright", Blockly.Python.ORDER_ATOMIC);
  var code = "neopixel.set_pixel(" + pixel_num + ", " + rgb_w + ", " + how_bright + ")" + "\n";
  return code;
};

Blockly.Python["neopixel__set_pixel_line"] = function(block) {
  Blockly.Python.definitions_["import_neopixel"] = "import neopixel";
  var pixel1 = Blockly.Python.valueToCode(block, "pixel1", Blockly.Python.ORDER_ATOMIC);
  var pixel2 = Blockly.Python.valueToCode(block, "pixel2", Blockly.Python.ORDER_ATOMIC);
  var rgb_w = Blockly.Python.valueToCode(block, "rgb_w", Blockly.Python.ORDER_ATOMIC);
  var how_bright = Blockly.Python.valueToCode(block, "how_bright", Blockly.Python.ORDER_ATOMIC);
  var code = "neopixel.set_pixel_line(" + pixel1 + ", " + pixel2 + ", " + rgb_w + ", " + how_bright + ")" + "\n";
  return code;
};

Blockly.Python["neopixel__set_pixel_line_gradient"] = function(block) {
  Blockly.Python.definitions_["import_neopixel"] = "import neopixel";
  var pixel1 = Blockly.Python.valueToCode(block, "pixel1", Blockly.Python.ORDER_ATOMIC);
  var pixel2 = Blockly.Python.valueToCode(block, "pixel2", Blockly.Python.ORDER_ATOMIC);
  var left_rgb_w = Blockly.Python.valueToCode(block, "left_rgb_w", Blockly.Python.ORDER_ATOMIC);
  var right_rgb_w = Blockly.Python.valueToCode(block, "right_rgb_w", Blockly.Python.ORDER_ATOMIC);
  var how_bright = Blockly.Python.valueToCode(block, "how_bright", Blockly.Python.ORDER_ATOMIC);
  var code = "neopixel.set_pixel_line_gradient(" + pixel1 + ", " + pixel2 + ", " + left_rgb_w + ", " + right_rgb_w + ", " + how_bright + ")" + "\n";
  return code;
};

Blockly.Python["neopixel__fill"] = function(block) {
  Blockly.Python.definitions_["import_neopixel"] = "import neopixel";
  var rgb_w = Blockly.Python.valueToCode(block, "rgb_w", Blockly.Python.ORDER_ATOMIC);
  var how_bright = Blockly.Python.valueToCode(block, "how_bright", Blockly.Python.ORDER_ATOMIC);
  var code = "neopixel.fill(" + rgb_w + ", " + how_bright + ")" + "\n";
  return code;
};

Blockly.Python["neopixel__clear"] = function(block) {
  Blockly.Python.definitions_["import_neopixel"] = "import neopixel";
  var code = "neopixel.clear()" + "\n";
  return code;
};

Blockly.Python["neopixel__rotate_left"] = function(block) {
  Blockly.Python.definitions_["import_neopixel"] = "import neopixel";
  var num_of_pixels = Blockly.Python.valueToCode(block, "num_of_pixels", Blockly.Python.ORDER_ATOMIC);
  var code = "neopixel.rotate_left(" + num_of_pixels + ")" + "\n";
  return code;
};

Blockly.Python["neopixel__rotate_right"] = function(block) {
  Blockly.Python.definitions_["import_neopixel"] = "import neopixel";
  var num_of_pixels = Blockly.Python.valueToCode(block, "num_of_pixels", Blockly.Python.ORDER_ATOMIC);
  var code = "neopixel.rotate_right(" + num_of_pixels + ")" + "\n";
  return code;
};

Blockly.Python["neopixel__show"] = function(block) {
  Blockly.Python.definitions_["import_neopixel"] = "import neopixel";
  var code = "neopixel.show()" + "\n";
  return code;
};
