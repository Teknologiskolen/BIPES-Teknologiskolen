Blockly.Blocks["pinout"] = {
  update_list: function(load_) {
    let device_init_ = this.device_init;
    let device_ = this.getFieldValue("DEVICE");
    if (!device_) device_ = device_init_;
    if (device_ !== device_init_) {
      this.setColour(1);
    } else {
      this.setColour(190);
    }
    if (this.first_load < 1 && load_) {
      device_ = device_init_;
      this.setColour(190);
      this.getField("DEVICE").doValueUpdate_(device_);
    } else {
      this.first_load = this.first_load - 1;
    }
    this.setTooltip(device_ + " Pins");
    const devices = bipes.page.device.deviceInfo;
    if (device_ in devices && "pinout" in devices[device_]) {
      return devices[device_].pinout;
    }
    return [[Msg["notDefined"], "None"]];
  },
  refresh: function(target) {
    this.device_init = target;
    this.update_list(false);
  },
  device_init: "",
  options: [],
  first_load: 2,
  init: function() {
    this.device_init = bipes.page.project.current.device.target;
    this.appendDummyInput()
      .appendField(new Blockly.FieldLabelSerializable(this.device_init), "DEVICE")
      .appendField(Msg["pin"])
      .appendField(new Blockly.FieldDropdown(() => this.update_list(true)), "PIN");
    this.getField("DEVICE").setVisible(false);
    this.setOutput(true, null);
    this.setColour(190);
    this.setHelpUrl("https://docs.micropython.org/en/latest/library/machine.Pin.html");
  },
};

Blockly.Blocks["machine.freq_set"] = {
  init: function() {
    this.appendValueInput("freq")
      .setCheck("Number")
      .appendField("Set CPU Frequency");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(190);
    this.setTooltip("Set the CPU frequency in hertz.");
    this.setHelpUrl("https://docs.micropython.org/en/latest/library/machine.html");
  },
};

Blockly.Blocks["machine.freq_get"] = {
  init: function() {
    this.appendDummyInput().appendField("Get CPU Frequency");
    this.setOutput(true, null);
    this.setColour(190);
    this.setTooltip("Read the current CPU frequency in hertz.");
    this.setHelpUrl("https://docs.micropython.org/en/latest/library/machine.html");
  },
};

Blockly.Blocks["machine.unique_id"] = {
  init: function() {
    this.appendDummyInput().appendField("Unique ID");
    this.setOutput(true, null);
    this.setColour(190);
    this.setTooltip("Return the board's unique identifier as bytes.");
    this.setHelpUrl("https://docs.micropython.org/en/latest/library/machine.html");
  },
};

Blockly.Blocks["machine.reset_cause"] = {
  init: function() {
    this.appendDummyInput().appendField("Reset Cause");
    this.setOutput(true, null);
    this.setColour(190);
    this.setTooltip("Read the cause of the last reset.");
    this.setHelpUrl("https://docs.micropython.org/en/latest/library/machine.html");
  },
};

Blockly.Blocks["machine.wake_reason"] = {
  init: function() {
    this.appendDummyInput().appendField("Wake Reason");
    this.setOutput(true, null);
    this.setColour(190);
    this.setTooltip("Read the cause that woke the device from sleep.");
    this.setHelpUrl("https://docs.micropython.org/en/latest/library/machine.html");
  },
};

Blockly.Blocks["machine.disable_irq"] = {
  init: function() {
    this.appendDummyInput().appendField("Disable IRQ");
    this.setOutput(true, null);
    this.setColour(190);
    this.setTooltip("Disable interrupts and return the previous IRQ state.");
    this.setHelpUrl("https://docs.micropython.org/en/latest/library/machine.html");
  },
};

Blockly.Blocks["machine.enable_irq"] = {
  init: function() {
    this.appendValueInput("state")
      .setCheck(null)
      .appendField("Enable IRQ With State");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(190);
    this.setTooltip("Restore interrupts using a saved IRQ state.");
    this.setHelpUrl("https://docs.micropython.org/en/latest/library/machine.html");
  },
};

Blockly.Blocks["machine.idle"] = {
  init: function() {
    this.appendDummyInput().appendField("Idle CPU");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(190);
    this.setTooltip("Idle the CPU until an interrupt occurs.");
    this.setHelpUrl("https://docs.micropython.org/en/latest/library/machine.html");
  },
};

Blockly.Blocks["machine.lightsleep"] = {
  init: function() {
    this.appendValueInput("duration_ms")
      .setCheck("Number")
      .appendField("Light Sleep For ms");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(190);
    this.setTooltip("Enter light sleep for the requested duration in milliseconds.");
    this.setHelpUrl("https://docs.micropython.org/en/latest/library/machine.html");
  },
};

