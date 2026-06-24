// Network ---------------------------------------------------------------------
// Status&Configure ------------------------------------------------------------

Blockly.Python['wifi_client_connect'] = function(block) {
	var value_wifi_client_essid = Blockly.Python.valueToCode(block, 'wifi_client_essid', Blockly.Python.ORDER_ATOMIC);
	var value_wifi_client_key = Blockly.Python.valueToCode(block, 'wifi_client_key', Blockly.Python.ORDER_ATOMIC);

	if (bipes.page.project.current.device.firmware == "CircuitPython") {
		Blockly.Python.definitions_['import_ipaddress'] = 'import ipaddress';
		Blockly.Python.definitions_['import_ssl'] = 'import ssl';
		Blockly.Python.definitions_['import_wifi'] = 'import wifi';
		Blockly.Python.definitions_['import_socketpool'] = 'import socketpool';
		var code = 'print("Connecting to ' + value_wifi_client_essid + '")\n';
		code+=     'wifi.radio.connect(' + value_wifi_client_essid + ',' + value_wifi_client_key + ')\n';
		code+=	   'print("Connected")\n';
		code+=	   'print("My IP address is", wifi.radio.ipv4_address)\n\n';
	} else {
		Blockly.Python.definitions_['import_network'] = 'import network';
		Blockly.Python.definitions_['import_time'] = 'import time';
		var code = 'sta_if = network.WLAN(network.STA_IF); sta_if.active(True) \nsta_if.scan() \nsta_if.connect(' + value_wifi_client_essid + ',' + value_wifi_client_key + ') \nprint("Waiting for Wifi connection")\nwhile not sta_if.isconnected(): time.sleep(1)\nprint("Connected")\n';
	}
	return code;
};

Blockly.Python['wifi_client_scan_networks'] = function(block) {

	if (bipes.page.project.current.device.firmware == "CircuitPython") {
		Blockly.Python.definitions_['import_ipaddress'] = 'import ipaddress';
		Blockly.Python.definitions_['import_ssl'] = 'import ssl';
		Blockly.Python.definitions_['import_wifi'] = 'import wifi';
		Blockly.Python.definitions_['import_socketpool'] = 'import socketpool';
		Blockly.Python.definitions_['import_scan_wifi'] = 'def scan_wifi():\n\tfor network in wifi.radio.start_scanning_networks():\n\t\tprint("\t%s\t\tRSSI: %d\tChannel: %d" % (str(network.ssid, "utf-8"), network.rssi, network.channel))\n\twifi.radio.stop_scanning_networks()\n';
		var code = 'scan_wifi()';
	} else {
		Blockly.Python.definitions_['import_network'] = 'import network';
		Blockly.Python.definitions_['import_network_sta_init'] = 'sta_if = network.WLAN(network.STA_IF); sta_if.active(True) \n';
		var code = 'sta_if.scan()';
	}
	return [code, Blockly.Python.ORDER_NONE];
};

Blockly.Python['net_ap_mode'] = function(block) {
  var value_wifi_essid = Blockly.Python.valueToCode(block, 'wifi_essid', Blockly.Python.ORDER_ATOMIC);
  var value_wifi_key = Blockly.Python.valueToCode(block, 'wifi_key', Blockly.Python.ORDER_ATOMIC);

  Blockly.Python.definitions_['import_network'] = 'import network';
  var code = 'ap = network.WLAN(network.AP_IF) \nap.active(True) \nap.config(essid=' + value_wifi_essid + ', password=' + value_wifi_key + ') \n';

  return code;
};


Blockly.Python['net_ifconfig'] = function(block) {

	if (bipes.page.project.current.device.firmware == "CircuitPython") {
		Blockly.Python.definitions_['import_ipaddress'] = 'import ipaddress';
		Blockly.Python.definitions_['import_ssl'] = 'import ssl';
		Blockly.Python.definitions_['import_wifi'] = 'import wifi';
		Blockly.Python.definitions_['import_socketpool'] = 'import socketpool';
		var code = 'wifi.radio.ipv4_address';
	} else {
		Blockly.Python.definitions_['import_network'] = 'import network';
		Blockly.Python.definitions_['import_network_a'] = 'sta_if = network.WLAN(network.STA_IF)';
		Blockly.Python.definitions_['import_network_b'] = 'sta_if.active(True)';
		var code = 'sta_if.ifconfig()';
	}
	return [code, Blockly.Python.ORDER_NONE];
};



Blockly.Python['net_wiznet5k_init'] = function(block) {

  //Reference: https://docs.micropython.org/en/latest/library/network.WIZNET5K.html

  var spi = Blockly.Python.valueToCode(block, 'spi', Blockly.Python.ORDER_ATOMIC);
  var cs = Blockly.Python.valueToCode(block, 'cs', Blockly.Python.ORDER_ATOMIC);
  var rst = Blockly.Python.valueToCode(block, 'rst', Blockly.Python.ORDER_ATOMIC);

  //Working nicely with RPI Pico. Before modifying, remmeber that this is workign with RIP Pico
  Blockly.Python.definitions_['import_Pin_SPI'] = 'from machine import Pin,SPI';
  Blockly.Python.definitions_['import_network'] = 'import network';

  var code = 'spi' + spi + '=SPI(' + spi + ',2_000_000, mosi=Pin(19),miso=Pin(16),sck=Pin(18))\n';
  code += 'nic = network.WIZNET5K(spi' + spi + ',Pin(' + cs + '),Pin(' + rst + '))\n';

  return code;

};


Blockly.Python['net_wiznet5k_isconnected'] = function(block) {

  var code = 'nic.isconnected()';

  return [code, Blockly.Python.ORDER_NONE];
};


Blockly.Python['net_wiznet5k_regs'] = function(block) {

  var code = 'nic.regs()';

  return [code, Blockly.Python.ORDER_NONE];
};


Blockly.Python['net_wiznet5k_ifconfig'] = function(block) {
  var ip = Blockly.Python.valueToCode(block, 'ip', Blockly.Python.ORDER_ATOMIC);
  var subnet = Blockly.Python.valueToCode(block, 'subnet', Blockly.Python.ORDER_ATOMIC);
  var gw = Blockly.Python.valueToCode(block, 'gw', Blockly.Python.ORDER_ATOMIC);
  var dns = Blockly.Python.valueToCode(block, 'dns', Blockly.Python.ORDER_ATOMIC);

  var code = 'nic.ifconfig((' + ip + ',' + subnet + ',' + gw + ',' + dns + '))\n';

  return code;
};


// HTTP Client -----------------------------------------------------------------

