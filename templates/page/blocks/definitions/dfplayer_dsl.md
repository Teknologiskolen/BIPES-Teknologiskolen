# DFPlayer
<category name="DFPlayer">
<label text="DFPlayer"></label>
<button text="%{INSTALL_LIBRARY}: dfplayer" callbackKey="installPyLib"></button>

# dfplayer__create
<block type="dfplayer__create">
  <value name="uart_id">
    <shadow type="math_number">
      <field name="NUM">1</field>
    </shadow>
  </value>
  <value name="tx_pin">
    <shadow type="pinout">
      <field name="PIN">4</field>
    </shadow>
  </value>
  <value name="rx_pin">
    <shadow type="pinout">
      <field name="PIN">5</field>
    </shadow>
  </value>
</block>

# dfplayer__play
<block type="dfplayer__play">
  <value name="track">
    <shadow type="math_number">
      <field name="NUM">1</field>
    </shadow>
  </value>
</block>

# dfplayer__play_folder
<block type="dfplayer__play_folder">
  <value name="folder">
    <shadow type="math_number">
      <field name="NUM">0</field>
    </shadow>
  </value>
  <value name="track">
    <shadow type="math_number">
      <field name="NUM">0</field>
    </shadow>
  </value>
</block>

# dfplayer__play_mp3
<block type="dfplayer__play_mp3">
  <value name="track">
    <shadow type="math_number">
      <field name="NUM">0</field>
    </shadow>
  </value>
  <value name="loop">
    <shadow type="logic_boolean">
      <field name="BOOL">FALSE</field>
    </shadow>
  </value>
</block>

# dfplayer__pause
<block type="dfplayer__pause">
</block>

# dfplayer__resume
<block type="dfplayer__resume">
</block>

# dfplayer__stop
<block type="dfplayer__stop">
</block>

# dfplayer__loop_current
<block type="dfplayer__loop_current">
  <value name="enable">
    <shadow type="logic_boolean">
      <field name="BOOL">TRUE</field>
    </shadow>
  </value>
</block>

# dfplayer__next
<block type="dfplayer__next">
</block>

# dfplayer__prev
<block type="dfplayer__prev">
</block>

# dfplayer__volume
<block type="dfplayer__volume">
  <value name="level">
    <shadow type="math_number">
      <field name="NUM">0</field>
    </shadow>
  </value>
</block>

# dfplayer__volume_up
<block type="dfplayer__volume_up">
</block>

# dfplayer__volume_down
<block type="dfplayer__volume_down">
</block>

# dfplayer__eq
<block type="dfplayer__eq">
</block>

# dfplayer__reset
<block type="dfplayer__reset">
</block>

# dfplayer__sleep
<block type="dfplayer__sleep">
</block>

# dfplayer__wake
<block type="dfplayer__wake">
</block>
