# %{COMM}
<category name="%{COMM}" colour="135">

# Serial
<category name="Serial / UART" colour="135">
<label text="Serial / UART (USB) — the connected-program model"></label>
<button text="%{INSTALL_LIBRARY}: runtime_launcher" callbackKey="installPyLib"></button>
<button text="%{INSTALL_LIBRARY}: bipes_runtime" callbackKey="installPyLib"></button>

# UART
<category name="UART" colour="135">
<label text="UART Serial Port"></label>

# uart
<block type="uart">
  <field name="parity">NONE</field>
  <value name="id"><shadow type="math_number"><field name="NUM">1</field></shadow></value>
  <value name="baudrate"><shadow type="math_number"><field name="NUM">9600</field></shadow></value>
  <value name="bits"><shadow type="math_number"><field name="NUM">8</field></shadow></value>
  <value name="stop"><shadow type="math_number"><field name="NUM">1</field></shadow></value>
  <value name="tx"><shadow type="math_number"><field name="NUM">4</field></shadow></value>
  <value name="rx"><shadow type="math_number"><field name="NUM">5</field></shadow></value>
  <value name="timeout"><shadow type="math_number"><field name="NUM">0</field></shadow></value>
  <value name="timeout_char"><shadow type="math_number"><field name="NUM">0</field></shadow></value>
</block>

# uart_init
<block type="uart_init">
  <value name="port"><shadow type="math_number"><field name="NUM">1</field></shadow></value>
  <value name="baudrate"><shadow type="math_number"><field name="NUM">9600</field></shadow></value>
  <value name="bits"><shadow type="math_number"><field name="NUM">8</field></shadow></value>
  <value name="stop"><shadow type="math_number"><field name="NUM">1</field></shadow></value>
  <value name="tx"><shadow type="math_number"><field name="NUM">4</field></shadow></value>
  <value name="rx"><shadow type="math_number"><field name="NUM">5</field></shadow></value>
  <value name="timeout"><shadow type="math_number"><field name="NUM">0</field></shadow></value>
  <value name="timeout_char"><shadow type="math_number"><field name="NUM">0</field></shadow></value>
</block>

# uart_deinit
<block type="uart_deinit"></block>

# uart_any
<block type="uart_any"></block>

# uart_write
<block type="uart_write">
  <value name="buf">
    <shadow type="text"><field name="TEXT"></field></shadow>
  </value>
</block>

# uart_read
<block type="uart_read">
  <value name="nbytes">
    <shadow type="math_number"><field name="NUM">1</field></shadow>
  </value>
</block>

# uart_read_into
<block type="uart_read_into">
  <value name="buffer">
    <shadow type="text"><field name="TEXT"></field></shadow>
  </value>
</block>

# uart_readline
<block type="uart_readline"></block>

# uart_read_all
<block type="uart_read_all"></block>

# SPI
<category name="%{CAT_SPI}" colour="135">
<label text="%{CAT_SPI}"></label>

# spi
<block type="spi">
  <field name="firstbit">MSB</field>
  <value name="id"><shadow type="math_number"><field name="NUM">0</field></shadow></value>
  <value name="baudrate"><shadow type="math_number"><field name="NUM">1000000</field></shadow></value>
  <value name="polarity"><shadow type="math_number"><field name="NUM">0</field></shadow></value>
  <value name="phase"><shadow type="math_number"><field name="NUM">0</field></shadow></value>
  <value name="bits"><shadow type="math_number"><field name="NUM">8</field></shadow></value>
  <value name="sck"><shadow type="math_number"><field name="NUM">18</field></shadow></value>
  <value name="mosi"><shadow type="math_number"><field name="NUM">19</field></shadow></value>
  <value name="miso"><shadow type="math_number"><field name="NUM">16</field></shadow></value>
</block>

