# %{NET}
<category name="%{NET}" colour="200">

# Status&Configure
<category name="%{CAT_STATUS_CONFIGURE}">

# wifi_client_connect
<block type="wifi_client_connect">
  <value name="wifi_client_essid">
    <shadow type="text">
      <field name="TEXT"></field>
    </shadow>
  </value>
  <value name="wifi_client_key">
    <shadow type="text">
      <field name="TEXT"></field>
    </shadow>
  </value>
</block>

# net_ap_mode
<block type="net_ap_mode">
  <value name="wifi_essid">
    <shadow type="text">
      <field name="TEXT"></field>
    </shadow>
  </value>
  <value name="wifi_key">
    <shadow type="text">
      <field name="TEXT"></field>
    </shadow>
  </value>
</block>

# wifi_client_scan_networks
<block type="wifi_client_scan_networks"></block>

# net_ifconfig
<block type="net_ifconfig"></block>

# net_wiznet5k_init
<block type="net_wiznet5k_init">
  <value name="spi">
    <shadow type="math_number">
      <field name="NUM">0</field>
    </shadow>
  </value>
  <value name="cs">
    <shadow type="math_number">
      <field name="NUM">17</field>
    </shadow>
  </value>
  <value name="rst">
    <shadow type="math_number">
      <field name="NUM">20</field>
    </shadow>
  </value>
</block>

# net_wiznet5k_isconnected
<block type="net_wiznet5k_isconnected"></block>

# net_wiznet5k_regs
<block type="net_wiznet5k_regs"></block>

# net_wiznet5k_ifconfig
<block type="net_wiznet5k_ifconfig">
  <value name="ip">
    <shadow type="text">
      <field name="TEXT">192.168.0.2</field>
    </shadow>
  </value>
  <value name="subnet">
    <shadow type="text">
      <field name="TEXT">255.255.255.0</field>
    </shadow>
  </value>
  <value name="gw">
    <shadow type="text">
      <field name="TEXT">192.168.0.1</field>
    </shadow>
  </value>
  <value name="dns">
    <shadow type="text">
      <field name="TEXT">8.8.8.8</field>
    </shadow>
  </value>
</block>

# HTTP Client
<category name="HTTP Client" colour="200">
<label text="HTTP (web) Client"></label>
<label text="GET Method"></label>

# net_get_request
<block type="net_get_request">
  <value name="URL">
    <shadow type="text">
      <field name="TEXT">http://</field>
    </shadow>
  </value>
</block>

# net_get_request&text
<block type="net_get_request">
  <value name="URL">
    <block type="text">
      <field name="TEXT">http://</field>
    </block>
  </value>
</block>

# http_get_status
<block type="http_get_status"></block>

# http_get_content
<block type="http_get_content"></block>

# variables_set&net_get_request
<block type="variables_set" inline="false">
  <field name="VAR">request</field>
  <value name="VALUE">
    <block type="net_get_request">
      <value name="URL">
        <block type="text">
          <field name="TEXT">http://bipes.net.br/test.txt</field>
        </block>
      </value>
    </block>
  </value>
</block>

# request&http_get_content
<variables>
  <variable id="yFH}K(gY?bu!VLT9NYZ.">request</variable>
