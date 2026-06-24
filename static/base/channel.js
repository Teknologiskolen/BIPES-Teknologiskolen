"use strict"

import {Tool} from './tool.js'
import {command} from './command.js'
import {Pipes} from './navigation.js'

// Commom MicroPython outputs
const BACKSPACE = '[K' // Backspace character
const PASTEMODE = "paste mode; Ctrl-C to cancel, Ctrl-D to finish" // Paste mode output
const CAMERA_FRAME_START = 'BIPES_CAMERA_FRAME'
const CAMERA_FRAME_MARKER_BYTES = new TextEncoder().encode(CAMERA_FRAME_START)
const CAMERA_CAPTURE_COMMAND = 'BIPES_CAPTURE\n'
const CAMERA_DEFAULT_INTERVAL_MS = 3000

class ChannelImageFeed {
  constructor (channel, uid) {
    this.channel = channel
    this.uid = uid
    this.listeners = new Map()
    this.latestFrame = null
    this.convertingFrame = false
    this.droppedFrames = 0
    this.timer = undefined
    this.awaitingFrame = false
    this.awaitingFrameTimer = undefined
    this.pendingFrames = []
    this.triggerBuffer = ''
    this.lastTriggerAt = 0
  }
  subscribe (callback, options = {}) {
    this.listeners.set(callback, {
      mode: options.mode || 'interval',
      intervalMs: Math.max(CAMERA_DEFAULT_INTERVAL_MS, Number(options.intervalMs) || CAMERA_DEFAULT_INTERVAL_MS)
    })

    if (this.latestFrame) {
      try {
        callback(this.latestFrame)
      } catch (error) {
        console.error(error)
      }
    }

    return () => {
      this.listeners.delete(callback)
    }
  }
  hasIntervalListeners () {
    for (let listener of this.listeners.values()) {
      if (listener.mode == 'interval')
        return true
    }
    return false
  }
  hasTriggerListeners () {
    for (let listener of this.listeners.values()) {
      if (listener.mode == 'newImage')
        return true
    }
    return false
  }
  pollingIntervalMs () {
    let intervalMs = null

    for (let listener of this.listeners.values()) {
      if (listener.mode != 'interval')
        continue

      intervalMs = intervalMs === null ? listener.intervalMs : Math.min(intervalMs, listener.intervalMs)
    }

    return intervalMs || CAMERA_DEFAULT_INTERVAL_MS
  }
  triggerIntervalMs () {
    let intervalMs = null

    for (let listener of this.listeners.values()) {
      if (listener.mode != 'newImage')
        continue

      intervalMs = intervalMs === null ? listener.intervalMs : Math.min(intervalMs, listener.intervalMs)
    }

    return intervalMs || CAMERA_DEFAULT_INTERVAL_MS
  }
  isTriggerLine (line) {
    return line == 'CAPTURE' ||
      line.includes('BIPES_CAMERA_TRIGGER') ||
      line.includes('BIPES_CAMERA_CAPTURE') ||
      line.includes('$BIPES-CAMERA:') ||
      line.includes('$BIPES_CAMERA:')
  }
  triggerFromChunk (chunk) {
    if (!chunk || !this.hasTriggerListeners())
      return

    this.triggerBuffer = `${this.triggerBuffer}${chunk}`.slice(-4096)
    let lines = this.triggerBuffer.split(/\r?\n/)
    this.triggerBuffer = lines.pop() || ''

    for (let line of lines) {
      line = line.trim()
      if (!this.isTriggerLine(line))
        continue

      if (this.awaitingFrame)
        return

      let now = Date.now()
      let intervalMs = this.triggerIntervalMs()
      if (now - this.lastTriggerAt < intervalMs)
        return

      this.lastTriggerAt = now
      this.requestFrame().catch((error) => {
        console.error(error)
      })
      return
    }
  }
  syncTimer () {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = undefined
    }
  }
  start () {
    this.syncTimer()
  }
  stop () {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = undefined
    }
  }
  armAwaitingFrameTimeout () {
    if (this.awaitingFrameTimer)
      clearTimeout(this.awaitingFrameTimer)

    this.awaitingFrameTimer = setTimeout(() => {
      this.awaitingFrame = false
      this.awaitingFrameTimer = undefined
    }, 15000)
  }
  async requestFrame () {
    if (this.awaitingFrame)
      return

    let connection = this.channel.connections[this.uid]
    if (!connection || !connection.current || typeof connection.current.writeRaw != 'function')
      throw new Error('Source device is not ready for image capture.')

    this.awaitingFrame = true
    this.armAwaitingFrameTimeout()
    await connection.current.writeRaw(CAMERA_CAPTURE_COMMAND)
  }
  async getFrame () {
    await this.requestFrame()
    return new Promise((resolve) => {
      this.pendingFrames.push(resolve)
    })
  }
  getLatestFrame () {
    return this.latestFrame
  }
  acceptFrame (frame) {
    frame.droppedFrames = this.droppedFrames
    this.droppedFrames = 0
    this.awaitingFrame = false
    if (this.awaitingFrameTimer) {
      clearTimeout(this.awaitingFrameTimer)
      this.awaitingFrameTimer = undefined
    }

    this.latestFrame = frame

    while (this.pendingFrames.length > 0) {
      let resolve = this.pendingFrames.shift()
      try {
        resolve(frame)
      } catch (error) {
        console.error(error)
      }
    }

    for (let [callback] of this.listeners) {
      try {
        callback(frame)
      } catch (error) {
        console.error(error)
      }
    }
  }
  shouldDropIncomingFrame () {
    return this.convertingFrame
  }
  beginFrameConversion () {
    this.convertingFrame = true
  }
  endFrameConversion () {
    this.convertingFrame = false
  }
  dropIncomingFrame () {
    this.droppedFrames += 1
  }
}

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
    this.textListeners = new Set()
    this.targetDevice
    this.ping = {      // Create a timer on connect and on message to check
      timer:undefined, // if the device is responding
      on:false
    }
    // Cross tabs event handler on muxing terminal
    command.add(this, {
      push: this.push,
      rawPush: this.rawPush,
      livePush: this.livePush
    })

    window.addEventListener("beforeunload", () => {
      Object.keys(this.connections).forEach(uid => {
        this.disconnect(true, uid)
      })
    })
    // Global Stop shortcut — SAME logic as the Stop buttons (was a stray Ctrl-D
    // reboot, which isn't a stop at all).
    shortcut.add("Shift+Ctrl+S", () => {
      try { window.bipes.page.files.device.stopExecution() } catch (e) {}
    })
  }
  _createTransport (channel){
    switch (channel){
      case 'websocket':
        return new _WebSocket(this)
      case 'webserial':
        return new _WebSerial(this)
      case 'webbluetooth':
        // Reuse ONE instance across reconnects. A fresh instance each time left the
        // previous one's characteristicvaluechanged listener attached to the same
        // (browser-reused) GATT characteristic object, so inbound data kept being
        // tagged with the OLD uid — routed to a dead device, so the terminal and
        // card never updated on reconnect.
        return this.webbluetooth || (this.webbluetooth = new _WebBluetooth(this))
      case 'webmqtt':
        // A NEW instance per connect: unlike the single physical serial/BLE link,
        // several WiFi devices can be connected over MQTT simultaneously, each with
        // its own Paho client, uid and topic prefix.
        return new _WebMqtt(this)
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
  getImageFeed (uid){
    let connection = this.connections[uid]
    return connection ? connection.imageFeed : undefined
  }
  subscribeText (callback) {
    this.textListeners.add(callback)
    return () => {
      this.textListeners.delete(callback)
    }
  }
  notifyTextListeners (chunk, uid) {
    for (let callback of this.textListeners) {
      try {
        callback(chunk, uid)
      } catch (error) {
        console.error(error)
      }
    }
  }
  triggerImageFeedsFromChunk (chunk) {
    Object.keys(this.connections).forEach((uid) => {
      let connection = this.connections[uid]
      if (connection && connection.imageFeed)
        connection.imageFeed.triggerFromChunk(chunk)
    })
  }
  _createImageParserState (){
    return {
      decoder: new TextDecoder(),
      buffer: new Uint8Array(0),
      pendingEndRequestId: null
    }
  }
  _appendBytes (first, second) {
    if (!first || first.length === 0)
      return second ? second.slice() : new Uint8Array(0)
    if (!second || second.length === 0)
      return first.slice()

    let merged = new Uint8Array(first.length + second.length)
    merged.set(first, 0)
    merged.set(second, first.length)
    return merged
  }
  _findMarker (buffer, marker) {
    if (!buffer || buffer.length < marker.length)
      return -1

    outer: for (let i = 0; i <= buffer.length - marker.length; i++) {
      for (let j = 0; j < marker.length; j++) {
        if (buffer[i + j] !== marker[j])
          continue outer
      }
      return i
    }

    return -1
  }
  _findLineBreak (buffer, start = 0) {
    for (let i = start; i < buffer.length; i++) {
      if (buffer[i] === 10) {
        let lineEnd = i
        if (lineEnd > start && buffer[lineEnd - 1] === 13)
          lineEnd--
        return {
          lineEnd,
          nextIndex: i + 1
        }
      }
    }
    return null
  }
  _parseHeaderMetadata (text) {
    let metadata = {}
    if (!text)
      return metadata

    text.trim().split(/\s+/).forEach((part) => {
      let index = part.indexOf('=')
      if (index <= 0)
        return
      let key = part.slice(0, index).trim()
      let value = part.slice(index + 1).trim()
      if (!key)
        return
      metadata[key] = decodeURIComponent(value)
    })

    return metadata
  }
  _parseCameraHeader (line) {
    let match = line.match(/^(GRAY8|RAW565|JPEG)\s+(\S+)\s+(\d+)\s+(\d+)\s+(\d+)(?:\s+(.*))?$/)
    if (!match)
      return null

    let metadata = this._parseHeaderMetadata(match[6] || '')
    return {
      type: match[1].toLowerCase(),
      requestId: match[2],
      width: Number(match[3]),
      height: Number(match[4]),
      length: Number(match[5]),
      metadata: metadata,
      dataType: metadata.data || metadata.kind || 'image',
      contentType: metadata.contentType || metadata.mime || '',
      visionInput: metadata.vision || metadata.visionInput || metadata.input || '',
      label: metadata.label || metadata.name || ''
    }
  }
  _emitTextBytes (uid, state, bytes, final = false) {
    if (!bytes || bytes.length === 0)
      return

    let text = state.decoder.decode(bytes, {stream: !final})
    if (text)
      this.inString(text, uid)
  }
  _markerTailLength (buffer, marker) {
    let max = Math.min(buffer.length, marker.length - 1)

    for (let len = max; len > 0; len--) {
      let matches = true
      for (let i = 0; i < len; i++) {
        if (buffer[buffer.length - len + i] !== marker[i]) {
          matches = false
          break
        }
      }
      if (matches)
        return len
    }

    return 0
  }
  _flushTextBuffer (uid, state, keepTail = 0) {
    if (!state.buffer || state.buffer.length <= keepTail)
      return

    let flushLength = state.buffer.length - keepTail
    let bytes = state.buffer.slice(0, flushLength)
    state.buffer = state.buffer.slice(flushLength)
    this._emitTextBytes(uid, state, bytes)
  }
  _consumeFrameEndMarker (state) {
    if (!state.pendingEndRequestId)
      return false

    while (state.buffer.length > 0 && (state.buffer[0] === 10 || state.buffer[0] === 13)) {
      state.buffer = state.buffer.slice(1)
    }

    if (state.buffer.length === 0)
      return true

    let line = this._findLineBreak(state.buffer, 0)
    if (!line)
      return true

    let text = new TextDecoder().decode(state.buffer.slice(0, line.lineEnd)).trim()
    if (text === `END ${state.pendingEndRequestId}`) {
      state.buffer = state.buffer.slice(line.nextIndex)
      state.pendingEndRequestId = null
      return true
    }

    state.pendingEndRequestId = null
    return false
  }
  async _frameToBlob (header, bytes) {
    if (header.type == 'jpeg')
      return new Blob([bytes], {type:'image/jpeg'})

    let canvas = document.createElement('canvas')
    canvas.width = header.width
    canvas.height = header.height
    let context = canvas.getContext('2d', {willReadFrequently:true})
    let imageData = new ImageData(header.width, header.height)

    if (header.type == 'gray8') {
      let pixels = Math.min(header.width * header.height, bytes.length)
      for (let i = 0; i < pixels; i++) {
        let value = bytes[i]
        let target = i * 4
        imageData.data[target] = value
        imageData.data[target + 1] = value
        imageData.data[target + 2] = value
        imageData.data[target + 3] = 255
      }
    } else {
      let pixels = Math.min(header.width * header.height, Math.floor(bytes.length / 2))
      for (let i = 0; i < pixels; i++) {
        let source = i * 2
        let value = bytes[source] | (bytes[source + 1] << 8)
        let r = ((value >> 11) & 0x1f) * 255 / 31
        let g = ((value >> 5) & 0x3f) * 255 / 63
        let b = (value & 0x1f) * 255 / 31
        let target = i * 4
        imageData.data[target] = Math.round(r)
        imageData.data[target + 1] = Math.round(g)
        imageData.data[target + 2] = Math.round(b)
        imageData.data[target + 3] = 255
      }
    }

    context.putImageData(imageData, 0, 0)

    return await new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob)
          resolve(blob)
        else
          reject(new Error('Could not convert source image frame to blob.'))
      }, 'image/png')
    })
  }
  _acceptCameraFrame (uid, header, payload) {
    let connection = this.connections[uid]
    if (!connection || !connection.imageFeed)
      return

    if (connection.imageFeed.shouldDropIncomingFrame()) {
      connection.imageFeed.dropIncomingFrame()
      return
    }

    connection.imageFeed.beginFrameConversion()
    this._frameToBlob(header, payload).then((blob) => {
      connection.imageFeed.acceptFrame({
        blob,
        width: header.width,
        height: header.height,
        byteLength: header.length,
        header: header,
        metadata: header.metadata || {},
        dataType: header.dataType,
        contentType: header.contentType,
        visionInput: header.visionInput,
        label: header.label,
        changed: true,
        signature: `${header.requestId}:${header.length}:${Date.now()}`
      })
    }).catch((error) => {
      console.error(error)
    }).finally(() => {
      connection.imageFeed.endFrameConversion()
    })
  }
  handleIncomingBytes (uint8, uid){
    let connection = this.connections[uid]
    if (!connection || !connection.imageState)
      return

    connection.ping.on = true
    if (uid == this.targetDevice)
      this.ping.on = true

    let state = connection.imageState
    state.buffer = this._appendBytes(state.buffer, uint8)

    while (true) {
      if (this._consumeFrameEndMarker(state))
        if (state.pendingEndRequestId)
          return

      let markerIndex = this._findMarker(state.buffer, CAMERA_FRAME_MARKER_BYTES)

      if (markerIndex === -1) {
        this._flushTextBuffer(uid, state, this._markerTailLength(state.buffer, CAMERA_FRAME_MARKER_BYTES))
        return
      }

      if (markerIndex > 0) {
        this._emitTextBytes(uid, state, state.buffer.slice(0, markerIndex))
        state.buffer = state.buffer.slice(markerIndex)
        continue
      }

      let markerLine = this._findLineBreak(state.buffer, 0)
      if (!markerLine)
        return

      let markerText = new TextDecoder().decode(state.buffer.slice(0, markerLine.lineEnd)).trim()
      if (markerText !== CAMERA_FRAME_START) {
        this._emitTextBytes(uid, state, state.buffer.slice(0, 1))
        state.buffer = state.buffer.slice(1)
        continue
      }

      let headerLine = this._findLineBreak(state.buffer, markerLine.nextIndex)
      if (!headerLine)
        return

      let headerText = new TextDecoder().decode(state.buffer.slice(markerLine.nextIndex, headerLine.lineEnd)).trim()
      let header = this._parseCameraHeader(headerText)

      if (!header) {
        this._emitTextBytes(uid, state, state.buffer.slice(0, headerLine.nextIndex))
        state.buffer = state.buffer.slice(headerLine.nextIndex)
        continue
      }

      let payloadStart = headerLine.nextIndex
      if (state.buffer.length < payloadStart + header.length)
        return

      let payload = state.buffer.slice(payloadStart, payloadStart + header.length)
      state.buffer = state.buffer.slice(payloadStart + header.length)
      state.pendingEndRequestId = header.requestId
      this._acceptCameraFrame(uid, header, payload)
    }
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
      // 5s: tolerant of slower transports (e.g. a first uname over BLE) so a
      // healthy device isn't falsely flagged "unresponsive".
      }, 5000)
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
        reconnect:(protocol) => {bipes.page.device.reconnect(protocol)},
        select:(uid) => {bipes.page.device.select(uid)}
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
    let result = this.current.write(cmd)
    if (result && typeof result.catch == 'function')
      result.catch((error) => {
        console.error(error)
      })
  }
  livePush (cmd, targetDevice){
    if (this.targetDevice == undefined){
      bipes.page.notification.send(Msg["NotConnectedWarning"])
      return
    }

    if (targetDevice != undefined && this.targetDevice != targetDevice)
      this.activate(targetDevice)

    if (this.current == undefined || this.targetDevice != targetDevice)
      return

    if (typeof this.current.writeRaw == 'function') {
      this.current.writeRaw(cmd).catch((error) => {
        console.error(error)
      })
      return
    }

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
      case 'webmqtt':
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
      imageFeed: new ChannelImageFeed(this, uid),
      imageState: this._createImageParserState(),
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
    // Clear the runtime flag so a reconnect re-detects the device and re-runs
    // markRuntime → re-requests INFO → the card identity updates every time.
    if (this.runtimeUids != undefined)
      this.runtimeUids.delete(uid)

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
    // If other devices are still connected, promote one to be the current
    // device so there is always an active device while any remain. Otherwise
    // fall back to the reconnect logic.
    let remaining = Object.keys(this.connections)
    if (remaining.length > 0)
      this.pipe.device_select(remaining[0])
    else
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

      // Strip the echoed command. Over BLE the echo can arrive preceded by
      // stray bytes / prompt fragments or split across notifications, so the
      // echo isn't always at index 0. Find it anywhere; if it's missing, don't
      // bail — pass the raw output to the callback, whose own regex extracts
      // what it needs (e.g. _fetchedInfo matches the uname tuple).
      // Echo missing is expected for runtime devices (no REPL echo) and over BLE
      // where it can be split/reordered — pass the raw output through silently; the
      // callback's own regex extracts what it needs.
      let echoAt = out.indexOf(call.cmd)
      if (echoAt >= 0)
        out = out.substr(echoAt + call.cmd.length)
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
    let sourceUid = uid != undefined ? uid : this.targetDevice
    this.notifyTextListeners(chunk, sourceUid)

    // Detect a BIPES runtime device (bipes_runtime.py): it emits READY / ACK,.. /
    // ERR,.. / T,name=value lines and has NO REPL prompt. A normal MicroPython
    // REPL never emits these, so this won't affect REPL/programming devices.
    if (this.runtimeUids == undefined)
      this.runtimeUids = new Set()
    // Parse the runtime protocol on COMPLETE lines, not raw chunks. Over BLE a line
    // like "I,rp2,1.28.0\r\n" is split across 20-byte notifications, so matching a
    // half-chunk yields a truncated/empty version → the card stays "unknown" and
    // _requestInfo keeps re-sending INFO forever (the I,/M,run flood). Buffer per
    // source and only parse whole lines; the display below still gets the raw chunk.
    if (this._lineBuf == undefined)
      this._lineBuf = {}
    let acc = (this._lineBuf[sourceUid] || '') + chunk
    let nl
    while ((nl = acc.search(/[\r\n]/)) >= 0) {
      let line = acc.slice(0, nl)
      acc = acc.slice(nl + 1)
      if (!line)
        continue
      let isRuntimeLine = /^(READY|ACK,|ERR,|T,|I,|M,)/.test(line)
      // Promote the talking device if none is active (e.g. a serial→BLE handoff).
      if (isRuntimeLine && this.connections[sourceUid] != undefined &&
          (this.targetDevice == undefined || this.connections[this.targetDevice] == undefined))
        this.pipe.device_select(sourceUid)
      // Flag runtime on the first runtime line so the REPL probe / unresponsive stop.
      if (isRuntimeLine && !this.runtimeUids.has(sourceUid)){
        this.runtimeUids.add(sourceUid)
        try { window.bipes.page.device.markRuntime(sourceUid) } catch (e) {}
      }
      // Identity "I,<name>,<version>" (reply to INFO) — now a full line, full version.
      let _info = line.match(/^I,([^,]*),(.*)$/)
      if (_info) {
        try { window.bipes.page.device.updateRuntimeInfo(sourceUid, _info[1], _info[2]) } catch (e) {}
      }
      // Sub-mode "M,run" / "M,program" / "M,boot" (booting = transient transition).
      let _m = line.match(/^M,(run|program|boot)\b/)
      if (_m) {
        try { window.bipes.page.device.markMode(sourceUid, _m[1]) } catch (e) {}
      }
      // OTA failure (WiFi deploy): the device couldn't fetch/apply the new program and
      // stayed in its current mode. Surface WHY, and release the Blocks Play button now
      // instead of letting it sit locked until the 35s "waiting for run mode" timeout —
      // that wait is what makes a failed deploy look "stuck".
      if (/^ERR,ota\b/.test(line)) {
        try { window.bipes.page.notification.send(`${Msg['PageBlocks'] || 'Blocks'}: ${line}`) } catch (e) {}
        try { window.bipes.page.blocks.code.busy = false } catch (e) {}
      }
    }
    this._lineBuf[sourceUid] = acc

    if (uid != undefined && uid != this.targetDevice) {
      this.pipe.dashboard_write(chunk)
      return
    }

    this.pipe.prompt_write(chunk)
    this.pipe.dashboard_write(chunk)
    this.ping.on = true

    // Transition back to Program Mode: a ">>> " prompt on a runtime link means
    // the device handed BLE/serial to the REPL after QUIT. Leave runtime mode
    // and let the normal REPL machinery below resume.
    if (this.runtimeUids.has(sourceUid) && chunk.indexOf('>>> ') != -1){
      this.runtimeUids.delete(sourceUid)
      this.output = ''
      this.callbacks = []
      this.lock = false
      try { window.bipes.page.device.markProgram(sourceUid) } catch (e) {}
    }

    if (this.runtimeUids.has(sourceUid)) {
      // Runtime device: there is no ">>> " prompt to wait for. Don't accumulate
      // output or run REPL callbacks — that machinery is what threw
      // "callback's commands checkup failed" against the uname probe. Also clear
      // `dirty`: runtime sends are fire-and-forget rawPush (which sets dirty=true),
      // and with no REPL callback flow to clear it the terminal would stick on
      // "Ongoing input" (locked) — especially after a reconnect INFO request.
      this.output = ''
      this.callbacks = []
      this.lock = false
      this.dirty = false
      return
    }

    //data comes in chunks, keep last 4 chars to check MicroPython REPL string
    this.output += chunk

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
  this.reader
  this.writeQueue = Promise.resolve()
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
        this.parent._connected('webserial', callback, this)
        this.readLoop()
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
  this.readLoop = async () => {
    if (!this.port || !this.port.readable)
      return

    this.reader = this.port.readable.getReader()

    try {
      while (true) {
        let result = await this.reader.read()
        if (result.done)
          break

        if (result.value && result.value.length > 0)
          window.bipes.channel.handleIncomingBytes(result.value, this.uid)
      }
    } catch (e) {
      if (!/The device has been lost/i.test(e && e.message ? e.message : ''))
        console.error(e)
    } finally {
      try {
        this.reader.releaseLock()
      } catch (error) {}
      this.reader = undefined

      if (this.uid != undefined && window.bipes.channel.hasConnection(this.uid))
        window.bipes.channel._disconnected(this.uid)
    }
  }
  /**
   * Disconnect device connected with webserial protocol.
   * @param {boolean} force - Try to disconnect at all cost and if fails, pretend
   *                          it worked (useful on unload when everything is cleared anyway)
   */
  this.disconnect = (force) => {
    if (this.reader) {
      try {
        this.reader.cancel()
      } catch (error) {}
    }

    if (!this.port || !this.port.writable)
      return true

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
  this.enqueueWrite = (callback) => {
    this.writeQueue = this.writeQueue
      .catch(() => {})
      .then(callback)
    return this.writeQueue
  }
  this.writeRaw = async (data) => {
    if (!this.port || !this.port.writable)
      throw new Error('Serial device is not writable.')

    let payload = data instanceof Uint8Array ? data : this.encoder.encode(String(data))
    return this.enqueueWrite(async () => {
      const writer = this.port.writable.getWriter()
      try {
        await writer.write(payload)
      } finally {
        writer.releaseLock()
      }
    })
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

    return this.enqueueWrite(async () => {
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
          try {
            for (const buffer of subBuffer){
              // Execution is paused until writer wrote dataArrayBuffer
              await writer.write(buffer)
            }
          } finally {
            writer.releaseLock()
          }
        }
        this.parent.pipe.prompt_setLoading(index, data.length - 1)
      }
      // If no callback expected, release lock
      if (this.parent.callbacks.length == 0)
        this.parent.lock = false
      this.parent.pipe.prompt_endLoading()
    })
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
  this.writeRaw = async (data) => {
    if (!this.ws)
      throw new Error('WebSocket device is not writable.')

    if (data instanceof Uint8Array)
      this.ws.send(data)
    else
      this.ws.send(String(data))
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
        // Only show BIPES robots (advertised name starts with "Pico"). The NUS
        // service isn't in the advertising payload, so we filter by name, not
        // service. optionalServices still grants access to NUS after connect.
        filters: [{namePrefix: 'Pico'}],
        optionalServices: [this.config.ServiceUUID]
      })
      .then(bleDevice => {
        this.bleDevice = bleDevice; //check
        this.bleDevice.addEventListener(
          'gattserverdisconnected',
          () => { this.parent._disconnected(this.uid) }
          );
        return bleDevice.gatt.connect()
      })
      .then(server => {
        return server.getPrimaryService(this.config.ServiceUUID)
      }).then(service => {
        this.nusService = service;
      })
      .then(() => {
        return this.nusService.getCharacteristic(this.config.RXUUID)
      })
      .then(characteristic => {
        this.rxCharacteristic = characteristic
      })
      .then(() => {
        return this.nusService.getCharacteristic(this.config.TXUUID)
      })
      .then(characteristic => {
        this.txCharacteristic = characteristic
      })
      .then(() => {
        return this.txCharacteristic.startNotifications()
      })
      .then(() => {
        // Detach a listener left over from a previous connection FIRST: the browser
        // hands back the same characteristic object on reconnect, so an orphaned
        // listener would keep firing with the stale uid. Store the handler +
        // characteristic so disconnect() can detach them too.
        if (this._txChar && this._onTx) {
          try { this._txChar.removeEventListener('characteristicvaluechanged', this._onTx) } catch (e) {}
        }
        this._txChar = this.txCharacteristic
        this._onTx = (ev) => {
          this.parent.inString(this.decoder.decode(ev.target.value), this.uid)
        }
        this._txChar.addEventListener('characteristicvaluechanged', this._onTx)
        this.parent._connected('webbluetooth', callback, this)
        // A Web Bluetooth device reached over the NUS service is ALWAYS a
        // bipes_runtime (there is no REPL over BLE). Flag it as a runtime up front
        // — don't wait for an inbound line. On a reconnect into the silent program
        // mode no telemetry arrives, so without this the browser would treat it as
        // a REPL, fire the uname probe, and hang as "ongoing input" with the
        // runtime buttons dead. markRuntime then requests INFO and the device
        // replies I,<name> + M,<mode> so the card shows the current sub-mode.
        if (this.parent.runtimeUids == undefined)
          this.parent.runtimeUids = new Set()
        this.parent.runtimeUids.add(this.uid)
        try { window.bipes.page.device.markRuntime(this.uid) } catch (e) {}
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
    // Detach the notification listener so it can't fire after disconnect (and so a
    // later reconnect on the reused characteristic object doesn't double-fire).
    if (this._txChar && this._onTx) {
      try { this._txChar.removeEventListener('characteristicvaluechanged', this._onTx) } catch (e) {}
      // stopNotifications() returns a promise that REJECTS with "GATT Server is
      // disconnected" when the link already dropped — catch it (the try only catches
      // a synchronous throw) so it doesn't surface as an uncaught rejection.
      try { let p = this._txChar.stopNotifications(); if (p && p.catch) p.catch(() => {}) } catch (e) {}
    }
    this._txChar = undefined
    this._onTx = undefined
    if (this.bleDevice && this.bleDevice.gatt.connected)
      this.bleDevice.gatt.disconnect()

    this.bleDevice = undefined;
    this.nusService = undefined;
    this.txCharacteristic = undefined;
    this.rxCharacteristic = undefined;
    return true
  }
  this.writeRaw = async (data) => {
    // Bail quietly if the link is gone. A write racing a disconnect — e.g. the
    // device rebooting into a freshly saved program — otherwise rejects with
    // "GATT Server is disconnected", and callers like the dashboard heartbeat don't
    // all attach a .catch, so it surfaces as an uncaught promise rejection.
    if (!this.rxCharacteristic || !this.bleDevice || !this.bleDevice.gatt.connected)
      return

    let value = data instanceof Uint8Array ? data : this.encoder.encode(String(data))
    // Respect the ATT MTU: split into 20-byte packets (see this.write).
    const MTU = 20
    try {
      for (let i = 0; i < value.length; i += MTU)
        await this.rxCharacteristic.writeValue(value.slice(i, i + MTU))
    } catch (e) {
      // Disconnected mid-write — benign; drop quietly rather than reject.
    }
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
    // Web Bluetooth permits only ONE GATT operation at a time. rawPush() (e.g. the
    // INFO probe fired the instant a runtime connects) calls write() directly while
    // the queued writer may still be mid-flight — two overlapping writes throw
    // "GATT operation already in progress". Chain every write so each one awaits the
    // previous one's GATT ops to finish.
    this._gattChain = (this._gattChain || Promise.resolve())
      .then(() => this._writeNow(data), () => this._writeNow(data))
    return this._gattChain
  }
  this._writeNow = async (data) => {
    this.streaming = true
    // A BLE characteristic write is bounded by the negotiated ATT MTU (20 usable
    // bytes by default). Sending a whole command in a single writeValue() either
    // truncates it or stalls the GATT operation, so split into MTU-sized packets
    // and write them sequentially. push() wraps Uint8Array payloads in an array.
    const MTU = 20
    let packets = data != undefined && data.constructor.name == 'Array' ? data : [data]
    try {
      for (let pack of packets) {
        let value = pack instanceof Uint8Array ? pack : this.encoder.encode(String(pack))
        for (let i = 0; i < value.length; i += MTU)
          await this.rxCharacteristic.writeValue(value.slice(i, i + MTU))
      }
      // Release lock after successful write
      this.parent.lock = false
      this.parent.input.shift()

      if (this.parent.input.length > 0)
        this.write (this.parent.input[0])
      else
        this.streaming = false
    } catch (e) {
      // A write racing a disconnect/reconnect is benign — release the lock so the
      // queue doesn't wedge, and drop quietly (no console spam).
      this.parent.lock = false
      this.streaming = false
      this.parent.input.shift()
    }
  }

  this.delayPromise = (delay) => {
    return new Promise(resolve => {
        setTimeout(resolve, delay)
    })
  }
}

