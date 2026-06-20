// Network ---------------------------------------------------------------------
// Status&Configure ------------------------------------------------------------
Blockly.Blocks['wifi_client_connect'] = {
  init: function() {
    this.appendDummyInput()
        .appendField(new Blockly.FieldLabelSerializable(Msg["wifi_connect"]), "NAME");
    this.appendValueInput("wifi_client_essid")
        .setCheck("String")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField(new Blockly.FieldLabelSerializable(Msg["wifi_name"]), "WIFI_CLIENT_NET_NAME");
    this.appendValueInput("wifi_client_key")
        .setCheck("String")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField(new Blockly.FieldLabelSerializable(Msg["wifi_key"]), "WIFI_CLIENT_NET_KEY");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setInputsInline(true);
    this.setColour(200);
 this.setTooltip("Connect to a WiFi network");
 this.setHelpUrl("http://www.bipes.net.br");
  }
};

Blockly.Blocks['wifi_client_scan_networks'] = {
  init: function() {
    this.appendDummyInput()
        .appendField(new Blockly.FieldLabelSerializable(Msg["wifi_scan"]), "NET_SCAN_WIFI");
    this.setOutput(true, null);
    this.setInputsInline(true);
    this.setColour(200);
 this.setTooltip("Scan WiFi networks");
 this.setHelpUrl("http://www.bipes.net.br");
  }
};

Blockly.Blocks['net_ap_mode'] = {
  init: function() {
    this.appendDummyInput()
        .appendField(new Blockly.FieldLabelSerializable("Configure Access Point Mode"), "NAME");
    this.appendValueInput("wifi_essid")
        .setCheck("String")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField(new Blockly.FieldLabelSerializable("Network name"), "NET_NETWORK_NAME");
    this.appendValueInput("wifi_key")
        .setCheck("String")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField(new Blockly.FieldLabelSerializable("Network password"), "NET_NETWORK_KEY");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setInputsInline(true);
    this.setColour(200);
 this.setTooltip("Configure Access Point Mode");
 this.setHelpUrl("http://www.bipes.net.br");
  }
};


Blockly.Blocks['net_ifconfig'] = {
  init: function() {
    this.appendDummyInput()
        .appendField(new Blockly.FieldLabelSerializable(Msg["wifi_current_ip"]), "NET_IFCONFIG");
    this.setOutput(true, null);
    this.setInputsInline(true);
    this.setColour(170);
 this.setTooltip("Current WiFi IP address");
 this.setHelpUrl("http://www.bipes.net.br");
  }
};

Blockly.Blocks['net_wiznet5k_init'] = {
  init: function() {
    this.setColour(200);
    this.appendDummyInput()
        .appendField("Init WizNet5000");

    this.appendDummyInput()
        .appendField("Ethernet Controller");

    this.appendValueInput("spi")
        .setCheck("Number")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField("SPI Bus:");

    this.appendValueInput("cs")
        .setCheck("Number")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField("CS:");

    this.appendValueInput("rst")
        .setCheck("Number")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField("RST:");

    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setInputsInline(true);
    this.setTooltip('');
  }
};


Blockly.Blocks['net_wiznet5k_isconnected'] = {
  init: function() {
    this.setColour(200);
    this.appendDummyInput()
        .appendField("Check if Ethernet is Connected");

    this.setOutput(true);
    this.setInputsInline(true);
    this.setTooltip('');
  }
};



Blockly.Blocks['net_wiznet5k_regs'] = {
  init: function() {
    this.setColour(200);
    this.appendDummyInput()
        .appendField("Dump Ethernet Registers");

    this.setOutput(true);
    this.setInputsInline(true);
    this.setTooltip('');
  }
};


Blockly.Blocks['net_wiznet5k_ifconfig'] = {
  init: function() {
    this.setColour(200);
    this.appendDummyInput()
        .appendField("Configure WizNet5000");

    this.appendDummyInput()
        .appendField("Ethernet Controller");

    this.appendValueInput("ip")
        .setCheck("String")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField("IP:");

    this.appendValueInput("subnet")
        .setCheck("String")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField("Subnet:");

    this.appendValueInput("gw")
        .setCheck("String")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField("Gateway:");

    this.appendValueInput("dns")
        .setCheck("String")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField("DNS:");

    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setInputsInline(true);
    this.setTooltip('');
  }
};

// HTTP Client -----------------------------------------------------------------

Blockly.Blocks['net_get_request'] = {
  init: function() {

    this.appendDummyInput()
        .appendField(Msg["net_http_get"]);
    this.appendValueInput("URL")
        .setAlign(Blockly.ALIGN_RIGHT)
        .setCheck("String")
        .appendField(new Blockly.FieldLabelSerializable("URL"), "BLOCK_NET_GET");
    this.setOutput(true, null);
    this.setInputsInline(true);
    this.setColour(210);
 this.setTooltip("Make HTTP GET Request");
 this.setHelpUrl("http://www.bipes.net.br");
  }
};


Blockly.Blocks['http_get_status'] = {
  init: function() {
    this.appendDummyInput()
        .appendField(Msg["net_http_get_status"])
        .appendField(new Blockly.FieldVariable("request"), "request");
    this.setOutput(true, null);
    this.setInputsInline(true);
    this.setColour(210);
 this.setTooltip("Status code of the HTTP GET request");
 this.setHelpUrl("bipes.net.br");
  }
};

