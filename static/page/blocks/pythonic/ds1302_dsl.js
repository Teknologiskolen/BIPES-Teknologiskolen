Blockly.Python["ds1302__create"] = function(block) {
  Blockly.Python.definitions_["import_ds1302"] = "import ds1302";
  Blockly.Python.definitions_["registry_ds1302_instances"] = "ds1302_instances = {}";
  var id = Blockly.Python.valueToCode(block, "id", Blockly.Python.ORDER_ATOMIC);
  var clk_pin = Blockly.Python.valueToCode(block, "clk_pin", Blockly.Python.ORDER_ATOMIC);
  var dat_pin = Blockly.Python.valueToCode(block, "dat_pin", Blockly.Python.ORDER_ATOMIC);
  var rst_pin = Blockly.Python.valueToCode(block, "rst_pin", Blockly.Python.ORDER_ATOMIC);
  var code = "ds1302_instances[" + id + "] = ds1302.DS1302(" + id + ", " + clk_pin + ", " + dat_pin + ", " + rst_pin + ")" + "\n";
  return code;
};

Blockly.Python["ds1302__get_time"] = function(block) {
  Blockly.Python.definitions_["import_ds1302"] = "import ds1302";
  Blockly.Python.definitions_["registry_ds1302_instances"] = "ds1302_instances = {}";
  var id = Blockly.Python.valueToCode(block, "id", Blockly.Python.ORDER_ATOMIC);
  var code = "ds1302_instances[" + id + "].get_time()" + "\n";
  return [code.trimEnd(), Blockly.Python.ORDER_NONE];
};

Blockly.Python["ds1302__get_year"] = function(block) {
  Blockly.Python.definitions_["import_ds1302"] = "import ds1302";
  Blockly.Python.definitions_["registry_ds1302_instances"] = "ds1302_instances = {}";
  var id = Blockly.Python.valueToCode(block, "id", Blockly.Python.ORDER_ATOMIC);
  var code = "ds1302_instances[" + id + "].get_year()" + "\n";
  return [code.trimEnd(), Blockly.Python.ORDER_NONE];
};

Blockly.Python["ds1302__get_month"] = function(block) {
  Blockly.Python.definitions_["import_ds1302"] = "import ds1302";
  Blockly.Python.definitions_["registry_ds1302_instances"] = "ds1302_instances = {}";
  var id = Blockly.Python.valueToCode(block, "id", Blockly.Python.ORDER_ATOMIC);
  var code = "ds1302_instances[" + id + "].get_month()" + "\n";
  return [code.trimEnd(), Blockly.Python.ORDER_NONE];
};

Blockly.Python["ds1302__get_day"] = function(block) {
  Blockly.Python.definitions_["import_ds1302"] = "import ds1302";
  Blockly.Python.definitions_["registry_ds1302_instances"] = "ds1302_instances = {}";
  var id = Blockly.Python.valueToCode(block, "id", Blockly.Python.ORDER_ATOMIC);
  var code = "ds1302_instances[" + id + "].get_day()" + "\n";
  return [code.trimEnd(), Blockly.Python.ORDER_NONE];
};

Blockly.Python["ds1302__get_hour"] = function(block) {
  Blockly.Python.definitions_["import_ds1302"] = "import ds1302";
  Blockly.Python.definitions_["registry_ds1302_instances"] = "ds1302_instances = {}";
  var id = Blockly.Python.valueToCode(block, "id", Blockly.Python.ORDER_ATOMIC);
  var code = "ds1302_instances[" + id + "].get_hour()" + "\n";
  return [code.trimEnd(), Blockly.Python.ORDER_NONE];
};

Blockly.Python["ds1302__get_minute"] = function(block) {
  Blockly.Python.definitions_["import_ds1302"] = "import ds1302";
  Blockly.Python.definitions_["registry_ds1302_instances"] = "ds1302_instances = {}";
  var id = Blockly.Python.valueToCode(block, "id", Blockly.Python.ORDER_ATOMIC);
  var code = "ds1302_instances[" + id + "].get_minute()" + "\n";
  return [code.trimEnd(), Blockly.Python.ORDER_NONE];
};

Blockly.Python["ds1302__get_second"] = function(block) {
  Blockly.Python.definitions_["import_ds1302"] = "import ds1302";
  Blockly.Python.definitions_["registry_ds1302_instances"] = "ds1302_instances = {}";
  var id = Blockly.Python.valueToCode(block, "id", Blockly.Python.ORDER_ATOMIC);
  var code = "ds1302_instances[" + id + "].get_second()" + "\n";
  return [code.trimEnd(), Blockly.Python.ORDER_NONE];
};

Blockly.Python["ds1302__get_time_text"] = function(block) {
  Blockly.Python.definitions_["import_ds1302"] = "import ds1302";
  Blockly.Python.definitions_["registry_ds1302_instances"] = "ds1302_instances = {}";
  var id = Blockly.Python.valueToCode(block, "id", Blockly.Python.ORDER_ATOMIC);
  var show_seconds = Blockly.Python.valueToCode(block, "show_seconds", Blockly.Python.ORDER_ATOMIC);
  var code = "ds1302_instances[" + id + "].get_time_text(" + show_seconds + ")" + "\n";
  return [code.trimEnd(), Blockly.Python.ORDER_NONE];
};

Blockly.Python["ds1302__get_date_text"] = function(block) {
  Blockly.Python.definitions_["import_ds1302"] = "import ds1302";
  Blockly.Python.definitions_["registry_ds1302_instances"] = "ds1302_instances = {}";
  var id = Blockly.Python.valueToCode(block, "id", Blockly.Python.ORDER_ATOMIC);
  var code = "ds1302_instances[" + id + "].get_date_text()" + "\n";
  return [code.trimEnd(), Blockly.Python.ORDER_NONE];
};

Blockly.Python["ds1302__set_time"] = function(block) {
  Blockly.Python.definitions_["import_ds1302"] = "import ds1302";
  Blockly.Python.definitions_["registry_ds1302_instances"] = "ds1302_instances = {}";
  var id = Blockly.Python.valueToCode(block, "id", Blockly.Python.ORDER_ATOMIC);
  var year = Blockly.Python.valueToCode(block, "year", Blockly.Python.ORDER_ATOMIC);
  var month = Blockly.Python.valueToCode(block, "month", Blockly.Python.ORDER_ATOMIC);
  var day = Blockly.Python.valueToCode(block, "day", Blockly.Python.ORDER_ATOMIC);
  var hour = Blockly.Python.valueToCode(block, "hour", Blockly.Python.ORDER_ATOMIC);
  var minute = Blockly.Python.valueToCode(block, "minute", Blockly.Python.ORDER_ATOMIC);
  var second = Blockly.Python.valueToCode(block, "second", Blockly.Python.ORDER_ATOMIC);
  var code = "ds1302_instances[" + id + "].set_time(" + year + ", " + month + ", " + day + ", " + hour + ", " + minute + ", " + second + ")" + "\n";
  return code;
};
