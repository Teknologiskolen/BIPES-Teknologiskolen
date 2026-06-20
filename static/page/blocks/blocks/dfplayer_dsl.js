Blockly.Blocks["dfplayer__create"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_CREATE_DF_PLAYER"]||"Create DF Player"));
    this.appendValueInput("uart_id").setCheck("Number").appendField((Blockly.Msg["BLBL_UART_ID"]||"UART ID"));
    this.appendValueInput("tx_pin").setCheck("Number").appendField((Blockly.Msg["BLBL_TX_PIN"]||"TX Pin"));
    this.appendValueInput("rx_pin").setCheck("Number").appendField((Blockly.Msg["BLBL_RX_PIN"]||"RX Pin"));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(30);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_DFPLAYER_CREATE"]||"Create a DFPlayer MP3 module on a UART."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["dfplayer__play"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_PLAY"]||"Play"));
    this.appendValueInput("track").setCheck("Number").appendField((Blockly.Msg["BLBL_TRACK"]||"Track"));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(30);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_DFPLAYER_PLAY"]||"Play a track by number (1-3000)."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["dfplayer__play_folder"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_PLAY_FOLDER"]||"Play Folder"));
    this.appendValueInput("folder").setCheck("Number").appendField((Blockly.Msg["BLBL_FOLDER"]||"Folder"));
    this.appendValueInput("track").setCheck("Number").appendField((Blockly.Msg["BLBL_TRACK"]||"Track"));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(30);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_DFPLAYER_PLAY_FOLDER"]||"Play a track from a folder (folder 1-99, track 1-255)."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["dfplayer__play_mp3"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_PLAY_MP_3"]||"Play Mp 3"));
    this.appendValueInput("track").setCheck("Number").appendField((Blockly.Msg["BLBL_TRACK"]||"Track"));
    this.appendValueInput("loop").setCheck("Boolean").appendField((Blockly.Msg["BLBL_LOOP"]||"Loop"));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(30);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_DFPLAYER_PLAY_MP3"]||"Play a track from the /mp3 folder."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["dfplayer__pause"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_PAUSE"]||"Pause"));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(30);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_DFPLAYER_PAUSE"]||"Pause playback."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["dfplayer__resume"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_RESUME"]||"Resume"));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(30);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_DFPLAYER_RESUME"]||"Resume playback."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["dfplayer__stop"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_STOP"]||"Stop"));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(30);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_DFPLAYER_STOP"]||"Stop playback."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["dfplayer__loop_current"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_LOOP_CURRENT"]||"Loop Current"));
    this.appendValueInput("enable").setCheck("Boolean").appendField((Blockly.Msg["BLBL_ENABLE"]||"Enable"));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(30);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_DFPLAYER_LOOP_CURRENT"]||"Enable or disable looping the current track."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["dfplayer__next"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_NEXT"]||"Next"));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(30);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_DFPLAYER_NEXT"]||"Skip to the next track."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["dfplayer__prev"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_PREV"]||"Prev"));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(30);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_DFPLAYER_PREV"]||"Skip to the previous track."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["dfplayer__volume"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_VOLUME"]||"Volume"));
    this.appendValueInput("level").setCheck("Number").appendField((Blockly.Msg["BLBL_LEVEL"]||"Level"));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(30);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_DFPLAYER_VOLUME"]||"Set the volume level (0-30)."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["dfplayer__volume_up"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_VOLUME_UP"]||"Volume Up"));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(30);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_DFPLAYER_VOLUME_UP"]||"Increase the volume."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["dfplayer__volume_down"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_VOLUME_DOWN"]||"Volume Down"));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(30);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_DFPLAYER_VOLUME_DOWN"]||"Decrease the volume."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["dfplayer__eq"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_EQ"]||"Eq"));
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_MODE"]||"Mode")).appendField(new Blockly.FieldDropdown([["Normal", "0"], ["Pop", "1"], ["Rock", "2"], ["Jazz", "3"], ["Classic", "4"], ["Bass", "5"]]), "mode");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(30);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_DFPLAYER_EQ"]||"Set the equaliser mode."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["dfplayer__reset"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_RESET"]||"Reset"));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(30);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_DFPLAYER_RESET"]||"Reset the DFPlayer."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["dfplayer__sleep"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_SLEEP"]||"Sleep"));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(30);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_DFPLAYER_SLEEP"]||"Put the DFPlayer into standby."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["dfplayer__wake"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_WAKE"]||"Wake"));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(30);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_DFPLAYER_WAKE"]||"Wake the DFPlayer from standby."));
    this.setHelpUrl("https://github.com/bipes");
  }
};