# SPI.init
<block type="SPI.init">
  <value name="id"><shadow type="math_number"><field name="NUM">0</field></shadow></value>
  <value name="baudRate"><shadow type="math_number"><field name="NUM">1000000</field></shadow></value>
  <value name="polarity"><shadow type="math_number"><field name="NUM">0</field></shadow></value>
  <value name="phase"><shadow type="math_number"><field name="NUM">0</field></shadow></value>
  <value name="bits"><shadow type="math_number"><field name="NUM">8</field></shadow></value>
  <value name="sck"><shadow type="math_number"><field name="NUM">18</field></shadow></value>
  <value name="mosi"><shadow type="math_number"><field name="NUM">19</field></shadow></value>
  <value name="miso"><shadow type="math_number"><field name="NUM">16</field></shadow></value>
</block>

# SPI.deinit
<block type="SPI.deinit"></block>

# SPI.read
<block type="SPI.read">
  <value name="bytes">
    <shadow type="math_number"><field name="NUM">1</field></shadow>
  </value>
  <value name="write_byte">
    <shadow type="math_number"><field name="NUM">0</field></shadow>
  </value>
</block>

# SPI.readinto
<block type="SPI.readinto">
  <value name="buffer">
    <shadow type="text"><field name="TEXT"></field></shadow>
  </value>
  <value name="write_byte">
    <shadow type="math_number"><field name="NUM">0</field></shadow>
  </value>
</block>

# SPI.write
<block type="SPI.write">
  <value name="message">
    <shadow type="text"><field name="TEXT"></field></shadow>
  </value>
</block>

# SPI.write_readinto
<block type="SPI.write_readinto">
  <value name="message">
    <shadow type="text"><field name="TEXT"></field></shadow>
  </value>
  <value name="buffer">
    <shadow type="text"><field name="TEXT"></field></shadow>
  </value>
</block>

# GSM Modem
<category name="%{CAT_GSM_MODEM}">

# gsm_modem_init
<block type="gsm_modem_init">
  <value name="tx">
    <shadow type="math_number"><field name="NUM">4</field></shadow>
  </value>
  <value name="rx">
    <shadow type="math_number"><field name="NUM">5</field></shadow>
  </value>
  <value name="bps">
    <shadow type="math_number"><field name="NUM">9600</field></shadow>
  </value>
</block>

# gsm_modem_send_sms
<block type="gsm_modem_send_sms">
  <value name="dst">
    <shadow type="math_number"><field name="NUM">0</field></shadow>
  </value>
  <value name="msg">
    <shadow type="text"><field name="TEXT">Hello from BIPES!</field></shadow>
  </value>
</block>

# gsm_modem_send_at
<block type="gsm_modem_send_at">
  <value name="cmd">
    <shadow type="text"><field name="TEXT">AT</field></shadow>
  </value>
</block>

# gsm_modem_http_get
<block type="gsm_modem_http_get">
  <value name="cmd">
    <shadow type="text"><field name="TEXT">http://</field></shadow>
  </value>
</block>

# gsm_modem_response
<block type="gsm_modem_response">
  <value name="timeout">
    <shadow type="math_number"><field name="NUM">1000</field></shadow>
  </value>
</block>

# I2C
<category name="I2C" colour="135">
<label text="I2c"></label>

# i2_c
<block type="i2_c">
  <value name="id">
    <shadow type="math_number"><field name="NUM">0</field></shadow>
  </value>
  <value name="sda">
    <shadow type="math_number"><field name="NUM">8</field></shadow>
  </value>
  <value name="scl">
    <shadow type="math_number"><field name="NUM">9</field></shadow>
  </value>
  <value name="freq">
    <shadow type="math_number"><field name="NUM">400000</field></shadow>
  </value>
</block>