Blockly.Blocks['http_get_content'] = {
  init: function() {
    this.appendDummyInput()
        .appendField(Msg["net_http_get_content"])
        .appendField(new Blockly.FieldVariable("request"), "request");
    this.setOutput(true, null);
    this.setInputsInline(true);
    this.setColour(210);
 this.setTooltip("Content of HTTP GET request");
 this.setHelpUrl("bipes.net.br");
  }
};
// POST Method -----------------------------------------------------------------
Blockly.Blocks['net_post_request'] = {
  init: function() {
    this.appendValueInput("URL")
        .setCheck("String")
        .appendField(new Blockly.FieldLabelSerializable(Msg["net_http_post_url"]), "NET_POST_REQUEST_URL");
    this.appendValueInput("data")
        .setCheck("String")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField(new Blockly.FieldLabelSerializable(Msg["net_http_post_data"]), "NET_POST_REQUEST_DATA");
    this.setOutput(true, null);
    this.setInputsInline(true);
    this.setColour(210);
 this.setTooltip("Make HTTP POST Request");
 this.setHelpUrl("http://www.bipes.net.br");
  }
};

Blockly.Blocks['net_post_request_json'] = {
  init: function() {
    this.appendValueInput("URL")
        .setCheck("String")
        .appendField(new Blockly.FieldLabelSerializable(Msg["net_http_post_url"]), "NET_POST_REQUEST_URL");
    this.appendValueInput("data")
        .setCheck("String")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField(new Blockly.FieldLabelSerializable(Msg["net_http_post_json_data"]), "NET_POST_REQUEST_DATA");
    this.setOutput(true, null);
    this.setInputsInline(true);
    this.setColour(210);
 this.setTooltip("Make HTTP POST Request with JSON data");
 this.setHelpUrl("http://www.bipes.net.br");
  }
};

// HTTP Server -----------------------------------------------------------------

Blockly.Blocks['net_http_server_start'] = {
  init: function() {
    this.setColour(215);
    this.appendDummyInput()
        .appendField(Msg["net_http_server_start"]);

    this.appendValueInput("port")
        .setCheck("Number")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField(Msg["net_http_server_start_port"]);

    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setInputsInline(true);
    this.setTooltip('');
  }
};


Blockly.Blocks['net_http_server_accept'] = {
  init: function() {
    this.setColour(215);
    this.appendDummyInput()
        .appendField(Msg["net_http_server_wait"]);

    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setInputsInline(true);
    this.setTooltip('');
  }
};


Blockly.Blocks['net_http_server_requested_page'] = {
  init: function() {
    this.setColour(215);
    this.appendDummyInput()
        .appendField(Msg["net_http_server_requested_page"]);

    this.setOutput(true);
    this.setInputsInline(true);
    this.setTooltip('');
  }
};


Blockly.Blocks['net_http_server_send_response'] = {
  init: function() {
    this.setColour(215);
    this.appendDummyInput()
        .appendField(Msg["net_http_server_send_response"]);

    this.appendValueInput("html")
        .setCheck("String")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField(Msg["net_http_server_send_html"]);

    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setInputsInline(true);
    this.setTooltip('');
  }
};

Blockly.Blocks['net_http_server_send_response_jpg'] = {
  init: function() {
    this.setColour(215);
    this.appendDummyInput()
        .appendField(Msg["net_http_server_send_response"]);

    this.appendValueInput("html")
        .setCheck("String")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField("JPG Image");

    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setInputsInline(true);
    this.setTooltip('');
  }
};



Blockly.Blocks['net_http_server_close'] = {
  init: function() {
    this.setColour(215);
    this.appendDummyInput()
        .appendField("Close HTTP Web Server");

    this.setOutput(true);
    this.setInputsInline(true);
    this.setTooltip('');
  }
};

// EMAIL -----------------------------------------------------------------------
Blockly.Blocks['umail_init'] = {
  init: function() {
    this.setColour(185);
    this.appendDummyInput()
        .appendField("Init uMail Email Sender");

    this.appendValueInput("host")
        .setCheck("String")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField("Host:");

    this.appendValueInput("port")
        .setCheck("Number")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField("Port:");

    this.appendValueInput("username")
        .setCheck("String")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField("Username:");

    this.appendValueInput("password")
        .setCheck("String")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField("Password:");

    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setInputsInline(true);
    this.setTooltip('');
  }
};

Blockly.Blocks['umail_send'] = {
  init: function() {
    this.setColour(185);
    this.appendDummyInput()
        .appendField("Send email");

    this.appendValueInput("to")
        .setCheck("String")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField("To email:");

    this.appendValueInput("subject")
        .setCheck("String")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField("Subject:");

    this.appendValueInput("contents")
        .setCheck("String")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField("Email message:");

    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setInputsInline(true);
    this.setTooltip('');
  }
};

// NTP Time --------------------------------------------------------------------
Blockly.Blocks['net_ntp_sync'] = {
  init: function() {
    this.setColour(195);
    this.appendDummyInput()
        .appendField(Msg["ntp_sync"]);

    this.appendDummyInput()
        .appendField("NTP: Network Time Protocol");

    this.appendValueInput("tz")
        .setCheck("Number")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField(Msg["timezone"]);

    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setInputsInline(true);
    this.setTooltip('');
  }
};

// TCP/IP Socket ---------------------------------------------------------------
Blockly.Blocks['net_socket_connect'] = {
  init: function() {
    this.setColour(225);
    this.appendDummyInput()
        .appendField("TCP/IP Socket Connect");

    this.appendValueInput("host")
        .setCheck("String")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField("Host:");

    this.appendValueInput("port")
        .setCheck("Number")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField("Port:");

    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setInputsInline(true);
    this.setTooltip('');
  }
};

Blockly.Blocks['net_socket_receive'] = {
  init: function() {
    this.setColour(225);
    this.appendDummyInput()
        .appendField("Socket Receive");

    this.appendValueInput("bytes")
        .setCheck("Number")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField("Bytes to receive:");

    this.setOutput(true);
    this.setInputsInline(true);
    this.setTooltip('');
  }
};

Blockly.Blocks['net_socket_send'] = {
  init: function() {
    this.setColour(225);
    this.appendDummyInput()
        .appendField("Socket Send");

    this.appendValueInput("bytes")
        .setCheck("String")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField("Data:");

    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setInputsInline(true);
    this.setTooltip('');
  }
};


