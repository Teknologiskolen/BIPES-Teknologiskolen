Blockly.Blocks['uss_init'] = {
  init: function() {
	this.appendDummyInput()
      .appendField(new Blockly.FieldImage(
        "static/page/blocks/images/hcsr04.png",
        55,
        55,
        "*"))
      .appendField("Start HCSR04 Ultrasound sensor")
	  ;
    this.appendDummyInput()
        .appendField(`${Msg["get_distance_from"]} Ultra Sonic Sensor ${Msg["in"]}`)
        .appendField(new Blockly.FieldDropdown([
          ["mm", "0"],
          ["cm", "1"]
        ]), "unit")
     this.appendValueInput("echo")
        .setCheck("Number")
        .setAlign(Blockly.ALIGN_LEFT)
        .appendField("Echo Pin:");
      this.appendValueInput("trigger")
        .setCheck("Number")
        .setAlign(Blockly.ALIGN_LEFT)
        .appendField("Trigger Pin:");
    this.setOutput(true, null);
    this.setColour(70);
    this.setTooltip("Configure a GPIO pin");
    this.setHelpUrl("https://docs.micropython.org/en/latest/library/machine.Pin.html");
  }
};

Blockly.Blocks["uss_distance_mm"] = {
  init: function() {
    this.appendDummyInput()
      .appendField("Read Distance (mm) from")
      .appendField(new Blockly.FieldVariable("Variable"), "var")
    this.setColour(70);
    this.setOutput(true, null);
 this.setTooltip(" ");
 this.setHelpUrl("https://docs.micropython.org/en/latest/library/machine.Pin.html");
  }
};

Blockly.Blocks["uss_distance_cm"] = {
  init: function() {
    this.appendDummyInput()
      .appendField("Read Distance (cm) from")
      .appendField(new Blockly.FieldVariable("Variable"), "var")
    this.setColour(70);
    this.setOutput(true, null);
 this.setTooltip(" ");
 this.setHelpUrl("https://docs.micropython.org/en/latest/library/machine.Pin.html");
  }
};
