Blockly.Blocks["state_machine__create"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_CREATE_STATE_MACHINE"]||"Create State Machine"));
    this.appendValueInput("start").setCheck("String").appendField((Blockly.Msg["BLBL_START"]||"Start"));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(290);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_STATE_MACHINE_CREATE"]||"Create the state machine with a starting state name."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["state_machine__add_rule"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_ADD_RULE"]||"Add Rule"));
    this.appendValueInput("state").setCheck("String").appendField((Blockly.Msg["BLBL_STATE"]||"State"));
    this.appendValueInput("event").setCheck("String").appendField((Blockly.Msg["BLBL_EVENT"]||"Event"));
    this.appendValueInput("next_state").setCheck("String").appendField((Blockly.Msg["BLBL_NEXT_STATE"]||"Next State"));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(290);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_STATE_MACHINE_ADD_RULE"]||"Add a rule: in <state>, on <event>, go to <next state>."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["state_machine__feed"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_FEED"]||"Feed"));
    this.appendValueInput("event").setCheck("String").appendField((Blockly.Msg["BLBL_EVENT"]||"Event"));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(290);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_STATE_MACHINE_FEED"]||"Apply the matching rule for an event (G3 table-driven)."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["state_machine__go"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_GO"]||"Go"));
    this.appendValueInput("name").setCheck("String").appendField((Blockly.Msg["BLBL_NAME"]||"Name"));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(290);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_STATE_MACHINE_GO"]||"Go straight to a state (G2 explicit)."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["state_machine__state"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_STATE"]||"State"));
    this.setOutput(true, null);
    this.setColour(290);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_STATE_MACHINE_STATE"]||"The current state name."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["state_machine__is_state"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_IS_STATE"]||"Is State"));
    this.appendValueInput("name").setCheck("String").appendField((Blockly.Msg["BLBL_NAME"]||"Name"));
    this.setOutput(true, null);
    this.setColour(290);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_STATE_MACHINE_IS_STATE"]||"True if the machine is in this state."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["state_machine__entered"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_ENTERED"]||"Entered"));
    this.appendValueInput("name").setCheck("String").appendField((Blockly.Msg["BLBL_NAME"]||"Name"));
    this.setOutput(true, null);
    this.setColour(290);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_STATE_MACHINE_ENTERED"]||"True only on the first frame after entering this state (entry actions / clear)."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["state_machine__changed"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_CHANGED"]||"Changed"));
    this.setOutput(true, null);
    this.setColour(290);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_STATE_MACHINE_CHANGED"]||"True on the first frame after ANY state change."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["state_machine__tick"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_TICK"]||"Tick"));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(290);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_STATE_MACHINE_TICK"]||"Call once at the END of the loop so entered()/changed() work next frame."));
    this.setHelpUrl("https://github.com/bipes");
  }
};