Blockly.Python['net_get_request'] = function(block) {
	var value_url = Blockly.Python.valueToCode(block, 'URL', Blockly.Python.ORDER_ATOMIC);

	if (bipes.page.project.current.device.firmware == "CircuitPython") {
		Blockly.Python.definitions_['import_ipaddress'] = 'import ipaddress';
		Blockly.Python.definitions_['import_ssl'] = 'import ssl';
		Blockly.Python.definitions_['import_wifi'] = 'import wifi';
		Blockly.Python.definitions_['import_socketpool'] = 'import socketpool';
		Blockly.Python.definitions_['import_http_get'] = 'def http_get(pHOST):\n\ttmp=pHOST.replace("http://", "")\n\tHOST=tmp.split("/", 1)[0]\n\tparams=tmp.split("/",1)[1]\n\tprint("Host: " + HOST)\n\tprint("Params = " + params)\n\tpool = socketpool.SocketPool(wifi.radio)\n\tserver_ipv4 = ipaddress.ip_address(pool.getaddrinfo(HOST, 80)[0][4][0])\n\tprint("Server ping", server_ipv4, wifi.radio.ping(server_ipv4), "ms")\n\tbuf = bytearray(500)\n\ts = pool.socket(pool.AF_INET, pool.SOCK_STREAM)\n\ts.settimeout(50)\n\tprint("Connecting")\n\ts.connect((HOST, 80))\n\tsize = s.send(bytes(\'GET /%s HTTP/1.0\\r\\nHost: %s\\r\\n\\r\\n\' % (params, HOST), \'utf8\'))\n\tprint("Sent", size, "bytes")\n\tsize = s.recv_into(buf)\n\tprint(\'Received\', size, "bytes", buf[:size])\n\ts.close()\n\treturn buf[:size]\n';

		var code = 'http_get(' + value_url + ')\n';
	} else {
		Blockly.Python.definitions_['import_urequests'] = 'import urequests';
		var code = 'urequests.get(' + value_url + ')\n';
	}
	return [code, Blockly.Python.ORDER_NONE];
};


Blockly.Python['http_get_status'] = function(block) {
  var variable_request = Blockly.Python.nameDB_.getName(block.getFieldValue('request'), Blockly.VARIABLE_CATEGORY_NAME);

  var code = variable_request + '.status_code';

  return [code, Blockly.Python.ORDER_NONE];
};


Blockly.Python['http_get_content'] = function(block) {
  var variable_request = Blockly.Python.nameDB_.getName(block.getFieldValue('request'), Blockly.VARIABLE_CATEGORY_NAME);

  var code = 'str(' + variable_request + '.content)';

  return [code, Blockly.Python.ORDER_NONE];
};


// POST Method -----------------------------------------------------------------


Blockly.Python['net_post_request'] = function(block) {
  var value_url = Blockly.Python.valueToCode(block, 'URL', Blockly.Python.ORDER_ATOMIC);
  var value_data = Blockly.Python.valueToCode(block, 'data', Blockly.Python.ORDER_ATOMIC);
  Blockly.Python.definitions_['import_urequests'] = 'import urequests';
  var code = 'urequests.post(' + value_url + ', data = ' + value_data + ')\n';
  return [code, Blockly.Python.ORDER_NONE];
};

Blockly.Python['net_post_request_json'] = function(block) {
  var value_url = Blockly.Python.valueToCode(block, 'URL', Blockly.Python.ORDER_ATOMIC);
  var value_data = Blockly.Python.valueToCode(block, 'data', Blockly.Python.ORDER_ATOMIC);
  Blockly.Python.definitions_['import_urequests'] = 'import urequests';

  var value_data2 = value_data.replace('\'','').replace('\'','');
  var code = 'urequests.post(' + value_url + ', json={' + value_data2 + '})\n';
  return [code, Blockly.Python.ORDER_NONE];
};

// HTTP Server -----------------------------------------------------------------

Blockly.Python['net_http_server_start'] = function(block) {
	var port = Blockly.Python.valueToCode(block, 'port', Blockly.Python.ORDER_ATOMIC);

	if (bipes.page.project.current.device.firmware == "CircuitPython") {
		Blockly.Python.definitions_['import_ipaddress'] = 'import ipaddress';
		Blockly.Python.definitions_['import_ssl'] = 'import ssl';
		Blockly.Python.definitions_['import_wifi'] = 'import wifi';
		Blockly.Python.definitions_['import_socketpool'] = 'import socketpool';

		var code = "pool = socketpool.SocketPool(wifi.radio)\n";
		code += "HOST = str(wifi.radio.ipv4_address)\n";
		code += "s = pool.socket(pool.AF_INET, pool.SOCK_STREAM)\n";
		//code += "s.settimeout(10)\n";
		code += "s.settimeout(None)\n";
		code += "s.bind((HOST, 80))\n";
		code += "s.listen(5)\n";
		code += "print('BIPES HTTP Server Listening on', HOST)\n";
	} else {
		Blockly.Python.definitions_['import_socket'] = 'import socket';

		var code = "http_addr = socket.getaddrinfo('0.0.0.0'," + port + ")[0][-1]\n";
		code += 's = socket.socket()\n';
		code += 's.bind(http_addr)\n';
		code += 's.listen(1)\n';
		code += "print('BIPES HTTP Server Listening on', http_addr)\n";
	}

  return code;
};


Blockly.Python['net_http_server_accept'] = function(block) {

	if (bipes.page.project.current.device.firmware == "CircuitPython") {
		var code = "buf = bytearray(500)\n";
		code += "while True:\n";
		code += "\tconn, addr = s.accept()\n";
		//code += "\tconn.settimeout(50)\n";
		code += "\tprint(\"Accepted from\", addr)\n";
		code += "\tsize = conn.recv_into(buf, 500)\n";
		code += "\tprint(\"Received\", buf[:size], size, \"bytes\")\n";
		code += "\tlineS = str(buf[:size], 'utf8')\n";
		code += "\tprint(lineS)\n";
		code += "\tif lineS.startswith('GET /'):\n";
		code += "\t\thttp_request_page = (lineS.split('/')[1]).split(' ')[0]\n";
		code += "\t\tprint('Request page = ' + http_request_page)\n";

		code += "\tif size >= 20:\n";
		code += "\t\tbreak\n";

		//code += "\tconn.send(buf[:size])\n";
		//code += "\tprint("Sent", buf[:size], size, "bytes")\n";
	} else {
	  var code = "cl, http_addr = s.accept()\n";
	      code += "print('client connected from', http_addr)\n";
	      code += "cl_file = cl.makefile('rwb', 0)\n";
	      code += "while True:\n";
	      code += "    line = cl_file.readline()\n";
	      code += "    lineS = str(line, 'utf8')\n";
	      code += "    print(line)\n";
	      code += "    if lineS.startswith('GET /'):\n";
	      code += "        http_request_page = (lineS.split('/')[1]).split(' ')[0]\n";
	      code += "        print('Request page = ' + http_request_page)\n";
	      code += "    if not line or line == b'\\r\\n':\n";
	      code += "        break\n";
	}

  return code;
};