</variables>
<block type="variables_set" id="!1xIazB)h~sJ/!$o{Sm5" inline="false" x="-613" y="-737">
  <field name="VAR" id="yFH}K(gY?bu!VLT9NYZ.">request</field>
  <value name="VALUE">
  <block type="net_get_request" id="5gsz(fK06Y^Uq!^eqfl^">
  <value name="URL">
  <block type="text" id="$YN]pq|;%B-%rxn[)aK}">
  <field name="TEXT">http://bipes.net.br/test.txt</field>
  </block>
  </value>
  </block>
  </value>
  <next>
  <block type="controls_if" id="gXT.6iyw4xuE[DIT|DlZ">
  <mutation else="1"/>
  <value name="IF0">
  <block type="logic_compare" id="MAl#oabnR*]}v{*w!UzM">
  <field name="OP">EQ</field>
  <value name="A">
  <block type="http_get_status" id="wtKQnU[WC=}H%N;~w)2V">
  <field name="request" id="yFH}K(gY?buUVLT9NYZ.">request</field>
  </block>
  </value>
  <value name="B">
  <block type="math_number" id="tOXrARcB78l}%us2,2?k">
  <field name="NUM">200</field>
  </block>
  </value>
  </block>
  </value>
  <statement name="DO0">
  <block type="text_print" id="~f:U;)0R$FRjhp{cR]@E">
  <value name="TEXT">
  <shadow type="text" id="pr9Ux3[LuPqlVB$8Clx[">
  <field name="TEXT">abc</field>
  </shadow>
  <block type="text_join" id="=(rN|1TYMR;Dm$,@i*q=">
  <mutation items="2"/>
  <value name="ADD0">
  <block type="text" id="CqCB]Gb8.24=oZ!:4sB~">
  <field name="TEXT">Success. Response content: </field>
  </block>
  </value>
  <value name="ADD1">
  <block type="http_get_content" id="EIZ(Vmcg-,^Dt/N7Xc@;">
  <field name="request" id="yFH}K(gY?buUVLT9NYZ.">request</field>
  </block>
  </value>
  </block>
  </value>
  </block>
  </statement>
  <statement name="ELSE">
  <block type="text_print" id="RpdJo2g.#On;%,bM%LRs">
  <value name="TEXT">
  <shadow type="text">
  <field name="TEXT">abc</field>
  </shadow>
  <block type="text_join" id="bazG!D4x;$0/d[t@aG7]">
  <mutation items="2"/>
  <value name="ADD0">
  <block type="text" id="Gq9,.$(51,A0{y*siaQ~">
  <field name="TEXT">Request Error. Status code = </field>
  </block>
  </value>
  <value name="ADD1">
  <block type="http_get_status" id="gZ+~#AOpOjdmdd=2F%e~">
  <field name="request" id="yFH}K(gY?buUVLT9NYZ.">request</field>
  </block>
  </value>
  </block>
  </value>
  </block>
  </statement>
  </block>
  </next>
</block>

# POST Method
<label text="POST Method"></label>

# net_post_request
<block type="net_post_request">
  <value name="URL">
    <shadow type="text">
      <field name="TEXT">http://</field>
    </shadow>
  </value>
  <value name="data">
    <shadow type="text">
      <field name="TEXT"></field>
    </shadow>
  </value>
</block>

# net_post_request_json
<block type="net_post_request_json"></block>

# HTTP Server
<category name="HTTP Server">
<label text="HTTP Web Server"></label>
<button text="%{LOAD_EXAMPLE}: webserver" callbackKey="loadExample"></button>
<button text="%{DOCUMENTATION}: webserver" callbackKey="loadDoc"></button>

# net_http_server_start
<block type="net_http_server_start">
  <value name="port">
    <shadow type="math_number">
      <field name="NUM">80</field>
    </shadow>
  </value>
</block>

# net_http_server_accept
<block type="net_http_server_accept"></block>

# net_http_server_requested_page
<block type="net_http_server_requested_page"></block>

# net_http_server_send_response
<block type="net_http_server_send_response">
  <value name="html">
    <shadow type="text">
      <field name="TEXT">You reached BIPES WebServer!</field>
    </shadow>
  </value>
</block>

# net_http_server_send_response_jpg
<block type="net_http_server_send_response_jpg">
  <value name="html">
    <shadow type="text">
      <field name="TEXT"></field>
    </shadow>
  </value>
</block>

# net_http_server_close
<block type="net_http_server_close"></block>

