Blockly.Blocks['pinout'] = {
  update_list: function(load_) {
    let device_init_ = this.device_init;
    let device_ = this.getFieldValue('DEVICE');
    if (!device_) device_ = device_init_;
    /* make device name if it do not match with workspace */
    if (device_ !== device_init_)
      this.setColour(1);
    else if (device_ === device_init_)
      this.setColour(190);
    if (this.first_load < 1 && load_) {
      device_ = device_init_;
      this.setColour(190);
      this.getField('DEVICE').doValueUpdate_(device_);
    } else {
      this.first_load = this.first_load - 1; // function is triggered twice on load due to setting values
    }
    this.setTooltip(device_ + " Pins");
    let devices = bipes.page.device.deviceInfo

    if (device_  in  devices && 'pinout' in devices [device_]){
      return devices [device_].pinout;
    } else {
      return [[Msg["notDefined"],"None"]];
    }
  },
  refresh: function(target) {
    this.device_init = target
    this.update_list(false)
  },
  device_init: '',
  options: [],
  first_load: 2,
  init: function() {

    /*
    "this.getField('DEVICE').SERIALIZABLE = true;" could be used instead of FieldLabelSerializable
    */
    this.device_init = bipes.page.project.current.device.target
    this.appendDummyInput()
        .appendField(new Blockly.FieldLabelSerializable(this.device_init), 'DEVICE') // will use device_init if new block or no device specification on XML.
        .appendField(Msg["pin"])
        //.appendField('pin')
        .appendField(new Blockly.FieldDropdown(() => { return this.update_list(true);}), 'PIN');
    this.getField('DEVICE').setVisible(false);
    this.setOutput(true, null);
    this.setColour(190);
    this.setHelpUrl("http://www.bipes.net.br");
  },
};

Blockly.Blocks['machine.Pin.init'] = {
  init: function() {
   this.appendDummyInput()
        .appendField(" Mode")
        .appendField(new Blockly.FieldDropdown([
          ["IN", "Pin.IN"],
          ["OUT", "Pin.OUT"]
        ]), "MODE")
        .appendField(" Pull")
        .appendField(new Blockly.FieldDropdown([
          ["None", "Ingen"],
          ["PULL UP ", "Pin.PULL_UP"],
          ["PULL DOWN", "Pin.PULL_DOWN"]
        ]), "PULL");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(190);
    this.setTooltip("Configure a GPIO pin");
    this.setHelpUrl("https://docs.micropython.org/en/latest/library/machine.Pin.html");
  }
};

Blockly.Blocks["machine.Pin.irq"] = {
  init: function() {
 this.appendValueInput("pin")
        .setCheck("Number")
        .appendField(`${Msg["add"]} Interrupt ${Msg["ond"]}`)
  this.appendDummyInput()
        .appendField("Trigger")
        .appendField(new Blockly.FieldDropdown([
          ["Falling", "Pin.IRQ_FALLING"],
          ["Rising", "Pin.IRQ_RISING"],
          ["Falling | Rising", "Pin.IRQ._FALLING | Pin.IRQ_RISING"]
        ]), "TRIGGER")
      this.appendStatementInput("DO")
        .setCheck(null) // Accepts any block type
        .appendField(Msg["do"]);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(190);
    this.setTooltip("Configure a GPIO pin");
    this.setHelpUrl("https://docs.micropython.org/en/latest/library/machine.Pin.html");
  },
  setID: function(id_) {
    this.setFieldValue(id_, "ID")
  }
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
    this.setColour(190);
    this.setOutput(true, null);
 this.setTooltip(" ");
 this.setHelpUrl("https://docs.micropython.org/en/latest/library/machine.Pin.html");
  }
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
    this.setColour(190);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
 this.setTooltip(".. method:: Pin.on() Set pin to 1 output level. ");
 this.setHelpUrl("https://docs.micropython.org/en/latest/library/machine.Pin.html");
  }
};


Blockly.Blocks["machine.Pin.toggle"] = {
  init: function() {
     this.appendValueInput("pin")
        .appendField(`Toggle Output ${Msg["ond"]}`)
    this.setColour(190);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
 this.setTooltip(".. method:: Pin.off() Set pin to 0 output level. ");
 this.setHelpUrl("https://docs.micropython.org/en/latest/library/machine.Pin.html");
  }
};

Blockly.Blocks['machine.PWM.init'] = {
  init: function(){
    this.appendValueInput("pin")
        .setCheck("Number")
        .appendField(Msg["setPWMpin"]);
          // Frequency Input with Shadow Block
    this.appendValueInput("frequency")
        .setCheck("Number")
        .appendField("Frequency");

    // Duty Cycle Input with Shadow Block
    this.appendValueInput("duty")
        .setCheck("Number")
        .appendField("Duty Cycle");

    this.setColour(190);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setTooltip("Init and set PWM with frequency (1Hz to 40MHz) and duty (0-1023)");
    this.setHelpUrl("https://docs.micropython.org/en/latest/esp32/quickref.html#pwm-pulse-width-modulation"); 
 }
};

Blockly.Blocks['machine.PWM.freq'] = {
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
  }
};

Blockly.Blocks['machine.PWM.duty'] = {
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
  }
};

Blockly.Blocks["machine.ADC.init"] = {
  init: function() {
    this.appendDummyInput()
        .appendField("Pin")
        .appendField(new Blockly.FieldDropdown([
          ["31 / GPIO 26 / ADC 0", "26"],
          ["32 / GPIO 27 / ADC 1", "27"],
          ["34 / GPIO 28 / ADC 2", "28"]
        ]), "PIN")
    this.setOutput(true, null)
    this.setColour(190); // Purple for variable setup
    this.setTooltip("Create an ADC input using a pin number");
    this.setHelpUrl("");
  }
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
    this.setHelpUrl("");
  }
};


Blockly.Blocks["machine.Timer.init"] = {
  init: function() {
  this.appendDummyInput()
        .appendField(`${Msg["create"]} Timer Interrupt`)
  this.appendDummyInput()
        .appendField("Mode")
        .appendField(new Blockly.FieldDropdown([
          ["One Shot", "Timer.ONE_SHOT"],
          ["Periodic", "Timer.PERIODIC"]
        ]), "MODE")
        .appendField("Periode (ms):")
        .appendField(new Blockly.FieldNumber(1000), "PERIODE")
      this.appendStatementInput("DO")
        .setCheck(null) // Accepts any block type
        .appendField(Msg["do"]);
      this.setColour(190);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
 this.setTooltip(" ");
 this.setHelpUrl("https://docs.micropython.org/en/latest/library/machine.Timer.html");
  }
};
 
Blockly.Blocks["machine.Timer.deinit"] = {
  init: function() {
    this.appendDummyInput()
        .appendField("Stop Timer");
    this.setColour(190);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
 this.setTooltip(".. method:: Timer.deinit() Deinitialises the timer. Stops the timer, and disables the timer peripheral. ");
 this.setHelpUrl("https://docs.micropython.org/en/latest/library/machine.Timer.html");
  }
};