# Robotics Board
<category name="Robotics Board" colour="30">
<label text="Pico Robotics Board"></label>
<label text="Library: https://github.com/KitronikLtd/Kitronik-Pico-Robotics-Board-MicroPython"></label>
<button text="%{INSTALL_LIBRARY}: PicoRobotics" callbackKey="installPyLib"></button>

# robotics_board_init
<block type="robotics_board_init">
	<value name="address">
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

# robotics_board_Motor_On
<block type="robotics_board_Motor_On">
  <value name="motor">
    <shadow type="math_number">
    </shadow>
  </value>
  <value name="direction">
    <shadow type="text">
    </shadow>
  </value>
  <value name="speed">
    <shadow type="math_number">
    </shadow>
  </value>
</block>

# robotics_board_Motor_Off
<block type="robotics_board_Motor_Off">
  <value name="motor">
    <shadow type="math_number">
    </shadow>
  </value>
</block>

# robotics_board_Servo_Turn
<block type="robotics_board_Servo_Turn">
  <value name="servo">
    <shadow type="math_number">
    </shadow>
  </value>
  <value name="degrees">
    <shadow type="math_number">
    </shadow>
  </value>
</block>

# -