Blockly.Blocks['net_socket_close'] = {
  init: function() {
    this.setColour(225);
    this.appendDummyInput()
        .appendField("Socket Close");

    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setInputsInline(true);
    this.setTooltip('');
  }
};


// MQTT ------------------------------------------------------------------------
/// Start MQTT Client
Blockly.Blocks['mqtt_init'] = {
  init: function() {
    this.appendDummyInput()
        .appendField(new Blockly.FieldLabelSerializable("Start MQTT Client"), "BLOCK_MQTT_INIT");
    this.appendValueInput("server")
        .setCheck("String")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField(new Blockly.FieldLabelSerializable("Server Address"), "MQTT_SERVER");
    this.appendValueInput("port")
        .setCheck("Number")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField(new Blockly.FieldLabelSerializable("Server Port"), "MQTT_PORT");
    this.appendValueInput("user")
        .setCheck("String")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField(new Blockly.FieldLabelSerializable("Username"), "MQTT_USER");
    this.appendValueInput("password")
        .setCheck("String")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField(new Blockly.FieldLabelSerializable("Password"), "MQTT_PASSWORD");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setInputsInline(true);
    this.setColour(235);
    this.setTooltip("Start MQTT Client");
    this.setHelpUrl("http://www.bipes.net.br");
  }
};

/// Add Data to MQTT Buffer
Blockly.Blocks['mqtt_add_to_buffer'] = {
  init: function() {
    this.appendDummyInput()
        .appendField(new Blockly.FieldLabelSerializable("Add Data to MQTT Buffer"), "BLOCK_MQTT_ADD_TO_BUFFER");
    this.appendValueInput("fieldname")
        .setCheck("String")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField(new Blockly.FieldLabelSerializable("Field Name"), "MQTT_FIELDNAME");
    this.appendValueInput("value")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField(new Blockly.FieldLabelSerializable("Value"), "MQTT_VALUE");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setInputsInline(true);
    this.setColour(235);
    this.setTooltip("Add Data to MQTT Buffer");
    this.setHelpUrl("http://www.bipes.net.br");
  }
};

/// Publish Buffer to MQTT Topic
Blockly.Blocks['mqtt_publish_buffer'] = {
  init: function() {
    this.appendDummyInput()
        .appendField(new Blockly.FieldLabelSerializable("Publish Buffer to MQTT Topic"), "BLOCK_MQTT_PUBLISH");
    this.appendValueInput("topic")
        .setCheck("String")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField(new Blockly.FieldLabelSerializable("Topic"), "MQTT_TOPIC");
    this.appendDummyInput()
        .appendField('QOS:')
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField(new Blockly.FieldDropdown([
            ['0 - at most\u00A0once', '0'],
            ['1 - at least\u00A0once', '1']
        ]), 'MQTT_QOS');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(235);
    this.setInputsInline(true);
    this.setTooltip("Publish Buffer to MQTT Server");
    this.setHelpUrl("http://www.bipes.net.br");
  }
};

/// Publish Payload to MQTT Topic
Blockly.Blocks['mqtt_publish_payload'] = {
  init: function() {
    this.appendDummyInput()
        .appendField(new Blockly.FieldLabelSerializable("Publish Payload to MQTT Topic"), "BLOCK_MQTT_PUBLISH");
    this.appendValueInput("topic")
        .setCheck("String")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField(new Blockly.FieldLabelSerializable("Topic"), "MQTT_TOPIC");
    this.appendValueInput("payload")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField(new Blockly.FieldLabelSerializable("Payload"), "MQTT_PAYLOAD");
    this.appendDummyInput()
        .appendField('QOS:')
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField(new Blockly.FieldDropdown([
            ['0 - at most\u00A0once', '0'],
            ['1 - at least\u00A0once', '1']
        ]), 'MQTT_QOS');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(235);
    this.setInputsInline(true);
    this.setTooltip("Publish Payload to MQTT Server");
    this.setHelpUrl("http://www.bipes.net.br");
  }
};

/// Subscribe to MQTT Topic
Blockly.Blocks['mqtt_subscribe'] = {
  init: function() {
    this.appendDummyInput()
        .appendField(new Blockly.FieldLabelSerializable("Subscribe to MQTT Topic"), "BLOCK_MQTT_SUBSCRIBE");
    this.appendValueInput("topic")
        .setCheck("String")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField(new Blockly.FieldLabelSerializable("Topic"), "MQTT_TOPIC");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setInputsInline(true);
    this.setColour(235);
    this.setTooltip("Subscribe to MQTT Topic");
    this.setHelpUrl("http://www.bipes.net.br");
  }
};

/// Set Callback to MQTT Messages
Blockly.Blocks['mqtt_set_callback'] = {
  init: function() {
    this.appendDummyInput()
        .appendField(new Blockly.FieldLabelSerializable("Set Callback to MQTT Messages"), "BLOCK_MQTT_SET_CALLBACK");
    this.appendDummyInput()
        .appendField('with')
        .appendField(new Blockly.FieldVariable('data_bytes'), 'MQTT_DATA_VAR')
        .appendField('received from')
        .appendField(new Blockly.FieldVariable(
          'topic',
          null,
          ['String'],
          'String'
        ), 'MQTT_TOPIC_VAR');
    this.appendStatementInput('do')
        .appendField('do');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(235);
    this.setInputsInline(true);
    this.setTooltip("Callback function must have topic and msg parameters");
    this.setHelpUrl("http://www.bipes.net.br");
  }
};