Blockly.Python['net_http_server_requested_page'] = function(block) {

  var code = 'http_request_page';

  return [code, Blockly.Python.ORDER_NONE];
};


Blockly.Python['net_http_server_send_response'] = function(block) {
  var html = Blockly.Python.valueToCode(block, 'html', Blockly.Python.ORDER_ATOMIC);

	if (bipes.page.project.current.device.firmware == "CircuitPython") {
		var code = 'response = ' + html + '\n';
		code += "conn.send('HTTP/1.0 200 OK\\r\\nContent-type: text/html\\r\\n\\r\\n')\n";
		code += 'conn.send(response)\n';
		code += 'conn.close()\n';
	} else {
		var code = 'response = ' + html + '\n';
		code += "cl.send('HTTP/1.0 200 OK\\r\\nContent-type: text/html\\r\\n\\r\\n')\n";
		code += 'cl.send(response)\n';
		code += 'cl.close()\n';
	}

  return code;
};

Blockly.Python['net_http_server_send_response_jpg'] = function(block) {
  var html = Blockly.Python.valueToCode(block, 'html', Blockly.Python.ORDER_ATOMIC);

	if (bipes.page.project.current.device.firmware == "CircuitPython") {
		var code = 'response = ' + html + '\n';
		code += "conn.send('HTTP/1.0 200 OK\\r\\nContent-type: image/jpg\\r\\n\\r\\n')\n";
		code += 'conn.send(response)\n';
		code += 'conn.close()\n';
	} else {
		var code = 'response = ' + html + '\n';
		code += "cl.send('HTTP/1.0 200 OK\\r\\nContent-type: image/jpg\\r\\n\\r\\n')\n";
		code += 'cl.send(response)\n';
		code += 'cl.close()\n';
	}

  return code;
};


Blockly.Python['net_http_server_close'] = function(block) {

  var code = 'cl.close()\n';

  return code;
};
// EMAIL -----------------------------------------------------------------------
Blockly.Python['umail_init'] = function(block) {
  var host = Blockly.Python.valueToCode(block, 'host', Blockly.Python.ORDER_ATOMIC);
  var port = Blockly.Python.valueToCode(block, 'port', Blockly.Python.ORDER_ATOMIC);
  var username = Blockly.Python.valueToCode(block, 'username', Blockly.Python.ORDER_ATOMIC);
  var password = Blockly.Python.valueToCode(block, 'password', Blockly.Python.ORDER_ATOMIC);

  Blockly.Python.definitions_['import_umail'] = 'import umail';

  var code = 'smtp = umail.SMTP(' + host + ',' + port + ',' + 'username=' + username + ',' + 'password=' + password + ')\n';
  return code;

};

Blockly.Python['umail_send'] = function(block) {
  var to = Blockly.Python.valueToCode(block, 'to', Blockly.Python.ORDER_ATOMIC);
  var subject = Blockly.Python.valueToCode(block, 'subject', Blockly.Python.ORDER_ATOMIC);
  var contents = Blockly.Python.valueToCode(block, 'contents', Blockly.Python.ORDER_ATOMIC);

  var s = subject.replace('\'','').replace('\'','');
  var c = contents.replace('\'','').replace('\'','');
  var msg = 'Subject: ' + s + '\\n\\n' + c;


  var code = 'smtp.to(' + to + ')\n';
	code += 'smtp.send(\'' + msg + '\')\n';
	code += 'smtp.quit()\n';
  return code;
};

// NTP Time --------------------------------------------------------------------

Blockly.Python['net_ntp_sync'] = function(block) {
//  var server = Blockly.Python.valueToCode(block, 'server', Blockly.Python.ORDER_ATOMIC);
  var tz = Blockly.Python.valueToCode(block, 'tz', Blockly.Python.ORDER_ATOMIC);

  Blockly.Python.definitions_['import_ntptime'] = 'import ntptime';
  Blockly.Python.definitions_['import_machine'] = 'import machine';
  Blockly.Python.definitions_['import_utime'] = 'import utime';

  var code = 'ntptime.settime()\n';
	code += 'rtc = machine.RTC()\n';
	code += 'utc_shift=' + tz + '\n';
	code += 'tm = utime.localtime(utime.mktime(utime.localtime()) + utc_shift*3600)\n';
	code += 'tm = tm[0:3] + (0,) + tm[3:6] + (0,)\n';
	code += 'rtc.datetime(tm)\n';
	code += "rtc.datetime()\n";

	/*Useful:
	 * >>>from machine import RTC
>>>(year, month, mday, week_of_year, hour, minute, second, milisecond)=RTC().datetime()
>>>RTC().init((year, month, mday, week_of_year, hour+2, minute, second, milisecond)) # GMT correction. GMT+2
>>>print ("Fecha/Hora (year, month, mday, week of year, hour, minute, second, milisecond):", RTC().datetime())
>>>print ("{:02d}/{:02d}/{} {:02d}:{:02d}:{:02d}".format(RTC().datetime()[2],RTC().datetime()[1],RTC().datetime()[0],RTC().datetime()[4],RTC().datetime()[5],RTC
*/
  return code;

};

// TCP/IP Socket ---------------------------------------------------------------


Blockly.Python['net_socket_connect'] = function(block) {
  var host = Blockly.Python.valueToCode(block, 'host', Blockly.Python.ORDER_ATOMIC);
  var port = Blockly.Python.valueToCode(block, 'port', Blockly.Python.ORDER_ATOMIC);

  Blockly.Python.definitions_['import_socket'] = 'import socket';

  //var code = 'addr_info = socket.getaddrinfo("towel.blinkenlights.nl", 23)';
  var code = 'addr_info = socket.getaddrinfo(' + host + ',' + port + ')\n';
      code += 'addr = addr_info[0][-1]\n';
      code += 's = socket.socket()\n';
      code += 's.connect(addr)\n';

  return code;
};

Blockly.Python['net_socket_receive'] = function(block) {
  var bytes = Blockly.Python.valueToCode(block, 'bytes', Blockly.Python.ORDER_ATOMIC);

  var code = "str(s.recv(" + bytes + "), 'utf8')";

  return [code, Blockly.Python.ORDER_NONE];
};


Blockly.Python['net_socket_send'] = function(block) {
  var bytes = Blockly.Python.valueToCode(block, 'bytes', Blockly.Python.ORDER_ATOMIC);

  var code = "s.send(bytes(" + bytes + ", 'utf8'))\n";

  return code;
};


Blockly.Python['net_socket_close'] = function(block) {

  var code = 's.close()\n';

  return code;
};


