"use strict"

import {Tool} from './tool.js'
import {command} from './command.js'
import {Pipes} from './navigation.js'

// Commom MicroPython outputs
const BACKSPACE = '[K' // Backspace character
const PASTEMODE = "paste mode; Ctrl-C to cancel, Ctrl-D to finish" // Paste mode output

class Channel {
   /**
   * Create the Channel object with a root object.
   * @param {Object} root - Root object, where all callbacks are child from.
   */
  constructor (){
    this.name = 'channel'
    this.current
    this.pipe = {}

    this.currentProtocol // Just a string with the current connected protocol
    this.input = []   // Input to be sent to a device
    this.output = ''  // Output from the last command run in the decide
    this.watcher      // Store the interval to send data to a device
    this.lock = false // If the terminal is free to send new data
    this.dirty = false// If the terminal has input (user raw input or timers)
    this.callbacks = []

    this.webserial = new _WebSerial(this)
    this.websocket = new _WebSocket(this)
    this.webbluetooth = new _WebBluetooth(this)

    this.connections = {}
    this.targetDevice
    this.ping = {      // Create a timer on connect and on message to check
      timer:undefined, // if the device is responding
      on:false
    }
    // Cross tabs event handler on muxing terminal
    command.add(this, {
      push: this.push,
      rawPush: this.rawPush
    })

    window.addEventListener("beforeunload", () => {
      Object.keys(this.connections).forEach(uid => {
        this.disconnect(true, uid)
      })
    })
    // Global shortcuts
    shortcut.add("Shift+Ctrl+S", () => {
      command.dispatch(this, 'rawPush', [
          '\x04',
          this.targetDevice, [], this.tabUID
        ])
    })
  }
  _createTransport (channel){
    switch (channel){
      case 'websocket':
        return new _WebSocket(this)
      case 'webserial':
        return new _WebSerial(this)
      case 'webbluetooth':
        return new _WebBluetooth(this)
      default:
        return undefined
    }
  }
  _activeConnection (){
    if (this.targetDevice == undefined)
      return undefined
    return this.connections[this.targetDevice]
  }
  _syncActiveConnection (){
    let connection = this._activeConnection()
    if (connection == undefined)
      return

    connection.output = this.output
    connection.lock = this.lock
    connection.dirty = this.dirty
    connection.callbacks = this.callbacks
    connection.ping = this.ping
  }
  hasConnection (uid){
    return this.connections[uid] != undefined
  }
  activate (uid){
    let connection = this.connections[uid]
    if (connection == undefined)
      return false

    this._syncActiveConnection()
    clearInterval(this.watcher)

    this.targetDevice = uid
    this.current = connection.current
    this.currentProtocol = connection.currentProtocol
    this.input = connection.input
    this.output = connection.output
    this.callbacks = connection.callbacks
    this.lock = connection.lock
    this.dirty = connection.dirty
    this.ping = connection.ping

    this.watcher = setInterval(
      this.current.watch.bind(this.current),
      50);

    return true
  }
  renewPing (){
    clearTimeout(this.ping.timer)
    this.ping.timer = setTimeout(()=>{
      if (this.ping.on === false)
        window.bipes.page.device.unresponsive(this.targetDevice)
      }, 2000)
  }
  /** Setup the pipes for pages, if don't exist, sink. */
  connectPipes (){
    this.pipe = Pipes({
      prompt:{
        write:(chunk) => {bipes.page.prompt.write(chunk)},
        on:() => {bipes.page.prompt.on()},
        off:() => {bipes.page.prompt.off()},
        setLoading:(a,b) => {bipes.page.prompt.setLoading(a,b)},
        endLoading:() => {bipes.page.prompt.endLoading()}
      },
      dashboard:{
        write:(chunk) => {bipes.page.dashboard.write(chunk)}
      },
      device:{
        unuse:(uid) => {bipes.page.device.unuse(uid)},
        reconnect:(protocol) => {bipes.page.device.reconnect(protocol)}
      },
    })
  }
  /*
  @param {String, Uint8Array} cmd - String or uint8 array.
  */
  push (cmd, targetDevice, callback, tabUID){

    if (this.targetDevice == undefined){
      bipes.page.notification.send(Msg["NotConnectedWarning"])
      return
    }

    if (targetDevice != undefined && this.targetDevice != targetDevice)
      this.activate(targetDevice)

    if (this.current == undefined || this.targetDevice != targetDevice)
      return

    this.renewPing()
    // Build callback function
    if (callback != undefined && callback.constructor.name == 'Array') {
      let self = window.bipes.page,
          fun
      if (callback.length == 0) {
        // Filler/dummy callback
        fun = () => {}
      } else {
        for (let i = 0; i < callback.length-1; i++) {
          self = self[callback[i]]
        }
        fun = self[callback[callback.length-1]]
      }
      this.callbacks.push({
        self:self,
        fun:fun,
        cmd:cmd
      })
      if (tabUID)
        this.callbacks[this.callbacks.length - 1].uid = tabUID
    }
    if (cmd.constructor.name == 'Uint8Array') {
      this.input.push([cmd])
    } else if (typeof cmd == 'string' && this.current.config.packetSize != 0) {
      let reg = new RegExp(`(.|[\r]){1,${this.current.config.packetSize}}`, 'g')
      this.input.push([...cmd.match(reg)])
      console.log([...cmd.match(reg)])
    } else {
      this.input.push(cmd)
    }
  }
  rawPush (cmd, targetDevice){
    if (this.targetDevice == undefined){
      bipes.page.notification.send(Msg["NotConnectedWarning"])
      return
    }

    if (targetDevice != undefined && this.targetDevice != targetDevice)
      this.activate(targetDevice)

    if (this.current == undefined || this.targetDevice != targetDevice)
      return

    this.dirty = true
    this.current.write(cmd)
  }
  switch (channel){
    this.diconnect()
    this.connect(channel)

  }
  connect (channel, callback, conf){
    let transport = this._createTransport(channel)
    if (transport == undefined)
      return false

    switch (channel){
      case 'websocket':
      case 'webserial':
        transport.connect(callback, conf)
        break
      default:
        transport.connect(callback)
    }
  }
  _connected (channel, callback, transport){
    let uid = Tool.UID()
    transport = transport || this[channel]
    transport.uid = uid

    this.connections[uid] = {
      current: transport,
      currentProtocol: transport.name,
      input: [],
      output: '',
      callbacks: [],
      lock: false,
      dirty: false,
      ping: {
        timer: undefined,
        on: false
      }
    }

    this.activate(uid)
    this.pipe.prompt_on()
    this.pipe.prompt_write(`\r\n\x1b[31mConnected with ${this.currentProtocol}!\x1b[m\r\n`);
    this.push('\r\n', this.targetDevice)
    if (typeof callback == 'object' && typeof callback[1] == 'function')
      callback[1].apply(callback[0])
  }
  disconnect (force, uid){
    uid = uid || this.targetDevice
    let connection = this.connections[uid]

    if (connection == undefined)
      return

    if (connection.current != undefined)
      connection.current.disconnect(force)

    this._disconnected(uid)
  }
  _disconnected (uid){
    if (uid == undefined)
      return

    let connection = this.connections[uid]
    if (connection == undefined)
      return

    let wasActive = uid == this.targetDevice,
      currentProtocol = connection.currentProtocol

    if (wasActive)
      clearInterval(this.watcher);

    delete this.connections[uid]

    if (!wasActive) {
      this.pipe.device_unuse(uid)
      return
    }

    this.output = ''
    this.callbacks = []
    this.current = undefined
    this.currentProtocol = ''
    this.pipe.device_unuse(uid)
    this.pipe.prompt_off()
    this.pipe.prompt_write(`\r\n\x1b[31mDisconnected from ${currentProtocol}!\x1b[m\r\n`)
    this.targetDevice = undefined
    // Check and reconnect under some circunstances
    this.pipe.device_reconnect(currentProtocol)
  }
  stripDashboardTriggerLines (out){
    let lines = out.split(/\r?\n/),
        changed = false

    lines = lines.filter((line) => {
      let normalized = line.trim()

      if (normalized.startsWith('>>> '))
        normalized = normalized.substr(4).trim()

      let isTrigger = normalized == 'CAPTURE' ||
        normalized.includes('BIPES_CAMERA_TRIGGER') ||
        normalized.includes('BIPES_CAMERA_CAPTURE') ||
        normalized.includes('$BIPES-CAMERA:') ||
        normalized.includes('$BIPES_CAMERA:')

      if (isTrigger)
        changed = true

      return !isTrigger
    })

    return changed ? lines.join('\n') : out
  }
  handleCallback (out){
    out = this.stripDashboardTriggerLines(out)
    // Remove backspaces and characters that antecends it
    out = this.interpretBackspace(
            out.replaceAll('\t', '    ')
          )
    let call = this.callbacks[0]

    if (!call.hasOwnProperty('skip') && !/^[\x00-\x7F]{1}$/.test(call.cmd)){
      call.cmd = call.cmd
          .replaceAll('\t', '    ')
      // Emulate command in paste mode
      if (call.cmd[0] == '\x05')
        call.cmd = this.emulatePasteMode(call.cmd)

      if (out.substring(0, call.cmd.length) != call.cmd) {
        console.error("Channel: callback's commands checkup failed")
        this.callbacks = []
        this.output = ''
        this.lock = false
        return true
      }
      out = out.substr(call.cmd.length)
      try {
        if (call.uid) {
          call.fun.apply(
           call.self, [out, call.cmd, call.uid]
          )
        } else {
          call.fun.apply(
            call.self, [out, call.cmd]
          )
        }
      } catch (e){
        console.error(e)
      }
    }
    this.output = ''
    this.lock = false

    this.callbacks.shift()
  }
  interpretBackspace (out){
    let _out = []
    // Simplify micropython's backspace
    out = out.replaceAll(BACKSPACE, '\b')

    for (let char of out) {
      if (char == '\b') {
        _out.pop()
      } else
        _out.push(char)
    }

    return _out.join('')
  }
  emulatePasteMode (cmd) {
    // Remove paste mode chars
    cmd = cmd.substring(1,cmd.length -1)
    return `\r\n${PASTEMODE}\r\n=== ${cmd.replaceAll(/\t/g,'    ')}`
  }
  /*
   * Return a command with paste mode enclosing
   */
  pasteMode (cmd){
    if (this.current != undefined && this.current.name == 'WebSocket')
      cmd = cmd.replaceAll('\n','\r\n')
    return `\x05${cmd}\x04`
  }

