// Small utility blocks (hand-written, no library).

// Turn a number into text with leading zeros, e.g. 7 -> "07". The staple for clock
// displays (HH:MM:SS) where Python's f-string `:02d` has no block equivalent.
Blockly.Blocks['pad_number'] = {
  init: function() {
    this.appendValueInput("VALUE")
        .setCheck("Number")
        .appendField("number");
    this.appendDummyInput()
        .appendField("as text, min")
        .appendField(new Blockly.FieldNumber(2, 1, 10, 1), "WIDTH")
        .appendField("digits");
    this.setInputsInline(true);
    this.setOutput(true, "String");
    this.setColour(160);
    this.setTooltip("Turn a number into text with leading zeros, e.g. 7 with 2 digits -> \"07\". Use it for clocks: hour, \":\", minute.");
    this.setHelpUrl("");
  }
};