// MQTT ------------------------------------------------------------------------

/// Start MQTT Client
Blockly.Python['mqtt_init'] = function(block) {
  var server = Blockly.Python.valueToCode(block, 'server', Blockly.Python.ORDER_ATOMIC);
  var port = Blockly.Python.valueToCode(block, 'port', Blockly.Python.ORDER_ATOMIC);
  var user = Blockly.Python.valueToCode(block, 'user', Blockly.Python.ORDER_ATOMIC);
  var pass = Blockly.Python.valueToCode(block, 'password', Blockly.Python.ORDER_ATOMIC);

  Blockly.Python.definitions_['import_umqtt.robust'] = 'import umqtt.robust';
  var code = 'mqtt_buffer = ""; mqtt_client = umqtt.robust.MQTTClient("umqtt_client", server = ' + server + ', port = ' + port + ', user = ' + user + ', password = ' + pass + '); mqtt_client.connect()\n'
  return code;
};

/// Add Data to MQTT Buffer
Blockly.Python['mqtt_add_to_buffer'] = function(block) {
  var name = Blockly.Python.valueToCode(block, 'fieldname', Blockly.Python.ORDER_ATOMIC);
  var value = Blockly.Python.valueToCode(block, 'value', Blockly.Python.ORDER_ATOMIC);

  var code = 'mqtt_buffer += (' + name + ' + "=" + str(' + value + ')) if not len(mqtt_buffer) else ("&" + ' + name + ' + "=" + str(' + value + '))\n'
  return code;
};

/// Publish Buffer to MQTT Topic
Blockly.Python['mqtt_publish_buffer'] = function(block) {
  var topic = Blockly.Python.valueToCode(block, 'topic', Blockly.Python.ORDER_ATOMIC);
  var qos = block.getFieldValue('MQTT_QOS');

  Blockly.Python.definitions_['import_umqtt.robust'] = 'import umqtt.robust';

  var code = 'mqtt_client.publish(' + topic + ', mqtt_buffer,qos=' + qos + '); mqtt_buffer = ""\n';
  return code;
};

/// Publish Payload to MQTT Topic
Blockly.Python['mqtt_publish_payload'] = function(block) {
  var topic = Blockly.Python.valueToCode(block, 'topic', Blockly.Python.ORDER_ATOMIC);
  var payload = Blockly.Python.valueToCode(block, 'payload', Blockly.Python.ORDER_ATOMIC);
  var qos = block.getFieldValue('MQTT_QOS');

  Blockly.Python.definitions_['import_umqtt.robust'] = 'import umqtt.robust';

  var code = 'mqtt_client.publish(' + topic + ', ' + payload + ',qos=' + qos + ')\n';
  return code;
};

/// Set Callback to MQTT Messages
Blockly.Python['mqtt_set_callback'] = function(block) {
	var data_var_name = Blockly.Python.nameDB_.getName(block.getFieldValue('MQTT_DATA_VAR'), Blockly.VARIABLE_CATEGORY_NAME);
	var topic_var_name = Blockly.Python.nameDB_.getName(block.getFieldValue('MQTT_TOPIC_VAR'), Blockly.VARIABLE_CATEGORY_NAME);
	// Fix for global variables inside callback
	// Piece of code from generators/python/procedures.js
	// Add a 'global' statement for every variable that is not shadowed by a local parameter.
	var globals = [];
	var varName;
	var workspace = block.workspace;
	var variables = Blockly.Variables.allUsedVarModels(workspace) || [];
	for (var i = 0, variable; variable = variables[i]; i++) {
		varName = variable.name;
		if (block.getVars().indexOf(varName) == -1 && varName != data_var_name && varName != topic_var_name) {
		globals.push(Blockly.Python.nameDB_.getName(varName,
			Blockly.VARIABLE_CATEGORY_NAME));
		}
	}
	// Add developer variables.
	var devVarList = Blockly.Variables.allDeveloperVariables(workspace);
	for (var i = 0; i < devVarList.length; i++) {
		globals.push(Blockly.Python.nameDB_.getName(devVarList[i],
			Blockly.Names.DEVELOPER_VARIABLE_TYPE));
	}
	globals = globals.length ? Blockly.Python.INDENT + 'global ' + globals.join(', ') : '';
	// End of code from generators/python/procedures.js

	Blockly.Python.definitions_['import_umqtt.robust'] = 'import umqtt.robust';

	var funct_code = Blockly.Python.statementToCode(block, 'do');


	var function_name = Blockly.Python.provideFunction_(
		'mqtt_callback',
		['def ' + Blockly.Python.FUNCTION_NAME_PLACEHOLDER_ + '('+topic_var_name+','+data_var_name+'):',
		globals,
		Blockly.Python.INDENT + topic_var_name + " = " + topic_var_name + ".decode()",
		funct_code]);

	var code = 'mqtt_client.set_callback(' + function_name + ')\n';
	return code;
};

/// Subscribe to MQTT Topic
Blockly.Python['mqtt_subscribe'] = function(block) {
  var topic = Blockly.Python.valueToCode(block, 'topic', Blockly.Python.ORDER_ATOMIC);

  Blockly.Python.definitions_['import_umqtt.robust'] = 'import umqtt.robust';

  var code = 'mqtt_client.subscribe(' + topic + ')\n';
  return code;
};

/// Check for MQTT Server messages
Blockly.Python['mqtt_check_msg'] = function(block) {
  Blockly.Python.definitions_['import_umqtt.robust'] = 'import umqtt.robust';

  var code = 'mqtt_client.check_msg()\n';
  return code;
};

/// Wait for MQTT Server messages
Blockly.Python['mqtt_wait_msg'] = function(block) {
  Blockly.Python.definitions_['import_umqtt.robust'] = 'import umqtt.robust';

  var code = 'mqtt_client.wait_msg()\n';
  return code;
};

/// Disconnect MQTT Client
Blockly.Python['mqtt_disconnect'] = function(block) {
  Blockly.Python.definitions_['import_umqtt.robust'] = 'import umqtt.robust';

  var code = 'mqtt_client.disconnect()\n';
  return code;
};


// EasyMQTT --------------------------------------------------------------------
/// EasyMQTT Init
Blockly.Python['easymqtt_init'] = function(block) {
  var server = bipes.page.dashboard.easyMQTT.host || "YOUR_MQTT_BROKER_HOST";
  var port = '1883';
  var user = bipes.page.dashboard.easyMQTT.deviceUser || "YOUR_DEVICE_MQTT_USER";
  var pass = bipes.page.dashboard.easyMQTT.devicePassword || "YOUR_DEVICE_MQTT_PASSWORD";
  var session = bipes.page.dashboard.easyMQTT.session;

  Blockly.Python.definitions_['import_umqtt.robust'] = 'import umqtt.robust';
  var code = `easymqtt_session = "${session}"; \neasymqtt_client = umqtt.robust.MQTTClient("umqtt_client", server = "${server}", port = "${port}", user = "${user}", password = "${pass}"); \neasymqtt_client.connect()\nprint("EasyMQTT connected")\n`
  return code;
};