  isDirty (){
    if (!this.dirty)
      return false

    this.current.write('\x03')
    this.dirty = false
    this.callbacks.unshift({skip:true})
    return true
  }
  inArrayBuffer (buffer, uid){
    if (uid != undefined && uid != this.targetDevice)
      return

    let uint8 = new Uint8Array(buffer)

    if (this.callbacks.length > 0){
      let call = this.callbacks[0]
      if (uint8.length == 2){
        if (uint8[0] | (uint8[1] << 8) == 0) {
          console.log('Channel: End of text detected')
          // tell that the next buffer is the ending of text,
          // probably the header as a footer.
          call.cmd[0] = 0x03
          return
        }
      }
      try {
        if (call.uid) {
          call.fun.apply(
           call.self, [uint8, call.cmd, call.uid]
          )
        } else {
          call.fun.apply(
            call.self, [uint8, call.cmd]
          )
        }
      } catch (e){
        console.error(e)
      }

      this.callbacks.shift()
    }
  }
  inString (chunk, uid){
    if (uid != undefined && uid != this.targetDevice)
      return

    //data comes in chunks, keep last 4 chars to check MicroPython REPL string
    this.output += chunk

    this.pipe.prompt_write(chunk)
    this.pipe.dashboard_write(chunk)

    this.ping.on = true
    if (this.output.substring(this.output.length - 4) == ">>> "){
      this.output = this.output.substring(0, this.output.length - 4)
      this.dirty = false
      //After all code was executed
      if (this.callbacks.length > 0)
        this.handleCallback(this.output)
      else {
        this.output = ''
        this.lock = false
      }
    }
  }
}

