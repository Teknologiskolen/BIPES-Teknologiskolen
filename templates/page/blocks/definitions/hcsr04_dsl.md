# Ultrasonic
<category name="%{CAT_ULTRASONIC}" colour="330">
<label text="%{CAT_ULTRASONIC}"></label>
<button text="%{INSTALL_LIBRARY}: hcsr04" callbackKey="installPyLib"></button>

# hcsr04__create
<block type="hcsr04__create">
  <value name="id">
    <shadow type="math_number">
      <field name="NUM">1</field>
    </shadow>
  </value>
  <value name="trigger_pin">
    <shadow type="pinout">
      <field name="PIN">0</field>
    </shadow>
  </value>
  <value name="echo_pin">
    <shadow type="pinout">
      <field name="PIN">0</field>
    </shadow>
  </value>
  <value name="echo_timeout_us">
    <shadow type="math_number">
      <field name="NUM">30000</field>
    </shadow>
  </value>
</block>

# hcsr04__distance_cm
<block type="hcsr04__distance_cm">
  <value name="id">
    <shadow type="math_number">
      <field name="NUM">1</field>
    </shadow>
  </value>
</block>

# hcsr04__distance_mm
<block type="hcsr04__distance_mm">
  <value name="id">
    <shadow type="math_number">
      <field name="NUM">1</field>
    </shadow>
  </value>
</block>
