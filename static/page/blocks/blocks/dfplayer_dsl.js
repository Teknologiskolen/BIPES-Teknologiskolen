Blockly.Blocks["dfplayer__create"] = {
  init: function() {
    this.appendDummyInput().appendField("Create DF Player");
    this.appendValueInput("uart_id").setCheck("Number").appendField("UART ID");
    this.appendValueInput("tx_pin").setCheck("Number").appendField("TX Pin");
    this.appendValueInput("rx_pin").setCheck("Number").appendField("RX Pin");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(300);
    this.setInputsInline(true);
    this.setTooltip("Create a DFPlayer Mini instance.");
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
    this.setInputsInline(true);
    this.setTooltip("Play a track by number (1\u20133000).");
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
    this.setInputsInline(true);
    this.setTooltip("Play a track from a numbered folder (folder 1\u201399, track 1\u2013255).");
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
    this.setInputsInline(true);
    this.setTooltip("Play a track from the /mp3 folder (track 1\u20139999).");
    this.setHelpUrl("https://github.com/mannbro/PicoDFPlayer");
  }
};

Blockly.Blocks["dfplayer__pause"] = {
  init: function() {
    this.appendDummyInput().appendField("Pause");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(300);
    this.setInputsInline(true);
    this.setTooltip("Pause playback.");
    this.setHelpUrl("https://github.com/mannbro/PicoDFPlayer");
  }
};

Blockly.Blocks["dfplayer__resume"] = {
  init: function() {
    this.appendDummyInput().appendField("Resume");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(300);
    this.setInputsInline(true);
    this.setTooltip("Resume playback.");
    this.setHelpUrl("https://github.com/mannbro/PicoDFPlayer");
  }
};

Blockly.Blocks["dfplayer__stop"] = {
  init: function() {
    this.appendDummyInput().appendField("Stop");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(300);
    this.setInputsInline(true);
    this.setTooltip("Stop playback.");
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
    this.setInputsInline(true);
    this.setTooltip("Enable or disable looping of the current track.");
    this.setHelpUrl("https://github.com/mannbro/PicoDFPlayer");
  }
};

Blockly.Blocks["dfplayer__next"] = {
  init: function() {
    this.appendDummyInput().appendField("Next");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(300);
    this.setInputsInline(true);
    this.setTooltip("Skip to the next track.");
    this.setHelpUrl("https://github.com/mannbro/PicoDFPlayer");
  }
};

Blockly.Blocks["dfplayer__prev"] = {
  init: function() {
    this.appendDummyInput().appendField("Prev");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(300);
    this.setInputsInline(true);
    this.setTooltip("Go back to the previous track.");
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
    this.setInputsInline(true);
    this.setTooltip("Set the volume level (0\u201330).");
    this.setHelpUrl("https://github.com/mannbro/PicoDFPlayer");
  }
};

Blockly.Blocks["dfplayer__volume_up"] = {
  init: function() {
    this.appendDummyInput().appendField("Volume Up");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(300);
    this.setInputsInline(true);
    this.setTooltip("Increase the volume by one step.");
    this.setHelpUrl("https://github.com/mannbro/PicoDFPlayer");
  }
};

Blockly.Blocks["dfplayer__volume_down"] = {
  init: function() {
    this.appendDummyInput().appendField("Volume Down");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(300);
    this.setInputsInline(true);
    this.setTooltip("Decrease the volume by one step.");
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
    this.setInputsInline(true);
    this.setTooltip("Set the equalizer preset.");
    this.setHelpUrl("https://github.com/mannbro/PicoDFPlayer");
  }
};

Blockly.Blocks["dfplayer__reset"] = {
  init: function() {
    this.appendDummyInput().appendField("Reset");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(300);
    this.setInputsInline(true);
    this.setTooltip("Reset the DFPlayer module.");
    this.setHelpUrl("https://github.com/mannbro/PicoDFPlayer");
  }
};

Blockly.Blocks["dfplayer__sleep"] = {
  init: function() {
    this.appendDummyInput().appendField("Sleep");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(300);
    this.setInputsInline(true);
    this.setTooltip("Put the DFPlayer into standby mode.");
    this.setHelpUrl("https://github.com/mannbro/PicoDFPlayer");
  }
};

Blockly.Blocks["dfplayer__wake"] = {
  init: function() {
    this.appendDummyInput().appendField("Wake");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(300);
    this.setInputsInline(true);
    this.setTooltip("Wake the DFPlayer from standby mode.");
    this.setHelpUrl("https://github.com/mannbro/PicoDFPlayer");
  }
};
