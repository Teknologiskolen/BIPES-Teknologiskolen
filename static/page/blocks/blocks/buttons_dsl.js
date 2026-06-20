Blockly.Blocks["button_hub__create"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_CREATE_BUTTON_HUB"]||"Create Button Hub"));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(20);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_BUTTON_HUB_CREATE"]||"Create the button manager (once, before adding buttons)."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["button_hub__add"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_ADD"]||"Add"));
    this.appendValueInput("pin").setCheck("Number").appendField((Blockly.Msg["BLBL_PIN"]||"Pin"));
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_PULL"]||"Pull")).appendField(new Blockly.FieldDropdown([["pull-down", "down"], ["pull-up", "up"], ["none", "none"]]), "pull");
    this.appendValueInput("debounce_ms").setCheck("Number").appendField((Blockly.Msg["BLBL_DEBOUNCE_MS"]||"Debounce Ms"));
    this.appendValueInput("hold_ms").setCheck("Number").appendField((Blockly.Msg["BLBL_HOLD_MS"]||"Hold Ms"));
    this.appendValueInput("repeat_ms").setCheck("Number").appendField((Blockly.Msg["BLBL_REPEAT_MS"]||"Repeat Ms"));
    this.appendValueInput("double_ms").setCheck("Number").appendField((Blockly.Msg["BLBL_DOUBLE_MS"]||"Double Ms"));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(20);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_BUTTON_HUB_ADD"]||"Add a button on a pin. Pull-down = wired to 3V3; pull-up = wired to GND."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["button_hub__was_pressed"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_WAS_PRESSED"]||"Was Pressed"));
    this.appendValueInput("pin").setCheck("Number").appendField((Blockly.Msg["BLBL_PIN"]||"Pin"));
    this.setOutput(true, null);
    this.setColour(20);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_BUTTON_HUB_WAS_PRESSED"]||"True ONCE each time the button on this pin is pressed."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["button_hub__was_double_clicked"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_WAS_DOUBLE_CLICKED"]||"Was Double Clicked"));
    this.appendValueInput("pin").setCheck("Number").appendField((Blockly.Msg["BLBL_PIN"]||"Pin"));
    this.setOutput(true, null);
    this.setColour(20);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_BUTTON_HUB_WAS_DOUBLE_CLICKED"]||"True ONCE when the button on this pin is pressed twice quickly (within double_ms)."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["button_hub__was_clicked"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_WAS_CLICKED"]||"Was Clicked"));
    this.appendValueInput("pin").setCheck("Number").appendField((Blockly.Msg["BLBL_PIN"]||"Pin"));
    this.setOutput(true, null);
    this.setColour(20);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_BUTTON_HUB_WAS_CLICKED"]||"True ONCE for a confirmed SINGLE click (a lone press with no quick second press). Pairs with 'was double clicked'."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["button_hub__was_released"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_WAS_RELEASED"]||"Was Released"));
    this.appendValueInput("pin").setCheck("Number").appendField((Blockly.Msg["BLBL_PIN"]||"Pin"));
    this.setOutput(true, null);
    this.setColour(20);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_BUTTON_HUB_WAS_RELEASED"]||"True ONCE each time the button on this pin is released."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["button_hub__is_down"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_IS_DOWN"]||"Is Down"));
    this.appendValueInput("pin").setCheck("Number").appendField((Blockly.Msg["BLBL_PIN"]||"Pin"));
    this.setOutput(true, null);
    this.setColour(20);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_BUTTON_HUB_IS_DOWN"]||"True while the button on this pin is held down."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["button_hub__is_held"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_IS_HELD"]||"Is Held"));
    this.appendValueInput("pin").setCheck("Number").appendField((Blockly.Msg["BLBL_PIN"]||"Pin"));
    this.setOutput(true, null);
    this.setColour(20);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_BUTTON_HUB_IS_HELD"]||"True once the button has been held past its hold threshold."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["button_hub__repeated"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_REPEATED"]||"Repeated"));
    this.appendValueInput("pin").setCheck("Number").appendField((Blockly.Msg["BLBL_PIN"]||"Pin"));
    this.setOutput(true, null);
    this.setColour(20);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_BUTTON_HUB_REPEATED"]||"Auto-repeat: fires repeatedly while the button is held (after the hold threshold)."));
    this.setHelpUrl("https://github.com/bipes");
  }
};
