# Alarm Clock
<category name="%{CAT_ALARM_CLOCK}" colour="200">
<label text="%{CAT_ALARM_CLOCK}"></label>
<button text="%{INSTALL_LIBRARY}: alarm_clock" callbackKey="installPyLib"></button>

# alarm_clock__create
<block type="alarm_clock__create">
  <value name="spi">
    <shadow type="text">
      <field name="TEXT"></field>
    </shadow>
  </value>
  <value name="dc">
    <shadow type="pinout">
      <field name="PIN">16</field>
    </shadow>
  </value>
  <value name="rst">
    <shadow type="pinout">
      <field name="PIN">20</field>
    </shadow>
  </value>
  <value name="cs">
    <shadow type="pinout">
      <field name="PIN">17</field>
    </shadow>
  </value>
  <value name="clk">
    <shadow type="pinout">
      <field name="PIN">1</field>
    </shadow>
  </value>
  <value name="dat">
    <shadow type="pinout">
      <field name="PIN">0</field>
    </shadow>
  </value>
  <value name="rtc_rst">
    <shadow type="pinout">
      <field name="PIN">2</field>
    </shadow>
  </value>
  <value name="field_pin">
    <shadow type="pinout">
      <field name="PIN">14</field>
    </shadow>
  </value>
  <value name="plus_pin">
    <shadow type="pinout">
      <field name="PIN">15</field>
    </shadow>
  </value>
  <value name="mode_pin">
    <shadow type="pinout">
      <field name="PIN">13</field>
    </shadow>
  </value>
  <value name="width">
    <shadow type="math_number">
      <field name="NUM">160</field>
    </shadow>
  </value>
  <value name="height">
    <shadow type="math_number">
      <field name="NUM">128</field>
    </shadow>
  </value>
</block>

# alarm_clock__update
<block type="alarm_clock__update">
</block>

# alarm_clock__set_alarm
<block type="alarm_clock__set_alarm">
  <value name="hour">
    <shadow type="math_number">
      <field name="NUM">7</field>
    </shadow>
  </value>
  <value name="minute">
    <shadow type="math_number">
      <field name="NUM">0</field>
    </shadow>
  </value>
</block>

# alarm_clock__enable_alarm
<block type="alarm_clock__enable_alarm">
  <value name="on">
    <shadow type="logic_boolean">
      <field name="BOOL">TRUE</field>
    </shadow>
  </value>
</block>

# alarm_clock__is_enabled
<block type="alarm_clock__is_enabled">
</block>

# alarm_clock__is_ringing
<block type="alarm_clock__is_ringing">
</block>

# alarm_clock__alarm_started
<block type="alarm_clock__alarm_started">
</block>

# alarm_clock__alarm_stopped
<block type="alarm_clock__alarm_stopped">
</block>

# alarm_clock__read
<block type="alarm_clock__read">
</block>

# alarm_clock__in_normal
<block type="alarm_clock__in_normal">
</block>

# alarm_clock__in_set_alarm
<block type="alarm_clock__in_set_alarm">
</block>

# alarm_clock__in_set_clock
<block type="alarm_clock__in_set_clock">
</block>

# alarm_clock__in_ringing
<block type="alarm_clock__in_ringing">
</block>

# alarm_clock__set_alarm_mode
<block type="alarm_clock__set_alarm_mode">
</block>

# alarm_clock__set_clock_mode
<block type="alarm_clock__set_clock_mode">
</block>

# alarm_clock__go_normal
<block type="alarm_clock__go_normal">
</block>

# alarm_clock__field_pressed
<block type="alarm_clock__field_pressed">
</block>

# alarm_clock__plus_pressed
<block type="alarm_clock__plus_pressed">
</block>

# alarm_clock__mode_clicked
<block type="alarm_clock__mode_clicked">
</block>

# alarm_clock__mode_double_clicked
<block type="alarm_clock__mode_double_clicked">
</block>

# alarm_clock__handle_buttons
<block type="alarm_clock__handle_buttons">
</block>

# alarm_clock__next_field
<block type="alarm_clock__next_field">
</block>

# alarm_clock__increase
<block type="alarm_clock__increase">
</block>

# alarm_clock__save
<block type="alarm_clock__save">
</block>

# alarm_clock__commit_alarm
<block type="alarm_clock__commit_alarm">
</block>

# alarm_clock__commit_clock
<block type="alarm_clock__commit_clock">
</block>

# alarm_clock__stop
<block type="alarm_clock__stop">
</block>

# alarm_clock__field
<block type="alarm_clock__field">
</block>

# alarm_clock__alarm_hour
<block type="alarm_clock__alarm_hour">
</block>

# alarm_clock__alarm_minute
<block type="alarm_clock__alarm_minute">
</block>

# alarm_clock__alarm_due
<block type="alarm_clock__alarm_due">
</block>

