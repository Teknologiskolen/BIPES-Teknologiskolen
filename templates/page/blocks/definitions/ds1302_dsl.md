# DS1302
<category name="DS1302" colour="35">
<label text="DS1302"></label>
<button text="%{INSTALL_LIBRARY}: ds1302" callbackKey="installPyLib"></button>

# ds1302__create
<block type="ds1302__create">
  <value name="clk_pin">
    <shadow type="pinout">
      <field name="PIN">0</field>
    </shadow>
  </value>
  <value name="dat_pin">
    <shadow type="pinout">
      <field name="PIN">0</field>
    </shadow>
  </value>
  <value name="rst_pin">
    <shadow type="pinout">
      <field name="PIN">0</field>
    </shadow>
  </value>
</block>

# ds1302__get_time
<block type="ds1302__get_time">
</block>

# ds1302__get_year
<block type="ds1302__get_year">
</block>

# ds1302__get_month
<block type="ds1302__get_month">
</block>

# ds1302__get_day
<block type="ds1302__get_day">
</block>

# ds1302__get_hour
<block type="ds1302__get_hour">
</block>

# ds1302__get_minute
<block type="ds1302__get_minute">
</block>

# ds1302__get_second
<block type="ds1302__get_second">
</block>

# ds1302__set_time
<block type="ds1302__set_time">
  <value name="year">
    <shadow type="math_number">
      <field name="NUM">0</field>
    </shadow>
  </value>
  <value name="month">
    <shadow type="math_number">
      <field name="NUM">0</field>
    </shadow>
  </value>
  <value name="day">
    <shadow type="math_number">
      <field name="NUM">0</field>
    </shadow>
  </value>
  <value name="hour">
    <shadow type="math_number">
      <field name="NUM">0</field>
    </shadow>
  </value>
  <value name="minute">
    <shadow type="math_number">
      <field name="NUM">0</field>
    </shadow>
  </value>
  <value name="second">
    <shadow type="math_number">
      <field name="NUM">0</field>
    </shadow>
  </value>
</block>