/// EasyMQTT Publish Data
Blockly.Python['easymqtt_publish_data'] = function(block) {
  var topic = Blockly.Python.valueToCode(block, 'topic', Blockly.Python.ORDER_ATOMIC);
  var data = Blockly.Python.valueToCode(block, 'data', Blockly.Python.ORDER_ATOMIC);

  Blockly.Python.definitions_['import_umqtt.robust'] = 'import umqtt.robust';

  var code = `easymqtt_client.publish(easymqtt_session + "/" + ${topic}, str(${data}))\n`
  return code;
};

/// EasyMQTT Axis Data
Blockly.Python['easymqtt_publish_axis'] = function(block) {
  var topic = block.getFieldValue('topic');
  var elements = new Array(block.itemCount_);
  for (var i = 0; i < block.itemCount_; i++) {
    elements[i] = Blockly.Python.valueToCode(block, 'ADD' + i,
        Blockly.Python.ORDER_NONE) || 'None';
  }

  Blockly.Python.definitions_['import_umqtt.robust'] = 'import umqtt.robust';

  var code = `easymqtt_client.publish(easymqtt_session + "/${topic}", ','.join([str(${elements.join('), str(')})]))\n`

  return code;
};

/// EasyMQTT Disconnect
Blockly.Python['easymqtt_disconnect'] = function(block) {
  Blockly.Python.definitions_['import_umqtt.robust'] = 'import umqtt.robust';

  var code = 'easymqtt_client.disconnect()\nprint("EasyMQTT disconnected")\n';
  return code;
};

///EasyMQTT Subscribe
Blockly.Python['easymqtt_subscribe'] = function(block) {
  var var_name = Blockly.Python.nameDB_.getName(
      block.getFieldValue('EASYMQTT_VAR'), Blockly.VARIABLE_CATEGORY_NAME);
  // Fix for global variables inside callback
  // Piece of code from generators/python/procedures.js
  // Define a procedure with a return value.
  // First, add a 'global' statement for every variable that is not shadowed by
  // a local parameter.
  var globals = [];
  var varName;
  var workspace = block.workspace;
  var variables = Blockly.Variables.allUsedVarModels(workspace) || [];
  for (var i = 0, variable; variable = variables[i]; i++) {
    varName = variable.name;
    if (block.getVars().indexOf(varName) == -1 && varName != var_name) {
      globals.push(Blockly.Python.nameDB_.getName(varName,
          Blockly.VARIABLE_CATEGORY_NAME));
    }
  }
  // Add developer variables.
  var devVarList = Blockly.Variables.allDeveloperVariables(workspace);
  for (var i = 0; i < devVarList.length; i++) {
    globals.push(Blockly.Python.nameDB_.getName(devVarList[i],
        Blockly.Names.DEVELOPER_VARIABLE_TYPE));
  }
  globals = globals.length ? Blockly.Python.INDENT + 'global ' + globals.join(', ') + '\n' : '';

  Blockly.Python.definitions_['import_umqtt.robust'] = 'import umqtt.robust';
  var topic = Blockly.Python.valueToCode(block, 'topic', Blockly.Python.ORDER_ATOMIC);
  var funct_code = Blockly.Python.statementToCode(block, 'do');
  var name = topic.replace(/\W/g, '_');

  var function_name = Blockly.Python.provideFunction_(
    'easymqtt'+name,
    ['def ' + Blockly.Python.FUNCTION_NAME_PLACEHOLDER_ + '('+var_name+'):',globals,funct_code]);
  var session = bipes.page.dashboard.easyMQTT.session;

  Blockly.Python.definitions_['easymqtt_callback'] = 'easymqtt_callback_list = {}\ndef easymqtt_callback(topic_,msg_):\n  topic_=topic_.decode();msg_=msg_.decode()\n  if topic_ in easymqtt_callback_list: easymqtt_callback_list[topic_](float(msg_))';

  var code = "easymqtt_client.set_callback(easymqtt_callback)\neasymqtt_callback_list['"+session+"/' + "+topic+"]="+function_name+"\neasymqtt_client.subscribe('"+session+"/' + "+topic+")\n"
  return code;
};

/// EasyMQTT Receive Data
Blockly.Python['easymqtt_receive_data'] = function(block) {
  Blockly.Python.definitions_['import_umqtt.robust'] = 'import umqtt.robust';
  var wait = block.getFieldValue('EASYMQTT_WAIT');
  if (wait == '1'){
    var code = 'easymqtt_client.wait_msg()\n';
  }else{
    var code = 'easymqtt_client.check_msg()\n';
  }

  return code;
};



Blockly.Python['mqtt_add_to_buffer'] = function(block) {
  var name = Blockly.Python.valueToCode(block, 'fieldname', Blockly.Python.ORDER_ATOMIC);
  var value = Blockly.Python.valueToCode(block, 'value', Blockly.Python.ORDER_ATOMIC);

  var code = 'mqtt_buffer += (' + name + ' + "=" + str(' + value + ')) if not len(mqtt_buffer) else ("&" + ' + name + ' + "=" + str(' + value + '))\n'
  return code;
};

// Bluetooth (runtime) ---------------------------------------------------------
Blockly.Python['bluetooth_runtime_start'] = function(block) {
  Blockly.Python.definitions_['import_bipes_runtime'] = 'import bipes_runtime';
  var t = Blockly.Python.valueToCode(block, 'name', Blockly.Python.ORDER_ATOMIC) || '""';
  var code = 'bipes_runtime.run(globals(), bluetooth=' + t + ')\n';
  return code;
};

// Runtime: start over USB / Serial --------------------------------------------
Blockly.Python['runtime_start'] = function(block) {
  Blockly.Python.definitions_['import_bipes_runtime'] = 'import bipes_runtime';
  return 'bipes_runtime.run(globals())\n';
};

// Runtime: start over WiFi using /secrets.json --------------------------------
Blockly.Python['runtime_start_wifi_secrets'] = function(block) {
  Blockly.Python.definitions_['import_bipes_runtime'] = 'import bipes_runtime';
  return 'bipes_runtime.run(globals(), wifi=True)\n';
};

