# App Core
<category name="%{CAT_APP_CORE}" colour="290">
<label text="%{CAT_APP_CORE}"></label>
<button text="%{INSTALL_LIBRARY}: app_core" callbackKey="installPyLib"></button>

# state_machine__create
<block type="state_machine__create">
  <value name="start">
    <shadow type="text">
      <field name="TEXT">idle</field>
    </shadow>
  </value>
</block>

# state_machine__add_rule
<block type="state_machine__add_rule">
  <value name="state">
    <shadow type="text">
      <field name="TEXT">idle</field>
    </shadow>
  </value>
  <value name="event">
    <shadow type="text">
      <field name="TEXT">ok</field>
    </shadow>
  </value>
  <value name="next_state">
    <shadow type="text">
      <field name="TEXT">idle</field>
    </shadow>
  </value>
</block>

# state_machine__feed
<block type="state_machine__feed">
  <value name="event">
    <shadow type="text">
      <field name="TEXT">ok</field>
    </shadow>
  </value>
</block>

# state_machine__go
<block type="state_machine__go">
  <value name="name">
    <shadow type="text">
      <field name="TEXT">idle</field>
    </shadow>
  </value>
</block>

# state_machine__state
<block type="state_machine__state">
</block>

# state_machine__is_state
<block type="state_machine__is_state">
  <value name="name">
    <shadow type="text">
      <field name="TEXT">idle</field>
    </shadow>
  </value>
</block>

# state_machine__entered
<block type="state_machine__entered">
  <value name="name">
    <shadow type="text">
      <field name="TEXT">idle</field>
    </shadow>
  </value>
</block>

# state_machine__changed
<block type="state_machine__changed">
</block>

# state_machine__tick
<block type="state_machine__tick">
</block>
