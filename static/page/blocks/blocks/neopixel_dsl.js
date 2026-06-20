Blockly.Blocks["neopixel__create"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_CREATE_NEOPIXEL"]||"Create Neopixel"));
    this.appendValueInput("id").setCheck("Number").appendField((Blockly.Msg["BLBL_ID"]||"ID #"));
    this.appendValueInput("number").setCheck("Number").appendField((Blockly.Msg["BLBL_NUMBER"]||"Number"));
    this.appendValueInput("state_machine").setCheck("Number").appendField((Blockly.Msg["BLBL_STATE_MACHINE"]||"State Machine"));
    this.appendValueInput("pin").setCheck("Number").appendField((Blockly.Msg["BLBL_PIN"]||"Pin"));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(45);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_NEOPIXEL_CREATE"]||"Create a NeoPixel strip (number of LEDs, PIO state machine 0-7, data pin)."));
    this.setHelpUrl("https://github.com/blaz-r/pi_pico_neopixel");
  }
};

Blockly.Blocks["neopixel__brightness"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_BRIGHTNESS"]||"Brightness"));
    this.appendValueInput("id").setCheck("Number").appendField((Blockly.Msg["BLBL_ID"]||"ID #"));
    this.appendValueInput("brightness").setCheck("Number").appendField((Blockly.Msg["BLBL_BRIGHTNESS"]||"Brightness"));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(45);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_NEOPIXEL_BRIGHTNESS"]||"Set the overall strip brightness (1-255)."));
    this.setHelpUrl("https://github.com/blaz-r/pi_pico_neopixel");
  }
};

Blockly.Blocks["neopixel__set_pixel"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_SET_PIXEL"]||"Set Pixel"));
    this.appendValueInput("id").setCheck("Number").appendField((Blockly.Msg["BLBL_ID"]||"ID #"));
    this.appendValueInput("pixel_num").setCheck("Number").appendField((Blockly.Msg["BLBL_PIXEL_NUM"]||"Pixel Num"));
    this.appendValueInput("rgb_w").appendField((Blockly.Msg["BLBL_RGB_W"]||"RGB W"));
    this.appendValueInput("how_bright").setCheck("Number").appendField((Blockly.Msg["BLBL_HOW_BRIGHT"]||"How Bright"));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(45);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_NEOPIXEL_SET_PIXEL"]||"Set one LED to a colour (connect a colour block)."));
    this.setHelpUrl("https://github.com/blaz-r/pi_pico_neopixel");
  }
};

Blockly.Blocks["neopixel__set_pixel_line"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_SET_PIXEL_LINE"]||"Set Pixel Line"));
    this.appendValueInput("id").setCheck("Number").appendField((Blockly.Msg["BLBL_ID"]||"ID #"));
    this.appendValueInput("pixel1").setCheck("Number").appendField((Blockly.Msg["BLBL_PIXEL_1"]||"Pixel 1"));
    this.appendValueInput("pixel2").setCheck("Number").appendField((Blockly.Msg["BLBL_PIXEL_2"]||"Pixel 2"));
    this.appendValueInput("rgb_w").appendField((Blockly.Msg["BLBL_RGB_W"]||"RGB W"));
    this.appendValueInput("how_bright").setCheck("Number").appendField((Blockly.Msg["BLBL_HOW_BRIGHT"]||"How Bright"));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(45);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_NEOPIXEL_SET_PIXEL_LINE"]||"Set a range of LEDs to a colour."));
    this.setHelpUrl("https://github.com/blaz-r/pi_pico_neopixel");
  }
};

Blockly.Blocks["neopixel__set_pixel_line_gradient"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_SET_PIXEL_LINE_GRADIENT"]||"Set Pixel Line Gradient"));
    this.appendValueInput("id").setCheck("Number").appendField((Blockly.Msg["BLBL_ID"]||"ID #"));
    this.appendValueInput("pixel1").setCheck("Number").appendField((Blockly.Msg["BLBL_PIXEL_1"]||"Pixel 1"));
    this.appendValueInput("pixel2").setCheck("Number").appendField((Blockly.Msg["BLBL_PIXEL_2"]||"Pixel 2"));
    this.appendValueInput("left_rgb_w").appendField((Blockly.Msg["BLBL_LEFT_RGB_W"]||"Left RGB W"));
    this.appendValueInput("right_rgb_w").appendField((Blockly.Msg["BLBL_RIGHT_RGB_W"]||"Right RGB W"));
    this.appendValueInput("how_bright").setCheck("Number").appendField((Blockly.Msg["BLBL_HOW_BRIGHT"]||"How Bright"));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(45);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_NEOPIXEL_SET_PIXEL_LINE_GRADIENT"]||"Fade a range of LEDs from one colour to another."));
    this.setHelpUrl("https://github.com/blaz-r/pi_pico_neopixel");
  }
};

Blockly.Blocks["neopixel__rotate_left"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_ROTATE_LEFT"]||"Rotate Left"));
    this.appendValueInput("id").setCheck("Number").appendField((Blockly.Msg["BLBL_ID"]||"ID #"));
    this.appendValueInput("num_of_pixels").setCheck("Number").appendField((Blockly.Msg["BLBL_NUM_OF_PIXELS"]||"Num Of Pixels"));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(45);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_NEOPIXEL_ROTATE_LEFT"]||"Shift all LEDs left by a number of steps."));
    this.setHelpUrl("https://github.com/blaz-r/pi_pico_neopixel");
  }
};

Blockly.Blocks["neopixel__rotate_right"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_ROTATE_RIGHT"]||"Rotate Right"));
    this.appendValueInput("id").setCheck("Number").appendField((Blockly.Msg["BLBL_ID"]||"ID #"));
    this.appendValueInput("num_of_pixels").setCheck("Number").appendField((Blockly.Msg["BLBL_NUM_OF_PIXELS"]||"Num Of Pixels"));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(45);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_NEOPIXEL_ROTATE_RIGHT"]||"Shift all LEDs right by a number of steps."));
    this.setHelpUrl("https://github.com/blaz-r/pi_pico_neopixel");
  }
};

Blockly.Blocks["neopixel__show"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_SHOW"]||"Show"));
    this.appendValueInput("id").setCheck("Number").appendField((Blockly.Msg["BLBL_ID"]||"ID #"));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(45);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_NEOPIXEL_SHOW"]||"Send the pixel buffer to the strip (refresh). Call after setting pixels."));
    this.setHelpUrl("https://github.com/blaz-r/pi_pico_neopixel");
  }
};
