Blockly.Python["color565"] = function(block) {
  Blockly.Python.definitions_["import_st7735s"] = "import st7735s";
  var r = Blockly.Python.valueToCode(block, "r", Blockly.Python.ORDER_ATOMIC);
  var g = Blockly.Python.valueToCode(block, "g", Blockly.Python.ORDER_ATOMIC);
  var b = Blockly.Python.valueToCode(block, "b", Blockly.Python.ORDER_ATOMIC);
  var code = "color565(" + r + ", " + g + ", " + b + ")" + "\n";
  return [code.trimEnd(), Blockly.Python.ORDER_NONE];
};

Blockly.Python["st7735_s__create"] = function(block) {
  Blockly.Python.definitions_["import_st7735s"] = "import st7735s";
  Blockly.Python.definitions_["registry_st7735_s_instances"] = "st7735_s_instances = {}";
  var id = Blockly.Python.valueToCode(block, "id", Blockly.Python.ORDER_ATOMIC);
  $ = Blockly.internal_;
  var spi = $.Blockly.Python.nameDB_.getName(block.getFieldValue("spi"), $.module$exports$Blockly$Names.NameType.VARIABLE);
  var dc_pin = Blockly.Python.valueToCode(block, "dc_pin", Blockly.Python.ORDER_ATOMIC);
  var rst_pin = Blockly.Python.valueToCode(block, "rst_pin", Blockly.Python.ORDER_ATOMIC);
  var cs_pin = Blockly.Python.valueToCode(block, "cs_pin", Blockly.Python.ORDER_ATOMIC);
  var width = Blockly.Python.valueToCode(block, "width", Blockly.Python.ORDER_ATOMIC);
  var height = Blockly.Python.valueToCode(block, "height", Blockly.Python.ORDER_ATOMIC);
  var code = "st7735_s_instances[" + id + "] = st7735s.ST7735S(" + id + ", " + spi + ", " + dc_pin + ", " + rst_pin + ", " + cs_pin + ", " + width + ", " + height + ")" + "\n";
  return code;
};

Blockly.Python["st7735_s__fill"] = function(block) {
  Blockly.Python.definitions_["import_st7735s"] = "import st7735s";
  Blockly.Python.definitions_["registry_st7735_s_instances"] = "st7735_s_instances = {}";
  var id = Blockly.Python.valueToCode(block, "id", Blockly.Python.ORDER_ATOMIC);
  var color = Blockly.Python.valueToCode(block, "color", Blockly.Python.ORDER_ATOMIC);
  var code = "st7735_s_instances[" + id + "].fill(" + color + ")" + "\n";
  return code;
};

Blockly.Python["st7735_s__fill_rect"] = function(block) {
  Blockly.Python.definitions_["import_st7735s"] = "import st7735s";
  Blockly.Python.definitions_["registry_st7735_s_instances"] = "st7735_s_instances = {}";
  var id = Blockly.Python.valueToCode(block, "id", Blockly.Python.ORDER_ATOMIC);
  var x = Blockly.Python.valueToCode(block, "x", Blockly.Python.ORDER_ATOMIC);
  var y = Blockly.Python.valueToCode(block, "y", Blockly.Python.ORDER_ATOMIC);
  var w = Blockly.Python.valueToCode(block, "w", Blockly.Python.ORDER_ATOMIC);
  var h = Blockly.Python.valueToCode(block, "h", Blockly.Python.ORDER_ATOMIC);
  var color = Blockly.Python.valueToCode(block, "color", Blockly.Python.ORDER_ATOMIC);
  var code = "st7735_s_instances[" + id + "].fill_rect(" + x + ", " + y + ", " + w + ", " + h + ", " + color + ")" + "\n";
  return code;
};

Blockly.Python["st7735_s__pixel"] = function(block) {
  Blockly.Python.definitions_["import_st7735s"] = "import st7735s";
  Blockly.Python.definitions_["registry_st7735_s_instances"] = "st7735_s_instances = {}";
  var id = Blockly.Python.valueToCode(block, "id", Blockly.Python.ORDER_ATOMIC);
  var x = Blockly.Python.valueToCode(block, "x", Blockly.Python.ORDER_ATOMIC);
  var y = Blockly.Python.valueToCode(block, "y", Blockly.Python.ORDER_ATOMIC);
  var color = Blockly.Python.valueToCode(block, "color", Blockly.Python.ORDER_ATOMIC);
  var code = "st7735_s_instances[" + id + "].pixel(" + x + ", " + y + ", " + color + ")" + "\n";
  return code;
};

