Blockly.Blocks["dfplayer__create"] = {
  init: function() {
    this.appendDummyInput().appendField("Create DF Player");
    this.appendValueInput("uart_id").setCheck("Number").appendField("UART ID");
    this.appendValueInput("tx_pin").setCheck("Number").appendField("TX Pin");
    this.appendValueInput("rx_pin").setCheck("Number").appendField("RX Pin");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(300);
    this.setInputsInline(false);
    this.setTooltip("Create a DFPlayer instance.");
    this.setHelpUrl("https://github.com/mannbro/PicoDFPlayer");
  }
};

Blockly.Blocks["dfplayer__play"] = {
  init: function() {
    this.appendDummyInput().appendField("Play");
    this.appendValueInput("track").setCheck("Number").appendField("Track");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(300);
    this.setInputsInline(false);
    this.setTooltip("");
    this.setHelpUrl("https://github.com/mannbro/PicoDFPlayer");
  }
};

Blockly.Blocks["dfplayer__play_folder"] = {
  init: function() {
    this.appendDummyInput().appendField("Play Folder");
    this.appendValueInput("folder").setCheck("Number").appendField("Folder");
    this.appendValueInput("track").setCheck("Number").appendField("Track");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(300);
    this.setInputsInline(false);
    this.setTooltip("");
    this.setHelpUrl("https://github.com/mannbro/PicoDFPlayer");
  }
};

Blockly.Blocks["dfplayer__play_mp3"] = {
  init: function() {
    this.appendDummyInput().appendField("Play Mp 3");
    this.appendValueInput("track").setCheck("Number").appendField("Track");
    this.appendValueInput("loop").setCheck("Boolean").appendField("Loop");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(300);
    this.setInputsInline(false);
    this.setTooltip("");
    this.setHelpUrl("https://github.com/mannbro/PicoDFPlayer");
  }
};

Blockly.Blocks["dfplayer__pause"] = {
  init: function() {
    this.appendDummyInput().appendField("Pause");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(300);
    this.setInputsInline(false);
    this.setTooltip("");
    this.setHelpUrl("https://github.com/mannbro/PicoDFPlayer");
  }
};

Blockly.Blocks["dfplayer__resume"] = {
  init: function() {
    this.appendDummyInput().appendField("Resume");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(300);
    this.setInputsInline(false);
    this.setTooltip("");
    this.setHelpUrl("https://github.com/mannbro/PicoDFPlayer");
  }
};

Blockly.Blocks["dfplayer__stop"] = {
  init: function() {
    this.appendDummyInput().appendField("Stop");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(300);
    this.setInputsInline(false);
    this.setTooltip("");
    this.setHelpUrl("https://github.com/mannbro/PicoDFPlayer");
  }
};

Blockly.Blocks["dfplayer__loop_current"] = {
  init: function() {
    this.appendDummyInput().appendField("Loop Current");
    this.appendValueInput("enable").setCheck("Boolean").appendField("Enable");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(300);
    this.setInputsInline(false);
    this.setTooltip("");
    this.setHelpUrl("https://github.com/mannbro/PicoDFPlayer");
  }
};

Blockly.Blocks["dfplayer__next"] = {
  init: function() {
    this.appendDummyInput().appendField("Next");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(300);
    this.setInputsInline(false);
    this.setTooltip("");
    this.setHelpUrl("https://github.com/mannbro/PicoDFPlayer");
  }
};

Blockly.Blocks["dfplayer__prev"] = {
  init: function() {
    this.appendDummyInput().appendField("Prev");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(300);
    this.setInputsInline(false);
    this.setTooltip("");
    this.setHelpUrl("https://github.com/mannbro/PicoDFPlayer");
  }
};

Blockly.Blocks["dfplayer__volume"] = {
  init: function() {
    this.appendDummyInput().appendField("Volume");
    this.appendValueInput("level").setCheck("Number").appendField("Level");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(300);
    this.setInputsInline(false);
    this.setTooltip("");
    this.setHelpUrl("https://github.com/mannbro/PicoDFPlayer");
  }
};

Blockly.Blocks["dfplayer__volume_up"] = {
  init: function() {
    this.appendDummyInput().appendField("Volume Up");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(300);
    this.setInputsInline(false);
    this.setTooltip("");
    this.setHelpUrl("https://github.com/mannbro/PicoDFPlayer");
  }
};

Blockly.Blocks["dfplayer__volume_down"] = {
  init: function() {
    this.appendDummyInput().appendField("Volume Down");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(300);
    this.setInputsInline(false);
    this.setTooltip("");
    this.setHelpUrl("https://github.com/mannbro/PicoDFPlayer");
  }
};

Blockly.Blocks["dfplayer__eq"] = {
  init: function() {
    this.appendDummyInput().appendField("Eq");
    this.appendDummyInput().appendField("Mode").appendField(new Blockly.FieldDropdown([["Normal", "0"], ["Pop", "1"], ["Rock", "2"], ["Jazz", "3"], ["Classic", "4"], ["Bass", "5"]]), "mode");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(300);
    this.setInputsInline(false);
    this.setTooltip("");
    this.setHelpUrl("https://github.com/mannbro/PicoDFPlayer");
  }
};

Blockly.Blocks["dfplayer__reset"] = {
  init: function() {
    this.appendDummyInput().appendField("Reset");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(300);
    this.setInputsInline(false);
    this.setTooltip("");
    this.setHelpUrl("https://github.com/mannbro/PicoDFPlayer");
  }
};

Blockly.Blocks["dfplayer__sleep"] = {
  init: function() {
    this.appendDummyInput().appendField("Sleep");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(300);
    this.setInputsInline(false);
    this.setTooltip("");
    this.setHelpUrl("https://github.com/mannbro/PicoDFPlayer");
  }
};

Blockly.Blocks["dfplayer__wake"] = {
  init: function() {
    this.appendDummyInput().appendField("Wake");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(300);
    this.setInputsInline(false);
    this.setTooltip("");
    this.setHelpUrl("https://github.com/mannbro/PicoDFPlayer");
  }
};