// Runtime: define an async function -------------------------------------------
Blockly.Python['runtime_async_function'] = function(block) {
  Blockly.Python.definitions_['import_bipes_runtime'] = 'import bipes_runtime';
  var name = block.getFieldValue('NAME') || 'loop';
  // Same global-scan as the on_* handlers, so a variable the loop REASSIGNS writes the
  // module variable instead of a hidden local (fixes "local variable referenced before
  // assignment" in loop()). Scoped to the loop's own body ('STACK').
  var globalsLine = runtimeGlobalsLine(block, [], 'STACK');
  var branch = Blockly.Python.statementToCode(block, 'STACK');
  if (!branch)
    branch = Blockly.Python.INDENT + 'pass\n';
  return 'async def ' + name + '():\n' + globalsLine + branch + '\n';
};

// Runtime: cooperative wait (yields; does not block the event loop) ------------
Blockly.Python['runtime_wait'] = function(block) {
  Blockly.Python.definitions_['import_bipes_runtime'] = 'import bipes_runtime';
  var ms = Blockly.Python.valueToCode(block, 'MS', Blockly.Python.ORDER_NONE) || '1000';
  return 'await bipes_runtime.wait(' + ms + ')\n';
};

// Runtime: await another async function ----------------------------------------
Blockly.Python['runtime_await'] = function(block) {
  var name = block.getFieldValue('NAME') || 'my_task';
  return 'await ' + name + '()\n';
};

// Runtime: publish telemetry to the dashboard ---------------------------------
Blockly.Python['runtime_send'] = function(block) {
  Blockly.Python.definitions_['import_bipes_runtime'] = 'import bipes_runtime';
  var name = block.getFieldValue('NAME');
  var value = Blockly.Python.valueToCode(block, 'VALUE', Blockly.Python.ORDER_NONE) || '0';
  return 'bipes_runtime.send("' + name + '", ' + value + ')\n';
};

// WiFi connected? (status) ----------------------------------------------------
Blockly.Python['wifi_is_connected'] = function(block) {
  Blockly.Python.definitions_['import_network'] = 'import network';
  return ['network.WLAN(network.STA_IF).isconnected()', Blockly.Python.ORDER_ATOMIC];
};

// ============================================================================
// Runtime EVENT blocks codegen. The runtime wires top-level functions named
// on_start / on_stop / on_connect / on_disconnect / on_message / loop, so these
// blocks just emit those functions (and run() picks them up).
// ============================================================================

// Shared: emit a `def <name>(<params>):` with a body + a `global ...` line for any
// module variables the body uses, so a variable_set inside the handler writes the
// module-level variable instead of a hidden local (same trick the procedure blocks
// and mqtt_set_callback use).
// Block types whose Python generator REBINDS a variable name (`x = …`). Only these
// need a `global` declaration when they sit inside a function — a plain read, or an
// in-place mutation (e.g. lists_setIndex appends to the object), does NOT.
// ⚠️ If you add a block that assigns/rebinds a variable, add its type here, or a write
// to that variable inside on_start/on_message/loop/… silently becomes a hidden local
// and a later read raises "local variable referenced before assignment".
// NB: text_append rebinds (`x = str(x) + …`), so it belongs here despite looking like
// an in-place op.
var RUNTIME_REBINDER_BLOCKS = [
  'variables_set',     // x = value
  'math_change',       // x = (x if … ) + n
  'controls_for',      // for x in range(…)
  'controls_forEach',  // for x in list
  'text_append'        // x = str(x) + …
];

// Emit an indented `global a, b, c` line for exactly the variables this function's BODY
// reassigns — scoped to the given statement input, minus `ownVars` (the handler's own
// parameters). It walks only the body subtree, so e.g. on_start never declares a
// variable that only on_message writes, and read-only variables stay out entirely.
function runtimeGlobalsLine(block, ownVars, inputName) {
  var own = ownVars || [];
  var seen = {};
  var globals = [];
  var add = function(name) {
    if (own.indexOf(name) == -1 && !seen[name]) { seen[name] = true; globals.push(name); }
  };
  var root = block.getInputTargetBlock(inputName || 'do');
  var body = root ? root.getDescendants(false) : [];
  for (var i = 0, b; b = body[i]; i++) {
    // A rebinding block: the variable(s) in its OWN fields are the ones it assigns.
    if (RUNTIME_REBINDER_BLOCKS.indexOf(b.type) != -1 && typeof b.getVarModels == 'function') {
      var models = b.getVarModels() || [];
      for (var j = 0; j < models.length; j++)
        add(Blockly.Python.nameDB_.getName(models[j].name, Blockly.VARIABLE_CATEGORY_NAME));
    }
    // Developer (synthetic) variables are always written by the block that owns them.
    if (typeof b.getDeveloperVariables == 'function') {
      var dev = b.getDeveloperVariables() || [];
      for (var k = 0; k < dev.length; k++)
        add(Blockly.Python.nameDB_.getName(dev[k], Blockly.Names.DEVELOPER_VARIABLE_TYPE));
    }
  }
  return globals.length ? Blockly.Python.INDENT + 'global ' + globals.join(', ') + '\n' : '';
}

function runtimeHandler(block, name, params, ownVars, inputName) {
  var resolvedInput = inputName || 'do';
  var globalsLine = runtimeGlobalsLine(block, ownVars, resolvedInput);
  var body = Blockly.Python.statementToCode(block, resolvedInput);
  if (!body)
    body = Blockly.Python.INDENT + 'pass\n';
  return 'def ' + name + '(' + params + '):\n' + globalsLine + body + '\n';
}

// Combined "program" blocks: emit the def for each event section that has blocks
// in it (skip empties so the program stays clean), then the caller appends the
// matching bipes_runtime.run(...) start call. `withConnect` adds on_connect /
// on_disconnect (wireless transports only).
function runtimeProgramScaffold(block, withConnect) {
  Blockly.Python.definitions_['import_bipes_runtime'] = 'import bipes_runtime';
  var nonEmpty = function(input) {
    var b = Blockly.Python.statementToCode(block, input);
    return b && b.trim().length;
  };
  var code = '';
  if (nonEmpty('ON_START'))
    code += runtimeHandler(block, 'on_start', '', [], 'ON_START');
  if (withConnect && nonEmpty('ON_CONNECT'))
    code += runtimeHandler(block, 'on_connect', '', [], 'ON_CONNECT');
  if (withConnect && nonEmpty('ON_DISCONNECT'))
    code += runtimeHandler(block, 'on_disconnect', '', [], 'ON_DISCONNECT');
  if (nonEmpty('ON_MESSAGE')) {
    var nameVar = Blockly.Python.nameDB_.getName(block.getFieldValue('MSG_NAME'), Blockly.VARIABLE_CATEGORY_NAME);
    var valueVar = Blockly.Python.nameDB_.getName(block.getFieldValue('MSG_VALUE'), Blockly.VARIABLE_CATEGORY_NAME);
    code += runtimeHandler(block, 'on_message', nameVar + ', ' + valueVar, [nameVar, valueVar], 'ON_MESSAGE');
  }
  if (nonEmpty('ON_STOP'))
    code += runtimeHandler(block, 'on_stop', '', [], 'ON_STOP');
  return code;
}

