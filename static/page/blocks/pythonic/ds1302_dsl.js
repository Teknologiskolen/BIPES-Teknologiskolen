Blockly.Python["ds1302__create"] = function(block) {
  Blockly.Python.definitions_["from_ds1302_DS1302"] = "from ds1302 import DS1302";
  Blockly.Python.definitions_["import_machine_Pin"] = "from machine import Pin";
  var clk_pin_raw = Blockly.Python.valueToCode(block, "clk_pin", Blockly.Python.ORDER_ATOMIC);
  var clk_pin_key = clk_pin_raw.replace(/[^a-zA-Z0-9_]/g, "");
  var clk_pin = "clk_pin_" + clk_pin_key;
  Blockly.Python.definitions_["pin_clk_pin_" + clk_pin_key] = clk_pin + " = Pin(" + clk_pin_raw + ", Pin.OUT)";
  var dat_pin_raw = Blockly.Python.valueToCode(block, "dat_pin", Blockly.Python.ORDER_ATOMIC);
  var dat_pin_key = dat_pin_raw.replace(/[^a-zA-Z0-9_]/g, "");
  var dat_pin = "dat_pin_" + dat_pin_key;
  Blockly.Python.definitions_["pin_dat_pin_" + dat_pin_key] = dat_pin + " = Pin(" + dat_pin_raw + ")";
  var rst_pin_raw = Blockly.Python.valueToCode(block, "rst_pin", Blockly.Python.ORDER_ATOMIC);
  var rst_pin_key = rst_pin_raw.replace(/[^a-zA-Z0-9_]/g, "");
  var rst_pin = "rst_pin_" + rst_pin_key;
  Blockly.Python.definitions_["pin_rst_pin_" + rst_pin_key] = rst_pin + " = Pin(" + rst_pin_raw + ", Pin.OUT)";
  var code = "ds1302 = DS1302(" + clk_pin + ", " + dat_pin + ", " + rst_pin + ")" + "\n";
  return code;
};

Blockly.Python["ds1302__get_time"] = function(block) {
  Blockly.Python.definitions_["from_ds1302_DS1302"] = "from ds1302 import DS1302";
  var code = "ds1302.get_time()" + "\n";
  return [code.trimEnd(), Blockly.Python.ORDER_NONE];
};

Blockly.Python["ds1302__get_year"] = function(block) {
  Blockly.Python.definitions_["from_ds1302_DS1302"] = "from ds1302 import DS1302";
  var code = "ds1302.get_year()" + "\n";
  return [code.trimEnd(), Blockly.Python.ORDER_NONE];
};

Blockly.Python["ds1302__get_month"] = function(block) {
  Blockly.Python.definitions_["from_ds1302_DS1302"] = "from ds1302 import DS1302";
  var code = "ds1302.get_month()" + "\n";
  return [code.trimEnd(), Blockly.Python.ORDER_NONE];
};

Blockly.Python["ds1302__get_day"] = function(block) {
  Blockly.Python.definitions_["from_ds1302_DS1302"] = "from ds1302 import DS1302";
  var code = "ds1302.get_day()" + "\n";
  return [code.trimEnd(), Blockly.Python.ORDER_NONE];
};

Blockly.Python["ds1302__get_hour"] = function(block) {
  Blockly.Python.definitions_["from_ds1302_DS1302"] = "from ds1302 import DS1302";
  var code = "ds1302.get_hour()" + "\n";
  return [code.trimEnd(), Blockly.Python.ORDER_NONE];
};

Blockly.Python["ds1302__get_minute"] = function(block) {
  Blockly.Python.definitions_["from_ds1302_DS1302"] = "from ds1302 import DS1302";
  var code = "ds1302.get_minute()" + "\n";
  return [code.trimEnd(), Blockly.Python.ORDER_NONE];
};

Blockly.Python["ds1302__get_second"] = function(block) {
  Blockly.Python.definitions_["from_ds1302_DS1302"] = "from ds1302 import DS1302";
  var code = "ds1302.get_second()" + "\n";
  return [code.trimEnd(), Blockly.Python.ORDER_NONE];
};

Blockly.Python["ds1302__get_time_text"] = function(block) {
  Blockly.Python.definitions_["from_ds1302_DS1302"] = "from ds1302 import DS1302";
  var show_seconds = Blockly.Python.valueToCode(block, "show_seconds", Blockly.Python.ORDER_ATOMIC);
  var code = "ds1302.get_time_text(" + show_seconds + ")" + "\n";
  return [code.trimEnd(), Blockly.Python.ORDER_NONE];
};

Blockly.Python["ds1302__get_date_text"] = function(block) {
  Blockly.Python.definitions_["from_ds1302_DS1302"] = "from ds1302 import DS1302";
  var code = "ds1302.get_date_text()" + "\n";
  return [code.trimEnd(), Blockly.Python.ORDER_NONE];
};

Blockly.Python["ds1302__set_time"] = function(block) {
  Blockly.Python.definitions_["from_ds1302_DS1302"] = "from ds1302 import DS1302";
  var year = Blockly.Python.valueToCode(block, "year", Blockly.Python.ORDER_ATOMIC);
  var month = Blockly.Python.valueToCode(block, "month", Blockly.Python.ORDER_ATOMIC);
  var day = Blockly.Python.valueToCode(block, "day", Blockly.Python.ORDER_ATOMIC);
  var hour = Blockly.Python.valueToCode(block, "hour", Blockly.Python.ORDER_ATOMIC);
  var minute = Blockly.Python.valueToCode(block, "minute", Blockly.Python.ORDER_ATOMIC);
  var second = Blockly.Python.valueToCode(block, "second", Blockly.Python.ORDER_ATOMIC);
  var code = "ds1302.set_time(" + year + ", " + month + ", " + day + ", " + hour + ", " + minute + ", " + second + ")" + "\n";
  return code;
};