Blockly.Blocks["machine.deepsleep"] = {
  init: function() {
    this.appendValueInput("duration_ms")
      .setCheck("Number")
      .appendField("Deep Sleep For ms");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(190);
    this.setTooltip("Enter deep sleep for the requested duration in milliseconds.");
    this.setHelpUrl("https://docs.micropython.org/en/latest/library/machine.html");
  },
};

Blockly.Blocks["machine.soft_reset"] = {
  init: function() {
    this.appendDummyInput().appendField("Soft Reset");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(190);
    this.setTooltip("Perform a soft reset without a full power-on reset.");
    this.setHelpUrl("https://docs.micropython.org/en/latest/library/machine.html");
  },
};

Blockly.Blocks["machine.reset"] = {
  init: function() {
    this.appendDummyInput().appendField("Reset Device");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(190);
    this.setTooltip("Perform a hard reset of the device.");
    this.setHelpUrl("https://docs.micropython.org/en/latest/library/machine.html");
  },
};

Blockly.Blocks["machine.bootloader"] = {
  init: function() {
    this.appendDummyInput().appendField("Enter Bootloader");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(190);
    this.setTooltip("Reboot into the board bootloader if supported.");
    this.setHelpUrl("https://docs.micropython.org/en/latest/library/machine.html");
  },
};

Blockly.Blocks["machine.time_pulse_us"] = {
  init: function() {
    this.appendValueInput("pin")
      .setCheck("Number")
      .appendField("Measure Pulse On Pin");
    this.appendValueInput("pulse_level")
      .setCheck("Number")
      .appendField("Level");
    this.appendValueInput("timeout_us")
      .setCheck("Number")
      .appendField("Timeout us");
    this.setOutput(true, null);
    this.setColour(190);
    this.setTooltip("Measure a pulse width on a pin in microseconds.");
    this.setHelpUrl("https://docs.micropython.org/en/latest/library/machine.html");
  },
};

Blockly.Blocks["machine.Pin.init"] = {
  init: function() {
    this.appendValueInput("pin")
      .setCheck("Number")
      .appendField("Initialize Pin");
    this.appendDummyInput()
      .appendField("Mode")
      .appendField(
        new Blockly.FieldDropdown([
          ["IN", "Pin.IN"],
          ["OUT", "Pin.OUT"],
          ["OPEN_DRAIN", "Pin.OPEN_DRAIN"],
        ]),
        "MODE"
      );
    this.appendDummyInput()
      .appendField("Pull")
      .appendField(
        new Blockly.FieldDropdown([
          ["None", "NONE"],
          ["PULL_UP", "Pin.PULL_UP"],
          ["PULL_DOWN", "Pin.PULL_DOWN"],
        ]),
        "PULL"
      );
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(190);
    this.setTooltip("Create or reconfigure a machine.Pin object.");
    this.setHelpUrl("https://docs.micropython.org/en/latest/library/machine.Pin.html");
  },
};

Blockly.Blocks["machine.Pin.irq"] = {
  init: function() {
 this.appendValueInput("pin")
        .setCheck("Number")
        .appendField(`${Msg["add"]} Interrupt ${Msg["ond"]}`);
  this.appendDummyInput()
        .appendField("Trigger")
        .appendField(new Blockly.FieldDropdown([
          ["Falling", "Pin.IRQ_FALLING"],
          ["Rising", "Pin.IRQ_RISING"],
          ["Falling | Rising", "Pin.IRQ_FALLING | Pin.IRQ_RISING"]
        ]), "TRIGGER");
      this.appendStatementInput("DO")
        .setCheck(null)
        .appendField(Msg["do"]);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(190);
    this.setTooltip("Configure a GPIO pin");
    this.setHelpUrl("https://docs.micropython.org/en/latest/library/machine.Pin.html");
  },
};

Blockly.Blocks["machine.Pin.getValue"] = {
  init: function() {
    this.appendValueInput("pin")
        .setCheck("Number")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField(Msg["read_digital_pin"]);
    this.appendDummyInput()
        .appendField(`${Msg["set"]} PULL MODE ${Msg["to"]}`)
        .appendField(new Blockly.FieldDropdown([
          ["None", "Ingen"],
          ["PULL UP ", "Pin.PULL_UP"],
          ["PULL DOWN", "Pin.PULL_DOWN"]
        ]), "PULL");
    this.setOutput(true, null);
    this.setColour(190);
    this.setTooltip(" ");
    this.setHelpUrl("https://docs.micropython.org/en/latest/library/machine.Pin.html");
  },
};

Blockly.Blocks["machine.Pin.setValue"] = {
  init: function() {
    this.appendValueInput("pin")
        .setCheck("Number")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField(Msg["setpin"]);
    this.appendValueInput("value")
        .setCheck(null)
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField(Msg["to"]);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(190);
    this.setTooltip(".. method:: Pin.on() Set pin to 1 output level. ");
    this.setHelpUrl("https://docs.micropython.org/en/latest/library/machine.Pin.html");
  },
};

