# %{MICROCONTROLLER}
<category name="%{MICROCONTROLLER}" colour="190">

# %{MACHINE}
<category name="%{MACHINE}" colour="190">

# machine.freq_set
<block type="machine.freq_set">
  <value name="freq">
    <shadow type="math_number">
      <field name="NUM">125000000</field>
    </shadow>
  </value>
</block>

# machine.freq_get
<block type="machine.freq_get"></block>

# machine.unique_id
<block type="machine.unique_id"></block>

# machine.reset_cause
<block type="machine.reset_cause"></block>

# machine.wake_reason
<block type="machine.wake_reason"></block>

# machine.disable_irq
<block type="machine.disable_irq"></block>

# machine.enable_irq
<block type="machine.enable_irq">
  <value name="state">
    <shadow type="math_number">
      <field name="NUM">0</field>
    </shadow>
  </value>
</block>

# machine.idle
<block type="machine.idle"></block>

# machine.lightsleep
<block type="machine.lightsleep">
  <value name="duration_ms">
    <shadow type="math_number">
      <field name="NUM">1000</field>
    </shadow>
  </value>
</block>

# machine.deepsleep
<block type="machine.deepsleep">
  <value name="duration_ms">
    <shadow type="math_number">
      <field name="NUM">1000</field>
    </shadow>
  </value>
</block>

# machine.soft_reset
<block type="machine.soft_reset"></block>

# machine.reset
<block type="machine.reset"></block>

# machine.bootloader
<block type="machine.bootloader"></block>

# machine.time_pulse_us
<block type="machine.time_pulse_us">
  <value name="pin">
    <shadow type="pinout">
      <field name="PIN">0</field>
    </shadow>
  </value>
  <value name="pulse_level">
    <shadow type="math_number">
      <field name="NUM">1</field>
    </shadow>
  </value>
  <value name="timeout_us">
    <shadow type="math_number">
      <field name="NUM">1000000</field>
    </shadow>
  </value>
</block>

# machine.RTC.datetime
<block type="machine.RTC.datetime"></block>

# machine.RTC.set_datetime
<block type="machine.RTC.set_datetime">
  <value name="year">
    <shadow type="math_number">
      <field name="NUM">2026</field>
    </shadow>
  </value>
  <value name="month">
    <shadow type="math_number">
      <field name="NUM">1</field>
    </shadow>
  </value>
  <value name="day">
    <shadow type="math_number">
      <field name="NUM">1</field>
    </shadow>
  </value>
  <value name="weekday">
    <shadow type="math_number">
      <field name="NUM">0</field>
    </shadow>
  </value>
  <value name="hour">
    <shadow type="math_number">
      <field name="NUM">12</field>
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
  <value name="subseconds">
    <shadow type="math_number">
      <field name="NUM">0</field>
    </shadow>
  </value>
</block>

# machine.RTC.deinit
<block type="machine.RTC.deinit"></block>

# machine.WDT.init
<block type="machine.WDT.init">
  <value name="timeout_ms">
    <shadow type="math_number">
      <field name="NUM">5000</field>
    </shadow>
  </value>
</block>

# machine.WDT.feed
<block type="machine.WDT.feed"></block>

# %{PINS}
<category name="%{PINS}" colour="190">

# machine.pinout
<block type="pinout"></block>

# machine.Pin.init
<block type="machine.Pin.init">
  <field name="MODE">Pin.OUT</field>
  <field name="PULL">Ingen</field>
</block>

# machine.Pin.irq
<block type="machine.Pin.irq">
  <value name="pin">
    <shadow type="pinout">
      <field name="PIN">0</field>
    </shadow>
  </value>
  <statement name="DO">
  </statement>
</block>

# machine.Pin.getValue
<block type="machine.Pin.getValue">
  <value name="pin">
    <shadow type="pinout">
      <field name="PIN">1</field>
    </shadow>
  </value>
  <field name="PULL">Ingen</field>
</block>

# machine.Pin.setValue
<block type="machine.Pin.setValue">
  <value name="pin">
    <shadow type="pinout">
      <field name="PIN">0</field>
    </shadow>
  </value>
  <value name="value">
    <shadow type="logic_boolean">
      <field name="BOOL">TRUE</field>
    </shadow>
  </value>
</block>

# machine.Pin.toggle
<block type="machine.Pin.toggle">
  <value name="pin">
    <shadow type="pinout">
      <field name="PIN">1</field>
    </shadow>
  </value>
</block>

# machine.Signal.getValue
<block type="machine.Signal.getValue">
  <value name="pin">
    <shadow type="pinout">
      <field name="PIN">0</field>
    </shadow>
  </value>
  <field name="INVERT">FALSE</field>
</block>

# machine.Signal.setValue
<block type="machine.Signal.setValue">
  <value name="pin">
    <shadow type="pinout">
      <field name="PIN">0</field>
    </shadow>
  </value>
  <value name="value">
    <shadow type="logic_boolean">
      <field name="BOOL">TRUE</field>
    </shadow>
  </value>
  <field name="INVERT">FALSE</field>
</block>

# machine.Signal.on
<block type="machine.Signal.on">
  <value name="pin">
    <shadow type="pinout">
      <field name="PIN">0</field>
    </shadow>
  </value>
  <field name="INVERT">FALSE</field>
</block>

# machine.Signal.off
<block type="machine.Signal.off">
  <value name="pin">
    <shadow type="pinout">
      <field name="PIN">0</field>
    </shadow>
  </value>
  <field name="INVERT">FALSE</field>
</block>

# machine.ADC.init
<block type="machine.ADC.init">
  <field name="PIN">26</field>
</block>

# machine.ADC.read_u16
<block type="machine.ADC.read_u16">
  <value name="pin">
    <shadow type="pinout">
      <field name="PIN">26</field>
    </shadow>
  </value>
</block>

# machine.PWM.init
<block type="machine.PWM.init">
  <value name="pin">
    <shadow type="pinout">
      <field name="PIN">0</field>
    </shadow>
  </value>
  <value name="frequency">
    <shadow type="math_number">
      <field name="NUM">1000</field>
    </shadow>
  </value>
  <value name="duty">
    <shadow type="math_number">
      <field name="NUM">0</field>
    </shadow>
  </value>
</block>

# machine.PWM.freq
<block type="machine.PWM.freq">
  <value name="pin">
    <shadow type="pinout">
      <field name="PIN">0</field>
    </shadow>
  </value>
  <value name="frequency">
    <shadow type="math_number">
      <field name="NUM">1000</field>
    </shadow>
  </value>
</block>

# machine.PWM.duty
<block type="machine.PWM.duty">
  <value name="pin">
    <shadow type="pinout">
      <field name="PIN">0</field>
    </shadow>
  </value>
  <value name="duty">
    <shadow type="math_number">
      <field name="NUM">0</field>
    </shadow>
  </value>
</block>

# machine.PWM.deinit
<block type="machine.PWM.deinit">
  <value name="pin">
    <shadow type="pinout">
      <field name="PIN">0</field>
    </shadow>
  </value>
</block>

# Timer_INTERRUPT
<category name="%{CAT_TIMER_INTERRUPT}" colour="190">

# machine.Timer.init
<block type="machine.Timer.init">
  <field name="MODE">Timer.ONE_SHOT</field>
  <field name="PERIODE">1000</field>
  <statement name="DO">
  </statement>
</block>

# machine.Timer.deinit
<block type="machine.Timer.deinit"></block>

# second_core
<block type="second_core"></block>

# stop_second_core
<block type="stop_second_core"></block>
