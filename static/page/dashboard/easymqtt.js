"use strict";

// EasyMQTT has been retired. The cloud relay, its bridge, and the server-side
// /mqtt store/relay are all gone. The dashboard uses only the local "Standard"
// data path (device link -> localStorage). The ONLY thing kept here is the
// `session` id, which the easymqtt_* network blocks still read when generating
// device code. No network I/O happens here, and there is no MQTT client.

import {storage} from '../../base/storage.js'
import {Tool} from '../../base/tool.js'

// `session` is still exposed because the easymqtt_* network blocks read it when
// generating device code; `host`/credentials are intentionally absent so those
// blocks fall back to their "YOUR_MQTT_BROKER_HOST" placeholders.
export let easyMQTT = {
  session: storage.has('mqtt_session') ?
           storage.fetch('mqtt_session') : storage.set('mqtt_session', Tool.SID())
}