/// Check MQTT Server for pending messages
Blockly.Blocks['mqtt_check_msg'] = {
  init: function() {
    this.appendDummyInput()
        .appendField(new Blockly.FieldLabelSerializable("Check MQTT Server for pending messages"), "BLOCK_MQTT_CHECK_Msg");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setInputsInline(true);
    this.setColour(235);
    this.setTooltip("Check if the server has any pending messages. Non-blocking method. Subscription messages will be passed to the callback.");
     this.setHelpUrl("http://www.bipes.net.br");
  }
};

/// Wait for MQTT Server messages
Blockly.Blocks['mqtt_wait_msg'] = {
  init: function() {
    this.appendDummyInput()
        .appendField(new Blockly.FieldLabelSerializable("Wait for MQTT Server messages"), "BLOCK_MQTT_WAIT_Msg");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setInputsInline(true);
    this.setColour(235);
    this.setTooltip("Wait for server sending any message. Blocking method. Subscription messages will be passed to the callback.");
    this.setHelpUrl("http://www.bipes.net.br");
  }
};

/// Disconnect MQTT Client
Blockly.Blocks['mqtt_disconnect'] = {
  init: function() {
    this.appendDummyInput()
        .appendField(new Blockly.FieldLabelSerializable("Disconnect MQTT Client"), "BLOCK_MQTT_DISCONNECT");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setInputsInline(true);
    this.setColour(235);
    this.setTooltip("Disconnect the MQTT Client from Server.");
    this.setHelpUrl("http://www.bipes.net.br");
  }
};

// EasyMQTT --------------------------------------------------------------------
/// EasyMQTT Init
Blockly.Blocks['easymqtt_init'] = {
  generate_id: function(){
    return Math.random().toString(36).substring(7);
  },
  init: function() {
    this.appendDummyInput()
        .appendField(new Blockly.FieldLabelSerializable(Msg["easymqtt_start"]), "BLOCK_EASYMQTT_INIT");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setInputsInline(true);
    this.setColour(238);
    this.setTooltip("Start EasyMQTT Client");
    this.setHelpUrl("http://www.bipes.net.br");
  }
};

/// EasyMQTT Publish Data
Blockly.Blocks['easymqtt_publish_data'] = {
  init: function() {
    this.appendDummyInput()
        .appendField(new Blockly.FieldLabelSerializable(Msg["easymqtt_publish"]), "BLOCK_EASYMQTT_PUBLISH");
    this.appendValueInput("topic")
        .setCheck("String")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField(new Blockly.FieldLabelSerializable(Msg["topic"]), "EASYMQTT_TOPIC");
    this.appendValueInput("data")
        .setAlign(Blockly.ALIGN_RIGHT)
        .setCheck("Number")
        .appendField(new Blockly.FieldLabelSerializable(Msg["data"]), "EASYMQTT_PAYLOAD");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setInputsInline(true);
    this.setColour(238);
    this.setTooltip("Publish Data to EasyMQTT Server");
    this.setHelpUrl("http://www.bipes.net.br");
  }
};

/// EasyMQTT Axis Data
Blockly.Blocks['easymqtt_publish_axis'] = {
    init: function () {
        this.appendDummyInput()
          .appendField("easyMQTT topic")
          .appendField(new Blockly.FieldTextInput("data"), "topic");
        this.itemCount_ = 3;
        this.updateShape_();
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(238);
        this.setMutator(new Blockly.Mutator(["easymqtt_publish_axis_item"]));
        this.setTooltip("The data will be stored in the browser, organized by topic, see the 'Databoard' tab.");
    },
    mutationToDom: function () {
        var a = Blockly.utils.xml.createElement("mutation");
        a.setAttribute("items", this.itemCount_);
        return a;
    },
    domToMutation: function (a) {
        this.itemCount_ = parseInt(a.getAttribute("items"), 10);
        this.updateShape_();
    },
    decompose: function (a) {
        var b = a.newBlock("easymqtt_publish_axis_container");
        b.initSvg();
        for (var c = b.getInput("STACK").connection, d = 0; d < this.itemCount_; d++) {
            var e = a.newBlock("easymqtt_publish_axis_item");
            e.initSvg();
            c.connect(e.previousConnection);
            c = e.nextConnection;
        }
        return b;
    },
    compose: function (a) {
        var b = a.getInputTargetBlock("STACK");
        for (a = []; b && !b.isInsertionMarker(); ) a.push(b.valueConnection_), (b = b.nextConnection && b.nextConnection.targetBlock());
        for (b = 0; b < this.itemCount_; b++) {
            var c = this.getInput("ADD" + b).connection.targetConnection;
            c && -1 == a.indexOf(c) && c.disconnect();
        }
        this.itemCount_ = a.length;
        this.updateShape_();
        for (b = 0; b < this.itemCount_; b++) Blockly.Mutator.reconnect(a[b], this, "ADD" + b);
    },
    saveConnections: function (a) {
        a = a.getInputTargetBlock("STACK");
        for (var b = 0; a; ) {
            var c = this.getInput("ADD" + b);
            a.valueConnection_ = c && c.connection.targetConnection;
            b++;
            a = a.nextConnection && a.nextConnection.targetBlock();
        }
    },
    updateShape_: function () {
        this.itemCount_ && this.getInput("EMPTY") ? this.removeInput("EMPTY") : this.itemCount_ || this.getInput("EMPTY") || this.appendDummyInput("EMPTY").appendField("no axis set").setAlign(Blockly.ALIGN_RIGHT);
        for (var a = 0; a < this.itemCount_; a++)
            if (!this.getInput("ADD" + a)) {
                var b = this.appendValueInput("ADD" + a).setAlign(Blockly.ALIGN_RIGHT);
                0 == a && b.appendField("axis data (x, y, ...)");
            }
        for (; this.getInput("ADD" + a); ) this.removeInput("ADD" + a), a++;
    },
};
Blockly.Blocks['easymqtt_publish_axis_container'] = {
    init: function () {
        this.setColour(238);
        this.appendDummyInput().appendField("dataset");
        this.appendStatementInput("STACK");
        this.setTooltip("Dataset composed by multiple axis, the first axis is 'x'.");
        this.contextMenu = !1;
    },
};
Blockly.Blocks['easymqtt_publish_axis_item'] = {
    init: function () {
        this.setColour(238);
        this.appendDummyInput().appendField("axis");
        this.setPreviousStatement(!0);
        this.setNextStatement(!0);
        this.setTooltip("Add axis to the dataset (x, y1, y2, ...).");
        this.contextMenu = !1;
    },
};

