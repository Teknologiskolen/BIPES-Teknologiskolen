Blockly.Blocks["robotics_board_init"] = {
  init: function() {
    this.appendDummyInput()
    	.appendField(new Blockly.FieldLabelSerializable(`${Msg["init"]} Board`));
	this.appendValueInput("address")
        .setCheck("Number")
        .appendField(`I2C ${Msg["address"]}`)    
	this.appendValueInput("sda")
        .setCheck("Number")
        .appendField(`${Msg["set"]} SDA ${Msg["to"]}`)  
	this.appendValueInput("scl")
        .setCheck("Number")
        .appendField(`${Msg["set"]} SCL ${Msg["to"]}`) 
	this.setColour(45);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
 this.setTooltip(" ");
 this.setHelpUrl("https://github.com/KitronikLtd/Kitronik-Pico-Robotics-Board-MicroPython");
  }
};

Blockly.Blocks["robotics_board_Motor_On"] = {
  init: function() {
    this.appendDummyInput()
      .appendField(new Blockly.FieldLabelSerializable("Start DC Motor"));
    this.appendValueInput("motor")
        .setCheck("Number")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField(new Blockly.FieldLabelSerializable(`${Msg["number"]}`), "motor");
    this.appendValueInput("direction")
        .setCheck("String")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField(new Blockly.FieldLabelSerializable(Msg["direction"]), "direction");
    this.appendValueInput("speed")
        .setCheck("Number")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField(new Blockly.FieldLabelSerializable(Msg["speed"]), "speed");
    this.setColour(45);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
 this.setTooltip(" ");
 this.setHelpUrl("https://github.com/KitronikLtd/Kitronik-Pico-Robotics-Board-MicroPython");
  }
};

Blockly.Blocks["robotics_board_Motor_Off"] = {
  init: function() {
    this.appendDummyInput()
    .appendField(new Blockly.FieldLabelSerializable("Stop DC Motor"));
  this.appendValueInput("motor")
      .setCheck("Number")
      .setAlign(Blockly.ALIGN_RIGHT)
      .appendField(new Blockly.FieldLabelSerializable(`${Msg["number"]}`), "motor");
        this.setColour(45);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
 this.setTooltip(" ");
 this.setHelpUrl("https://github.com/KitronikLtd/Kitronik-Pico-Robotics-Board-MicroPython");
  }
};

Blockly.Blocks["robotics_board_Servo_Turn"] = {
  init: function() {
    this.appendDummyInput()
      .appendField(new Blockly.FieldLabelSerializable(`${Msg["turn"]} Servo Motor`));
    this.appendValueInput("servo")
        .setCheck("Number")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField(new Blockly.FieldLabelSerializable(`${Msg["number"]}`), "servo");
    this.appendValueInput("degrees")
        .setCheck("Number")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField(new Blockly.FieldLabelSerializable(Msg["degrees"]), "degrees");
    this.setColour(45);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
 this.setTooltip(" ");
 this.setHelpUrl("https://github.com/KitronikLtd/Kitronik-Pico-Robotics-Board-MicroPython");
  }
};