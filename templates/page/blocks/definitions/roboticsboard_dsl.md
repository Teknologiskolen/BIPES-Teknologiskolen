# Robotics Board
<category name="%{CAT_ROBOTICS_BOARD}" colour="30">
<label text="%{CAT_ROBOTICS_BOARD}"></label>
<button text="%{INSTALL_LIBRARY}: PicoRobotics" callbackKey="installPyLib"></button>

# kitronik_pico_robotics__create
<block type="kitronik_pico_robotics__create">
  <value name="I2CAddress">
    <shadow type="math_number">
      <field name="NUM">108</field>
    </shadow>
  </value>
  <value name="sda">
    <shadow type="pinout">
      <field name="PIN">8</field>
    </shadow>
  </value>
  <value name="scl">
    <shadow type="pinout">
      <field name="PIN">9</field>
    </shadow>
  </value>
</block>

# kitronik_pico_robotics__adjust_servos
<block type="kitronik_pico_robotics__adjust_servos">
  <value name="change">
    <shadow type="math_number">
      <field name="NUM">0</field>
    </shadow>
  </value>
</block>

# kitronik_pico_robotics__motor_on
<block type="kitronik_pico_robotics__motor_on">
  <value name="motor">
    <shadow type="math_number">
      <field name="NUM">1</field>
    </shadow>
  </value>
  <value name="speed">
    <shadow type="math_number">
      <field name="NUM">50</field>
    </shadow>
  </value>
</block>

# kitronik_pico_robotics__motor_off
<block type="kitronik_pico_robotics__motor_off">
  <value name="motor">
    <shadow type="math_number">
      <field name="NUM">1</field>
    </shadow>
  </value>
</block>

# kitronik_pico_robotics__servo_write
<block type="kitronik_pico_robotics__servo_write">
  <value name="servo">
    <shadow type="math_number">
      <field name="NUM">1</field>
    </shadow>
  </value>
  <value name="degrees">
    <shadow type="math_number">
      <field name="NUM">90</field>
    </shadow>
  </value>
</block>

# kitronik_pico_robotics__servo_write_radians
<block type="kitronik_pico_robotics__servo_write_radians">
  <value name="servo">
    <shadow type="math_number">
      <field name="NUM">1</field>
    </shadow>
  </value>
  <value name="radians">
    <shadow type="math_number">
      <field name="NUM">0</field>
    </shadow>
  </value>
</block>

# kitronik_pico_robotics__step
<block type="kitronik_pico_robotics__step">
  <value name="motor">
    <shadow type="math_number">
      <field name="NUM">1</field>
    </shadow>
  </value>
  <value name="steps">
    <shadow type="math_number">
      <field name="NUM">200</field>
    </shadow>
  </value>
  <value name="speed">
    <shadow type="math_number">
      <field name="NUM">20</field>
    </shadow>
  </value>
  <value name="holdPosition">
    <shadow type="logic_boolean">
      <field name="BOOL">FALSE</field>
    </shadow>
  </value>
</block>

# kitronik_pico_robotics__step_angle
<block type="kitronik_pico_robotics__step_angle">
  <value name="motor">
    <shadow type="math_number">
      <field name="NUM">1</field>
    </shadow>
  </value>
  <value name="angle">
    <shadow type="math_number">
      <field name="NUM">90</field>
    </shadow>
  </value>
  <value name="speed">
    <shadow type="math_number">
      <field name="NUM">20</field>
    </shadow>
  </value>
  <value name="holdPosition">
    <shadow type="logic_boolean">
      <field name="BOOL">FALSE</field>
    </shadow>
  </value>
  <value name="stepsPerRev">
    <shadow type="math_number">
      <field name="NUM">200</field>
    </shadow>
  </value>
</block>
