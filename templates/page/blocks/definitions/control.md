# %{CONTROL}
<category name="%{CONTROL}">

# PID
<category name="PID">
<button text="%{INSTALL_LIBRARY}: PID" callbackKey="installPyLib"></button>
<label text="Proportional–integral–derivative Controller"></label>
<label text="https://github.com/gastmaier/micropython-simple-pid"></label>
<button text="%{DOCUMENTATION}: simple_pid" callbackKey="loadDoc"></button>
<button text="%{LOAD_EXAMPLE}: PID_water_boiler" callbackKey="loadExample"></button>
<button text="%{LOAD_EXAMPLE}: PID_thermal_plant_ds1820" callbackKey="loadExample"></button>
<button text="%{LOAD_EXAMPLE}: PID_dc_motor_interrupt" callbackKey="loadExample"></button>

# control_pid.__init__
<block type="control_pid.__init__">
  <value name="SETPOINT">
    <shadow type="math_number">
      <field name="NUM">1</field>
    </shadow>
  </value>
</block>

# control_pid.compute
<block type="control_pid.compute">
  <value name="INPUT">
    <shadow type="math_number">
      <field name="NUM">0</field>
    </shadow>
  </value>
</block>

# control_pid.compute_not_realtime
<block type="control_pid.compute_not_realtime">
  <value name="INPUT">
    <shadow type="math_number">
      <field name="NUM">0</field>
    </shadow>
  </value>
  <value name="DT">
    <shadow type="math_number">
      <field name="NUM">0.1</field>
    </shadow>
  </value>
</block>

# control_pid.tunings
<block type="control_pid.tunings">
  <value name="KP">
    <shadow type="math_number">
      <field name="NUM">1</field>
    </shadow>
  </value>
  <value name="KI">
    <shadow type="math_number">
     <field name="NUM">0</field>
    </shadow>
  </value>
  <value name="KD">
    <shadow type="math_number">
     <field name="NUM">0</field>
    </shadow>
  </value>
</block>

# control_pid.setpoint
<block type="control_pid.setpoint">
  <value name="SETPOINT">
    <shadow type="math_number">
     <field name="NUM">1</field>
    </shadow>
  </value>
</block>

# control_pid.auto_mode
<block type="control_pid.auto_mode"></block>

# control_pid.output_limits
<block type="control_pid.output_limits"></block>

# control_pid.vars
<block type="control_pid.vars"></block>

# control-pid-reset
<!--
<block type="control-pid-reset"></block>
-->

# %{SIMULATE}
<category name="%{SIMULATE}">
<button text="%{INSTALL_LIBRARY}: PID" callbackKey="installPyLib"></button>

# Realtime simulation:
<label text="Realtime simulation:"></label>
<button text="%{LOAD_EXAMPLE}: PID_water_boiler" callbackKey="loadExample"></button>

# simulate_water_boiler
<block type="simulate_water_boiler">
  <value name="POWER">
    <shadow type="math_number">
      <field name="NUM">0</field>
    </shadow>
  </value>
</block>

# Non-real-time simulation:
<label text="Non-real-time simulation:"></label>
<button text="%{LOAD_EXAMPLE}: PID_dc_motor" callbackKey="loadExample"></button>

# simulate_dcmotor.sim
<block type="simulate_dcmotor.sim">
  <value name="POWER">
    <shadow type="math_number">
      <field name="NUM">0</field>
    </shadow>
  </value>
  <value name="DT">
    <shadow type="math_number">
      <field name="NUM">0.001</field>
    </shadow>
  </value>
  <value name="LOAD">
    <shadow type="math_number">
      <field name="NUM">0</field>
    </shadow>
  </value>
</block>

# simulate_dcmotor.vars
<block type="simulate_dcmotor.vars"></block>W

# -
