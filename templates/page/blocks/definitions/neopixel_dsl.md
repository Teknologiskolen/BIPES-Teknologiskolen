# NeoPixel Strip
<category name="%{CAT_NEOPIXEL_STRIP}" colour="45">
<label text="%{CAT_NEOPIXEL_STRIP}"></label>
<button text="%{INSTALL_LIBRARY}: neopixel" callbackKey="installPyLib"></button>

# neopixel__create
<block type="neopixel__create">
  <value name="id">
    <shadow type="math_number">
      <field name="NUM">1</field>
    </shadow>
  </value>
  <value name="number">
    <shadow type="math_number">
      <field name="NUM">8</field>
    </shadow>
  </value>
  <value name="state_machine">
    <shadow type="math_number">
      <field name="NUM">0</field>
    </shadow>
  </value>
  <value name="pin">
    <shadow type="pinout">
      <field name="PIN">0</field>
    </shadow>
  </value>
</block>

# neopixel__brightness
<block type="neopixel__brightness">
  <value name="id">
    <shadow type="math_number">
      <field name="NUM">1</field>
    </shadow>
  </value>
  <value name="brightness">
    <shadow type="math_number">
      <field name="NUM">128</field>
    </shadow>
  </value>
</block>

# neopixel__set_pixel
<block type="neopixel__set_pixel">
  <value name="id">
    <shadow type="math_number">
      <field name="NUM">1</field>
    </shadow>
  </value>
  <value name="pixel_num">
    <shadow type="math_number">
      <field name="NUM">0</field>
    </shadow>
  </value>
  <value name="rgb_w">
    <shadow type="text">
      <field name="TEXT"></field>
    </shadow>
  </value>
  <value name="how_bright">
    <shadow type="math_number">
      <field name="NUM">255</field>
    </shadow>
  </value>
</block>

# neopixel__set_pixel_line
<block type="neopixel__set_pixel_line">
  <value name="id">
    <shadow type="math_number">
      <field name="NUM">1</field>
    </shadow>
  </value>
  <value name="pixel1">
    <shadow type="math_number">
      <field name="NUM">0</field>
    </shadow>
  </value>
  <value name="pixel2">
    <shadow type="math_number">
      <field name="NUM">1</field>
    </shadow>
  </value>
  <value name="rgb_w">
    <shadow type="text">
      <field name="TEXT"></field>
    </shadow>
  </value>
  <value name="how_bright">
    <shadow type="math_number">
      <field name="NUM">255</field>
    </shadow>
  </value>
</block>

# neopixel__set_pixel_line_gradient
<block type="neopixel__set_pixel_line_gradient">
  <value name="id">
    <shadow type="math_number">
      <field name="NUM">1</field>
    </shadow>
  </value>
  <value name="pixel1">
    <shadow type="math_number">
      <field name="NUM">0</field>
    </shadow>
  </value>
  <value name="pixel2">
    <shadow type="math_number">
      <field name="NUM">1</field>
    </shadow>
  </value>
  <value name="left_rgb_w">
    <shadow type="text">
      <field name="TEXT"></field>
    </shadow>
  </value>
  <value name="right_rgb_w">
    <shadow type="text">
      <field name="TEXT"></field>
    </shadow>
  </value>
  <value name="how_bright">
    <shadow type="math_number">
      <field name="NUM">255</field>
    </shadow>
  </value>
</block>

# neopixel__fill
<block type="neopixel__fill">
  <value name="id">
    <shadow type="math_number">
      <field name="NUM">1</field>
    </shadow>
  </value>
  <value name="rgb_w">
    <shadow type="text">
      <field name="TEXT"></field>
    </shadow>
  </value>
  <value name="how_bright">
    <shadow type="math_number">
      <field name="NUM">255</field>
    </shadow>
  </value>
</block>

# neopixel__clear
<block type="neopixel__clear">
  <value name="id">
    <shadow type="math_number">
      <field name="NUM">1</field>
    </shadow>
  </value>
</block>

# neopixel__rotate_left
<block type="neopixel__rotate_left">
  <value name="id">
    <shadow type="math_number">
      <field name="NUM">1</field>
    </shadow>
  </value>
  <value name="num_of_pixels">
    <shadow type="math_number">
      <field name="NUM">1</field>
    </shadow>
  </value>
</block>

# neopixel__rotate_right
<block type="neopixel__rotate_right">
  <value name="id">
    <shadow type="math_number">
      <field name="NUM">1</field>
    </shadow>
  </value>
  <value name="num_of_pixels">
    <shadow type="math_number">
      <field name="NUM">1</field>
    </shadow>
  </value>
</block>

# neopixel__show
<block type="neopixel__show">
  <value name="id">
    <shadow type="math_number">
      <field name="NUM">1</field>
    </shadow>
  </value>
</block>