# EMAIL
<category name="EMAIL">
<label text="Email sender using uMail"></label>
<label text="Library: https://github.com/shawwwn/uMail"></label>
<button text="%{INSTALL_LIBRARY}: umail" callbackKey="installPyLib"></button>
<button text="%{DOCUMENTATION}: uMail" callbackKey="loadDoc"></button>

# umail_init
<block type="umail_init">
  <value name="host">
    <shadow type="text">
     <field name="TEXT">smtp.gmail.com</field>
    </shadow>
  </value>
  <value name="port">
    <shadow type="math_number">
      <field name="NUM">587</field>
    </shadow>
  </value>
  <value name="username">
    <shadow type="text">
      <field name="TEXT">email@gmail.com</field>
    </shadow>
  </value>
    <value name="password">
    <shadow type="text">
      <field name="TEXT">gmail_password</field>
    </shadow>
  </value>
</block>

# umail_send
<block type="umail_send">
<value name="to">
    <shadow type="text">
      <field name="TEXT">email@email.com</field>
    </shadow>
  </value>
  <value name="subject">
    <shadow type="text">
      <field name="TEXT">Email from BIPES!</field>
    </shadow>
  </value>
  <value name="contents">
    <shadow type="text">
      <field name="TEXT">BIPES is nice!</field>
    </shadow>
  </value>
</block>

# NTP Time
<category name="%{CAT_NTP_TIME}">
<label text="Network Time Protocol (NTP)"></label>
<label text="Adjusts RTC using Internet"></label>
<button text="Load example: ntp" callbackKey="loadExample"></button>
<button text="%{DOCUMENTATION}: ntp" callbackKey="loadDoc"></button>

# net_ntp_sync
<block type="net_ntp_sync">
  <value name="tz">
    <shadow type="math_number">
     <field name="NUM">3</field>
    </shadow>
  </value>
</block>

# TCP/IP Socket
<category name="TCP/IP Socket">
<label text="TCP/IP Socket"></label>
<button text="%{LOAD_EXAMPLE}: starwars" callbackKey="loadExample"></button>
<button text="%{DOCUMENTATION}: sockets" callbackKey="loadDoc"></button>

# net_socket_connect
<block type="net_socket_connect">
  <value name="host">
    <shadow type="text">
      <field name="TEXT">towel.blinkenlights.nl</field>
    </shadow>
  </value>
  <value name="port">
    <shadow type="math_number">
      <field name="NUM">23</field>
    </shadow>
  </value>
</block>

# net_socket_receive
<block type="net_socket_receive">
	<value name="bytes">
      <shadow type="math_number">
        <field name="NUM">500</field>
      </shadow>
    </value>
</block>

# net_socket_send
<block type="net_socket_send">
 <value name="bytes">
    <shadow type="text">
      <field name="TEXT">Hello</field>
    </shadow>
  </value>
</block>

# net_socket_close
<block type="net_socket_close"></block>

# MQTT
<category name="MQTT">
<label text="MQTT (Message Queue Telemetry Transport)"></label>

# mqtt_init
<block type="mqtt_init">
  <value name="server">
    <shadow type="text">
      <field name="TEXT"></field>
    </shadow>
  </value>
  <value name="port">
    <shadow type="math_number">
      <field name="NUM">1883</field>
    </shadow>
  </value>
  <value name="user">
    <shadow type="text">
      <field name="TEXT"></field>
    </shadow>
  </value>
  <value name="password">
    <shadow type="text">
      <field name="TEXT"></field>
    </shadow>
  </value>
</block>

# mqtt_add_to_buffer
<block type="mqtt_add_to_buffer">
  <value name="fieldname">
    <shadow type="text">
      <field name="TEXT"></field>
    </shadow>
  </value>
</block>

# mqtt_publish_buffer
<block type="mqtt_publish_buffer">
  <value name="topic">
    <shadow type="text">
      <field name="TEXT"></field>
    </shadow>
  </value>
</block>

