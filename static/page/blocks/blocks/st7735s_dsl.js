Blockly.Blocks["color565"] = {
  init: function() {
    this.appendDummyInput().appendField("Color 565");
    this.appendValueInput("r").setCheck("Number").appendField("R");
    this.appendValueInput("g").setCheck("Number").appendField("G");
    this.appendValueInput("b").setCheck("Number").appendField("B");
    this.setOutput(true, null);
    this.setColour(210);
    this.setInputsInline(false);
    this.setTooltip("Convert RGB888 values into a 16-bit display color.");
    this.setHelpUrl("");
  }
};

Blockly.Blocks["st7735_s__create"] = {
  init: function() {
    this.appendDummyInput().appendField("Create ST7735S");
    this.appendValueInput("dc_pin").setCheck("Number").appendField("DC Pin");
    this.appendValueInput("sck_pin").setCheck("Number").appendField("SCK Pin");
    this.appendValueInput("mosi_pin").setCheck("Number").appendField("MOSI Pin");
    this.appendValueInput("rst_pin").setCheck("Number").appendField("RST Pin");
    this.appendValueInput("cs_pin").setCheck("Number").appendField("CS Pin");
    this.appendValueInput("width").setCheck("Number").appendField("Width");
    this.appendValueInput("height").setCheck("Number").appendField("Height");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(210);
    this.setInputsInline(false);
    this.setTooltip("Create an ST7735S display instance.");
    this.setHelpUrl("https://github.com/micropython/micropython");
  }
};

Blockly.Blocks["st7735_s__fill"] = {
  init: function() {
    this.appendDummyInput().appendField("Fill");
    this.appendValueInput("color").setCheck("Number").appendField("Color");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(210);
    this.setInputsInline(false);
    this.setTooltip("");
    this.setHelpUrl("https://github.com/micropython/micropython");
  }
};

Blockly.Blocks["st7735_s__fill_rect"] = {
  init: function() {
    this.appendDummyInput().appendField("Fill Rect");
    this.appendValueInput("x").setCheck("Number").appendField("X");
    this.appendValueInput("y").setCheck("Number").appendField("Y");
    this.appendValueInput("w").setCheck("Number").appendField("W");
    this.appendValueInput("h").setCheck("Number").appendField("H");
    this.appendValueInput("color").setCheck("Number").appendField("Color");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(210);
    this.setInputsInline(false);
    this.setTooltip("");
    this.setHelpUrl("https://github.com/micropython/micropython");
  }
};

Blockly.Blocks["st7735_s__pixel"] = {
  init: function() {
    this.appendDummyInput().appendField("Pixel");
    this.appendValueInput("x").setCheck("Number").appendField("X");
    this.appendValueInput("y").setCheck("Number").appendField("Y");
    this.appendValueInput("color").setCheck("Number").appendField("Color");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(210);
    this.setInputsInline(false);
    this.setTooltip("");
    this.setHelpUrl("https://github.com/micropython/micropython");
  }
};

Blockly.Blocks["st7735_s__hline"] = {
  init: function() {
    this.appendDummyInput().appendField("Hline");
    this.appendValueInput("x").setCheck("Number").appendField("X");
    this.appendValueInput("y").setCheck("Number").appendField("Y");
    this.appendValueInput("w").setCheck("Number").appendField("W");
    this.appendValueInput("color").setCheck("Number").appendField("Color");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(210);
    this.setInputsInline(false);
    this.setTooltip("");
    this.setHelpUrl("https://github.com/micropython/micropython");
  }
};

Blockly.Blocks["st7735_s__vline"] = {
  init: function() {
    this.appendDummyInput().appendField("Vline");
    this.appendValueInput("x").setCheck("Number").appendField("X");
    this.appendValueInput("y").setCheck("Number").appendField("Y");
    this.appendValueInput("h").setCheck("Number").appendField("H");
    this.appendValueInput("color").setCheck("Number").appendField("Color");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(210);
    this.setInputsInline(false);
    this.setTooltip("");
    this.setHelpUrl("https://github.com/micropython/micropython");
  }
};

Blockly.Blocks["st7735_s__rect"] = {
  init: function() {
    this.appendDummyInput().appendField("Rect");
    this.appendValueInput("x").setCheck("Number").appendField("X");
    this.appendValueInput("y").setCheck("Number").appendField("Y");
    this.appendValueInput("w").setCheck("Number").appendField("W");
    this.appendValueInput("h").setCheck("Number").appendField("H");
    this.appendValueInput("color").setCheck("Number").appendField("Color");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(210);
    this.setInputsInline(false);
    this.setTooltip("");
    this.setHelpUrl("https://github.com/micropython/micropython");
  }
};

Blockly.Blocks["st7735_s__line"] = {
  init: function() {
    this.appendDummyInput().appendField("Line");
    this.appendValueInput("x0").setCheck("Number").appendField("X 0");
    this.appendValueInput("y0").setCheck("Number").appendField("Y 0");
    this.appendValueInput("x1").setCheck("Number").appendField("X 1");
    this.appendValueInput("y1").setCheck("Number").appendField("Y 1");
    this.appendValueInput("color").setCheck("Number").appendField("Color");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(210);
    this.setInputsInline(false);
    this.setTooltip("");
    this.setHelpUrl("https://github.com/micropython/micropython");
  }
};

Blockly.Blocks["st7735_s__text"] = {
  init: function() {
    this.appendDummyInput().appendField("Text");
    this.appendValueInput("string").appendField("String");
    this.appendValueInput("x").setCheck("Number").appendField("X");
    this.appendValueInput("y").setCheck("Number").appendField("Y");
    this.appendValueInput("color").setCheck("Number").appendField("Color");
    this.appendValueInput("size").setCheck("Number").appendField("Size");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(210);
    this.setInputsInline(false);
    this.setTooltip("");
    this.setHelpUrl("https://github.com/micropython/micropython");
  }
};
