# HC-SR04
<category name="Ultra Sonic Sensor">
<label text="Library: https://github.com/blaz-r/pi_pico_neopixel/blob/main/neopixel.py"></label>
<button text="Install HCSR04 library" callbackKey="installPyLib"></button>

# uss_init
<block type="uss_init">
  <field name="unit">0</field>
  <value name="echo">
      <shadow type="pinout">
        <field name="PIN">0</field>
      </shadow>
    </value>
  <value name="trigger">
      <shadow type="pinout">
        <field name="PIN">1</field>
      </shadow>
    </value>
</block>

# uss_distance_mm
<block type="uss_distance_mm"></block>

# uss_distance_cm
<block type="uss_distance_cm"></block>

# -