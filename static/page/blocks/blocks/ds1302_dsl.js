Blockly.Blocks["ds1302__create"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_CREATE_DS1302"]||"Create DS1302"));
    this.appendValueInput("clk_pin").setCheck("Number").appendField((Blockly.Msg["BLBL_CLK_PIN"]||"CLK Pin"));
    this.appendValueInput("dat_pin").setCheck("Number").appendField((Blockly.Msg["BLBL_DAT_PIN"]||"DAT Pin"));
    this.appendValueInput("rst_pin").setCheck("Number").appendField((Blockly.Msg["BLBL_RST_PIN"]||"RST Pin"));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(35);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_DS1302_CREATE"]||"Create a DS1302 RTC instance."));
    this.setHelpUrl("https://github.com/micropython/micropython");
  }
};

Blockly.Blocks["ds1302__get_time"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_GET_TIME"]||"Get Time"));
    this.setOutput(true, null);
    this.setColour(35);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_DS1302_GET_TIME"]||"Read the whole time as (year, month, day, hour, minute, second)."));
    this.setHelpUrl("https://github.com/micropython/micropython");
  }
};

Blockly.Blocks["ds1302__get_year"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_GET_YEAR"]||"Get Year"));
    this.setOutput(true, null);
    this.setColour(35);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_DS1302_GET_YEAR"]||"Read the current year from the RTC."));
    this.setHelpUrl("https://github.com/micropython/micropython");
  }
};

Blockly.Blocks["ds1302__get_month"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_GET_MONTH"]||"Get Month"));
    this.setOutput(true, null);
    this.setColour(35);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_DS1302_GET_MONTH"]||"Read the current month from the RTC."));
    this.setHelpUrl("https://github.com/micropython/micropython");
  }
};

Blockly.Blocks["ds1302__get_day"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_GET_DAY"]||"Get Day"));
    this.setOutput(true, null);
    this.setColour(35);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_DS1302_GET_DAY"]||"Read the current day from the RTC."));
    this.setHelpUrl("https://github.com/micropython/micropython");
  }
};

Blockly.Blocks["ds1302__get_hour"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_GET_HOUR"]||"Get Hour"));
    this.setOutput(true, null);
    this.setColour(35);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_DS1302_GET_HOUR"]||"Read the current hour from the RTC."));
    this.setHelpUrl("https://github.com/micropython/micropython");
  }
};

Blockly.Blocks["ds1302__get_minute"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_GET_MINUTE"]||"Get Minute"));
    this.setOutput(true, null);
    this.setColour(35);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_DS1302_GET_MINUTE"]||"Read the current minute from the RTC."));
    this.setHelpUrl("https://github.com/micropython/micropython");
  }
};

Blockly.Blocks["ds1302__get_second"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_GET_SECOND"]||"Get Second"));
    this.setOutput(true, null);
    this.setColour(35);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_DS1302_GET_SECOND"]||"Read the current second from the RTC."));
    this.setHelpUrl("https://github.com/micropython/micropython");
  }
};

Blockly.Blocks["ds1302__set_time"] = {
  init: function() {
    this.appendDummyInput().appendField((Blockly.Msg["BLBL_SET_TIME"]||"Set Time"));
    this.appendValueInput("year").setCheck("Number").appendField((Blockly.Msg["BLBL_YEAR"]||"Year"));
    this.appendValueInput("month").setCheck("Number").appendField((Blockly.Msg["BLBL_MONTH"]||"Month"));
    this.appendValueInput("day").setCheck("Number").appendField((Blockly.Msg["BLBL_DAY"]||"Day"));
    this.appendValueInput("hour").setCheck("Number").appendField((Blockly.Msg["BLBL_HOUR"]||"Hour"));
    this.appendValueInput("minute").setCheck("Number").appendField((Blockly.Msg["BLBL_MINUTE"]||"Minute"));
    this.appendValueInput("second").setCheck("Number").appendField((Blockly.Msg["BLBL_SECOND"]||"Second"));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(35);
    this.setInputsInline(true);
    this.setTooltip((Blockly.Msg["BTIP_DS1302_SET_TIME"]||"Set the RTC date and time."));
    this.setHelpUrl("https://github.com/micropython/micropython");
  }
};
