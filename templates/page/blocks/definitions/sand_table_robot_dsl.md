# Sand Drawing Machine
<category name="%{CAT_SAND_ROBOT}" colour="30">
<label text="%{CAT_SAND_ROBOT}"></label>
<button text="%{INSTALL_LIBRARY}: sand_table_robot" callbackKey="installPyLib"></button>

# sand_table_robot__create
<block type="sand_table_robot__create">
  <value name="motor_shoulder">
    <shadow type="lists_create_with">
      <mutation items="4"></mutation>
      <value name="ADD0">
        <shadow type="math_number">
          <field name="NUM">17</field>
        </shadow>
      </value>
      <value name="ADD1">
        <shadow type="math_number">
          <field name="NUM">16</field>
        </shadow>
      </value>
      <value name="ADD2">
        <shadow type="math_number">
          <field name="NUM">15</field>
        </shadow>
      </value>
      <value name="ADD3">
        <shadow type="math_number">
          <field name="NUM">14</field>
        </shadow>
      </value>
    </shadow>
  </value>
  <value name="motor_elbow">
    <shadow type="lists_create_with">
      <mutation items="4"></mutation>
      <value name="ADD0">
        <shadow type="math_number">
          <field name="NUM">21</field>
        </shadow>
      </value>
      <value name="ADD1">
        <shadow type="math_number">
          <field name="NUM">20</field>
        </shadow>
      </value>
      <value name="ADD2">
        <shadow type="math_number">
          <field name="NUM">19</field>
        </shadow>
      </value>
      <value name="ADD3">
        <shadow type="math_number">
          <field name="NUM">18</field>
        </shadow>
      </value>
    </shadow>
  </value>
  <value name="sensor_shoulder">
    <shadow type="pinout">
      <field name="PIN">1</field>
    </shadow>
  </value>
  <value name="sensor_elbow">
    <shadow type="pinout">
      <field name="PIN">22</field>
    </shadow>
  </value>
</block>

# sand_table_robot__home
<block type="sand_table_robot__home">
</block>

# sand_table_robot__off
<block type="sand_table_robot__off">
</block>

# sand_table_robot__step_motor
<block type="sand_table_robot__step_motor">
  <value name="steps">
    <shadow type="math_number">
      <field name="NUM">500</field>
    </shadow>
  </value>
  <value name="speed">
    <shadow type="math_number">
      <field name="NUM">3</field>
    </shadow>
  </value>
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
      <field name="NUM">500</field>
    </shadow>
  </value>
  <value name="speed">
    <shadow type="math_number">
      <field name="NUM">2</field>
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
      <field name="NUM">10</field>
    </shadow>
  </value>
  <value name="start_angle">
    <shadow type="math_number">
      <field name="NUM">0</field>
    </shadow>
  </value>
  <value name="end_angle">
    <shadow type="math_number">
      <field name="NUM">180</field>
    </shadow>
  </value>
  <value name="segments">
    <shadow type="math_number">
      <field name="NUM">50</field>
    </shadow>
  </value>
  <value name="speed">
    <shadow type="math_number">
      <field name="NUM">2</field>
    </shadow>
  </value>
</block>

# sand_table_robot__draw_spiral
<block type="sand_table_robot__draw_spiral">
  <value name="max_radius">
    <shadow type="math_number">
      <field name="NUM">30</field>
    </shadow>
  </value>
  <value name="turns">
    <shadow type="math_number">
      <field name="NUM">10</field>
    </shadow>
  </value>
  <value name="segments_pr_omgang">
    <shadow type="math_number">
      <field name="NUM">60</field>
    </shadow>
  </value>
  <value name="speed">
    <shadow type="math_number">
      <field name="NUM">2</field>
    </shadow>
  </value>
</block>

# sand_table_robot__draw_flower
<block type="sand_table_robot__draw_flower">
  <value name="max_radius">
    <shadow type="math_number">
      <field name="NUM">30</field>
    </shadow>
  </value>
  <value name="petals">
    <shadow type="math_number">
      <field name="NUM">5</field>
    </shadow>
  </value>
  <value name="speed">
    <shadow type="math_number">
      <field name="NUM">2</field>
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
      <field name="NUM">40</field>
    </shadow>
  </value>
  <value name="draw_speed_ms">
    <shadow type="math_number">
      <field name="NUM">2</field>
    </shadow>
  </value>
  <value name="travel_speed_ms">
    <shadow type="math_number">
      <field name="NUM">2</field>
    </shadow>
  </value>
  <value name="reset_modal">
    <shadow type="logic_boolean">
      <field name="BOOL">TRUE</field>
    </shadow>
  </value>
</block>

# sand_table_robot__run_gcode_file
<block type="sand_table_robot__run_gcode_file">
  <value name="path">
    <shadow type="text">
      <field name="TEXT">/drawing.gcode</field>
    </shadow>
  </value>
  <value name="segments">
    <shadow type="math_number">
      <field name="NUM">40</field>
    </shadow>
  </value>
  <value name="draw_speed_ms">
    <shadow type="math_number">
      <field name="NUM">2</field>
    </shadow>
  </value>
  <value name="travel_speed_ms">
    <shadow type="math_number">
      <field name="NUM">2</field>
    </shadow>
  </value>
  <value name="reset_modal">
    <shadow type="logic_boolean">
      <field name="BOOL">TRUE</field>
    </shadow>
  </value>
</block>
