Blockly.Blocks["music__create"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_SET_UP_BUZZER_SONG"]||"set up buzzer song"));
    this.appendValueInput("songString").setCheck("String").appendField((Blockly.Msg["BLBL_SONG_STRING"]||"Song String"));
    this.appendValueInput("looping").setCheck("Boolean").appendField((Blockly.Msg["BLBL_LOOPING"]||"Looping"));
    this.appendValueInput("tempo").setCheck("Number").appendField((Blockly.Msg["BLBL_TEMPO"]||"Tempo"));
    this.appendValueInput("duty").setCheck("Number").appendField((Blockly.Msg["BLBL_DUTY"]||"Duty"));
    this.appendValueInput("pin").setCheck("Number").appendField((Blockly.Msg["BLBL_PIN"]||"Pin"));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(160);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_MUSIC_CREATE"]||"Set up a song to play on a passive piezo buzzer (onlinesequencer.net format). Call 'update buzzer' every loop to keep it playing."));
    this.setHelpUrl("https://github.com/james1236/buzzer_music");
  }
};

Blockly.Blocks["music__tick"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_UPDATE_BUZZER"]||"update buzzer"));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(160);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_MUSIC_TICK"]||"Call this every loop pass to advance the music (non-blocking)."));
    this.setHelpUrl("https://github.com/james1236/buzzer_music");
  }
};

Blockly.Blocks["music__stop"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_STOP_BUZZER"]||"stop buzzer"));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(160);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_MUSIC_STOP"]||"Stop the music and silence the buzzer."));
    this.setHelpUrl("https://github.com/james1236/buzzer_music");
  }
};

Blockly.Blocks["music__restart"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_RESTART_BUZZER"]||"restart buzzer"));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(160);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_MUSIC_RESTART"]||"Restart the song from the beginning."));
    this.setHelpUrl("https://github.com/james1236/buzzer_music");
  }
};

Blockly.Blocks["music__resume"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_RESUME_BUZZER"]||"resume buzzer"));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(160);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_MUSIC_RESUME"]||"Resume playing after a stop."));
    this.setHelpUrl("https://github.com/james1236/buzzer_music");
  }
};
