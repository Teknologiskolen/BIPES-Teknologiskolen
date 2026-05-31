Blockly.Blocks["ds1302__create"] = {
  init: function() {
    this.appendDummyInput().appendField("Create DS1302");
    this.appendValueInput("clk_pin").setCheck("Number").appendField("CLK Pin");
    this.appendValueInput("dat_pin").setCheck("Number").appendField("DAT Pin");
    this.appendValueInput("rst_pin").setCheck("Number").appendField("RST Pin");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(35);
    this.setInputsInline(true);
    this.setTooltip("Create a DS1302 RTC instance.");
    this.setHelpUrl("https://github.com/micropython/micropython");
  }
};

Blockly.Blocks["ds1302__get_time"] = {
  init: function() {
    this.appendDummyInput().appendField("Get Time");
    this.setOutput(true, null);
    this.setColour(35);
    this.setInputsInline(true);
    this.setTooltip("Read the current time tuple from the RTC.");
    this.setHelpUrl("https://github.com/micropython/micropython");
  }
};

Blockly.Blocks["ds1302__get_year"] = {
  init: function() {
    this.appendDummyInput().appendField("Get Year");
    this.setOutput(true, null);
    this.setColour(35);
    this.setInputsInline(true);
    this.setTooltip("Read the current year from the RTC.");
    this.setHelpUrl("https://github.com/micropython/micropython");
  }
};

Blockly.Blocks["ds1302__get_month"] = {
  init: function() {
    this.appendDummyInput().appendField("Get Month");
    this.setOutput(true, null);
    this.setColour(35);
    this.setInputsInline(true);
    this.setTooltip("Read the current month from the RTC.");
    this.setHelpUrl("https://github.com/micropython/micropython");
  }
};

Blockly.Blocks["ds1302__get_day"] = {
  init: function() {
    this.appendDummyInput().appendField("Get Day");
    this.setOutput(true, null);
    this.setColour(35);
    this.setInputsInline(true);
    this.setTooltip("Read the current day from the RTC.");
    this.setHelpUrl("https://github.com/micropython/micropython");
  }
};

Blockly.Blocks["ds1302__get_hour"] = {
  init: function() {
    this.appendDummyInput().appendField("Get Hour");
    this.setOutput(true, null);
    this.setColour(35);
    this.setInputsInline(true);
    this.setTooltip("Read the current hour from the RTC.");
    this.setHelpUrl("https://github.com/micropython/micropython");
  }
};

Blockly.Blocks["ds1302__get_minute"] = {
  init: function() {
    this.appendDummyInput().appendField("Get Minute");
    this.setOutput(true, null);
    this.setColour(35);
    this.setInputsInline(true);
    this.setTooltip("Read the current minute from the RTC.");
    this.setHelpUrl("https://github.com/micropython/micropython");
  }
};

Blockly.Blocks["ds1302__get_second"] = {
  init: function() {
    this.appendDummyInput().appendField("Get Second");
    this.setOutput(true, null);
    this.setColour(35);
    this.setInputsInline(true);
    this.setTooltip("Read the current second from the RTC.");
    this.setHelpUrl("https://github.com/micropython/micropython");
  }
};

Blockly.Blocks["ds1302__get_time_text"] = {
  init: function() {
    this.appendDummyInput().appendField("Get Time Text");
    this.appendValueInput("show_seconds").setCheck("Boolean").appendField("Show Seconds");
    this.setOutput(true, null);
    this.setColour(35);
    this.setInputsInline(true);
    this.setTooltip("Format the current time as text.");
    this.setHelpUrl("https://github.com/micropython/micropython");
  }
};

Blockly.Blocks["ds1302__get_date_text"] = {
  init: function() {
    this.appendDummyInput().appendField("Get Date Text");
    this.setOutput(true, null);
    this.setColour(35);
    this.setInputsInline(true);
    this.setTooltip("Format the current date as text.");
    this.setHelpUrl("https://github.com/micropython/micropython");
  }
};

Blockly.Blocks["ds1302__set_time"] = {
  init: function() {
    this.appendDummyInput().appendField("Set Time");
    this.appendValueInput("year").setCheck("Number").appendField("Year");
    this.appendValueInput("month").setCheck("Number").appendField("Month");
    this.appendValueInput("day").setCheck("Number").appendField("Day");
    this.appendValueInput("hour").setCheck("Number").appendField("Hour");
    this.appendValueInput("minute").setCheck("Number").appendField("Minute");
    this.appendValueInput("second").setCheck("Number").appendField("Second");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(35);
    this.setInputsInline(false);
    this.setTooltip("Set the RTC date and time.");
    this.setHelpUrl("https://github.com/micropython/micropython");
  }
};