Blockly.Python['runtime_program_serial'] = function(block) {
  return runtimeProgramScaffold(block, false) + 'bipes_runtime.run(globals())\n';
};

Blockly.Python['runtime_program_bluetooth'] = function(block) {
  var esc = function(s){ return String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"'); };
  var name = esc(block.getFieldValue('BLE_NAME') || 'Pico-BIPES');
  return runtimeProgramScaffold(block, true) +
         'bipes_runtime.run(globals(), bluetooth="' + name + '")\n';
};

Blockly.Python['runtime_program_wifi'] = function(block) {
  var defs = runtimeProgramScaffold(block, true);
  if (block.getFieldValue('CREDS') !== 'FIELDS')
    return defs + 'bipes_runtime.run(globals(), wifi=True)\n';   // creds from /secrets.json
  // Fields mode: build the literal wifi config (same shape as runtime_start_wifi_literal),
  // pulling the auto-filled MQTT credentials from the block's hidden `data`.
  var esc = function(s){ return String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"'); };
  var ssid = esc(block.getFieldValue('SSID') || '');
  var pw = esc(block.getFieldValue('PW') || '');
  var host = esc(block.getFieldValue('HOST') || '');
  var useTls = block.getFieldValue('SSL') !== 'PLAIN';
  var port = parseInt(block.getFieldValue('PORT')) || (useTls ? 8883 : 1883);
  var creds = {};
  try { creds = JSON.parse(block.data || '{}'); } catch (e) {}
  var user = esc(creds.user || '');
  var password = esc(creds.password || '');
  var prefix = esc(creds.prefix || '');
  var cfg = '{"ssid": "' + ssid + '", "pw": "' + pw + '", "host": "' + host + '", "port": ' + port +
            ', "ssl": ' + (useTls ? 'True' : 'False') +
            ', "user": "' + user + '", "password": "' + password + '", "prefix": "' + prefix + '"}';
  return defs + 'bipes_runtime.run(globals(), wifi=' + cfg + ')\n';
};

Blockly.Python['runtime_on_start'] = function(block) {
  Blockly.Python.definitions_['import_bipes_runtime'] = 'import bipes_runtime';
  return runtimeHandler(block, 'on_start', '');
};

Blockly.Python['runtime_on_stop'] = function(block) {
  Blockly.Python.definitions_['import_bipes_runtime'] = 'import bipes_runtime';
  return runtimeHandler(block, 'on_stop', '');
};

Blockly.Python['runtime_on_connect'] = function(block) {
  Blockly.Python.definitions_['import_bipes_runtime'] = 'import bipes_runtime';
  return runtimeHandler(block, 'on_connect', '');
};

Blockly.Python['runtime_on_disconnect'] = function(block) {
  Blockly.Python.definitions_['import_bipes_runtime'] = 'import bipes_runtime';
  return runtimeHandler(block, 'on_disconnect', '');
};

Blockly.Python['runtime_on_message'] = function(block) {
  Blockly.Python.definitions_['import_bipes_runtime'] = 'import bipes_runtime';
  var nameVar = Blockly.Python.nameDB_.getName(block.getFieldValue('NAME_VAR'), Blockly.VARIABLE_CATEGORY_NAME);
  var valueVar = Blockly.Python.nameDB_.getName(block.getFieldValue('VALUE_VAR'), Blockly.VARIABLE_CATEGORY_NAME);
  return runtimeHandler(block, 'on_message', nameVar + ', ' + valueVar, [nameVar, valueVar]);
};

// Raw line out over the connection.
Blockly.Python['runtime_serial_send'] = function(block) {
  Blockly.Python.definitions_['import_bipes_runtime'] = 'import bipes_runtime';
  var text = Blockly.Python.valueToCode(block, 'TEXT', Blockly.Python.ORDER_NONE) || '""';
  return 'bipes_runtime.serial_send(' + text + ')\n';
};

// Start over WiFi. WiFi name/password/host come from the visible fields; the MQTT
// credentials come from the block's hidden `data` (auto-filled on add) and are
// injected here so they never appear as editable fields.
Blockly.Python['runtime_start_wifi_literal'] = function(block) {
  Blockly.Python.definitions_['import_bipes_runtime'] = 'import bipes_runtime';
  var esc = function(s){ return String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"'); };
  var ssid = esc(block.getFieldValue('SSID') || '');
  var pw = esc(block.getFieldValue('PW') || '');
  var host = esc(block.getFieldValue('HOST') || '');
  var useTls = block.getFieldValue('SSL') !== 'PLAIN';   // default (incl. legacy blocks) = TLS
  var port = parseInt(block.getFieldValue('PORT')) || (useTls ? 8883 : 1883);
  var creds = {};
  try { creds = JSON.parse(block.data || '{}'); } catch (e) {}
  var user = esc(creds.user || '');
  var password = esc(creds.password || '');
  var prefix = esc(creds.prefix || '');
  var cfg = '{"ssid": "' + ssid + '", "pw": "' + pw + '", "host": "' + host + '", "port": ' + port +
            ', "ssl": ' + (useTls ? 'True' : 'False') +
            ', "user": "' + user + '", "password": "' + password + '", "prefix": "' + prefix + '"}';
  return 'bipes_runtime.run(globals(), wifi=' + cfg + ')\n';
};

// Subscribe to an extra MQTT topic (messages -> on_message).
Blockly.Python['runtime_subscribe'] = function(block) {
  Blockly.Python.definitions_['import_bipes_runtime'] = 'import bipes_runtime';
  var topic = Blockly.Python.valueToCode(block, 'TOPIC', Blockly.Python.ORDER_NONE) || '""';
  return 'bipes_runtime.subscribe(' + topic + ')\n';
};

// Publish to an extra MQTT topic.
Blockly.Python['runtime_publish'] = function(block) {
  Blockly.Python.definitions_['import_bipes_runtime'] = 'import bipes_runtime';
  var topic = Blockly.Python.valueToCode(block, 'TOPIC', Blockly.Python.ORDER_NONE) || '""';
  var value = Blockly.Python.valueToCode(block, 'VALUE', Blockly.Python.ORDER_NONE) || '0';
  return 'bipes_runtime.publish(' + topic + ', ' + value + ')\n';
};

// Trigger an OTA update from a URL.
Blockly.Python['runtime_ota_update'] = function(block) {
  Blockly.Python.definitions_['import_bipes_runtime'] = 'import bipes_runtime';
  var url = Blockly.Python.valueToCode(block, 'URL', Blockly.Python.ORDER_NONE) || '""';
  return 'bipes_runtime.ota(' + url + ')\n';
};


// WebREPL ---------------------------------------------------------------------
Blockly.Python['webrepl_start'] = function(block) {
  Blockly.Python.definitions_['import_webrepl'] = 'import webrepl';
  var code = 'webrepl.start()\n';
  return code;
};

Blockly.Python['webrepl_setup'] = function(block) {
  var code = 'import webrepl_setup\n';
  return code;
};

// CAN Bus ---------------------------------------------------------------------
//https://github.com/nos86/micropython/blob/esp32-can-driver-v3/docs/library/machine.CAN.rst
Blockly.Python['esp32_can_init'] = function(block) {
  var mode = Blockly.Python.valueToCode(block, 'mode', Blockly.Python.ORDER_ATOMIC);
  var baudrate = Blockly.Python.valueToCode(block, 'baudrate', Blockly.Python.ORDER_ATOMIC);
  var extframe = Blockly.Python.valueToCode(block, 'extframe', Blockly.Python.ORDER_ATOMIC);

  Blockly.Python.definitions_['import_can'] = 'from machine import CAN';

  //BAUDRATE_500k = 500
  var code = 'can = CAN(0, extframe=True, mode=CAN.LOOPBACK, baudrate=500)\n';

  return code;
};

Blockly.Python['esp32_can_filter'] = function(block) {
  var filter = Blockly.Python.valueToCode(block, 'filter', Blockly.Python.ORDER_ATOMIC);

  //dev.setfilter(0, CAN.FILTER_ADDRESS, [0x102, 0])  # set a filter to receive messages with id = 0x102
  var code = 'can.setfilter(0, CAN.FILTER_ADDRESS, [0x102, 0]) \n';

  return code;
};

Blockly.Python['esp32_can_send'] = function(block) {
  var id = Blockly.Python.valueToCode(block, 'id', Blockly.Python.ORDER_ATOMIC);
  var data = Blockly.Python.valueToCode(block, 'data', Blockly.Python.ORDER_ATOMIC);

  var code = 'can.send([1,2,3], 0x102) \n';

  return code;
};

Blockly.Python['esp32_can_recv'] = function(block) {

  var code = 'can.recv()';

  return [code, Blockly.Python.ORDER_NONE];
};

// Google Sheets ---------------------------------------------------------------

Blockly.Python['google_spreadsheet'] = function(block) {
  Blockly.Python.definitions_['import_prequests'] = 'import prequests';
  Blockly.Python.definitions_['import_ujson'] = 'import ujson';

  var number_sheet_num = block.getFieldValue('sheet_num');
  var value_deploy_code = Blockly.Python.valueToCode(block, 'deploy_code', Blockly.Python.ORDER_ATOMIC);
  var cells_blocks = block.getInputTargetBlock('cells_values');

  // TODO: Assemble Python into code variable.
  Blockly.Python.definitions_['post_data'] = 'def post_data(row_data, deployment_code):\n  request_data = ujson.dumps({"parameters": row_data})\n  r = prequests.post("https://script.google.com/macros/s/" + deployment_code + "/exec", headers = {"content-type": "application/json"}, data = request_data)\n  r.close()';
  Blockly.Python.definitions_['deployment_code' + number_sheet_num] = 'deployment_code' + number_sheet_num + '= ' + value_deploy_code;
  Blockly.Python.definitions_['row_data_' + number_sheet_num] = 'row_data' + number_sheet_num +' = {}';

  if(cells_blocks)
  var num_cell = 0;
  var row_data_def = '';
    do{
      var cell_value = Blockly.Python.blockToCode(cells_blocks, 'Cell');
      row_data_def += ' row_data' + number_sheet_num +'["var' + num_cell+ '"] = ' + cell_value+'\n';
      num_cell ++;
    }while (cells_blocks = cells_blocks.getNextBlock());

    Blockly.Python.definitions_['row_data_cell'+ number_sheet_num] = 'def update_row_data'+ number_sheet_num+'():\n' + row_data_def;

  var code = 'update_row_data'+ number_sheet_num+'()\npost_data(row_data' + number_sheet_num+',deployment_code' + number_sheet_num+')\n';
  return code;
};

Blockly.Python['cell_value'] = function(block) {
  var value_value = Blockly.Python.valueToCode(block, 'value', Blockly.Python.ORDER_ATOMIC);
  // TODO: Assemble Python into code variable.
  var code = value_value;
  return code;
};

// ============================================================================
// Make USER-DEFINED functions (procedures_def*) use the same reassigned-only
// `global` rule as the runtime handlers. Blockly's stock procedure generator
// (basic.js) declares EVERY workspace variable global except the function's own
// parameters — noisy, and inconsistent with on_start/on_message/loop.
//
// Why we rewrite the OUTPUT instead of the cleaner approaches:
//   * Re-feeding the generator a filtered variable list is UNSAFE: a procedure
//     body can contain blocks (timer/IRQ/MQTT callbacks in timing.js/network.js/
//     machine.js) that themselves call allUsedVarModels during statementToCode,
//     so globally patching it would corrupt their codegen.
//   * Re-implementing the whole generator risks drifting from upstream and, worse,
//     mis-resolving the function NAME (a def/call mismatch -> NameError).
// So we let the original run untouched (correct names, return value, scrub,
// nested callbacks) and then replace just its `global …` line in the stored
// definition with the reassigned-only set (scoped to the body 'STACK', minus
// params). The regex is anchored to the function's own `def …:` signature, so a
// nested callback def inside the body keeps its own globals.
// network.js is concatenated AFTER basic.js (see concat_files(..., "basic.js")),
// so procedures_def* is already defined here.
(function () {
  if (typeof Blockly == 'undefined' || !Blockly.Python) return;
  var orig = Blockly.Python['procedures_defreturn'];
  if (typeof orig != 'function') return;
  function override(block) {
    var before = {};
    for (var k in Blockly.Python.definitions_) before[k] = true;
    var ret = orig.call(this, block);                 // original generator, untouched
    var params = (block.getVars() || []).map(function (v) {
      return Blockly.Python.nameDB_.getName(v, Blockly.VARIABLE_CATEGORY_NAME);
    });
    var newLine = runtimeGlobalsLine(block, params, 'STACK');   // '' or INDENT+'global …\n'
    for (var key in Blockly.Python.definitions_) {
      if (before[key] || key.charAt(0) !== '%') continue;       // the def just added
      Blockly.Python.definitions_[key] = Blockly.Python.definitions_[key].replace(
        /(def [^\n]*:\n)([ \t]*global [^\n]*\n)?/,
        function (m, sig) { return sig + newLine; });
    }
    return ret;
  }
  Blockly.Python['procedures_defreturn'] = override;
  Blockly.Python['procedures_defnoreturn'] = override;   // basic.js aliases these
})();