Blockly.Blocks["machine.Pin.toggle"] = {
  init: function() {
     this.appendValueInput("pin")
        .appendField(`Toggle Output ${Msg["ond"]}`);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(190);
    this.setTooltip(".. method:: Pin.off() Set pin to 0 output level. ");
    this.setHelpUrl("https://docs.micropython.org/en/latest/library/machine.Pin.html");
  },
};

Blockly.Blocks["machine.Signal.getValue"] = {
  init: function() {
    this.appendValueInput("pin")
      .setCheck("Number")
      .appendField("Read Signal");
    this.appendDummyInput()
      .appendField("Invert")
      .appendField(
        new Blockly.FieldDropdown([
          ["False", "FALSE"],
          ["True", "TRUE"],
        ]),
        "INVERT"
      );
    this.setOutput(true, null);
    this.setColour(190);
    this.setTooltip("Read a machine.Signal value, optionally inverted.");
    this.setHelpUrl("https://docs.micropython.org/en/latest/library/machine.Signal.html");
  },
};

Blockly.Blocks["machine.Signal.setValue"] = {
  init: function() {
    this.appendValueInput("pin")
      .setCheck("Number")
      .appendField("Write Signal");
    this.appendDummyInput()
      .appendField("Invert")
      .appendField(
        new Blockly.FieldDropdown([
          ["False", "FALSE"],
          ["True", "TRUE"],
        ]),
        "INVERT"
      );
    this.appendValueInput("value")
      .setCheck(null)
      .appendField("Value");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(190);
    this.setTooltip("Write a machine.Signal value, optionally inverted.");
    this.setHelpUrl("https://docs.micropython.org/en/latest/library/machine.Signal.html");
  },
};

Blockly.Blocks["machine.Signal.on"] = {
  init: function() {
    this.appendValueInput("pin")
      .setCheck("Number")
      .appendField("Signal On");
    this.appendDummyInput()
      .appendField("Invert")
      .appendField(
        new Blockly.FieldDropdown([
          ["False", "FALSE"],
          ["True", "TRUE"],
        ]),
        "INVERT"
      );
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(190);
    this.setTooltip("Set a machine.Signal high.");
    this.setHelpUrl("https://docs.micropython.org/en/latest/library/machine.Signal.html");
  },
};

Blockly.Blocks["machine.Signal.off"] = {
  init: function() {
    this.appendValueInput("pin")
      .setCheck("Number")
      .appendField("Signal Off");
    this.appendDummyInput()
      .appendField("Invert")
      .appendField(
        new Blockly.FieldDropdown([
          ["False", "FALSE"],
          ["True", "TRUE"],
        ]),
        "INVERT"
      );
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(190);
    this.setTooltip("Set a machine.Signal low.");
    this.setHelpUrl("https://docs.micropython.org/en/latest/library/machine.Signal.html");
  },
};

Blockly.Blocks["machine.ADC.init"] = {
  init: function() {
    this.appendDummyInput()
        .appendField("Pin")
        .appendField(new Blockly.FieldDropdown([
          ["31 / GPIO 26 / ADC 0", "26"],
          ["32 / GPIO 27 / ADC 1", "27"],
          ["34 / GPIO 28 / ADC 2", "28"]
        ]), "PIN");
    this.setOutput(true, null);
    this.setColour(190);
    this.setTooltip("Create an ADC input using a pin number");
    this.setHelpUrl("");
  },
};

Blockly.Blocks["machine.ADC.read_u16"] = {
  init: function() {
    this.appendValueInput("pin")
        .setCheck("Number")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField(Msg["read_analog_pin"]);
    this.setOutput(true, null);
    this.setColour(190);
    this.setTooltip("Read a 16-bit filtered value from an ADC pin");
    this.setHelpUrl("https://docs.micropython.org/en/latest/library/machine.ADC.html");
  },
};

Blockly.Blocks["machine.PWM.init"] = {
  init: function() {
    this.appendValueInput("pin")
        .setCheck("Number")
        .appendField(Msg["setPWMpin"]);
    this.appendValueInput("frequency")
        .setCheck("Number")
        .appendField("Frequency");
    this.appendValueInput("duty")
        .setCheck("Number")
        .appendField("Duty Cycle");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(190);
    this.setTooltip("Init and set PWM with frequency (1Hz to 40MHz) and duty (0-1023)");
    this.setHelpUrl("https://docs.micropython.org/en/latest/esp32/quickref.html#pwm-pulse-width-modulation");
  },
};

