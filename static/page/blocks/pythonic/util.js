// Code generators for the small utility blocks.

Blockly.Python['pad_number'] = function(block) {
  var value = Blockly.Python.valueToCode(block, 'VALUE', Blockly.Python.ORDER_NONE) || '0';
  var width = block.getFieldValue('WIDTH');
  // '{:0{}d}'.format(int(7), 2) -> "07"
  var code = "'{:0{}d}'.format(int(" + value + "), " + width + ")";
  return [code, Blockly.Python.ORDER_FUNCTION_CALL];
};
