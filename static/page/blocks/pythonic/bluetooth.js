Blockly.Python["bluetooth_init"] = function(block) {
  Blockly.Python.definitions_['from_BLEPeripheral_import_BLEPeripheral'] =
    'from BLEPeripheral import BLEPeripheral';

  const INDENT = Blockly.Python.INDENT || '  ';

  const onConnect = Blockly.Python.statementToCode(block, 'OC');
  const onDisconnect = Blockly.Python.statementToCode(block, 'OD');
  const onMessageReveived = Blockly.Python.statementToCode(block, 'OR');

  function emitHandler(defLine, bodyCode, extraTopLines) {
    const hasBody = (bodyCode || '').trim().length > 0;

    let out = `${defLine}\n`;

    if (extraTopLines && extraTopLines.length) {
      for (const l of extraTopLines) out += `${INDENT}${l}\n`;
    }

    if (hasBody) {
      // statementToCode() is already indented correctly — don't indent again
      out += bodyCode;
      if (!out.endsWith('\n')) out += '\n';
      out += '\n';
    } else {
      out += `${INDENT}pass\n\n`;
    }
    return out;
  }

  let code =
    `def send_message(msg: str):\n` +
    `${INDENT}if ble_peripheral.connected:\n` +
    `${INDENT}${INDENT}ble_peripheral.send(msg)\n\n`;

  code += emitHandler('def on_connect():', onConnect, []);
  code += emitHandler('def on_disconnect():', onDisconnect, []);

  const PARAM = "__ble_msg";
  code += emitHandler(
    `def on_message_received(${PARAM}):`,
    onMessageReveived,
    []
  );

  code += "ble_peripheral = BLEPeripheral()\n";
  code += "ble_peripheral.on_write(on_message_received)\n";
  code += "ble_peripheral.on_connect(on_connect)\n";
  code += "ble_peripheral.on_disconnect(on_disconnect)\n\n";

  return code;
};

Blockly.Python["bluetooth_last_msg"] = function(block) {
  var code = "ble_peripheral.last_message";
  return [code, Blockly.Python.ORDER_NONE];
};

Blockly.Python["bluetooth_has_msg"] = function(block) {
  var code = "ble_peripheral.has_message()";
  return [code, Blockly.Python.ORDER_NONE];
};

Blockly.Python["bluetooth_pop_msg"] = function(block) {
  var code = "ble_peripheral.pop_message()";
  return [code, Blockly.Python.ORDER_NONE];
};

Blockly.Python["bluetooth_send_msg"] = function(block) {
	var message = Blockly.Python.valueToCode(block, 'message', Blockly.Python.ORDER_ATOMIC);
	var code = `send_message(${message})\n`;
	return code;
};
