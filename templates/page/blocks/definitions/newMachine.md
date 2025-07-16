# %{MICROCONTROLLER}
  <category name="%{MICROCONTROLLER}">

# %{PINS}
  <category name="%{PINS}">

# %{MACHINE}
<category name="%{MACHINE}">

# Machine.Pin
<category name="Machine.Pin">

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

# Machine.PWM
<category name="Machine.PWM">

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
	<field name="NUM">0</field>
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

# Machine.ADC
<category name="Machine.ADC">

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

# Timer_INTERRUPT
<category name="Timer Interrupt">

# machine.Timer.init
<block type="machine.Timer.init">
  <field name="MODE">Timer.ONE_SHOT</field>
  <field name="PERIODE">1000</field>
</block>

# machine.Timer.deinit
<block type="machine.Timer.deinit"></block>

# -