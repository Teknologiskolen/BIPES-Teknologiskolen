Blockly.Blocks["alarm_clock__create"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_CREATE_ALARM_CLOCK"]||"Create Alarm Clock"));
    this.appendValueInput("spi").appendField((Blockly.Msg["BLBL_SPI"]||"SPI"));
    this.appendValueInput("dc").setCheck("Number").appendField((Blockly.Msg["BLBL_DC"]||"DC"));
    this.appendValueInput("rst").setCheck("Number").appendField((Blockly.Msg["BLBL_RST"]||"RST"));
    this.appendValueInput("cs").setCheck("Number").appendField((Blockly.Msg["BLBL_CS"]||"CS"));
    this.appendValueInput("clk").setCheck("Number").appendField((Blockly.Msg["BLBL_CLK"]||"CLK"));
    this.appendValueInput("dat").setCheck("Number").appendField((Blockly.Msg["BLBL_DAT"]||"DAT"));
    this.appendValueInput("rtc_rst").setCheck("Number").appendField((Blockly.Msg["BLBL_RTC_RST"]||"RTC RST"));
    this.appendValueInput("field_pin").setCheck("Number").appendField((Blockly.Msg["BLBL_FIELD_PIN"]||"Field Pin"));
    this.appendValueInput("plus_pin").setCheck("Number").appendField((Blockly.Msg["BLBL_PLUS_PIN"]||"Plus Pin"));
    this.appendValueInput("mode_pin").setCheck("Number").appendField((Blockly.Msg["BLBL_MODE_PIN"]||"Mode Pin"));
    this.appendValueInput("width").setCheck("Number").appendField((Blockly.Msg["BLBL_WIDTH"]||"Width"));
    this.appendValueInput("height").setCheck("Number").appendField((Blockly.Msg["BLBL_HEIGHT"]||"Height"));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(200);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_ALARM_CLOCK_CREATE"]||"Create the alarm clock: SPI object (ST7735S group) + display, RTC and 3 button pins."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["alarm_clock__update"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_UPDATE"]||"Update"));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(200);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_ALARM_CLOCK_UPDATE"]||"COARSE: read time + default buttons + default screen + alarm check, all at once."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["alarm_clock__set_alarm"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_SET_ALARM"]||"Set Alarm"));
    this.appendValueInput("hour").setCheck("Number").appendField((Blockly.Msg["BLBL_HOUR"]||"Hour"));
    this.appendValueInput("minute").setCheck("Number").appendField((Blockly.Msg["BLBL_MINUTE"]||"Minute"));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(200);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_ALARM_CLOCK_SET_ALARM"]||"Pre-set the alarm time."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["alarm_clock__enable_alarm"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_ENABLE_ALARM"]||"Enable Alarm"));
    this.appendValueInput("on").setCheck("Boolean").appendField((Blockly.Msg["BLBL_ON"]||"On"));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(200);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_ALARM_CLOCK_ENABLE_ALARM"]||"Turn the alarm on/off."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["alarm_clock__is_enabled"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_IS_ENABLED"]||"Is Enabled"));
    this.setOutput(true, null);
    this.setColour(200);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_ALARM_CLOCK_IS_ENABLED"]||"True if the alarm is on."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["alarm_clock__is_ringing"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_IS_RINGING"]||"Is Ringing"));
    this.setOutput(true, null);
    this.setColour(200);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_ALARM_CLOCK_IS_RINGING"]||"True while the alarm is going off."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["alarm_clock__alarm_started"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_ALARM_STARTED"]||"Alarm Started"));
    this.setOutput(true, null);
    this.setColour(200);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_ALARM_CLOCK_ALARM_STARTED"]||"True ONCE when the alarm starts \u2014 start your sound."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["alarm_clock__alarm_stopped"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_ALARM_STOPPED"]||"Alarm Stopped"));
    this.setOutput(true, null);
    this.setColour(200);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_ALARM_CLOCK_ALARM_STOPPED"]||"True ONCE when the user stops it \u2014 stop your sound."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["alarm_clock__read"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_READ"]||"Read"));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(200);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_ALARM_CLOCK_READ"]||"MID: read the RTC once and work out what changed (call first each loop)."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["alarm_clock__in_normal"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_IN_NORMAL"]||"In Normal"));
    this.setOutput(true, null);
    this.setColour(200);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_ALARM_CLOCK_IN_NORMAL"]||"True when showing the clock."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["alarm_clock__in_set_alarm"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_IN_SET_ALARM"]||"In Set Alarm"));
    this.setOutput(true, null);
    this.setColour(200);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_ALARM_CLOCK_IN_SET_ALARM"]||"True when setting the alarm."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["alarm_clock__in_set_clock"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_IN_SET_CLOCK"]||"In Set Clock"));
    this.setOutput(true, null);
    this.setColour(200);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_ALARM_CLOCK_IN_SET_CLOCK"]||"True when setting the clock."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["alarm_clock__in_ringing"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_IN_RINGING"]||"In Ringing"));
    this.setOutput(true, null);
    this.setColour(200);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_ALARM_CLOCK_IN_RINGING"]||"True when the alarm is ringing."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["alarm_clock__set_alarm_mode"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_SET_ALARM_MODE"]||"Set Alarm Mode"));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(200);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_ALARM_CLOCK_SET_ALARM_MODE"]||"Switch to the SET ALARM screen."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["alarm_clock__set_clock_mode"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_SET_CLOCK_MODE"]||"Set Clock Mode"));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(200);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_ALARM_CLOCK_SET_CLOCK_MODE"]||"Switch to the SET CLOCK screen (loads the current date/time to edit)."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["alarm_clock__go_normal"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_GO_NORMAL"]||"Go Normal"));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(200);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_ALARM_CLOCK_GO_NORMAL"]||"Go back to the clock screen."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["alarm_clock__field_pressed"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_FIELD_PRESSED"]||"Field Pressed"));
    this.setOutput(true, null);
    this.setColour(200);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_ALARM_CLOCK_FIELD_PRESSED"]||"True once when the FIELD button is pressed."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["alarm_clock__plus_pressed"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_PLUS_PRESSED"]||"Plus Pressed"));
    this.setOutput(true, null);
    this.setColour(200);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_ALARM_CLOCK_PLUS_PRESSED"]||"True when the PLUS button is pressed (and auto-repeats when held)."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["alarm_clock__mode_clicked"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_MODE_CLICKED"]||"Mode Clicked"));
    this.setOutput(true, null);
    this.setColour(200);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_ALARM_CLOCK_MODE_CLICKED"]||"True once on a single click of the MODE button."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["alarm_clock__mode_double_clicked"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_MODE_DOUBLE_CLICKED"]||"Mode Double Clicked"));
    this.setOutput(true, null);
    this.setColour(200);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_ALARM_CLOCK_MODE_DOUBLE_CLICKED"]||"True once on a double-click of the MODE button."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["alarm_clock__handle_buttons"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_HANDLE_BUTTONS"]||"Handle Buttons"));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(200);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_ALARM_CLOCK_HANDLE_BUTTONS"]||"Run the DEFAULT button mapping (instead of writing your own)."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["alarm_clock__next_field"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_NEXT_FIELD"]||"Next Field"));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(200);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_ALARM_CLOCK_NEXT_FIELD"]||"Move the edit cursor to the next field."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["alarm_clock__increase"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_INCREASE"]||"Increase"));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(200);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_ALARM_CLOCK_INCREASE"]||"Increase the value of the field being edited."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["alarm_clock__save"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_SAVE"]||"Save"));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(200);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_ALARM_CLOCK_SAVE"]||"Smart SAVE: stop if ringing, commit in a set-screen, else open SET ALARM."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["alarm_clock__commit_alarm"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_COMMIT_ALARM"]||"Commit Alarm"));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(200);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_ALARM_CLOCK_COMMIT_ALARM"]||"Keep the edited alarm and return to the clock."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["alarm_clock__commit_clock"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_COMMIT_CLOCK"]||"Commit Clock"));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(200);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_ALARM_CLOCK_COMMIT_CLOCK"]||"Write the edited date/time to the RTC and return to the clock."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["alarm_clock__stop"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_STOP"]||"Stop"));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(200);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_ALARM_CLOCK_STOP"]||"Stop the ringing alarm."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["alarm_clock__field"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_FIELD"]||"Field"));
    this.setOutput(true, null);
    this.setColour(200);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_ALARM_CLOCK_FIELD"]||"Index of the field being edited (0-based)."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["alarm_clock__alarm_hour"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_ALARM_HOUR"]||"Alarm Hour"));
    this.setOutput(true, null);
    this.setColour(200);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_ALARM_CLOCK_ALARM_HOUR"]||"The alarm hour."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["alarm_clock__alarm_minute"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_ALARM_MINUTE"]||"Alarm Minute"));
    this.setOutput(true, null);
    this.setColour(200);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_ALARM_CLOCK_ALARM_MINUTE"]||"The alarm minute."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["alarm_clock__alarm_due"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_ALARM_DUE"]||"Alarm Due"));
    this.setOutput(true, null);
    this.setColour(200);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_ALARM_CLOCK_ALARM_DUE"]||"QUERY only: true when the alarm time is reached (no side effects)."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["alarm_clock__start_ringing"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_START_RINGING"]||"Start Ringing"));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(200);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_ALARM_CLOCK_START_RINGING"]||"ACTION only: put the clock into the ringing state."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["alarm_clock__begin_frame"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_BEGIN_FRAME"]||"Begin Frame"));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(200);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_ALARM_CLOCK_BEGIN_FRAME"]||"Frame bookkeeping (draws nothing): arms 'mode changed' and tells the draw helpers to repaint. Clear the screen yourself: if mode changed -> fill."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["alarm_clock__mode_changed"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_MODE_CHANGED"]||"Mode Changed"));
    this.setOutput(true, null);
    this.setColour(200);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_ALARM_CLOCK_MODE_CHANGED"]||"True on the first frame after the mode changed (clear/redraw static labels once)."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["alarm_clock__draw_clock"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_DRAW_CLOCK"]||"Draw Clock"));
    this.appendValueInput("x").setCheck("Number").appendField((Blockly.Msg["BLBL_X"]||"X"));
    this.appendValueInput("y").setCheck("Number").appendField((Blockly.Msg["BLBL_Y"]||"Y"));
    this.appendValueInput("color").setCheck("Number").appendField((Blockly.Msg["BLBL_COLOR"]||"Color"));
    this.appendValueInput("size").setCheck("Number").appendField((Blockly.Msg["BLBL_SIZE"]||"Size"));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(200);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_ALARM_CLOCK_DRAW_CLOCK"]||"Draw the running HH:MM:SS (only changed digits are repainted)."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["alarm_clock__draw_date"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_DRAW_DATE"]||"Draw Date"));
    this.appendValueInput("x").setCheck("Number").appendField((Blockly.Msg["BLBL_X"]||"X"));
    this.appendValueInput("y").setCheck("Number").appendField((Blockly.Msg["BLBL_Y"]||"Y"));
    this.appendValueInput("color").setCheck("Number").appendField((Blockly.Msg["BLBL_COLOR"]||"Color"));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(200);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_ALARM_CLOCK_DRAW_DATE"]||"Draw DD/MM/YYYY."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["alarm_clock__draw_edit_time"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_DRAW_EDIT_TIME"]||"Draw Edit Time"));
    this.appendValueInput("x").setCheck("Number").appendField((Blockly.Msg["BLBL_X"]||"X"));
    this.appendValueInput("y").setCheck("Number").appendField((Blockly.Msg["BLBL_Y"]||"Y"));
    this.appendValueInput("color").setCheck("Number").appendField((Blockly.Msg["BLBL_COLOR"]||"Color"));
    this.appendValueInput("size").setCheck("Number").appendField((Blockly.Msg["BLBL_SIZE"]||"Size"));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(200);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_ALARM_CLOCK_DRAW_EDIT_TIME"]||"Draw the HH:MM being edited, with a ^^ cursor under the active field."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["alarm_clock__draw_edit_date"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_DRAW_EDIT_DATE"]||"Draw Edit Date"));
    this.appendValueInput("x").setCheck("Number").appendField((Blockly.Msg["BLBL_X"]||"X"));
    this.appendValueInput("y").setCheck("Number").appendField((Blockly.Msg["BLBL_Y"]||"Y"));
    this.appendValueInput("color").setCheck("Number").appendField((Blockly.Msg["BLBL_COLOR"]||"Color"));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(200);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_ALARM_CLOCK_DRAW_EDIT_DATE"]||"Draw the DD/MM/YYYY being edited (set-clock), with ^^ under the active field."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["alarm_clock__draw_ringing"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_DRAW_RINGING"]||"Draw Ringing"));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(200);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_ALARM_CLOCK_DRAW_RINGING"]||"Draw the flashing red ALARM screen (call each loop)."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["alarm_clock__draw_default"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_DRAW_DEFAULT"]||"Draw Default"));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(200);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_ALARM_CLOCK_DRAW_DEFAULT"]||"Draw the built-in 4-screen layout (what update() uses)."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["alarm_clock__now_hour"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_NOW_HOUR"]||"Now Hour"));
    this.setOutput(true, null);
    this.setColour(200);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_ALARM_CLOCK_NOW_HOUR"]||"Current hour (0-23)."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["alarm_clock__now_minute"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_NOW_MINUTE"]||"Now Minute"));
    this.setOutput(true, null);
    this.setColour(200);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_ALARM_CLOCK_NOW_MINUTE"]||"Current minute (0-59)."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["alarm_clock__now_second"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_NOW_SECOND"]||"Now Second"));
    this.setOutput(true, null);
    this.setColour(200);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_ALARM_CLOCK_NOW_SECOND"]||"Current second (0-59)."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["alarm_clock__now_day"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_NOW_DAY"]||"Now Day"));
    this.setOutput(true, null);
    this.setColour(200);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_ALARM_CLOCK_NOW_DAY"]||"Current day of month."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["alarm_clock__now_month"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_NOW_MONTH"]||"Now Month"));
    this.setOutput(true, null);
    this.setColour(200);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_ALARM_CLOCK_NOW_MONTH"]||"Current month."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["alarm_clock__now_year"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_NOW_YEAR"]||"Now Year"));
    this.setOutput(true, null);
    this.setColour(200);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_ALARM_CLOCK_NOW_YEAR"]||"Current year."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["alarm_clock__time_text"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_TIME_TEXT"]||"Time Text"));
    this.setOutput(true, null);
    this.setColour(200);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_ALARM_CLOCK_TIME_TEXT"]||"Current time as text 'HH:MM:SS'."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["alarm_clock__date_text"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_DATE_TEXT"]||"Date Text"));
    this.setOutput(true, null);
    this.setColour(200);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_ALARM_CLOCK_DATE_TEXT"]||"Current date as text 'DD/MM/YYYY'."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["alarm_clock__hour_changed"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_HOUR_CHANGED"]||"Hour Changed"));
    this.setOutput(true, null);
    this.setColour(200);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_ALARM_CLOCK_HOUR_CHANGED"]||"True if the hour changed since the last read()."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["alarm_clock__minute_changed"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_MINUTE_CHANGED"]||"Minute Changed"));
    this.setOutput(true, null);
    this.setColour(200);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_ALARM_CLOCK_MINUTE_CHANGED"]||"True if the minute changed since the last read()."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["alarm_clock__second_changed"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_SECOND_CHANGED"]||"Second Changed"));
    this.setOutput(true, null);
    this.setColour(200);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_ALARM_CLOCK_SECOND_CHANGED"]||"True if the second changed since the last read()."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["alarm_clock__flash_on"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_FLASH_ON"]||"Flash On"));
    this.setOutput(true, null);
    this.setColour(200);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_ALARM_CLOCK_FLASH_ON"]||"Alternates True/False every second (for blinking)."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["alarm_clock__draw_text"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_DRAW_TEXT"]||"Draw Text"));
    this.appendValueInput("string").setCheck("String").appendField((Blockly.Msg["BLBL_STRING"]||"String"));
    this.appendValueInput("x").setCheck("Number").appendField((Blockly.Msg["BLBL_X"]||"X"));
    this.appendValueInput("y").setCheck("Number").appendField((Blockly.Msg["BLBL_Y"]||"Y"));
    this.appendValueInput("color").setCheck("Number").appendField((Blockly.Msg["BLBL_COLOR"]||"Color"));
    this.appendValueInput("size").setCheck("Number").appendField((Blockly.Msg["BLBL_SIZE"]||"Size"));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(200);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_ALARM_CLOCK_DRAW_TEXT"]||"Draw any text at (x, y)."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["alarm_clock__clear"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_CLEAR"]||"Clear"));
    this.appendValueInput("x").setCheck("Number").appendField((Blockly.Msg["BLBL_X"]||"X"));
    this.appendValueInput("y").setCheck("Number").appendField((Blockly.Msg["BLBL_Y"]||"Y"));
    this.appendValueInput("w").setCheck("Number").appendField((Blockly.Msg["BLBL_W"]||"W"));
    this.appendValueInput("h").setCheck("Number").appendField((Blockly.Msg["BLBL_H"]||"H"));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(200);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_ALARM_CLOCK_CLEAR"]||"Clear (black-fill) a rectangle."));
    this.setHelpUrl("https://github.com/bipes");
  }
};

Blockly.Blocks["alarm_clock__fill"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_FILL"]||"Fill"));
    this.appendValueInput("color").setCheck("Number").appendField((Blockly.Msg["BLBL_COLOR"]||"Color"));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(200);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_ALARM_CLOCK_FILL"]||"Fill the whole screen with a colour."));
    this.setHelpUrl("https://github.com/bipes");
  }
};
