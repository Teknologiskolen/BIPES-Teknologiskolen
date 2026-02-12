Blockly.Python["bluetooth_init"] = function(block) {
  Blockly.Python.definitions_['from_BLEPeripheral_import_BLEPeripheral'] =
    'from BLEPeripheral import BLEPeripheral';

  const INDENT = Blockly.Python.INDENT || '  ';

  // ✅ Use the variable NAME (not ID) so it becomes "Message"
  const msgVarModel = block.getField('message').getVariable();
  const rawMsgName = msgVarModel ? msgVarModel.name : "Message";

  // If available, use Blockly's safeName; otherwise fall back to a simple sanitizer.
  const msgGlobal = (Blockly.Python.nameDB_ && Blockly.Python.nameDB_.safeName_)
    ? Blockly.Python.nameDB_.safeName_(rawMsgName)
    : rawMsgName.replace(/[^A-Za-z0-9_]/g, "_");

  // Ensure ONLY Message exists globally
  Blockly.Python.definitions_[`var_${msgGlobal}`] = `${msgGlobal} = None`;

  const onConnect = Blockly.Python.statementToCode(block, 'OC');
  const onDisconnect = Blockly.Python.statementToCode(block, 'OD');
  const onMessageReveived = Blockly.Python.statementToCode(block, 'OR');

  const globalLine = `global ${msgGlobal}`;

  function emitHandler(defLine, bodyCode, extraTopLines) {
    const hasBody = (bodyCode || '').trim().length > 0;

    let out = `${defLine}\n`;
    out += `${INDENT}${globalLine}\n`;

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

  // ✅ Only Message is global, and Message = __ble_msg
  const PARAM = "__ble_msg";
  code += emitHandler(
    `def on_message_received(${PARAM}):`,
    onMessageReveived,
    [`${msgGlobal} = ${PARAM}`]
  );

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