function _WebSerial (parent){
  this.name = 'WebSerial'
  this.port
  this.config = {
    packetSize:0
  }
  this.encoder = new TextEncoder()
  this.parent = parent
  this.isChooserCancelError = (error) => {
    if (!error)
      return false

    return error.name == 'NotFoundError' ||
      error.name == 'AbortError' ||
      /No port selected by the user/i.test(error.message || '')
  }
  /**
   * Connect using webserial protocol, will ask user permission for the serial port.
   * @param {function} callback - Function to call on connect.
   * @param {string|number} baudrate - Baud rate to establish the serial connection.
   */
  this.connect = (callback, baudrate) => {
    if (navigator.serial == undefined)
      return false

    baudrate = parseInt(baudrate)
    navigator.serial.requestPort().then((port) => {
      this.port = port
      this.port.open({baudRate: [baudrate] }).then(() => {
        const transport = this
        const appendStream = new WritableStream({
          write(chunk) {
            if (typeof chunk == 'string') {
              window.bipes.channel.inString(chunk, transport.uid)
            }
          },
          abort(e){
            window.bipes.channel._disconnected(transport.uid)
          }
        })
        this.port.readable
        .pipeThrough(new TextDecoderStream())
        .pipeTo(appendStream)
        this.parent._connected('webserial', callback, this)
        return true

      }).catch((e) => {
        console.error(e)
        if (e.code == 11) {
          this.parent._connected('webserial', callback, this)
          return true
        }
      })
    }).catch((e) => {
      if (this.isChooserCancelError(e))
        return false

      console.error(e)
      return false
    })
  }
  /**
   * Disconnect device connected with webserial protocol.
   * @param {boolean} force - Try to disconnect at all cost and if fails, pretend
   *                          it worked (useful on unload when everything is cleared anyway)
   */
  this.disconnect = (force) => {
    const writer = this.port.writable.getWriter()
    writer.close().then(() => {
      this.port.close().then(() => {
          this.port = undefined
        }).catch((e) => {
          console.error(e)
          if (force == true){
            writer.abort()
            this.parent._disconnected(this.uid)
            this.port = undefined
          }
        })
        return true
    })
    return true
  }
  /**
   * Runs every 50ms to check if there is code to be sent in the :js:attr:`channel#input` (appended with :js:func:`this.parent.push()`)
   */
  this.watch = () => {
    if (this.port && this.port.writable && this.port.writable.locked == false && this.parent.lock == false) {
      if (this.parent.input.length > 0) {
        if (this.parent.isDirty())
          return
        try {
          this.parent.lock = true
          this.write(this.parent.input [0])
          this.parent.input.shift()
        } catch (e) {
          console.error(e)
        }
      }
    }
  }
  /**
   * Directly send code via webserial, normally called by this.watch()
   * @param {(Uint8Array|string|number)} data - code to be sent via webserial
   */
  this.write = async (data) => {
    if (data.constructor.name != 'Array')
      data = [data]

    let dataArrayBuffer = undefined

    for (const [index, pack] of data.entries()){
      switch (pack.constructor.name) {
        case 'Uint8Array':
          dataArrayBuffer = pack
        break;
        case 'String':
        case 'Number':
          dataArrayBuffer = this.encoder.encode(pack)
        break;
      }
      const chunk = (arr, size) =>
        Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
          arr.slice(i * size, i * size + size)
      )
      let subBuffer = chunk(dataArrayBuffer, 1) // encapsulate every byte
      if (this.port && this.port.writable && dataArrayBuffer != undefined) {
        const writer = this.port.writable.getWriter()
        for (const buffer of subBuffer){
          // Execution is paused until writer wrote dataArrayBuffer
          let response = await writer.write(buffer)
        }
        writer.releaseLock()
      }
      this.parent.pipe.prompt_setLoading(index, data.length - 1)
    }
    // If no callback expected, release lock
    if (this.parent.callbacks.length == 0)
      this.parent.lock = false
    this.parent.pipe.prompt_endLoading()
  }
}