# alarm_clock__start_ringing
<block type="alarm_clock__start_ringing">
</block>

# alarm_clock__begin_frame
<block type="alarm_clock__begin_frame">
</block>

# alarm_clock__mode_changed
<block type="alarm_clock__mode_changed">
</block>

# alarm_clock__draw_clock
<block type="alarm_clock__draw_clock">
  <value name="x">
    <shadow type="math_number">
      <field name="NUM">16</field>
    </shadow>
  </value>
  <value name="y">
    <shadow type="math_number">
      <field name="NUM">40</field>
    </shadow>
  </value>
  <value name="color">
    <shadow type="math_number">
      <field name="NUM">65535</field>
    </shadow>
  </value>
  <value name="size">
    <shadow type="math_number">
      <field name="NUM">2</field>
    </shadow>
  </value>
</block>

# alarm_clock__draw_date
<block type="alarm_clock__draw_date">
  <value name="x">
    <shadow type="math_number">
      <field name="NUM">40</field>
    </shadow>
  </value>
  <value name="y">
    <shadow type="math_number">
      <field name="NUM">95</field>
    </shadow>
  </value>
  <value name="color">
    <shadow type="math_number">
      <field name="NUM">65535</field>
    </shadow>
  </value>
</block>

# alarm_clock__draw_edit_time
<block type="alarm_clock__draw_edit_time">
  <value name="x">
    <shadow type="math_number">
      <field name="NUM">40</field>
    </shadow>
  </value>
  <value name="y">
    <shadow type="math_number">
      <field name="NUM">45</field>
    </shadow>
  </value>
  <value name="color">
    <shadow type="math_number">
      <field name="NUM">65535</field>
    </shadow>
  </value>
  <value name="size">
    <shadow type="math_number">
      <field name="NUM">2</field>
    </shadow>
  </value>
</block>

# alarm_clock__draw_edit_date
<block type="alarm_clock__draw_edit_date">
  <value name="x">
    <shadow type="math_number">
      <field name="NUM">40</field>
    </shadow>
  </value>
  <value name="y">
    <shadow type="math_number">
      <field name="NUM">68</field>
    </shadow>
  </value>
  <value name="color">
    <shadow type="math_number">
      <field name="NUM">65535</field>
    </shadow>
  </value>
</block>

# alarm_clock__draw_ringing
<block type="alarm_clock__draw_ringing">
</block>

# alarm_clock__draw_default
<block type="alarm_clock__draw_default">
</block>

# alarm_clock__now_hour
<block type="alarm_clock__now_hour">
</block>

# alarm_clock__now_minute
<block type="alarm_clock__now_minute">
</block>

# alarm_clock__now_second
<block type="alarm_clock__now_second">
</block>

# alarm_clock__now_day
<block type="alarm_clock__now_day">
</block>

# alarm_clock__now_month
<block type="alarm_clock__now_month">
</block>

# alarm_clock__now_year
<block type="alarm_clock__now_year">
</block>

# alarm_clock__time_text
<block type="alarm_clock__time_text">
</block>

# alarm_clock__date_text
<block type="alarm_clock__date_text">
</block>

# alarm_clock__hour_changed
<block type="alarm_clock__hour_changed">
</block>

# alarm_clock__minute_changed
<block type="alarm_clock__minute_changed">
</block>

# alarm_clock__second_changed
<block type="alarm_clock__second_changed">
</block>

# alarm_clock__flash_on
<block type="alarm_clock__flash_on">
</block>

# alarm_clock__draw_text
<block type="alarm_clock__draw_text">
  <value name="string">
    <shadow type="text">
      <field name="TEXT">Hello</field>
    </shadow>
  </value>
  <value name="x">
    <shadow type="math_number">
      <field name="NUM">0</field>
    </shadow>
  </value>
  <value name="y">
    <shadow type="math_number">
      <field name="NUM">0</field>
    </shadow>
  </value>
  <value name="color">
    <shadow type="math_number">
      <field name="NUM">65535</field>
    </shadow>
  </value>
  <value name="size">
    <shadow type="math_number">
      <field name="NUM">1</field>
    </shadow>
  </value>
</block>

# alarm_clock__clear
<block type="alarm_clock__clear">
  <value name="x">
    <shadow type="math_number">
      <field name="NUM">0</field>
    </shadow>
  </value>
  <value name="y">
    <shadow type="math_number">
      <field name="NUM">0</field>
    </shadow>
  </value>
  <value name="w">
    <shadow type="math_number">
      <field name="NUM">10</field>
    </shadow>
  </value>
  <value name="h">
    <shadow type="math_number">
      <field name="NUM">10</field>
    </shadow>
  </value>
</block>

# alarm_clock__fill
<block type="alarm_clock__fill">
  <value name="color">
    <shadow type="math_number">
      <field name="NUM">0</field>
    </shadow>
  </value>
</block>
