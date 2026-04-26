# Clock Helpers
<category name="Clock Helpers">
<label text="Clock Helpers"></label>
<button text="%{INSTALL_LIBRARY}: clock_helpers" callbackKey="installPyLib"></button>

# create_spi
<block type="create_spi">
  <value name="spi_id">
    <shadow type="math_number">
      <field name="NUM">0</field>
    </shadow>
  </value>
  <value name="sck_pin">
    <shadow type="pinout">
      <field name="PIN">18</field>
    </shadow>
  </value>
  <value name="mosi_pin">
    <shadow type="pinout">
      <field name="PIN">19</field>
    </shadow>
  </value>
  <value name="baudrate">
    <shadow type="math_number">
      <field name="NUM">40000000</field>
    </shadow>
  </value>
  <value name="polarity">
    <shadow type="math_number">
      <field name="NUM">0</field>
    </shadow>
  </value>
  <value name="phase">
    <shadow type="math_number">
      <field name="NUM">0</field>
    </shadow>
  </value>
</block>
