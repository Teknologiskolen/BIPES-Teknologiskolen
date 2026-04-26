Blockly.Blocks["create_spi"] = {
  init: function() {
    this.appendDummyInput().appendField("Create Spi");
    this.appendValueInput("spi_id").setCheck("Number").appendField("Spi Id");
    this.appendValueInput("sck_pin").setCheck("Number").appendField("Sck Pin");
    this.appendValueInput("mosi_pin").setCheck("Number").appendField("Mosi Pin");
    this.appendValueInput("baudrate").setCheck("Number").appendField("Baudrate");
    this.appendValueInput("polarity").setCheck("Number").appendField("Polarity");
    this.appendValueInput("phase").setCheck("Number").appendField("Phase");
    this.setOutput(true, null);
    this.setColour(200);
    this.setInputsInline(false);
    this.setTooltip("Create an SPI object for display and device wrappers.");
    this.setHelpUrl("");
  }
};