# mqtt_publish_payload
<block type="mqtt_publish_payload">
  <value name="topic">
    <shadow type="text">
      <field name="TEXT"></field>
    </shadow>
  </value>
  <value name="payload">
    <shadow type="text">
      <field name="TEXT"></field>
    </shadow>
  </value>
</block>

# mqtt_set_callback
<block type="mqtt_set_callback">
</block>

# mqtt_subscribe
<block type="mqtt_subscribe">
  <value name="topic">
    <shadow type="text">
      <field name="TEXT"></field>
    </shadow>
  </value>
</block>

# mqtt_check_msg
<block type="mqtt_check_msg">
</block>
# mqtt_wait_msg
<block type="mqtt_wait_msg">
</block>

# mqtt_disconnect
<block type="mqtt_disconnect">
</block>

# EasyMQTT
<category name="EasyMQTT">
<label text="IoT: EasyMQTT"></label>

# easymqtt_init
<block type="easymqtt_init"></block>

# easymqtt_publish_data
<block type="easymqtt_publish_data">
  <value name="topic">
    <shadow type="text">
      <field name="TEXT"></field>
    </shadow>
  </value>
  <value name="data">
    <shadow type="math_number">
      <field name="NUM"></field>
    </shadow>
  </value>
</block>

# easymqtt_publish_axis
<block type="easymqtt_publish_axis">
  <value name="ADD0">
    <shadow type="utime.vars">
      <field name="VARS">ticks_ms</field>
    </shadow>
  </value>
</block>

# easymqtt_subscribe
<block type="easymqtt_subscribe">
  <value name="topic">
    <shadow type="text">
      <field name="TEXT"></field>
    </shadow>
  </value>
</block>

# easymqtt_receive_data
<block type="easymqtt_receive_data"></block>

# easymqtt_disconnect
<block type="easymqtt_disconnect">
</block>

# Connectivity
<category name="%{CAT_CONNECTIVITY}">
<button text="%{INSTALL_LIBRARY}: runtime_launcher" callbackKey="installPyLib"></button>
<button text="%{INSTALL_LIBRARY}: bipes_runtime" callbackKey="installPyLib"></button>
<button text="%{INSTALL_LIBRARY}: ble_advertising" callbackKey="installPyLib"></button>
<button text="%{INSTALL_LIBRARY}: ble_uart_peripheral" callbackKey="installPyLib"></button>
<button text="%{INSTALL_LIBRARY}: umqtt_simple" callbackKey="installPyLib"></button>

# runtime_start
<block type="runtime_start"></block>

# runtime_send
<block type="runtime_send">
    <value name="VALUE">
    <shadow type="math_number">
     <field name="NUM">0</field>
    </shadow>
  </value>
</block>

# runtime_program_serial
<block type="runtime_program_serial"></block>

# runtime_program_bluetooth
<block type="runtime_program_bluetooth"></block>

# runtime_program_wifi
<block type="runtime_program_wifi"></block>

# wifi_is_connected
<block type="wifi_is_connected"></block>

# runtime_start_wifi_literal
<block type="runtime_start_wifi_literal"></block>

# runtime_on_start
<block type="runtime_on_start"></block>

# runtime_on_stop
<block type="runtime_on_stop"></block>

# runtime_on_connect
<block type="runtime_on_connect"></block>

# runtime_on_disconnect
<block type="runtime_on_disconnect"></block>

# runtime_on_message
<block type="runtime_on_message"></block>

# runtime_serial_send
<block type="runtime_serial_send">
  <value name="TEXT">
    <shadow type="text">
      <field name="TEXT">hello</field>
    </shadow>
  </value>
</block>

# runtime_subscribe
<block type="runtime_subscribe">
  <value name="TOPIC">
    <shadow type="text">
      <field name="TEXT">sensor</field>
    </shadow>
  </value>
</block>

# runtime_publish
<block type="runtime_publish">
  <value name="TOPIC">
    <shadow type="text">
      <field name="TEXT">sensor</field>
    </shadow>
  </value>
  <value name="VALUE">
    <shadow type="math_number">
      <field name="NUM">0</field>
    </shadow>
  </value>
