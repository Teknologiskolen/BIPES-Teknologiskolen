# Buzzer Music
<category name="%{CAT_BUZZER_MUSIC}" colour="160">
<label text="%{CAT_BUZZER_MUSIC}"></label>
<button text="%{INSTALL_LIBRARY}: buzzer_music" callbackKey="installPyLib"></button>

# music__create
<block type="music__create">
  <value name="songString">
    <shadow type="text">
      <field name="TEXT">0 A5 2 0;4 E5 2 0;8 A5 2 0;12 E5 2 0</field>
    </shadow>
  </value>
  <value name="looping">
    <shadow type="logic_boolean">
      <field name="BOOL">TRUE</field>
    </shadow>
  </value>
  <value name="tempo">
    <shadow type="math_number">
      <field name="NUM">3</field>
    </shadow>
  </value>
  <value name="duty">
    <shadow type="math_number">
      <field name="NUM">2512</field>
    </shadow>
  </value>
  <value name="pin">
    <shadow type="pinout">
      <field name="PIN">3</field>
    </shadow>
  </value>
</block>

# music__tick
<block type="music__tick">
</block>

# music__stop
<block type="music__stop">
</block>

# music__restart
<block type="music__restart">
</block>

# music__resume
<block type="music__resume">
</block>
