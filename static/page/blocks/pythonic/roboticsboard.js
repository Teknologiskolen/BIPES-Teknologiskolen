Blockly.Python["robotics_board_init"] = function(block) {
	Blockly.Python.definitions_['import_PicoRobotics'] = 'import PicoRobotics';
	var code = "board = PicoRobotics.KitronikPicoRobotics()\n"; 
	return code;
};

Blockly.Python["robotics_board_Motor_On"] = function(block) {
	var motor = Blockly.Python.valueToCode(block, 'motor', Blockly.Python.ORDER_ATOMIC);
	var direction = Blockly.Python.valueToCode(block, 'direction', Blockly.Python.ORDER_ATOMIC);
	var speed = Blockly.Python.valueToCode(block, 'speed', Blockly.Python.ORDER_ATOMIC);
	
	var code = 'board.motorOn(' + motor + ',' + direction + ', ' + speed + ")\n"; 
	return code;
};

Blockly.Python["robotics_board_Motor_Off"] = function(block) {
	var motor = Blockly.Python.valueToCode(block, 'motor', Blockly.Python.ORDER_ATOMIC);
	var code = 'board.motorOff(' + motor + ")\n"; 
	return code;
};

Blockly.Python["robotics_board_Servo_Turn"] = function(block) {
	var servo = Blockly.Python.valueToCode(block, 'servo', Blockly.Python.ORDER_ATOMIC);
	var degrees = Blockly.Python.valueToCode(block, 'degrees', Blockly.Python.ORDER_ATOMIC);
	
	var code = 'board.servoWrite(' + servo + ',' + degrees + ")\n"; 
	return code;
};