/**
 * MQTT-over-WebSocket transport for WiFi runtime devices. The browser connects to
 * the broker through the nginx /wss proxy with short-lived, session-scoped
 * credentials (POST /api/devices/browser-credentials) and speaks the SAME runtime
 * protocol used over serial/BLE — only the framing differs:
 *   - inbound: a telemetry message <prefix>/telemetry/<name>=<value> becomes the
 *     line "T,<name>=<value>"; <prefix>/telemetry/status carries whole protocol
 *     lines (ACK/ERR/M/I/READY) verbatim. Both are fed to inString() as lines.
 *   - outbound: a command line "drive,40,40" is published to
 *     <prefix>/commands/drive with payload "40,40" (mirrors the device's
 *     _mqtt_on_msg). This is the exact inverse of bipes_runtime's _mqtt_pub.
 * A new instance is created per device, so several WiFi devices can be connected
 * at once (unlike the single physical serial/BLE link).
 */
function _WebMqtt (parent){
  this.name = 'WebMqtt'
  this.parent = parent
  this.client = undefined
  this.prefix = ''
  this._txBuf = ''
  this.decoder = new TextDecoder()
  // packetSize 0 -> push() queues whole strings (no chunking); MQTT framing is
  // per-line, handled in _sendText. The activate() watcher calls watch() every 50ms.
  this.config = { packetSize: 0 }

  // Drain the channel input queue (terminal typing / command.dispatch 'push').
  // Dashboard widgets and Stop/Run use livePush/rawPush which call writeRaw/write
  // directly and bypass this queue.
  this.watch = () => {
    if (!this.client || !this.client.isConnected())
      return
    if (this.parent.input.length > 0 && this.parent.lock == false) {
      if (typeof this.parent.isDirty == 'function' && this.parent.isDirty())
        return
      try {
        this.parent.lock = true
        let item = this.parent.input.shift()
        this._sendText(Array.isArray(item) ? item.join('') : item)
      } catch (e) {
        console.error(e)
      } finally {
        this.parent.lock = false
      }
    }
  }

  this._wsConf = () => {
    let ssl = window.location.protocol === 'https:'
    let port = window.location.port ? Number(window.location.port) : (ssl ? 443 : 80)
    return { host: window.location.hostname, port: port, path: '/wss', ssl: ssl }
  }

  this.connect = (callback, conf) => {
    conf = conf || {}
    if (typeof Paho == 'undefined' || !Paho.MQTT) {
      bipes.page.notification.send('MQTT library not loaded')
      return false
    }
    if (!conf.prefix || !conf.username) {
      bipes.page.notification.send('Missing MQTT device credentials')
      return false
    }
    this.prefix = conf.prefix
    let ws = this._wsConf()
    let clientId = 'bipes-ui-' + Math.random().toString(16).slice(2) + ('' + new Date().getTime())
    this.client = new Paho.MQTT.Client(ws.host, ws.port, ws.path, clientId)
    this.client.onConnectionLost = () => {
      if (this.uid != undefined)
        this.parent._disconnected(this.uid)
    }
    this.client.onMessageArrived = (m) => { this._onMessage(m) }
    try {
      this.client.connect({
        useSSL: ws.ssl,
        userName: conf.username,
        password: conf.password,
        onSuccess: () => {
          try { this.client.subscribe(this.prefix + '/telemetry/#') } catch (e) { console.error(e) }
          this.parent._connected('webmqtt', callback, this)
          // A device reached over MQTT is ALWAYS a bipes_runtime (there is no REPL
          // over MQTT). Flag it up front like BLE so the browser doesn't run the
          // REPL uname probe; markRuntime then requests INFO -> device replies I,/M,.
          if (this.parent.runtimeUids == undefined)
            this.parent.runtimeUids = new Set()
          this.parent.runtimeUids.add(this.uid)
          try { window.bipes.page.device.markRuntime(this.uid) } catch (e) {}
        },
        onFailure: (e) => {
          bipes.page.notification.send('MQTT connect failed: ' + ((e && e.errorMessage) || e))
          if (this.uid != undefined)
            this.parent._disconnected(this.uid)
        }
      })
    } catch (e) {
      console.error('WebMqtt connect error:', e)
      return false
    }
  }

  this._onMessage = (message) => {
    let topic = message.destinationName || ''
    let payload
    try { payload = message.payloadString } catch (e) { return }   // non-UTF8, skip
    let marker = '/telemetry/'
    let idx = topic.indexOf(marker)
    if (idx < 0)
      return
    let name = topic.slice(idx + marker.length)
    // Any message in this device's telemetry namespace means it is alive — cancel a
    // pending grace-period teardown (armed by online=0 below). This is what lets an
    // OTA/reboot blip recover silently instead of flashing Disconnected then Connected.
    if (this._offlineTimer != undefined) {
      clearTimeout(this._offlineTimer)
      this._offlineTimer = undefined
    }
    let line
    if (name === 'status')
      line = payload                       // whole protocol line (ACK/ERR/M/I/READY)
    else if (name === 'seen')
      return                               // heartbeat — only used for the online dot
    else if (name === 'online') {
      // Retained presence flag, not telemetry — never shown in the terminal. When it
      // goes to 0 the device's last-will fired (reboot / power-off / dropped). DON'T tear
      // down immediately: an OTA or manual reboot rejoins within a few seconds, and a
      // disconnect/reconnect flicker is noisy and drops the terminal. Arm a grace timer
      // (~20 s); if the device comes back, online=1 — or any telemetry/heartbeat — clears
      // it via the check above, so we never disconnect. Only a SUSTAINED absence (no sign
      // of life for the whole window) is treated as a real disconnect.
      if (payload === '0' && this.uid != undefined && this._offlineTimer == undefined) {
        let uid = this.uid
        this._offlineTimer = setTimeout(() => {
          this._offlineTimer = undefined
          this.parent.disconnect(true, uid)
        }, 20000)
      }
      return   // online=1 needs nothing here — the cancel-on-any-message check handled it
    }
    else
      line = 'T,' + name + '=' + payload   // telemetry value -> T,name=value
    this.parent.inString(line + '\r\n', this.uid)
  }

  this._publishLine = (line) => {
    // Drop control bytes (a stray Ctrl-C/Ctrl-D from the terminal has no meaning
    // over MQTT) and skip blank lines.
    line = line.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '').trim()
    if (!line || !this.client)
      return
    let ci = line.indexOf(',')
    let name = ci < 0 ? line : line.slice(0, ci)
    let payload = ci < 0 ? '' : line.slice(ci + 1)
    if (!name)
      return
    try {
      let msg = new Paho.MQTT.Message(payload)
      msg.destinationName = this.prefix + '/commands/' + name
      this.client.send(msg)
    } catch (e) { console.error('WebMqtt publish error:', e) }
  }

  this._sendText = (data) => {
    this._txBuf += (data instanceof Uint8Array ? this.decoder.decode(data) : String(data))
    let parts = this._txBuf.split(/\r?\n/)
    this._txBuf = parts.pop()             // keep any trailing partial line buffered
    parts.forEach((l) => this._publishLine(l))
  }

  this.write = (data) => {
    // push() may wrap a payload in an array (BLE MTU helper) — flatten it.
    let packets = data != undefined && data.constructor.name == 'Array' ? data : [data]
    packets.forEach((p) => this._sendText(p))
    return Promise.resolve()
  }

  this.writeRaw = async (data) => { this._sendText(data) }

  this.disconnect = (force) => {
    // A clean Paho disconnect() does not fire onConnectionLost, so _disconnected is
    // driven by channel.disconnect() (manual) or onConnectionLost (dropped link).
    try { if (this.client && this.client.isConnected()) this.client.disconnect() } catch (e) {}
    this.client = undefined
    return true
  }
}

export let channel = new Channel()
