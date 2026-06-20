Blockly.Blocks["st7735_s__create"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_CREATE_ST7735S"]||"Create ST7735S"));
    this.appendValueInput("spi").appendField((Blockly.Msg["BLBL_SPI"]||"SPI"));
    this.appendValueInput("dc").setCheck("Number").appendField((Blockly.Msg["BLBL_DC"]||"DC"));
    this.appendValueInput("rst").setCheck("Number").appendField((Blockly.Msg["BLBL_RST"]||"RST"));
    this.appendValueInput("cs").setCheck("Number").appendField((Blockly.Msg["BLBL_CS"]||"CS"));
    this.appendValueInput("width").setCheck("Number").appendField((Blockly.Msg["BLBL_WIDTH"]||"Width"));
    this.appendValueInput("height").setCheck("Number").appendField((Blockly.Msg["BLBL_HEIGHT"]||"Height"));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(45);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_ST7735_S_CREATE"]||"Create an ST7735S display (give it an SPI object and the DC/RST/CS pins)."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["st7735_s__fill"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_FILL"]||"Fill"));
    this.appendValueInput("color").setCheck("Number").appendField((Blockly.Msg["BLBL_COLOR"]||"Color"));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(45);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_ST7735_S_FILL"]||"Fill the whole screen with a colour."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["st7735_s__fill_rect"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_FILL_RECT"]||"Fill Rect"));
    this.appendValueInput("x").setCheck("Number").appendField((Blockly.Msg["BLBL_X"]||"X"));
    this.appendValueInput("y").setCheck("Number").appendField((Blockly.Msg["BLBL_Y"]||"Y"));
    this.appendValueInput("w").setCheck("Number").appendField((Blockly.Msg["BLBL_W"]||"W"));
    this.appendValueInput("h").setCheck("Number").appendField((Blockly.Msg["BLBL_H"]||"H"));
    this.appendValueInput("color").setCheck("Number").appendField((Blockly.Msg["BLBL_COLOR"]||"Color"));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(45);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_ST7735_S_FILL_RECT"]||"Fill a rectangle with a colour."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["st7735_s__pixel"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_PIXEL"]||"Pixel"));
    this.appendValueInput("x").setCheck("Number").appendField((Blockly.Msg["BLBL_X"]||"X"));
    this.appendValueInput("y").setCheck("Number").appendField((Blockly.Msg["BLBL_Y"]||"Y"));
    this.appendValueInput("color").setCheck("Number").appendField((Blockly.Msg["BLBL_COLOR"]||"Color"));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(45);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_ST7735_S_PIXEL"]||"Set one pixel to a colour."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["st7735_s__hline"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_HLINE"]||"Hline"));
    this.appendValueInput("x").setCheck("Number").appendField((Blockly.Msg["BLBL_X"]||"X"));
    this.appendValueInput("y").setCheck("Number").appendField((Blockly.Msg["BLBL_Y"]||"Y"));
    this.appendValueInput("w").setCheck("Number").appendField((Blockly.Msg["BLBL_W"]||"W"));
    this.appendValueInput("color").setCheck("Number").appendField((Blockly.Msg["BLBL_COLOR"]||"Color"));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(45);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_ST7735_S_HLINE"]||"Draw a horizontal line."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["st7735_s__vline"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_VLINE"]||"Vline"));
    this.appendValueInput("x").setCheck("Number").appendField((Blockly.Msg["BLBL_X"]||"X"));
    this.appendValueInput("y").setCheck("Number").appendField((Blockly.Msg["BLBL_Y"]||"Y"));
    this.appendValueInput("h").setCheck("Number").appendField((Blockly.Msg["BLBL_H"]||"H"));
    this.appendValueInput("color").setCheck("Number").appendField((Blockly.Msg["BLBL_COLOR"]||"Color"));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(45);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_ST7735_S_VLINE"]||"Draw a vertical line."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["st7735_s__rect"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_RECT"]||"Rect"));
    this.appendValueInput("x").setCheck("Number").appendField((Blockly.Msg["BLBL_X"]||"X"));
    this.appendValueInput("y").setCheck("Number").appendField((Blockly.Msg["BLBL_Y"]||"Y"));
    this.appendValueInput("w").setCheck("Number").appendField((Blockly.Msg["BLBL_W"]||"W"));
    this.appendValueInput("h").setCheck("Number").appendField((Blockly.Msg["BLBL_H"]||"H"));
    this.appendValueInput("color").setCheck("Number").appendField((Blockly.Msg["BLBL_COLOR"]||"Color"));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(45);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_ST7735_S_RECT"]||"Draw a rectangle outline."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["st7735_s__line"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_LINE"]||"Line"));
    this.appendValueInput("x0").setCheck("Number").appendField((Blockly.Msg["BLBL_X_0"]||"X 0"));
    this.appendValueInput("y0").setCheck("Number").appendField((Blockly.Msg["BLBL_Y_0"]||"Y 0"));
    this.appendValueInput("x1").setCheck("Number").appendField((Blockly.Msg["BLBL_X_1"]||"X 1"));
    this.appendValueInput("y1").setCheck("Number").appendField((Blockly.Msg["BLBL_Y_1"]||"Y 1"));
    this.appendValueInput("color").setCheck("Number").appendField((Blockly.Msg["BLBL_COLOR"]||"Color"));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(45);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_ST7735_S_LINE"]||"Draw a line between two points."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["st7735_s__text"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_TEXT"]||"Text"));
    this.appendValueInput("string").setCheck("String").appendField((Blockly.Msg["BLBL_STRING"]||"String"));
    this.appendValueInput("x").setCheck("Number").appendField((Blockly.Msg["BLBL_X"]||"X"));
    this.appendValueInput("y").setCheck("Number").appendField((Blockly.Msg["BLBL_Y"]||"Y"));
    this.appendValueInput("color").setCheck("Number").appendField((Blockly.Msg["BLBL_COLOR"]||"Color"));
    this.appendValueInput("size").setCheck("Number").appendField((Blockly.Msg["BLBL_SIZE"]||"Size"));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(45);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_ST7735_S_TEXT"]||"Draw text at (x, y)."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["color565"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_COLOR_565"]||"Color 565"));
    this.appendValueInput("r").setCheck("Number").appendField((Blockly.Msg["BLBL_R"]||"R"));
    this.appendValueInput("g").setCheck("Number").appendField((Blockly.Msg["BLBL_G"]||"G"));
    this.appendValueInput("b").setCheck("Number").appendField((Blockly.Msg["BLBL_B"]||"B"));
    this.setOutput(true, null);
    this.setColour(45);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_COLOR565"]||"Make a 16-bit colour from red/green/blue (0-255)."));
    this.setHelpUrl("https://github.com/bipes");
  }
};
