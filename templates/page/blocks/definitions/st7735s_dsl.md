# ST7735S
<category name="ST7735S">
<label text="ST7735S"></label>
<button text="%{INSTALL_LIBRARY}: st7735s" callbackKey="installPyLib"></button>

# st7735_s__create
<block type="st7735_s__create">
  <value name="spi">
    <shadow type="spi">
      <field name="firstbit">MSB</field>
      <value name="id"><shadow type="math_number"><field name="NUM">0</field></shadow></value>
      <value name="baudrate"><shadow type="math_number"><field name="NUM">1000000</field></shadow></value>
      <value name="polarity"><shadow type="math_number"><field name="NUM">0</field></shadow></value>
      <value name="phase"><shadow type="math_number"><field name="NUM">0</field></shadow></value>
      <value name="bits"><shadow type="math_number"><field name="NUM">8</field></shadow></value>
      <value name="sck"><shadow type="math_number"><field name="NUM">18</field></shadow></value>
      <value name="mosi"><shadow type="math_number"><field name="NUM">19</field></shadow></value>
      <value name="miso"><shadow type="math_number"><field name="NUM">16</field></shadow></value>
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

# st7735_s__fill
<block type="st7735_s__fill">
  <value name="color">
    <shadow type="color565">
      <value name="r"><shadow type="math_number"><field name="NUM">0</field></shadow></value>
      <value name="g"><shadow type="math_number"><field name="NUM">0</field></shadow></value>
      <value name="b"><shadow type="math_number"><field name="NUM">0</field></shadow></value>
    </shadow>
  </value>
</block>

# st7735_s__fill_rect
<block type="st7735_s__fill_rect">
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
      <field name="NUM">0</field>
    </shadow>
  </value>
  <value name="h">
    <shadow type="math_number">
      <field name="NUM">0</field>
    </shadow>
  </value>
  <value name="color">
    <shadow type="color565">
      <value name="r"><shadow type="math_number"><field name="NUM">0</field></shadow></value>
      <value name="g"><shadow type="math_number"><field name="NUM">0</field></shadow></value>
      <value name="b"><shadow type="math_number"><field name="NUM">0</field></shadow></value>
    </shadow>
  </value>
</block>

# st7735_s__pixel
<block type="st7735_s__pixel">
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
    <shadow type="color565">
      <value name="r"><shadow type="math_number"><field name="NUM">0</field></shadow></value>
      <value name="g"><shadow type="math_number"><field name="NUM">0</field></shadow></value>
      <value name="b"><shadow type="math_number"><field name="NUM">0</field></shadow></value>
    </shadow>
  </value>
</block>

# st7735_s__hline
<block type="st7735_s__hline">
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
      <field name="NUM">0</field>
    </shadow>
  </value>
  <value name="color">
    <shadow type="color565">
      <value name="r"><shadow type="math_number"><field name="NUM">0</field></shadow></value>
      <value name="g"><shadow type="math_number"><field name="NUM">0</field></shadow></value>
      <value name="b"><shadow type="math_number"><field name="NUM">0</field></shadow></value>
    </shadow>
  </value>
</block>

# st7735_s__vline
<block type="st7735_s__vline">
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
  <value name="h">
    <shadow type="math_number">
      <field name="NUM">0</field>
    </shadow>
  </value>
  <value name="color">
    <shadow type="color565">
      <value name="r"><shadow type="math_number"><field name="NUM">0</field></shadow></value>
      <value name="g"><shadow type="math_number"><field name="NUM">0</field></shadow></value>
      <value name="b"><shadow type="math_number"><field name="NUM">0</field></shadow></value>
    </shadow>
  </value>
</block>

# st7735_s__rect
<block type="st7735_s__rect">
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
      <field name="NUM">0</field>
    </shadow>
  </value>
  <value name="h">
    <shadow type="math_number">
      <field name="NUM">0</field>
    </shadow>
  </value>
  <value name="color">
    <shadow type="color565">
      <value name="r"><shadow type="math_number"><field name="NUM">0</field></shadow></value>
      <value name="g"><shadow type="math_number"><field name="NUM">0</field></shadow></value>
      <value name="b"><shadow type="math_number"><field name="NUM">0</field></shadow></value>
    </shadow>
  </value>
</block>

# st7735_s__line
<block type="st7735_s__line">
  <value name="x0">
    <shadow type="math_number">
      <field name="NUM">0</field>
    </shadow>
  </value>
  <value name="y0">
    <shadow type="math_number">
      <field name="NUM">0</field>
    </shadow>
  </value>
  <value name="x1">
    <shadow type="math_number">
      <field name="NUM">0</field>
    </shadow>
  </value>
  <value name="y1">
    <shadow type="math_number">
      <field name="NUM">0</field>
    </shadow>
  </value>
  <value name="color">
    <shadow type="color565">
      <value name="r"><shadow type="math_number"><field name="NUM">0</field></shadow></value>
      <value name="g"><shadow type="math_number"><field name="NUM">0</field></shadow></value>
      <value name="b"><shadow type="math_number"><field name="NUM">0</field></shadow></value>
    </shadow>
  </value>
</block>

# st7735_s__text
<block type="st7735_s__text">
  <value name="string">
    <shadow type="text">
      <field name="TEXT"></field>
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
    <shadow type="color565">
      <value name="r"><shadow type="math_number"><field name="NUM">0</field></shadow></value>
      <value name="g"><shadow type="math_number"><field name="NUM">0</field></shadow></value>
      <value name="b"><shadow type="math_number"><field name="NUM">0</field></shadow></value>
    </shadow>
  </value>
  <value name="size">
    <shadow type="math_number">
      <field name="NUM">1</field>
    </shadow>
  </value>
</block>

# color565
<block type="color565">
  <value name="r">
    <shadow type="math_number">
      <field name="NUM">0</field>
    </shadow>
  </value>
  <value name="g">
    <shadow type="math_number">
      <field name="NUM">0</field>
    </shadow>
  </value>
  <value name="b">
    <shadow type="math_number">
      <field name="NUM">0</field>
    </shadow>
  </value>
</block>