///EasyMQTT Subscribe
Blockly.Blocks['easymqtt_subscribe'] = {
  init: function() {
    this.appendValueInput("topic")
        .setCheck("String")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField(new Blockly.FieldLabelSerializable(Msg["easymqtt_subscribe"]), "EASYMQTT_TOPIC");
    this.appendDummyInput()
        .appendField(Msg['when'])
        .appendField(new Blockly.FieldVariable(
          'data',
          null,
          ['Number'],
          'Number'
        ), 'EASYMQTT_VAR')
        .appendField(Msg["data_received"]);
    this.appendStatementInput('do')
        .appendField('do');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(238);
    this.setInputsInline(true);
    this.setTooltip("Subscribe to a topic and define what to do when data is received from EasyMQTT Server");
    this.setHelpUrl("http://www.bipes.net.br");
  }
};

/// EasyMQTT Receive Data
Blockly.Blocks['easymqtt_receive_data'] = {
  init: function() {
    this.appendDummyInput()
        .appendField(new Blockly.FieldLabelSerializable(Msg["easymqtt_receive"]), "BLOCK_EASYMQTT_RECEIVE");
    this.appendDummyInput()
        .appendField(Msg['wait_for_data'])
        .appendField(new Blockly.FieldDropdown([
            [Msg['no'], '0'],
            [Msg['yes'], '1']
        ]), 'EASYMQTT_WAIT');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setInputsInline(true);
    this.setColour(238);
    this.setTooltip("Receive Data from EasyMQTT Server");
    this.setHelpUrl("http://www.bipes.net.br");
  }
};

/// EasyMQTT Disconnect
Blockly.Blocks['easymqtt_disconnect'] = {
  init: function() {
    this.appendDummyInput()
        .appendField(new Blockly.FieldLabelSerializable("EasyMQTT Stop"), "BLOCK_EASYMQTT_DISCONNECT");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setInputsInline(true);
    this.setColour(238);
    this.setTooltip("Disconnect the EasyMQTT Client from Server.");
    this.setHelpUrl("http://www.bipes.net.br");
  }
};

// Bluetooth (runtime) ---------------------------------------------------------
Blockly.Blocks['bluetooth_runtime_start'] = {
  init: function() {
    this.appendDummyInput()
        .appendField(Msg["runtime_start_bluetooth"]);

    this.appendValueInput("name")
        .setCheck("String");

    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setInputsInline(true);
    this.setColour(210);
    this.setTooltip("Run this program as a Bluetooth (BLE) runtime device: it stays connected for live control, telemetry and file management. Place it at the end of your program.");
    this.setHelpUrl("http://www.bipes.net.br");
  }
};

// Runtime: start the program over USB / Serial (Bluetooth and WiFi have their own
// start blocks now). -----------------------------------------------------------
Blockly.Blocks['runtime_start'] = {
  init: function() {
    this.appendDummyInput().appendField("Start program over USB / Serial");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setInputsInline(true);
    this.setColour(135);
    this.setTooltip("Run this program as a connected runtime device over USB/serial. The dashboard can then control it and read telemetry. Place at the end of your program. For wireless use the Bluetooth or WiFi start blocks.");
    this.setHelpUrl("http://www.bipes.net.br");
  }
};

// Runtime: start over WiFi using credentials from the device's /secrets.json. ---
Blockly.Blocks['runtime_start_wifi_secrets'] = {
  init: function() {
    this.appendDummyInput().appendField(Msg["runtime_start_wifi_secrets"]);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setInputsInline(true);
    this.setColour(170);
    this.setTooltip("Run this program over WiFi + MQTT, reading WiFi/broker credentials from the device's /secrets.json (set once on the Device page). No passwords in your program — use this for anything real. Place at the end of your program.");
    this.setHelpUrl("http://www.bipes.net.br");
  }
};

// Runtime: define an async function (cooperative) -----------------------------
// Like a normal "define function" block, but generates `async def`, so you can
// pause inside it with the cooperative "wait" block without blocking the device.
// Name it "loop" to have the runtime run it continuously.
Blockly.Blocks['runtime_async_function'] = {
  init: function() {
    this.appendDummyInput()
        .appendField("async function")
        .appendField(new Blockly.FieldTextInput("loop"), "NAME");
    this.appendStatementInput("STACK")
        .setCheck(null)
        .appendField("do");
    this.setColour(290);
    this.setTooltip("Define an async function. Use 'wait' blocks inside to pause WITHOUT blocking the device (serial / Bluetooth / WiFi stay live). Name it 'loop' and the runtime runs it forever.");
    this.setHelpUrl("http://www.bipes.net.br");
  }
};

// Runtime: cooperative wait (yields to the event loop, does NOT block) ---------
Blockly.Blocks['runtime_wait'] = {
  init: function() {
    this.appendValueInput("MS")
        .setCheck("Number")
        .appendField("wait");
    this.appendDummyInput()
        .appendField("ms");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setInputsInline(true);
    this.setColour(290);
    this.setTooltip("Pause inside an async function WITHOUT blocking the device. Use this instead of the normal delay block in a runtime loop.");
    this.setHelpUrl("http://www.bipes.net.br");
  }
};