function _WebSocket (parent){
  this.name = 'WebSocket'
  this.parent = parent
  this.ws
  this.encoder = new TextEncoder()

  this.config = {
    packetSize:10
  }
  /**
   * Connect using websocket protocol.
   */
  this.connect = (callback, conf) => {
    if (WebSocket == undefined)
      return false

    this.ws = new WebSocket(conf.url)
    this.ws.binaryType = 'arraybuffer';
    this.ws.onopen = () => {
      this.ws.send(`${conf.passwd}\n\n`)
      this.parent._connected('websocket', callback, this)
      this.ws.onmessage = (event) => {
        if (event.data instanceof ArrayBuffer){
          window.bipes.channel.inArrayBuffer(event.data, this.uid)
        }
        if (typeof event.data == 'string'){
          window.bipes.channel.inString(event.data, this.uid)

          if (event.data.includes("Access denied"))
            bipes.page.notification.send("Wrong board password")
        }
      }
    }
    this.ws.onclose = () => {
      // onclose might be called even if onopen didn't exec
      if (this.parent.current != undefined)
        this.parent._disconnected(this.uid)
    }

  }
  /**
   * Disconnect device connected with websocket protocol.
   */
  this.disconnect = (force) => {
    this.ws.close()
    return true
  }
  /**
   * Runs every 50ms to check if there is code to be sent in the :js:attr:`channel#input` (appended with :js:func:`this.parent.push()`)
   */
  this.watch = () => {
    if (this.ws.bufferedAmount == 0 && this.parent.lock == false) {
      if (this.parent.input.length > 0) {
        if (this.parent.isDirty())
          return
        try {
          this.parent.lock = true
          this.write (this.parent.input[0])
        } catch (e) {
          console.error(e);
        }
      }
    }
  }
  /**
   * Directly send code via websocket, normally called by this.watch()
   * Since await ws.send() don't wait bufferedAmount to zero, watch manually.
   * @param {(Uint8Array|string|number)} data - code to be sent via websocket
   */
  this.write = async (data) => {
    if (data.constructor.name != 'Array')
      data = [data]

    let interval, totalLen = data.length
    if (data.length === 0)
      return

    interval = setInterval(() => {
      if (this.ws.bufferedAmount === 0 && data[0] !== undefined){
        if (data[0].constructor.name === 'Uint8Array') {
          this.ws.send(data[0])
          data.shift()
          this.parent.lock = false
        } else if (['String', 'Number'].includes(data[0].constructor.name)){
          this.ws.send(data[0])
          data.shift()
        }
      }
      this.parent.pipe.prompt_setLoading(totalLen - data.length, totalLen)
      if (data.length === 0){
        clearInterval(interval)
        this.parent.input.shift()
        // If no callback expected, release lock
        if (this.parent.callbacks.length == 0)
          this.parent.lock = false
        this.parent.pipe.prompt_endLoading()
      }
    }, 50)
  }
}

