# DS1302
<category name="DS1302">
<label text="DS1302"></label>
<button text="%{INSTALL_LIBRARY}: ds1302" callbackKey="installPyLib"></button>

# ds1302__create
<block type="ds1302__create">
  <value name="id">
    <shadow type="math_number">
      <field name="NUM">1</field>
    </shadow>
  </value>
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
  <value name="id">
    <shadow type="math_number">
      <field name="NUM">1</field>
    </shadow>
  </value>
</block>

# ds1302__get_year
<block type="ds1302__get_year">
  <value name="id">
    <shadow type="math_number">
      <field name="NUM">1</field>
    </shadow>
  </value>
</block>

# ds1302__get_month
<block type="ds1302__get_month">
  <value name="id">
    <shadow type="math_number">
      <field name="NUM">1</field>
    </shadow>
  </value>
</block>

# ds1302__get_day
<block type="ds1302__get_day">
  <value name="id">
    <shadow type="math_number">
      <field name="NUM">1</field>
    </shadow>
  </value>
</block>

# ds1302__get_hour
<block type="ds1302__get_hour">
  <value name="id">
    <shadow type="math_number">
      <field name="NUM">1</field>
    </shadow>
  </value>
</block>

# ds1302__get_minute
<block type="ds1302__get_minute">
  <value name="id">
    <shadow type="math_number">
      <field name="NUM">1</field>
    </shadow>
  </value>
</block>

# ds1302__get_second
<block type="ds1302__get_second">
  <value name="id">
    <shadow type="math_number">
      <field name="NUM">1</field>
    </shadow>
  </value>
</block>

# ds1302__get_time_text
<block type="ds1302__get_time_text">
  <value name="id">
    <shadow type="math_number">
      <field name="NUM">1</field>
    </shadow>
  </value>
  <value name="show_seconds">
    <shadow type="logic_boolean">
      <field name="BOOL">TRUE</field>
    </shadow>
  </value>
</block>

# ds1302__get_date_text
<block type="ds1302__get_date_text">
  <value name="id">
    <shadow type="math_number">
      <field name="NUM">1</field>
    </shadow>
  </value>
</block>

# ds1302__set_time
<block type="ds1302__set_time">
  <value name="id">
    <shadow type="math_number">
      <field name="NUM">1</field>
    </shadow>
  </value>
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