Blockly.Blocks["machine.PWM.freq"] = {
  init: function() {
    this.appendValueInput("pin")
        .setCheck("Number")
        .appendField(`${Msg["change"]} frequency ${Msg["ond"]}`);
    this.appendValueInput("frequency")
        .setCheck(null)
        .appendField("Frequency");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(190);
    this.setTooltip("Set PWM frequency from 1Hz to 40MHz");
    this.setHelpUrl("https://docs.micropython.org/en/latest/esp32/quickref.html#pwm-pulse-width-modulation");
  },
};

Blockly.Blocks["machine.PWM.duty"] = {
  init: function() {
    this.appendValueInput("pin")
        .setCheck("Number")
        .appendField(`${Msg["change"]} duty cycle ${Msg["ond"]}`);
    this.appendValueInput("duty")
        .setCheck(null)
        .appendField("Duty Cycle");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(190);
    this.setTooltip("Set PWM duty range of 0-1023");
    this.setHelpUrl("https://docs.micropython.org/en/latest/esp32/quickref.html#pwm-pulse-width-modulation");
  },
};

Blockly.Blocks["machine.PWM.deinit"] = {
  init: function() {
    this.appendValueInput("pin")
      .setCheck("Number")
      .appendField("Stop PWM On Pin");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(190);
    this.setTooltip("Deinitialize the PWM output on a pin.");
    this.setHelpUrl("https://docs.micropython.org/en/latest/library/machine.PWM.html");
  },
};

Blockly.Blocks["machine.RTC.datetime"] = {
  init: function() {
    this.appendDummyInput().appendField("RTC Datetime");
    this.setOutput(true, null);
    this.setColour(190);
    this.setTooltip("Read the RTC datetime tuple.");
    this.setHelpUrl("https://docs.micropython.org/en/latest/library/machine.RTC.html");
  },
};

Blockly.Blocks["machine.RTC.set_datetime"] = {
  init: function() {
    this.appendValueInput("year").setCheck("Number").appendField("Set RTC Year");
    this.appendValueInput("month").setCheck("Number").appendField("Month");
    this.appendValueInput("day").setCheck("Number").appendField("Day");
    this.appendValueInput("weekday").setCheck("Number").appendField("Weekday");
    this.appendValueInput("hour").setCheck("Number").appendField("Hour");
    this.appendValueInput("minute").setCheck("Number").appendField("Minute");
    this.appendValueInput("second").setCheck("Number").appendField("Second");
    this.appendValueInput("subseconds").setCheck("Number").appendField("Subseconds");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(190);
    this.setTooltip("Set the RTC datetime tuple.");
    this.setHelpUrl("https://docs.micropython.org/en/latest/library/machine.RTC.html");
  },
};

Blockly.Blocks["machine.RTC.deinit"] = {
  init: function() {
    this.appendDummyInput().appendField("RTC Deinit");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(190);
    this.setTooltip("Deinitialize the RTC if supported.");
    this.setHelpUrl("https://docs.micropython.org/en/latest/library/machine.RTC.html");
  },
};

Blockly.Blocks["machine.Timer.init"] = {
  init: function() {
  this.appendDummyInput()
        .appendField(`${Msg["create"]} Timer Interrupt`);
  this.appendDummyInput()
        .appendField("Mode")
        .appendField(new Blockly.FieldDropdown([
          ["One Shot", "Timer.ONE_SHOT"],
          ["Periodic", "Timer.PERIODIC"]
        ]), "MODE")
        .appendField("Periode (ms):")
        .appendField(new Blockly.FieldNumber(1000), "PERIODE");
      this.appendStatementInput("DO")
        .setCheck(null)
        .appendField(Msg["do"]);
      this.setColour(190);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
 this.setTooltip(" ");
 this.setHelpUrl("https://docs.micropython.org/en/latest/library/machine.Timer.html");
  },
};

Blockly.Blocks["machine.Timer.deinit"] = {
  init: function() {
    this.appendDummyInput()
        .appendField("Stop Timer");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(190);
    this.setTooltip(".. method:: Timer.deinit() Deinitialises the timer. Stops the timer, and disables the timer peripheral. ");
    this.setHelpUrl("https://docs.micropython.org/en/latest/library/machine.Timer.html");
  },
};

Blockly.Blocks["machine.WDT.init"] = {
  init: function() {
    this.appendValueInput("timeout_ms")
      .setCheck("Number")
      .appendField("Start Watchdog timeout ms");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(190);
    this.setTooltip("Create a watchdog timer with a timeout in milliseconds.");
    this.setHelpUrl("https://docs.micropython.org/en/latest/library/machine.WDT.html");
  },
};

Blockly.Blocks["machine.WDT.feed"] = {
  init: function() {
    this.appendDummyInput().appendField("Feed Watchdog");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(190);
    this.setTooltip("Feed the watchdog to prevent a reset.");
    this.setHelpUrl("https://docs.micropython.org/en/latest/library/machine.WDT.html");
  },
};
