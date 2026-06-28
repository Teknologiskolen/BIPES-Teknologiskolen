# PicoFly
<category name="PicoFly" colour="120">
<label text="PicoFly"></label>
<button text="%{INSTALL_LIBRARY}: picofly_firmware" callbackKey="installPyLib"></button>

# pico_fly__create
<block type="pico_fly__create">
</block>

# pico_fly__motor
<block type="pico_fly__motor">
  <value name="speed">
    <shadow type="math_number">
      <field name="NUM">1</field>
    </shadow>
  </value>
</block>

# pico_fly__motor_stop
<block type="pico_fly__motor_stop">
</block>

# pico_fly__set_servo
<block type="pico_fly__set_servo">
  <value name="angle">
    <shadow type="math_number">
      <field name="NUM">90</field>
    </shadow>
  </value>
</block>
