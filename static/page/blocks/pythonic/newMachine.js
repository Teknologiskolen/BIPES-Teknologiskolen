Blockly.Python['machine.pinout'] = function(block) {
	Blockly.Python.definitions_['from_machine_import_Pin'] = 'from machine import Pin';
	var pin = block.getFieldValue('PIN');
	return [code, Blockly.Python.ORDER_NONE];
};

Blockly.Python['machine.Pin.init'] = function(block) {
	Blockly.Python.definitions_['from_machine_import_Pin'] = 'from machine import Pin';
	var mode = block.getFieldValue('MODE');
	var pull = block.getFieldValue('PULL');

	if (pull === "Ingen")
	{
		var code = `${mode})\n`;
	}
	else
	{
		var code = `{mode}, ${pull})\n`;
	}
	return [code, Blockly.Python.ORDER_NONE];
};

Blockly.Python["machine.Pin.irq"] = function(block) {
	Blockly.Python.definitions_['import machine'] = 'import machine';
	Blockly.Python.definitions_['from_machine_import_Pin'] = 'from machine import Pin';
	
    var pinInput = Blockly.Python.valueToCode(block, 'pin', Blockly.Python.ORDER_ATOMIC);
	var pin = pinInput.replace('(','').replace(')','');

	var trigger = block.getFieldValue('TRIGGER');
	//var priority = block.getFieldValue('PRIORITY');
	//var wake = block.getFieldValue('WAKE');
	
	var statements = Blockly.Python.statementToCode(block, 'DO') || Blockly.Python.PASS;

	// Automatically extract variable names
	var variableNames = [];
	var workspaceVariables = block.workspace.getAllVariables();
		workspaceVariables.forEach(variable => {
		variableNames.push(variable.name);
	});

  	// Create global declaration line
 	var globalLine = Blockly.Python.INDENT + `global ${variableNames.join(', ')}`;

	var callbackFunction = `def handler${pin}(pin):\n${globalLine}\n${statements}`;

	var interrupt = `pin${pin}.irq(handler=handler${pin}, trigger=${trigger})`;

	
	var code = `${callbackFunction}\n${interrupt}\n`;
	return code;
};

Blockly.Python["machine.Pin.getValue"] = function(block) {
	var pinInput = Blockly.Python.valueToCode(block, 'pin', Blockly.Python.ORDER_ATOMIC);
	var pin = pinInput.replace('(','').replace(')','');

    var pull = block.getFieldValue('PULL');
    
	if (pull === "Ingen")
	{
		Blockly.Python.definitions_[`gpio_get_${pin}`] =`pin${pin} = Pin(${pin}, Pin.IN)`;
	}
	else
	{
		Blockly.Python.definitions_[`gpio_get_${pin}`] =`pin${pin} = Pin(${pin}, Pin.IN, ${pull})`;
	}

	var code = `pin${pin}.value()`;
	return [code, Blockly.Python.ORDER_NONE];
};


Blockly.Python["machine.Pin.setValue"] = function(block) {
	Blockly.Python.definitions_['from_machine_import_Pin'] = 'from machine import Pin';
	var pinInput = Blockly.Python.valueToCode(block, 'pin', Blockly.Python.ORDER_ATOMIC);
	var pin = pinInput.replace('(','').replace(')','');

	var value = Blockly.Python.valueToCode(block, 'value', Blockly.Python.ORDER_ATOMIC);

    Blockly.Python.definitions_['gpio_set'] = 'def gpio_set(pin,value):\n  if value >= 1:\n    Pin(pin, Pin.OUT).on()\n  else:\n    Pin(pin, Pin.OUT).off()';

	var code = `gpio_set(${pin}, ${value})\n`;

	return code;
};

Blockly.Python["machine.Pin.toggle"] = function(block) {
	Blockly.Python.definitions_['from_machine_import_Pin'] = 'from machine import Pin';
	var pinInput = Blockly.Python.valueToCode(block, 'pin', Blockly.Python.ORDER_ATOMIC);
	var pin = pinInput.replace('(','').replace(')','');

	var code = `Pin(${pin}, Pin.OUT).toggle()\n`;
	return code;
};

