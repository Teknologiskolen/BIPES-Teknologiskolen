Blockly.Blocks["utime_localtime"] = {
  init: function() {
  this.appendValueInput("pIn")
        .appendField("Time since Epoch");
        this.setInputsInline(true);
        this.setColour(60);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
 this.setTooltip(" ");
 this.setHelpUrl("https://docs.micropython.org/en/latest/library/utime.html");
  }
};



Blockly.Blocks["utime_mktime"] = {
  init: function() {
    this.appendDummyInput()
        .appendField("Time since Jan 1. 2000");
    this.setInputsInline(true);
    this.setColour(60);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
 this.setTooltip(".. function:: mktime() This is inverse function of localtime. It's argument is a full 8-tuple which expresses a time as per localtime. It returns an integer which is ");
 this.setHelpUrl("https://docs.micropython.org/en/latest/library/utime.html");
  }
};



Blockly.Blocks["utime_sleep"] = {
  init: function() {
  this.appendValueInput("pIn")
        .appendField("Delay (s)");
        this.setInputsInline(true);
        this.setColour(60);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
 this.setTooltip(".. function:: sleep(seconds) Sleep for the given number of seconds. Some boards may accept *seconds* as a floating-point number to sleep for a fractional number of seconds. Note that ");
 this.setHelpUrl("https://docs.micropython.org/en/latest/library/utime.html");
  }
};



Blockly.Blocks["utime_sleep_ms"] = {
  init: function() {
  this.appendValueInput("pIn")
        .appendField("Delay (ms)");
        this.setInputsInline(true);
        this.setColour(60);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
 this.setTooltip(".. function:: sleep_ms(ms) Delay for given number of milliseconds, should be positive or 0. ");
 this.setHelpUrl("https://docs.micropython.org/en/latest/library/utime.html");
  }
};



Blockly.Blocks["utime_sleep_us"] = {
  init: function() {
  this.appendValueInput("pIn")
        .appendField("Delay (us)");
        this.setInputsInline(true);
        this.setColour(60);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
 this.setTooltip(".. function:: sleep_us(us) Delay for given number of microseconds, should be positive or 0. ");
 this.setHelpUrl("https://docs.micropython.org/en/latest/library/utime.html");
  }
};



Blockly.Blocks["utime_ticks_ms"] = {
  init: function() {
    this.appendDummyInput()
        .appendField("Ticks since start (ms)");
    this.setInputsInline(true);
    this.setColour(60);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
 this.setTooltip(".. function:: ticks_ms() Returns an increasing millisecond counter with an arbitrary reference point, that ");
 this.setHelpUrl("https://docs.micropython.org/en/latest/library/utime.html");
  }
};



Blockly.Blocks["utime_ticks_us"] = {
  init: function() {
    this.appendDummyInput()
        .appendField("Ticks since start (us)");
    this.setInputsInline(true);
    this.setColour(60);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
 this.setTooltip(".. function:: ticks_us() Just like `ticks_ms()` above, but in microseconds. ");
 this.setHelpUrl("https://docs.micropython.org/en/latest/library/utime.html");
  }
};



Blockly.Blocks["utime_ticks_cpu"] = {
  init: function() {
    this.appendDummyInput()
        .appendField("Ticks since start (CPU Clock)");
    this.setInputsInline(true);
    this.setColour(60);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
 this.setTooltip(".. function:: ticks_cpu() Similar to `ticks_ms()` and `ticks_us()`, but with the highest possible resol ution ");
 this.setHelpUrl("https://docs.micropython.org/en/latest/library/utime.html");
  }
};



Blockly.Blocks["utime_ticks_add"] = {
  init: function() {
  this.appendValueInput("pIn")
        .appendField(" ticks_add");
        this.setInputsInline(true);
        this.setColour(60);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
 this.setTooltip(".. function:: ticks_add(ticks, delta) Offset ticks value by a given number, which can be either positive or negativ e. ");
 this.setHelpUrl("https://docs.micropython.org/en/latest/library/utime.html");
  }
};



Blockly.Blocks["utime_ticks_diff"] = {
  init: function() {
  this.appendValueInput("pIn")
        .appendField(" ticks_diff");
        this.setInputsInline(true);
        this.setColour(60);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
 this.setTooltip(".. function:: ticks_diff(ticks1, ticks2) Measure ticks difference between values returned from `ticks_ms()`, `ticks_us ()`, ");
 this.setHelpUrl("https://docs.micropython.org/en/latest/library/utime.html");
  }
};



Blockly.Blocks["utime_time"] = {
  init: function() {
    this.appendDummyInput()
        .appendField(" time");
    this.setInputsInline(true);
    this.setColour(60);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
 this.setTooltip(".. function:: time() Returns the number of seconds, as an integer, since the Epoch, assuming that underlying RTC is set and maintained as described above. If an RTC is not set ");
 this.setHelpUrl("https://docs.micropython.org/en/latest/library/utime.html");
  }
};