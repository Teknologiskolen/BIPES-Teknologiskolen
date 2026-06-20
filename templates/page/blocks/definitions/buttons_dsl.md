# Buttons
<category name="%{CAT_BUTTONS}" colour="20">
<label text="%{CAT_BUTTONS}"></label>
<button text="%{INSTALL_LIBRARY}: buttons" callbackKey="installPyLib"></button>

# button_hub__create
<block type="button_hub__create">
</block>

# button_hub__add
<block type="button_hub__add">
  <value name="pin">
    <shadow type="pinout">
      <field name="PIN">0</field>
    </shadow>
  </value>
  <value name="debounce_ms">
    <shadow type="math_number">
      <field name="NUM">130</field>
    </shadow>
  </value>
  <value name="hold_ms">
    <shadow type="math_number">
      <field name="NUM">500</field>
    </shadow>
  </value>
  <value name="repeat_ms">
    <shadow type="math_number">
      <field name="NUM">120</field>
    </shadow>
  </value>
  <value name="double_ms">
    <shadow type="math_number">
      <field name="NUM">400</field>
    </shadow>
  </value>
</block>

# button_hub__was_pressed
<block type="button_hub__was_pressed">
  <value name="pin">
    <shadow type="pinout">
      <field name="PIN">0</field>
    </shadow>
  </value>
</block>

# button_hub__was_double_clicked
<block type="button_hub__was_double_clicked">
  <value name="pin">
    <shadow type="pinout">
      <field name="PIN">0</field>
    </shadow>
  </value>
</block>

# button_hub__was_clicked
<block type="button_hub__was_clicked">
  <value name="pin">
    <shadow type="pinout">
      <field name="PIN">0</field>
    </shadow>
  </value>
</block>

# button_hub__was_released
<block type="button_hub__was_released">
  <value name="pin">
    <shadow type="pinout">
      <field name="PIN">0</field>
    </shadow>
  </value>
</block>

# button_hub__is_down
<block type="button_hub__is_down">
  <value name="pin">
    <shadow type="pinout">
      <field name="PIN">0</field>
    </shadow>
  </value>
</block>

# button_hub__is_held
<block type="button_hub__is_held">
  <value name="pin">
    <shadow type="pinout">
      <field name="PIN">0</field>
    </shadow>
  </value>
</block>

# button_hub__repeated
<block type="button_hub__repeated">
  <value name="pin">
    <shadow type="pinout">
      <field name="PIN">0</field>
    </shadow>
  </value>
</block>