// Runtime: await another async function ----------------------------------------
Blockly.Blocks['runtime_await'] = {
  init: function() {
    this.appendDummyInput()
        .appendField("await")
        .appendField(new Blockly.FieldTextInput("my_task"), "NAME")
        .appendField("()");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setInputsInline(true);
    this.setColour(290);
    this.setTooltip("Call another async function and wait for it to finish. Only valid inside an async function.");
    this.setHelpUrl("http://www.bipes.net.br");
  }
};

// Runtime: publish a telemetry value to the dashboard -------------------------
Blockly.Blocks['runtime_send'] = {
  init: function() {
    this.appendValueInput("VALUE")
        .appendField("Send to dashboard")
        .appendField(new Blockly.FieldTextInput("Name"), "NAME")
        .appendField("=");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setInputsInline(true);
    this.setColour(250);
    this.setTooltip("Publish a value to the dashboard. A gauge or chart bound to this name updates live. Works the same over serial, Bluetooth and WiFi.");
    this.setHelpUrl("http://www.bipes.net.br");
  }
};

// WiFi connected? (status, no credentials) ------------------------------------
Blockly.Blocks['wifi_is_connected'] = {
  init: function() {
    this.appendDummyInput().appendField(Msg["wifi_connected_status"]);
    this.setOutput(true, "Boolean");
    this.setColour(170);
    this.setTooltip("True when the device is connected to WiFi.");
    this.setHelpUrl("http://www.bipes.net.br");
  }
};

// ============================================================================
// Runtime EVENT blocks — the explicit comms model. The program reacts to events
// itself (no hidden auto-dispatch). These are transport-agnostic: the same
// on_message / on_connect logic runs over USB, Bluetooth or WiFi.
// ============================================================================

// Runs once when the program starts.
Blockly.Blocks['runtime_on_start'] = {
  init: function() {
    this.appendDummyInput().appendField(Msg["runtime_on_start"]);
    this.appendStatementInput("do").setCheck(null).appendField(Msg["runtime_do"]);
    this.setColour(250);
    this.setTooltip("Runs once when the program starts. Put one-time setup here (e.g. turn the LED off, configure a sensor).");
    this.setHelpUrl("http://www.bipes.net.br");
  }
};

// Runs once when the program is stopped (Stop / watchdog / exit) — safe state.
Blockly.Blocks['runtime_on_stop'] = {
  init: function() {
    this.appendDummyInput().appendField(Msg["runtime_on_stop"]);
    this.appendStatementInput("do").setCheck(null).appendField(Msg["runtime_do"]);
    this.setColour(250);
    this.setTooltip("Runs once when the program is stopped (Stop button, watchdog, or exit). Put your safe state here, e.g. stop the motors.");
    this.setHelpUrl("http://www.bipes.net.br");
  }
};

// Runs when a client (the browser) connects over Bluetooth/WiFi.
Blockly.Blocks['runtime_on_connect'] = {
  init: function() {
    this.appendDummyInput().appendField(Msg["runtime_on_connect"]);
    this.appendStatementInput("do").setCheck(null).appendField(Msg["runtime_do"]);
    this.setColour(250);
    this.setTooltip("Runs when a client (the browser) connects — e.g. over Bluetooth. The program keeps running across connects.");
    this.setHelpUrl("http://www.bipes.net.br");
  }
};

// Runs when the client disconnects (program keeps running).
Blockly.Blocks['runtime_on_disconnect'] = {
  init: function() {
    this.appendDummyInput().appendField(Msg["runtime_on_disconnect"]);
    this.appendStatementInput("do").setCheck(null).appendField(Msg["runtime_do"]);
    this.setColour(250);
    this.setTooltip("Runs when the client disconnects (e.g. browser closed or out of Bluetooth range). The program keeps running.");
    this.setHelpUrl("http://www.bipes.net.br");
  }
};

// Runs for every incoming command — the student checks the name and branches.
Blockly.Blocks['runtime_on_message'] = {
  init: function() {
    this.appendDummyInput()
        .appendField(Msg["runtime_on_message"])
        .appendField(new Blockly.FieldVariable("Name"), "NAME_VAR")
        .appendField(",")
        .appendField(new Blockly.FieldVariable("Value"), "VALUE_VAR");
    this.appendStatementInput("do").setCheck(null).appendField(Msg["runtime_do"]);
    this.setColour(250);
    this.setTooltip("Runs for every command received (dashboard switch/button, or a peer). 'name' is the command and 'value' its value. Check the name and call your functions. Same over serial, Bluetooth and WiFi.");
    this.setHelpUrl("http://www.bipes.net.br");
  }
};

// Send a raw line of text over the connection (debug / serial I/O).
Blockly.Blocks['runtime_serial_send'] = {
  init: function() {
    this.appendValueInput("TEXT").appendField(Msg["runtime_serial_send"]);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setInputsInline(true);
    this.setColour(250);
    this.setTooltip("Send a raw line of text over the connection (shows in the terminal). For dashboard gauges/charts use 'Send to dashboard' instead.");
    this.setHelpUrl("http://www.bipes.net.br");
  }
};

// Start over WiFi. The student enters only their WiFi name/password (+ broker host);
// the MQTT credentials are fetched automatically and stored on the block's hidden
// `data` (never shown as editable fields), then injected into the generated code.
Blockly.Blocks['runtime_start_wifi_literal'] = {
  init: function() {
    this.appendDummyInput().appendField(Msg["runtime_start_wifi"]);
    this.appendDummyInput()
        .appendField(Msg["runtime_wifi_name"]).appendField(new Blockly.FieldTextInput("SSID"), "SSID");
    this.appendDummyInput()
        .appendField(Msg["runtime_wifi_password"]).appendField(new Blockly.FieldTextInput(""), "PW");
    this.appendDummyInput()
        .appendField(Msg["runtime_broker_host"]).appendField(new Blockly.FieldTextInput("192.168.0.10"), "HOST");
    this.appendDummyInput()
        .appendField(Msg["runtime_broker_port"]).appendField(new Blockly.FieldTextInput("8883"), "PORT");
    this.appendDummyInput()
        .appendField(Msg["runtime_security"]).appendField(new Blockly.FieldDropdown([
          [Msg["runtime_tls_encrypted"], "TLS"],
          [Msg["runtime_plain_no_tls"], "PLAIN"]
        ]), "SSL");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(170);
    this.setTooltip("Connect over WiFi and the BIPES dashboard. Enter your WiFi name/password (and the broker host if it isn't this server). Keep security on TLS so the device credentials are encrypted (port 8883); only use 'plain' for a local lab broker without TLS (port 1883). The MQTT credentials are added automatically when you're logged in — you don't see or type them. Place at the end of your program.");
    this.setHelpUrl("http://www.bipes.net.br");
  }
};