# machine.I2C_I2C.init
<block type="machine.I2C_I2C.init">
  <value name="id"><shadow type="math_number"><field name="NUM">0</field></shadow></value>
  <value name="scl"><shadow type="math_number"><field name="NUM">9</field></shadow></value>
  <value name="sda"><shadow type="math_number"><field name="NUM">8</field></shadow></value>
  <value name="freq"><shadow type="math_number"><field name="NUM">400000</field></shadow></value>
  <value name="timeout"><shadow type="math_number"><field name="NUM">50000</field></shadow></value>
</block>

# machine.I2C_I2C.deinit
<block type="machine.I2C_I2C.deinit"></block>

# machine.I2C_I2C.scan
<block type="machine.I2C_I2C.scan"></block>

# machine.I2C_I2C.start
<block type="machine.I2C_I2C.start"></block>

# machine.I2C_I2C.stop
<block type="machine.I2C_I2C.stop"></block>

# machine.I2C_I2C.readinto
<block type="machine.I2C_I2C.readinto">
  <value name="buffer">
    <shadow type="text"><field name="TEXT"></field></shadow>
  </value>
</block>

# machine.I2C_I2C.write
<block type="machine.I2C_I2C.write">
  <value name="buffer">
    <shadow type="text"><field name="TEXT"></field></shadow>
  </value>
</block>

# machine.I2C_I2C.readfrom
<block type="machine.I2C_I2C.readfrom">
  <value name="addr">
    <shadow type="math_number"><field name="NUM">0</field></shadow>
  </value>
  <value name="nbytes">
    <shadow type="math_number"><field name="NUM">1</field></shadow>
  </value>
</block>

# machine.I2C_I2C.readfrom_into
<block type="machine.I2C_I2C.readfrom_into">
  <value name="addr">
    <shadow type="math_number"><field name="NUM">0</field></shadow>
  </value>
  <value name="buffer">
    <shadow type="text"><field name="TEXT"></field></shadow>
  </value>
</block>

# machine.I2C_I2C.writeto
<block type="machine.I2C_I2C.writeto">
  <value name="addr">
    <shadow type="math_number"><field name="NUM">0</field></shadow>
  </value>
  <value name="buffer">
    <shadow type="text"><field name="TEXT"></field></shadow>
  </value>
</block>

# machine.I2C_I2C.writevto
<block type="machine.I2C_I2C.writevto">
  <value name="addr">
    <shadow type="math_number"><field name="NUM">0</field></shadow>
  </value>
  <value name="vector">
    <shadow type="text"><field name="TEXT"></field></shadow>
  </value>
</block>

# machine.I2C_I2C.readfrom_mem
<block type="machine.I2C_I2C.readfrom_mem">
  <value name="addr"><shadow type="math_number"><field name="NUM">0</field></shadow></value>
  <value name="memaddr"><shadow type="math_number"><field name="NUM">0</field></shadow></value>
  <value name="nbytes"><shadow type="math_number"><field name="NUM">1</field></shadow></value>
  <value name="addrsize"><shadow type="math_number"><field name="NUM">8</field></shadow></value>
</block>

# machine.I2C_I2C.readfrom_mem_into
<block type="machine.I2C_I2C.readfrom_mem_into">
  <value name="addr"><shadow type="math_number"><field name="NUM">0</field></shadow></value>
  <value name="memaddr"><shadow type="math_number"><field name="NUM">0</field></shadow></value>
  <value name="buffer"><shadow type="text"><field name="TEXT"></field></shadow></value>
  <value name="addrsize"><shadow type="math_number"><field name="NUM">8</field></shadow></value>
</block>

# machine.I2C_I2C.writeto_mem
<block type="machine.I2C_I2C.writeto_mem">
  <value name="addr"><shadow type="math_number"><field name="NUM">0</field></shadow></value>
  <value name="memaddr"><shadow type="math_number"><field name="NUM">0</field></shadow></value>
  <value name="buffer"><shadow type="text"><field name="TEXT"></field></shadow></value>
  <value name="addrsize"><shadow type="math_number"><field name="NUM">8</field></shadow></value>
</block>

# -
