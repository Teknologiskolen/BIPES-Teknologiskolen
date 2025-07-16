Blockly.Python['uss_init'] = function(block) {
	Blockly.Python.definitions_['from_hcsr04 _import_HCSR04'] = 'from hcsr04  import HCSR04';
    var echoInput = Blockly.Python.valueToCode(block, 'echo', Blockly.Python.ORDER_ATOMIC);
    var triggerInput = Blockly.Python.valueToCode(block, 'trigger', Blockly.Python.ORDER_ATOMIC);
    var unit = block.getFieldValue('unit');

	var echo = echoInput.replace('(','').replace(')','');
	var trigger = triggerInput.replace('(','').replace(')','');

    Blockly.Python.definitions_[`hcsr04_${echo}_${trigger}`] =`hcsr04${echo}_${trigger} = HCSR04(echo_pin=${echo}, trigger_pin=${trigger})\n`;
    
	if(unit === "0")
    {
		var code = `hcsr04${echo}_${trigger}.distance_mm()`;
	}
	else
	{
		var code = `hcsr04${echo}_${trigger}.distance_cm()`;
	}

	return [code, Blockly.Python.ORDER_NONE];
};

Blockly.Python["uss_distance_mm"] = function(block) {
	$ = Blockly.internal_;
	var variable = $.Blockly.Python.nameDB_.getName(block.getFieldValue('var'), $.module$exports$Blockly$Names.NameType.VARIABLE);
	var code = `${variable}.distance_mm()`;
	return [code, Blockly.Python.ORDER_NONE];
};

Blockly.Python["uss_distance_cm"] = function(block) {
	$ = Blockly.internal_;
	var variable = $.Blockly.Python.nameDB_.getName(block.getFieldValue('var'), $.module$exports$Blockly$Names.NameType.VARIABLE);
	var code = `${variable}.distance_cm()`;
	return [code, Blockly.Python.ORDER_NONE];
};