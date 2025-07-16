Blockly.Python["bluetooth_init"] = function(block) {
	Blockly.Python.definitions_['from_BLEPeripheral_import_BLEPeripheral'] = 'from BLEPeripheral import BLEPeripheral';
	var message = Blockly.Python.nameDB_.getName(block.getFieldValue('message'), Blockly.Variables.NAME_TYPE);
	var onConnect = Blockly.Python.statementToCode(block, 'OC');
	var onDisconnect = Blockly.Python.statementToCode(block, 'OD');
	var onMessageReveived = Blockly.Python.statementToCode(block, 'OR');

	// Automatically extract variable names
	var variableNames = [];
	var workspaceVariables = block.workspace.getAllVariables();
		workspaceVariables.forEach(variable => {
		variableNames.push(variable.name);
	});

  	// Create global declaration line
 	var globalLine = `  global ${variableNames.join(', ')}\n`;

	var onConnectFunction = `def on_connect(): \n${Blockly.Python.prefixLines(globalLine + onConnect, '')}`;
	var onDisconnectFunction = `def on_disconnect(): \n${Blockly.Python.prefixLines(globalLine + onDisconnect, '')}`;
	var onMessageRevievedFunction = `def on_message_received(${message}): \n${Blockly.Python.prefixLines(globalLine + onMessageReveived, '')}`;

	var code = `def send_message(msg: str):\n  if ble_peripheral.connected:\n    ble_peripheral.send(msg)\n\n`;

	if (!onConnect.trim()) {
		code += onConnectFunction + "  pass\n\n";
  	}
	else
	{
		code += onConnectFunction + "\n";
	}

	if (!onDisconnect.trim()) {
		code += onDisconnectFunction + "   pass\n\n";
  	}
	else
	{
		code += onDisconnectFunction + "\n";
	}

	if (!onMessageReveived.trim()) {
		code += onMessageRevievedFunction + "  pass\n\n";
  	}
	else
	{
		code += onMessageRevievedFunction + "\n";
	}

	code += "ble_peripheral = BLEPeripheral()\n";
	code += "ble_peripheral.on_write(on_message_received)\n";
	code += "ble_peripheral.on_connect(on_connect)\n";
	code += "ble_peripheral.on_disconnect(on_disconnect)\n\n";

	return code;
};

Blockly.Python["bluetooth_send_msg"] = function(block) {
	var message = Blockly.Python.valueToCode(block, 'message', Blockly.Python.ORDER_ATOMIC);
	var code = `send_message(${message})`;
	return code;
};