Blockly.Python["ds1302__create"] = function(block) {
  Blockly.Python.definitions_["import_ds1302"] = "import ds1302";
  var clk_pin = Blockly.Python.valueToCode(block, "clk_pin", Blockly.Python.ORDER_ATOMIC);
  var dat_pin = Blockly.Python.valueToCode(block, "dat_pin", Blockly.Python.ORDER_ATOMIC);
  var rst_pin = Blockly.Python.valueToCode(block, "rst_pin", Blockly.Python.ORDER_ATOMIC);
  var code = "ds1302 = ds1302.DS1302(" + clk_pin + ", " + dat_pin + ", " + rst_pin + ")" + "\n";
  return code;
};

Blockly.Python["ds1302__get_time"] = function(block) {
  Blockly.Python.definitions_["import_ds1302"] = "import ds1302";
  var code = "ds1302.get_time()" + "\n";
  return [code.trimEnd(), Blockly.Python.ORDER_NONE];
};

Blockly.Python["ds1302__get_year"] = function(block) {
  Blockly.Python.definitions_["import_ds1302"] = "import ds1302";
  var code = "ds1302.get_year()" + "\n";
  return [code.trimEnd(), Blockly.Python.ORDER_NONE];
};

Blockly.Python["ds1302__get_month"] = function(block) {
  Blockly.Python.definitions_["import_ds1302"] = "import ds1302";
  var code = "ds1302.get_month()" + "\n";
  return [code.trimEnd(), Blockly.Python.ORDER_NONE];
};

Blockly.Python["ds1302__get_day"] = function(block) {
  Blockly.Python.definitions_["import_ds1302"] = "import ds1302";
  var code = "ds1302.get_day()" + "\n";
  return [code.trimEnd(), Blockly.Python.ORDER_NONE];
};

Blockly.Python["ds1302__get_hour"] = function(block) {
  Blockly.Python.definitions_["import_ds1302"] = "import ds1302";
  var code = "ds1302.get_hour()" + "\n";
  return [code.trimEnd(), Blockly.Python.ORDER_NONE];
};

Blockly.Python["ds1302__get_minute"] = function(block) {
  Blockly.Python.definitions_["import_ds1302"] = "import ds1302";
  var code = "ds1302.get_minute()" + "\n";
  return [code.trimEnd(), Blockly.Python.ORDER_NONE];
};

Blockly.Python["ds1302__get_second"] = function(block) {
  Blockly.Python.definitions_["import_ds1302"] = "import ds1302";
  var code = "ds1302.get_second()" + "\n";
  return [code.trimEnd(), Blockly.Python.ORDER_NONE];
};

Blockly.Python["ds1302__set_time"] = function(block) {
  Blockly.Python.definitions_["import_ds1302"] = "import ds1302";
  var year = Blockly.Python.valueToCode(block, "year", Blockly.Python.ORDER_ATOMIC);
  var month = Blockly.Python.valueToCode(block, "month", Blockly.Python.ORDER_ATOMIC);
  var day = Blockly.Python.valueToCode(block, "day", Blockly.Python.ORDER_ATOMIC);
  var hour = Blockly.Python.valueToCode(block, "hour", Blockly.Python.ORDER_ATOMIC);
  var minute = Blockly.Python.valueToCode(block, "minute", Blockly.Python.ORDER_ATOMIC);
  var second = Blockly.Python.valueToCode(block, "second", Blockly.Python.ORDER_ATOMIC);
  var code = "ds1302.set_time(" + year + ", " + month + ", " + day + ", " + hour + ", " + minute + ", " + second + ")" + "\n";
  return code;
};
