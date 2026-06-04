Blockly.Blocks["st7735_s__create"] = {
  init: function() {
    this.appendDummyInput().appendField("Create ST7735S");
    this.appendValueInput("spi").setCheck("SPI").appendField("SPI");
    this.appendValueInput("dc").setCheck("Number").appendField("DC");
    this.appendValueInput("rst").setCheck("Number").appendField("RST");
    this.appendValueInput("cs").setCheck("Number").appendField("CS");
    this.appendValueInput("width").setCheck("Number").appendField("Width");
    this.appendValueInput("height").setCheck("Number").appendField("Height");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(210);
    this.setInputsInline(false);
    this.setTooltip("Create an ST7735S display instance. Pass an SPI bus object and the dc, rst and cs pins.");
    this.setHelpUrl("https://github.com/micropython/micropython");
  }
};

Blockly.Blocks["st7735_s__fill"] = {
  init: function() {
    this.appendDummyInput().appendField("Fill");
    this.appendValueInput("color").setCheck("Color565").appendField("Color");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(210);
    this.setInputsInline(true);
    this.setTooltip("Fill the entire display with a single color.");
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
    this.appendValueInput("color").setCheck("Color565").appendField("Color");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(210);
    this.setInputsInline(true);
    this.setTooltip("Fill a rectangle with a color.");
    this.setHelpUrl("https://github.com/micropython/micropython");
  }
};

Blockly.Blocks["st7735_s__pixel"] = {
  init: function() {
    this.appendDummyInput().appendField("Pixel");
    this.appendValueInput("x").setCheck("Number").appendField("X");
    this.appendValueInput("y").setCheck("Number").appendField("Y");
    this.appendValueInput("color").setCheck("Color565").appendField("Color");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(210);
    this.setInputsInline(true);
    this.setTooltip("Draw a single pixel.");
    this.setHelpUrl("https://github.com/micropython/micropython");
  }
};

Blockly.Blocks["st7735_s__hline"] = {
  init: function() {
    this.appendDummyInput().appendField("Hline");
    this.appendValueInput("x").setCheck("Number").appendField("X");
    this.appendValueInput("y").setCheck("Number").appendField("Y");
    this.appendValueInput("w").setCheck("Number").appendField("W");
    this.appendValueInput("color").setCheck("Color565").appendField("Color");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(210);
    this.setInputsInline(true);
    this.setTooltip("Draw a horizontal line.");
    this.setHelpUrl("https://github.com/micropython/micropython");
  }
};

Blockly.Blocks["st7735_s__vline"] = {
  init: function() {
    this.appendDummyInput().appendField("Vline");
    this.appendValueInput("x").setCheck("Number").appendField("X");
    this.appendValueInput("y").setCheck("Number").appendField("Y");
    this.appendValueInput("h").setCheck("Number").appendField("H");
    this.appendValueInput("color").setCheck("Color565").appendField("Color");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(210);
    this.setInputsInline(true);
    this.setTooltip("Draw a vertical line.");
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
    this.appendValueInput("color").setCheck("Color565").appendField("Color");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(210);
    this.setInputsInline(true);
    this.setTooltip("Draw a rectangle outline.");
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
    this.appendValueInput("color").setCheck("Color565").appendField("Color");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(210);
    this.setInputsInline(true);
    this.setTooltip("Draw a line between two points.");
    this.setHelpUrl("https://github.com/micropython/micropython");
  }
};

Blockly.Blocks["st7735_s__text"] = {
  init: function() {
    this.appendDummyInput().appendField("Text");
    this.appendValueInput("string").setCheck("String").appendField("String");
    this.appendValueInput("x").setCheck("Number").appendField("X");
    this.appendValueInput("y").setCheck("Number").appendField("Y");
    this.appendValueInput("color").setCheck("Color565").appendField("Color");
    this.appendValueInput("size").setCheck("Number").appendField("Size");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(210);
    this.setInputsInline(true);
    this.setTooltip("Draw a text string on the display.");
    this.setHelpUrl("https://github.com/micropython/micropython");
  }
};

Blockly.Blocks["color565"] = {
  init: function() {
    this.appendDummyInput().appendField("Color 565");
    this.appendValueInput("r").setCheck("Number").appendField("R");
    this.appendValueInput("g").setCheck("Number").appendField("G");
    this.appendValueInput("b").setCheck("Number").appendField("B");
    this.setOutput(true, ["Color565", "Number"]);
    this.setColour(210);
    this.setInputsInline(true);
    this.setTooltip("Convert RGB values (0\u2013255 each) to a 16-bit display color.");
    this.setHelpUrl("https://github.com/micropython/micropython");
  }
};