</block>

# runtime_ota_update
<block type="runtime_ota_update">
  <value name="URL">
    <shadow type="text">
      <field name="TEXT">http://192.168.0.10/blocks.py</field>
    </shadow>
  </value>
</block>

# runtime_start_wifi_secrets
<block type="runtime_start_wifi_secrets"></block>

# bluetooth_runtime_start
<block type="bluetooth_runtime_start">
  <value name="name">
    <shadow type="text">
      <field name="TEXT">PicoW-Test</field>
    </shadow>
  </value>
</block>

# Radio communication
<category name="%{CAT_RADIO_COMMUNICATION}" colour="230">

# Bluetooth
<category name="Bluetooth" colour="210">
<label text="Bluetooth (BLE)"></label>
<button text="%{INSTALL_LIBRARY}: ble_advertising" callbackKey="installPyLib"></button>
<button text="%{INSTALL_LIBRARY}: ble_uart_peripheral" callbackKey="installPyLib"></button>

# WiFi
<category name="WiFi" colour="170">
<label text="WiFi (Internet / MQTT)"></label>
<button text="%{INSTALL_LIBRARY}: umqtt_simple" callbackKey="installPyLib"></button>

# WebREPL
<category name="WebREPL">
<label text="WebREPL"></label>

# webrepl_setup
<block type="webrepl_setup"></block>
      
# webrepl_start
<block type="webrepl_start"></block>

# CAN Bus
<category name="CAN Bus">
<label text="Controller Area Network (CAN)"></label>
<label text="Requires specific firmware"></label>
<label text="Compatible with: https://github.com/micropython/micropython/issues/5087#issuecomment-538779410"></label>
<button text="%{LOAD_EXAMPLES}: esp32_can" callbackKey="loadExample"></button>
<button text="%{DOCUMENTATION}: esp32_can" callbackKey="loadDoc"></button>

# esp32_can_init
<block type="esp32_can_init">
  <value name="mode">
    <shadow type="text">
      <field name="TEXT">NORMAL</field>
    </shadow>
  </value>
  <value name="baudrate">
    <shadow type="text">
      <field name="TEXT">500000</field>
    </shadow>
  </value>
  <value name="extframe">
    <shadow type="text">
      <field name="TEXT">False</field>
    </shadow>
  </value>
</block>

# esp32_can_filter
<block type="esp32_can_filter">
  <value name="filter">
    <shadow type="text">
      <field name="TEXT">0</field>
    </shadow>
  </value>
</block>

# esp32_can_send
<block type="esp32_can_send">
  <value name="id">
    <shadow type="text">
      <field name="TEXT">0</field>
    </shadow>
  </value>
  <value name="data">
    <shadow type="text">
      <field name="TEXT"></field>
    </shadow>
  </value>
</block>

# esp32_can_recv
<block type="esp32_can_recv"></block>

# Google Sheets
<category name="Google Sheets">
<label text="Send files to a Google Spreadsheet"></label>
<label text="Library: https://gist.github.com/SpotlightKid/8637c685626b334e5c0ec341dd269c44"></label>
<button text="%{INSTALL_LIBRARY}: prequests" callbackKey="installPyLib"></button>

# google_spreadsheet
<block type="google_spreadsheet">
  <field name="sheet_num">1</field>
  <value name="deploy_code">
    <shadow type="text">
      <field name="TEXT">Deploy code</field>
    </shadow>
  </value>
  <statement name="cells_values">
    <block type="cell_value">
      <value name="value">
        <shadow type="text">
          <field name="TEXT">Content</field>
        </shadow>
      </value>
    </block>
  </statement>
</block>

# cell_value
<block type="cell_value">
  <value name="value">
    <shadow type="text">
      <field name="TEXT">content</field>
    </shadow>
  </value>
</block>

# -