Blockly.Python['machine.PWM.init'] = function(block) {
	Blockly.Python.definitions_['from_machine_import_Pin'] = 'from machine import Pin';
	Blockly.Python.definitions_['from_machine_import_pwm'] = 'from machine import PWM';
	var pinInput = Blockly.Python.valueToCode(block, 'pin', Blockly.Python.ORDER_ATOMIC);
	var pin = pinInput.replace('(','').replace(')','');
    var value_frequency =  Blockly.Python.valueToCode(block, 'frequency', Blockly.Python.ORDER_ATOMIC);
	var value_duty =  Blockly.Python.valueToCode(block, 'duty', Blockly.Python.ORDER_ATOMIC);
	
	code = `pwm${pin} = PWM(Pin(${pin}))\npwm${pin}.freq(${value_frequency})\npwm${pin}.duty_u16(${value_duty})\n`
		
	return code;
};


Blockly.Python['machine.PWM.freq'] = function(block) {
	var pinInput = Blockly.Python.valueToCode(block, 'pin', Blockly.Python.ORDER_ATOMIC);
	var pin = pinInput.replace('(','').replace(')','');
	var value_frequency =  Blockly.Python.valueToCode(block, 'frequency', Blockly.Python.ORDER_ATOMIC);
  	var code = `pwm${pin}.freq(${value_frequency})\n`;

  	return code;
};

Blockly.Python['machine.PWM.duty'] = function(block) {
	var pinInput = Blockly.Python.valueToCode(block, 'pin', Blockly.Python.ORDER_ATOMIC);
	var pin = pinInput.replace('(','').replace(')','');
	var value_duty =  Blockly.Python.valueToCode(block, 'duty', Blockly.Python.ORDER_ATOMIC);
  	var code = `pwm${pin}.duty_u16(${value_duty})\n`;

  return code;
};

Blockly.Python["machine.ADC.init"] = function(block) {
	Blockly.Python.definitions_['import_machine.ADC'] = 'from machine import ADC';
	//var variable = Blockly.Python.nameDB_.getName(block.getFieldValue('var'), Blockly.Names.NameType.VARIABLE);
	var pin = block.getFieldValue('PIN');

	var code = `ADC(${pin})`;

	return [code, Blockly.Python.ORDER_NONE];
  };

Blockly.Python["machine.ADC.read_u16"] = function(block) {
    Blockly.Python.definitions_['import_machine.ADC'] = 'from machine import ADC';
	var pinInput = Blockly.Python.valueToCode(block, 'pin', Blockly.Python.ORDER_ATOMIC);
	var pin = pinInput.replace('(','').replace(')','');

	Blockly.Python.definitions_[`gpio_get_ADC_${pin}`] =`pin${pin} = ADC(${pin})\n`;
	
	var code = `pin${pin}.read_u16()`;
	return [code, Blockly.Python.ORDER_NONE];
  };

Blockly.Python["machine.Timer.init"] = function(block) {
	Blockly.Python.definitions_['from_machine_import_Timer'] = 'from machine import Timer';
	var mode = block.getFieldValue('MODE');
	var period = block.getFieldValue('PERIODE');
	var statements = Blockly.Python.statementToCode(block, 'DO') || Blockly.Python.PASS;

	// Automatically extract variable names
	var variableNames = [];
	var workspaceVariables = block.workspace.getAllVariables();
		workspaceVariables.forEach(variable => {
		variableNames.push(variable.name);
	});

  	// Create global declaration line
 	var globalLine = Blockly.Python.INDENT + `global ${variableNames.join(', ')}`;
	
	var callbackFunction = `def timer0(t):\n${globalLine}\n${statements}`;
	var interrupt = `timer = Timer(mode=${mode}, period=${period}, callback=timer0)`;
	
	var code = `${callbackFunction}\n${interrupt}\n`;
	return code;
};

Blockly.Python["machine.Timer.deinit"] = function(block) {
	Blockly.Python.definitions_['from_machine_import_Timer'] = 'from machine import Timer';
	var code = "machine.Timer.Timer.deinit()\n"; 
	return code;
};