// ============================================================================
// Combined "program" blocks. One block per transport holds the WHOLE event
// scaffold (on start / on message / on stop, plus on connect / on disconnect for
// the wireless ones) AND starts the runtime — so a pupil drags ONE block instead
// of wiring five separate hats + a start block. Colours match each transport's
// toolbox category (serial 135 / bluetooth 210 / wifi 170).
// ============================================================================

// Append the shared event sections (on start / [on connect / on disconnect] /
// on message(name,value) / on stop) to a combined program block.
function appendRuntimeEventSections (block, withConnect) {
  block.appendStatementInput("ON_START").setCheck(null).appendField(Msg["runtime_on_start"]);
  if (withConnect) {
    block.appendStatementInput("ON_CONNECT").setCheck(null).appendField(Msg["runtime_on_connect"]);
    block.appendStatementInput("ON_DISCONNECT").setCheck(null).appendField(Msg["runtime_on_disconnect"]);
  }
  block.appendDummyInput("MSG_HEADER")
      .appendField(Msg["runtime_on_message"])
      .appendField(new Blockly.FieldVariable("Name"), "MSG_NAME")
      .appendField(",")
      .appendField(new Blockly.FieldVariable("Value"), "MSG_VALUE");
  block.appendStatementInput("ON_MESSAGE").setCheck(null).appendField(Msg["runtime_do"]);
  block.appendStatementInput("ON_STOP").setCheck(null).appendField(Msg["runtime_on_stop"]);
}

// Serial: on start / on message / on stop + start over USB. -------------------
Blockly.Blocks['runtime_program_serial'] = {
  init: function() {
    this.appendDummyInput().appendField("Run program over USB / Serial");
    appendRuntimeEventSections(this, false);
    this.setColour(135);
    this.setTooltip("A whole program over USB/serial in one block: 'on start' runs once at boot, 'on message' for each dashboard/command, 'on stop' for a safe state. The dashboard controls it and reads telemetry — no separate start block needed.");
    this.setHelpUrl("http://www.bipes.net.br");
  }
};

// Bluetooth: full scaffold (+ connect/disconnect) + start over BLE. -----------
Blockly.Blocks['runtime_program_bluetooth'] = {
  init: function() {
    this.appendDummyInput()
        .appendField(Msg["runtime_program_bluetooth"])
        .appendField(new Blockly.FieldTextInput("Pico-BIPES"), "BLE_NAME");
    appendRuntimeEventSections(this, true);
    this.setColour(210);
    this.setTooltip("A whole program over Bluetooth (BLE) in one block. Stays connected for live control, telemetry and file management. 'on connect'/'on disconnect' fire as the browser joins/leaves — the program keeps running.");
    this.setHelpUrl("http://www.bipes.net.br");
  }
};

// WiFi: full scaffold (+ connect/disconnect) + start over WiFi, with a dropdown
// to take credentials from /secrets.json OR from fields typed on the block. ---
Blockly.Blocks['runtime_program_wifi'] = {
  init: function() {
    this.appendDummyInput().appendField(Msg["runtime_program_wifi"]);
    this.appendDummyInput()
        .appendField(Msg["runtime_credentials"])
        .appendField(new Blockly.FieldDropdown([
          [Msg["runtime_credentials_secrets"], "SECRETS"],
          [Msg["runtime_credentials_enter"], "FIELDS"]
        ], this.onCredsChange_.bind(this)), "CREDS");
    appendRuntimeEventSections(this, true);
    this.setColour(170);
    this.setTooltip("A whole program over WiFi + the dashboard in one block. Credentials 'from secrets.json' = set once on the Device page, nothing in your program (use for anything real). 'enter here' = type WiFi name/password + broker for a lab (MQTT credentials are added automatically). 'on connect'/'on disconnect' fire as the browser joins/leaves.");
    this.setHelpUrl("http://www.bipes.net.br");
    this.useFields_ = false;
  },
  // Dropdown validator: show/hide the credential fields.
  onCredsChange_: function(value) {
    this.updateShape_(value === 'FIELDS');
    return value;
  },
  // Add/remove the WiFi credential rows (placed above 'on start').
  updateShape_: function(useFields) {
    this.useFields_ = !!useFields;
    var has = !!this.getInput('WIFI_SSID');
    if (useFields && !has) {
      this.appendDummyInput('WIFI_SSID').appendField(Msg["runtime_wifi_name"]).appendField(new Blockly.FieldTextInput("SSID"), "SSID");
      this.appendDummyInput('WIFI_PW').appendField(Msg["runtime_wifi_password"]).appendField(new Blockly.FieldTextInput(""), "PW");
      this.appendDummyInput('WIFI_HOST').appendField(Msg["runtime_broker_host"]).appendField(new Blockly.FieldTextInput("192.168.0.10"), "HOST");
      this.appendDummyInput('WIFI_PORT').appendField(Msg["runtime_broker_port"]).appendField(new Blockly.FieldTextInput("8883"), "PORT");
      this.appendDummyInput('WIFI_SSL').appendField(Msg["runtime_security"]).appendField(new Blockly.FieldDropdown([
        [Msg["runtime_tls_encrypted"], "TLS"], [Msg["runtime_plain_no_tls"], "PLAIN"]
      ]), "SSL");
      this.moveInputBefore('WIFI_SSID', 'ON_START');
      this.moveInputBefore('WIFI_PW', 'ON_START');
      this.moveInputBefore('WIFI_HOST', 'ON_START');
      this.moveInputBefore('WIFI_PORT', 'ON_START');
      this.moveInputBefore('WIFI_SSL', 'ON_START');
    } else if (!useFields && has) {
      this.removeInput('WIFI_SSID');
      this.removeInput('WIFI_PW');
      this.removeInput('WIFI_HOST');
      this.removeInput('WIFI_PORT');
      this.removeInput('WIFI_SSL');
    }
  },
  mutationToDom: function() {
    var c = Blockly.utils.xml.createElement('mutation');
    c.setAttribute('fields', this.useFields_ ? '1' : '0');
    return c;
  },
  domToMutation: function(xml) {
    this.updateShape_(xml.getAttribute('fields') === '1');
  }
};

