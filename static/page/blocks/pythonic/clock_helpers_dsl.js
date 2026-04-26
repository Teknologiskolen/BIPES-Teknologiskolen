Blockly.Python["create_spi"] = function(block) {
  Blockly.Python.definitions_["import_clock_helpers"] = "import clock_helpers";
  var spi_id = Blockly.Python.valueToCode(block, "spi_id", Blockly.Python.ORDER_ATOMIC);
  var sck_pin = Blockly.Python.valueToCode(block, "sck_pin", Blockly.Python.ORDER_ATOMIC);
  var mosi_pin = Blockly.Python.valueToCode(block, "mosi_pin", Blockly.Python.ORDER_ATOMIC);
  var baudrate = Blockly.Python.valueToCode(block, "baudrate", Blockly.Python.ORDER_ATOMIC);
  var polarity = Blockly.Python.valueToCode(block, "polarity", Blockly.Python.ORDER_ATOMIC);
  var phase = Blockly.Python.valueToCode(block, "phase", Blockly.Python.ORDER_ATOMIC);
  var code = "create_spi(" + spi_id + ", " + sck_pin + ", " + mosi_pin + ", " + baudrate + ", " + polarity + ", " + phase + ")" + "\n";
  return [code.trimEnd(), Blockly.Python.ORDER_NONE];
};