function _WebBluetooth (parent){
  this.name = 'WebBluetooth'
  this.parent = parent
  this.encoder = new TextEncoder()
  this.decoder = new TextDecoder()
  this.isChooserCancelError = (error) => {
    if (!error)
      return false

    return error.name == 'NotFoundError' ||
      error.name == 'AbortError' ||
      /requestDevice\(\) chooser/i.test(error.message || '') ||
      /User cancelled/i.test(error.message || '')
  }

  this.streaming                         // If is streaming data over bluetooth
  this.bleDevice                         // Store selected device
  this.nusService = undefined
  this.txCharacteristic = undefined
  this.rxCharacteristic = undefined

  this.config = {
    ServiceUUID: '6e400001-b5a3-f393-e0a9-e50e24dcca9e',
    RXUUID: '6e400002-b5a3-f393-e0a9-e50e24dcca9e',
    TXUUID: '6e400003-b5a3-f393-e0a9-e50e24dcca9e',
    packetSize:0
  }
  /**
   * Connect using webbluetooth protocol.
   */
  this.connect = (callback) => {
    if (navigator.bluetooth == undefined)
      return false

      navigator.bluetooth.requestDevice({
        //filters: [{services: []}]
        optionalServices: [this.config.ServiceUUID],
        acceptAllDevices: true
      })
      .then(bleDevice => {
        this.bleDevice = bleDevice; //check
        console.log(`Found ${bleDevice.name}\nConnecting to GATT Server...`)
        this.bleDevice.addEventListener(
          'gattserverdisconnected',
          () => { this.parent._disconnected(this.uid) }
          );
        return bleDevice.gatt.connect()
      })
      .then(server => {
        console.log('Locate NUS service')
        return server.getPrimaryService(this.config.ServiceUUID)
      }).then(service => {
        this.nusService = service;
        console.log(`Found NUS service: ${service.uuid}`)
      })
      .then(() => {
        console.log('Locate RX characteristic')
        return this.nusService.getCharacteristic(this.config.RXUUID)
      })
      .then(characteristic => {
        this.rxCharacteristic = characteristic
        console.log('Found RX characteristic')
      })
      .then(() => {
        console.log('Locate TX characteristic')
        return this.nusService.getCharacteristic(this.config.TXUUID)
      })
      .then(characteristic => {
        this.txCharacteristic = characteristic
        console.log('Found TX characteristic')
      })
      .then(() => {
        console.log('Enable notifications')
        return this.txCharacteristic.startNotifications()
      })
      .then(() => {
        this.txCharacteristic.addEventListener(
          'characteristicvaluechanged',
          (ev) => {
            this.parent.inString(
              this.decoder.decode(ev.target.value),
              this.uid
              )
            }
          )
        this.parent._connected('webbluetooth', callback, this)
        /* connnected */
      }).catch(error => {
        if (this.isChooserCancelError(error))
          return false

        console.error('WebBluetooth error:', error)
        if (this.uid != undefined)
          this.parent._disconnected(this.uid)
        /* error */
        if(this.bleDevice && this.bleDevice.gatt.connected)
          this.bleDevice.gatt.disconnect()
      })
  }
  /**
   * Disconnect device connected with webbluetooth protocol.
   */
  this.disconnect = (force) => {
    if (this.bleDevice && this.bleDevice.gatt.connected)
      this.bleDevice.gatt.disconnect()

    this.bleDevice = undefined;
    this.nusService = undefined;
    this.txCharacteristic = undefined;
    this.rxCharacteristic = undefined;
    return true
  }
  /**
   * Runs every 50ms to check if there is code to be sent in the :js:attr:`channel#input` (appended with :js:func:`this.parent.push()`)
   */
  this.watch = () => {
    if (this.bleDevice && this.bleDevice.gatt.connected) {
      if (this.parent.input.length > 0 && !this.streaming  && this.parent.lock == false) {
        if (this.parent.isDirty())
          return
        try {
          this.parent.lock = true
          this.write (this.parent.input[0])
        } catch (e) {
          console.error(e);
        }
      }
    }
  }
  /**
   * Directly send code via webbluetooth, normally called by this.watch()
   * @param {(Uint8Array|string|number)} data - code to be sent via webbluetooth
   */
  this.write = async (data) => {
    return new Promise((resolve, reject) => {
      this.streaming = true
      const value = this.encoder.encode(data)

      this.rxCharacteristic.writeValue(value).then(() => {

        // Release lock after successful write
        this.parent.lock = false

        this.parent.input.shift()

        if (this.parent.input.length > 0)
          this.write (this.parent.input[0])
        else
          this.streaming = false
      }).catch(e => {
        console.error ('WebBluetooth write error:', e)
        // Release lock on error so queue doesn't get stuck
        this.parent.lock = false
        this.streaming = false
        this.parent.input.shift()
      })
    })
  }

  this.delayPromise = (delay) => {
    return new Promise(resolve => {
        setTimeout(resolve, delay)
    })
  }
}

export let channel = new Channel()