// Subscribe to an extra MQTT topic (WiFi); messages arrive in on_message.
Blockly.Blocks['runtime_subscribe'] = {
  init: function() {
    this.appendValueInput("TOPIC").setCheck("String").appendField(Msg["runtime_subscribe_topic"]);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setInputsInline(true);
    this.setColour(170);
    this.setTooltip("WiFi only: subscribe to an extra MQTT topic (relative to this device's session). Incoming messages arrive in 'on message' with name = the topic.");
    this.setHelpUrl("http://www.bipes.net.br");
  }
};

// Publish to an extra MQTT topic (WiFi).
Blockly.Blocks['runtime_publish'] = {
  init: function() {
    this.appendValueInput("TOPIC").setCheck("String").appendField(Msg["runtime_publish_topic"]);
    this.appendValueInput("VALUE").appendField(Msg["runtime_publish_value"]);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setInputsInline(true);
    this.setColour(170);
    this.setTooltip("WiFi only: publish a value to an extra MQTT topic (relative to this device's session).");
    this.setHelpUrl("http://www.bipes.net.br");
  }
};

// Trigger an over-the-air program update from a URL.
Blockly.Blocks['runtime_ota_update'] = {
  init: function() {
    this.appendValueInput("URL").setCheck("String").appendField(Msg["runtime_ota_update"]);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setInputsInline(true);
    this.setColour(170);
    this.setTooltip("Download new program code over HTTP from the URL, save it as blocks.py and reboot into it. The device must be on WiFi.");
    this.setHelpUrl("http://www.bipes.net.br");
  }
};

// WebREPL ---------------------------------------------------------------------

Blockly.Blocks['webrepl_setup'] = {
  init: function() {
    this.appendDummyInput()
        .appendField("WebREPL Setup");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setInputsInline(true);
    this.setColour(248);
 this.setTooltip("Configure WebREPL");
 this.setHelpUrl("www.bipes.net.br");
  }
};


Blockly.Blocks['webrepl_start'] = {
  init: function() {
    this.appendDummyInput()
        .appendField("Start WebREPL");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setInputsInline(true);
    this.setColour(248);
 this.setTooltip("Start WebREPL Server");
 this.setHelpUrl("www.bipes.net.br");
  }
};
// CAN Bus ---------------------------------------------------------------------
//https://github.com/nos86/micropython/blob/esp32-can-driver-v3/docs/library/machine.CAN.rst
Blockly.Blocks['esp32_can_init'] = {
  init: function() {
    this.setColour(10);
    this.appendDummyInput()
        .appendField("Init ESP32 CAN Bus Controller");

    this.appendValueInput("mode")
        .setCheck("String")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField("Mode");

    this.appendValueInput("baudrate")
        .setCheck("String")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField("Baud Rate");

    this.appendValueInput("extframe")
        .setCheck("String")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField("Extended CAN Frame");

    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setInputsInline(true);
    this.setTooltip('');
  }
};



Blockly.Blocks['esp32_can_filter'] = {
  init: function() {
    this.setColour(10);
    this.appendDummyInput()
        .appendField("Set CAN Filter");

    this.appendValueInput("filter")
        .setCheck("String")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField("Frame Filter");

    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setInputsInline(true);
    this.setTooltip('');
  }
};


Blockly.Blocks['esp32_can_send'] = {
  init: function() {
    this.setColour(10);
    this.appendDummyInput()
        .appendField("Send CAN Frame");

    this.appendValueInput("id")
        .setCheck("String")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField("ID");

    this.appendValueInput("data")
        .setCheck("String")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField("Frame Data");

    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setInputsInline(true);
    this.setTooltip('');
  }
};


Blockly.Blocks['esp32_can_recv'] = {
  init: function() {
    this.setColour(10);
    this.appendDummyInput()
        .appendField("Receive CAN Frame");

    this.setOutput(true);
    this.setInputsInline(true);
    this.setTooltip('');
  }
};

// Google Sheets ---------------------------------------------------------------
Blockly.Blocks['google_spreadsheet'] = {
  init: function() {
    this.appendDummyInput()
        .appendField("Send data to a Google spreadsheet")
        .appendField("#")
        .appendField(new Blockly.FieldNumber(1, 1, 9, 1), "sheet_num");
    this.appendValueInput("deploy_code")
        .setCheck("String")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField("Deployment Code");
    this.appendStatementInput("cells_values")
        .setCheck(null)
        .appendField("Cells");
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(130);
 this.setTooltip("");
 this.setHelpUrl("");
  }
};

Blockly.Blocks['cell_value'] = {
  init: function() {
    this.appendValueInput("value")
        .setCheck(null)
        .appendField("Cell");
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(130);
 this.setTooltip("");
 this.setHelpUrl("");
  }
};