Blockly.Python["st7735_s__hline"] = function(block) {
  Blockly.Python.definitions_["import_st7735s"] = "import st7735s";
  Blockly.Python.definitions_["registry_st7735_s_instances"] = "st7735_s_instances = {}";
  var id = Blockly.Python.valueToCode(block, "id", Blockly.Python.ORDER_ATOMIC);
  var x = Blockly.Python.valueToCode(block, "x", Blockly.Python.ORDER_ATOMIC);
  var y = Blockly.Python.valueToCode(block, "y", Blockly.Python.ORDER_ATOMIC);
  var w = Blockly.Python.valueToCode(block, "w", Blockly.Python.ORDER_ATOMIC);
  var color = Blockly.Python.valueToCode(block, "color", Blockly.Python.ORDER_ATOMIC);
  var code = "st7735_s_instances[" + id + "].hline(" + x + ", " + y + ", " + w + ", " + color + ")" + "\n";
  return code;
};

Blockly.Python["st7735_s__vline"] = function(block) {
  Blockly.Python.definitions_["import_st7735s"] = "import st7735s";
  Blockly.Python.definitions_["registry_st7735_s_instances"] = "st7735_s_instances = {}";
  var id = Blockly.Python.valueToCode(block, "id", Blockly.Python.ORDER_ATOMIC);
  var x = Blockly.Python.valueToCode(block, "x", Blockly.Python.ORDER_ATOMIC);
  var y = Blockly.Python.valueToCode(block, "y", Blockly.Python.ORDER_ATOMIC);
  var h = Blockly.Python.valueToCode(block, "h", Blockly.Python.ORDER_ATOMIC);
  var color = Blockly.Python.valueToCode(block, "color", Blockly.Python.ORDER_ATOMIC);
  var code = "st7735_s_instances[" + id + "].vline(" + x + ", " + y + ", " + h + ", " + color + ")" + "\n";
  return code;
};

Blockly.Python["st7735_s__rect"] = function(block) {
  Blockly.Python.definitions_["import_st7735s"] = "import st7735s";
  Blockly.Python.definitions_["registry_st7735_s_instances"] = "st7735_s_instances = {}";
  var id = Blockly.Python.valueToCode(block, "id", Blockly.Python.ORDER_ATOMIC);
  var x = Blockly.Python.valueToCode(block, "x", Blockly.Python.ORDER_ATOMIC);
  var y = Blockly.Python.valueToCode(block, "y", Blockly.Python.ORDER_ATOMIC);
  var w = Blockly.Python.valueToCode(block, "w", Blockly.Python.ORDER_ATOMIC);
  var h = Blockly.Python.valueToCode(block, "h", Blockly.Python.ORDER_ATOMIC);
  var color = Blockly.Python.valueToCode(block, "color", Blockly.Python.ORDER_ATOMIC);
  var code = "st7735_s_instances[" + id + "].rect(" + x + ", " + y + ", " + w + ", " + h + ", " + color + ")" + "\n";
  return code;
};

Blockly.Python["st7735_s__line"] = function(block) {
  Blockly.Python.definitions_["import_st7735s"] = "import st7735s";
  Blockly.Python.definitions_["registry_st7735_s_instances"] = "st7735_s_instances = {}";
  var id = Blockly.Python.valueToCode(block, "id", Blockly.Python.ORDER_ATOMIC);
  var x0 = Blockly.Python.valueToCode(block, "x0", Blockly.Python.ORDER_ATOMIC);
  var y0 = Blockly.Python.valueToCode(block, "y0", Blockly.Python.ORDER_ATOMIC);
  var x1 = Blockly.Python.valueToCode(block, "x1", Blockly.Python.ORDER_ATOMIC);
  var y1 = Blockly.Python.valueToCode(block, "y1", Blockly.Python.ORDER_ATOMIC);
  var color = Blockly.Python.valueToCode(block, "color", Blockly.Python.ORDER_ATOMIC);
  var code = "st7735_s_instances[" + id + "].line(" + x0 + ", " + y0 + ", " + x1 + ", " + y1 + ", " + color + ")" + "\n";
  return code;
};

Blockly.Python["st7735_s__text"] = function(block) {
  Blockly.Python.definitions_["import_st7735s"] = "import st7735s";
  Blockly.Python.definitions_["registry_st7735_s_instances"] = "st7735_s_instances = {}";
  var id = Blockly.Python.valueToCode(block, "id", Blockly.Python.ORDER_ATOMIC);
  var string = Blockly.Python.valueToCode(block, "string", Blockly.Python.ORDER_ATOMIC);
  var x = Blockly.Python.valueToCode(block, "x", Blockly.Python.ORDER_ATOMIC);
  var y = Blockly.Python.valueToCode(block, "y", Blockly.Python.ORDER_ATOMIC);
  var color = Blockly.Python.valueToCode(block, "color", Blockly.Python.ORDER_ATOMIC);
  var size = Blockly.Python.valueToCode(block, "size", Blockly.Python.ORDER_ATOMIC);
  var code = "st7735_s_instances[" + id + "].text(" + string + ", " + x + ", " + y + ", " + color + ", " + size + ")" + "\n";
  return code;
};
