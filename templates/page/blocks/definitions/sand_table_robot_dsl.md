# Sand Drawing Machine
<category name="Sand Drawing Machine">
<label text="Sand Drawing Machine"></label>
<button text="%{INSTALL_LIBRARY}: sand_table_robot" callbackKey="installPyLib"></button>
<button text="%{INSTALL_LIBRARY}: stepper" callbackKey="installPyLib"></button>

# sand_table_robot__create
<block type="sand_table_robot__create">
  <value name="motor1_pins">
    <shadow type="lists_create_with">
      <mutation items="4"></mutation>
      <value name="ADD0">
        <shadow type="pinout">
          <field name="PIN">0</field>
        </shadow>
      </value>
      <value name="ADD1">
        <shadow type="pinout">
          <field name="PIN">0</field>
        </shadow>
      </value>
      <value name="ADD2">
        <shadow type="pinout">
          <field name="PIN">0</field>
        </shadow>
      </value>
      <value name="ADD3">
        <shadow type="pinout">
          <field name="PIN">0</field>
        </shadow>
      </value>
    </shadow>
  </value>
  <value name="motor2_pins">
    <shadow type="lists_create_with">
      <mutation items="4"></mutation>
      <value name="ADD0">
        <shadow type="pinout">
          <field name="PIN">0</field>
        </shadow>
      </value>
      <value name="ADD1">
        <shadow type="pinout">
          <field name="PIN">0</field>
        </shadow>
      </value>
      <value name="ADD2">
        <shadow type="pinout">
          <field name="PIN">0</field>
        </shadow>
      </value>
      <value name="ADD3">
        <shadow type="pinout">
          <field name="PIN">0</field>
        </shadow>
      </value>
    </shadow>
  </value>
  <value name="sensor_shoulder_pin">
    <shadow type="pinout">
      <field name="PIN">0</field>
    </shadow>
  </value>
  <value name="sensor_elbow_pin">
    <shadow type="pinout">
      <field name="PIN">0</field>
    </shadow>
  </value>
  <value name="L1">
    <shadow type="math_number">
      <field name="NUM">0</field>
    </shadow>
  </value>
  <value name="L2">
    <shadow type="math_number">
      <field name="NUM">0</field>
    </shadow>
  </value>
  <value name="steps_per_rev">
    <shadow type="math_number">
      <field name="NUM">0</field>
    </shadow>
  </value>
  <value name="backlash_deg_m1">
    <shadow type="math_number">
      <field name="NUM">0</field>
    </shadow>
  </value>
  <value name="backlash_deg_m2">
    <shadow type="math_number">
      <field name="NUM">0</field>
    </shadow>
  </value>
  <value name="homing_dir_shoulder">
    <shadow type="math_number">
      <field name="NUM">0</field>
    </shadow>
  </value>
  <value name="homing_dir_elbow">
    <shadow type="math_number">
      <field name="NUM">0</field>
    </shadow>
  </value>
  <value name="homing_clear_steps">
    <shadow type="math_number">
      <field name="NUM">0</field>
    </shadow>
  </value>
  <value name="default_speed_ms">
    <shadow type="math_number">
      <field name="NUM">0</field>
    </shadow>
  </value>
</block>

# sand_table_robot__off
<block type="sand_table_robot__off">
</block>

# sand_table_robot__home
<block type="sand_table_robot__home">
</block>

# sand_table_robot__move_line
<block type="sand_table_robot__move_line">
  <value name="target_x">
    <shadow type="math_number">
      <field name="NUM">0</field>
    </shadow>
  </value>
  <value name="target_y">
    <shadow type="math_number">
      <field name="NUM">0</field>
    </shadow>
  </value>
  <value name="segments">
    <shadow type="math_number">
      <field name="NUM">0</field>
    </shadow>
  </value>
  <value name="speed">
    <shadow type="math_number">
      <field name="NUM">0</field>
    </shadow>
  </value>
</block>

# sand_table_robot__move_arc
<block type="sand_table_robot__move_arc">
  <value name="center_x">
    <shadow type="math_number">
      <field name="NUM">0</field>
    </shadow>
  </value>
  <value name="center_y">
    <shadow type="math_number">
      <field name="NUM">0</field>
    </shadow>
  </value>
  <value name="radius">
    <shadow type="math_number">
      <field name="NUM">0</field>
    </shadow>
  </value>
  <value name="start_angle">
    <shadow type="math_number">
      <field name="NUM">0</field>
    </shadow>
  </value>
  <value name="end_angle">
    <shadow type="math_number">
      <field name="NUM">0</field>
    </shadow>
  </value>
  <value name="segments">
    <shadow type="math_number">
      <field name="NUM">0</field>
    </shadow>
  </value>
  <value name="speed">
    <shadow type="math_number">
      <field name="NUM">0</field>
    </shadow>
  </value>
</block>

# sand_table_robot__draw_spiral
<block type="sand_table_robot__draw_spiral">
  <value name="max_radius">
    <shadow type="math_number">
      <field name="NUM">0</field>
    </shadow>
  </value>
  <value name="vindinger">
    <shadow type="math_number">
      <field name="NUM">0</field>
    </shadow>
  </value>
  <value name="segments_pr_omgang">
    <shadow type="math_number">
      <field name="NUM">0</field>
    </shadow>
  </value>
  <value name="speed">
    <shadow type="math_number">
      <field name="NUM">0</field>
    </shadow>
  </value>
</block>

# sand_table_robot__draw_flower
<block type="sand_table_robot__draw_flower">
  <value name="max_radius">
    <shadow type="math_number">
      <field name="NUM">0</field>
    </shadow>
  </value>
  <value name="petals">
    <shadow type="math_number">
      <field name="NUM">0</field>
    </shadow>
  </value>
  <value name="speed">
    <shadow type="math_number">
      <field name="NUM">0</field>
    </shadow>
  </value>
</block>

# sand_table_robot__run_gcode_text
<block type="sand_table_robot__run_gcode_text">
  <value name="gcode_text">
    <shadow type="text">
      <field name="TEXT"></field>
    </shadow>
  </value>
  <value name="segments">
    <shadow type="math_number">
      <field name="NUM">0</field>
    </shadow>
  </value>
  <value name="draw_speed_ms">
    <shadow type="math_number">
      <field name="NUM">0</field>
    </shadow>
  </value>
  <value name="travel_speed_ms">
    <shadow type="math_number">
      <field name="NUM">0</field>
    </shadow>
  </value>
  <value name="reset_modal">
    <shadow type="logic_boolean">
      <field name="BOOL">FALSE</field>
    </shadow>
  </value>
</block>

# sand_table_robot__run_gcode_file
<block type="sand_table_robot__run_gcode_file">
  <value name="path">
    <shadow type="text">
      <field name="TEXT"></field>
    </shadow>
  </value>
  <value name="segments">
    <shadow type="math_number">
      <field name="NUM">0</field>
    </shadow>
  </value>
  <value name="draw_speed_ms">
    <shadow type="math_number">
      <field name="NUM">0</field>
    </shadow>
  </value>
  <value name="travel_speed_ms">
    <shadow type="math_number">
      <field name="NUM">0</field>
    </shadow>
  </value>
  <value name="reset_modal">
    <shadow type="logic_boolean">
      <field name="BOOL">FALSE</field>
    </shadow>
  </value>
</block>
