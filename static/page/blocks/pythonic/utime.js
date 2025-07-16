Blockly.Python["utime_localtime"] = function(block) {
	Blockly.Python.definitions_['import_utime'] = 'import utime';
	var value_pIn = Blockly.Python.valueToCode(block, 'pIn', Blockly.Python.ORDER_ATOMIC);
	var code = "utime.localtime(" + value_pIn + ")\n"; 
	return code;
};
Blockly.Python["utime_mktime"] = function(block) {
	Blockly.Python.definitions_['import_utime'] = 'import utime';
	var code = "utime.mktime()\n"; 
	return code;
};
Blockly.Python["utime_sleep"] = function(block) {
	Blockly.Python.definitions_['import_utime'] = 'import utime';
	var value_pIn = Blockly.Python.valueToCode(block, 'pIn', Blockly.Python.ORDER_ATOMIC);
	var code = "utime.sleep(" + value_pIn + ")\n"; 
	return code;
};
Blockly.Python["utime_sleep_ms"] = function(block) {
	Blockly.Python.definitions_['import_utime'] = 'import utime';
	var value_pIn = Blockly.Python.valueToCode(block, 'pIn', Blockly.Python.ORDER_ATOMIC);
	var code = "utime.sleep_ms(" + value_pIn + ")\n"; 
	return code;
};
Blockly.Python["utime_sleep_us"] = function(block) {
	Blockly.Python.definitions_['import_utime'] = 'import utime';
	var value_pIn = Blockly.Python.valueToCode(block, 'pIn', Blockly.Python.ORDER_ATOMIC);
	var code = "utime.sleep_us(" + value_pIn + ")\n"; 
	return code;
};
Blockly.Python["utime_ticks_ms"] = function(block) {
	Blockly.Python.definitions_['import_utime'] = 'import utime';
	var code = "utime.ticks_ms()\n"; 
	return code;
};
Blockly.Python["utime_ticks_us"] = function(block) {
	Blockly.Python.definitions_['import_utime'] = 'import utime';
	var code = "utime.ticks_us()\n"; 
	return code;
};
Blockly.Python["utime_ticks_cpu"] = function(block) {
	Blockly.Python.definitions_['import_utime'] = 'import utime';
	var code = "utime.ticks_cpu()\n"; 
	return code;
};
Blockly.Python["utime_ticks_add"] = function(block) {
	Blockly.Python.definitions_['import_utime'] = 'import utime';
	var value_pIn = Blockly.Python.valueToCode(block, 'pIn', Blockly.Python.ORDER_ATOMIC);
	var code = "utime.ticks_add(" + value_pIn + ")\n"; 
	return code;
};
Blockly.Python["utime_ticks_diff"] = function(block) {
	Blockly.Python.definitions_['import_utime'] = 'import utime';
	var value_pIn = Blockly.Python.valueToCode(block, 'pIn', Blockly.Python.ORDER_ATOMIC);
	var code = "utime.ticks_diff(" + value_pIn + ")\n"; 
	return code;
};
Blockly.Python["utime_time"] = function(block) {
	Blockly.Python.definitions_['import_utime'] = 'import utime';
	var code = "utime.time()\n"; 
	return code;
};