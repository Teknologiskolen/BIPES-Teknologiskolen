"use strict";

import {DOM, Animate} from '../../base/dom.js'
import {Tool} from '../../base/tool.js'
import {command} from '../../base/command.js'
import {storage} from '../../base/storage.js'
import {channel} from '../../base/channel.js'
import {rosetta} from '../../base/rosetta.js'
import {Pipes} from '../../base/navigation.js'

import {notification} from '../notification/main.js'
import {project} from '../project/main.js'
import {prompt} from '../prompt/main.js'
import {
  listImageSourceDevices,
  subscribeImageSourceDevices,
  disconnectImageSourceDevice
} from '../dashboard/plugins.js'

import {deviceSpecifications} from './devices.js'

class Device {
  constructor (){
    this.name = 'device'
    this.isGuestMode = !document.getElementById('user-info')
    this.pipe = {}
    this.devices = storage.has('device') && storage.fetch('device') != '[]' ?
                    JSON.parse(storage.fetch('device')) : []

    this.devices = this._liveDevices(this.devices)
    storage.set('device', JSON.stringify(this.devices))
    this.imageSourceDevices = listImageSourceDevices()
    this.imageSourceUnsubscribe = undefined

    if (this.devices.length === 0)
      storage.set('device')

    this.inited = false
    this.deviceInfo = deviceSpecifications
    this.userDisconnectInput = false // Indicates if the user requested to disconnect.

    let $ = this.$ = {}

    let baudRates = [];
    [9600,19200,38400,57600,115200].forEach(key =>{
      baudRates.push(
        new DOM('option', {innerText:key, value:key})
      )
    })
    $.baudRateDropdown = new DOM('select', {id:'baudrate'})
            .append(baudRates)
    ;['click', 'mousedown', 'pointerdown', 'touchstart'].forEach((eventName) => {
      $.baudRateDropdown.$.addEventListener(eventName, (ev) => {
        ev.stopPropagation()
      })
    })
    $.buttonWebSerial = new DOM('button', {id:'WebSerial'})
      .append([
          new DOM('span', {innerText:Msg['NotSupported']}),
          new DOM('div', {innerText:Msg['USBSerial'], className:'button icon'}),
          $.baudRateDropdown,
          new DOM('span', {className:'silk'})
      ]).onclick(this, this.connectWebSerial)
    DOM.setSelected(this.$.baudRateDropdown, 115200),
    $.buttonWebSocket = new DOM('button', {id:'WebSocket'})
      .append([
          new DOM('span', {innerText:Msg['NotSupported']}),
          new DOM('div', {innerText:Msg['WifiInternet'], className:'button icon'}),
      ])
    $.buttonWebBluetooth = new DOM('button', {id:'WebBluetooth'})
        .append([
          new DOM('span', {innerText:Msg['NotSupported']}),
          new DOM('div', {innerText:Msg['Bluetooth'], className:'button icon'}),
        ]).onclick(this, this.connectWebBluetooth)

    let connectionButtons = [
      $.buttonWebSerial,
      $.buttonWebBluetooth
    ]

    if (!this.isGuestMode)
      connectionButtons.splice(1, 0, $.buttonWebSocket)

    $.newConnection = new DOM('div', {id:'new-connection'})
      .append([
        new DOM('h3', {innerText:Msg['NewConnection']}),
        new DOM('span', {className:'funky'}).append(connectionButtons)
      ])

    $.devices = new DOM('span', {className:'funky'})


    $.h2 = new DOM('h2', {innerText:Msg['PageDevice']})
    $.wrapper = new DOM('span', {className: "device-connect"})
      .append([
        new DOM('div', {id:'devices'})
        .append([
          new DOM('h3', {innerText:Msg['ConnectedDevices']}),
          $.devices
        ]), $.newConnection])

    let targets = []
    for (const key in this.deviceInfo) {
      targets.push(
        new DOM('option', {innerText:this.deviceInfo[key].name, value:key})
      )
    }
    $.targetDropdown = new DOM('select')
      .append(targets)
      .onevent('change', this, this.setProjectTarget)

    let targetFirmware = [];
    rosetta.languages.forEach(key =>{
      targetFirmware.push(
        new DOM('option', {innerText:key, value:key})
      )
    })
    $.targetFirmwareDropdown = new DOM('select')
      .append(targetFirmware)
      .onevent('change', this, this.setProjectTarget)

    $.pinout = new DOM('img', {id:'pinout'})
    $.wrapper2 = new DOM('span', {className: "device-current"})
      .append([
        new DOM('div', {id:'target-device'})
        .append([
          new DOM('div', {className:'header'})
            .append([
              new DOM('h3', {innerText:Msg['TargetDevice']}),
              new DOM('div').append([
                $.targetDropdown,
                $.targetFirmwareDropdown
              ])
            ]),
          new DOM('div')
            .append([
              new DOM('div')
                .append([
                  $.pinout
                ]),
              new DOM('span', {
                innerText:Msg['ChangeTargetAnytime'],
                className:'tips icon text'
              }),
            ])
        ])
      ])

    $.container = new DOM('div', {className:'container'})
      .append([$.h2, $.wrapper, $.wrapper2])


    $.section = new DOM(DOM.get('section#device'))
      .append([$.container.$])
    $.section.$.classList.add('default')
    $.nav = new DOM(DOM.get('a#device'))

    if (!this.isGuestMode) {
      $.webSocketSetup = new DOM('div')
      this.webSocketSetup = new WebSocketSetup($.webSocketSetup, this)
      $.section.append($.webSocketSetup)
      // The "Wi-fi/Internet" button now opens the MQTT WiFi-device provisioning
      // (mint creds + write /secrets.json over USB). The old WebSocket/WebREPL scan
      // is legacy and is blocked under HTTPS (insecure ws://), so it's not wired here.
      $.wifiSetup = new DOM('div')
      this.wifiSetup = new WifiSetup($.wifiSetup, this)
      $.buttonWebSocket.onclick(this.wifiSetup, this.wifiSetup.open)
      $.section.append($.wifiSetup)
    }


    // Status shortcut
    $.statusDevice = new DOM('div')
    $.statusDeviceButton = new DOM('button', {
        className:'status-icon',
        id:'target',
        title:Msg['TargetDevice']
      })
      .append($.statusDevice)
      .onclick(this, () => {
        this.nav.click()
        this.$.targetDropdown.focus()
      })
    $.statusFirmware = new DOM('div')
    $.statusFirmwareButton = new DOM('button', {
        className:'status-icon',
        id:'firmware',
        title:Msg['TargetFirmware']
      })
      .append($.statusFirmware)
      .onclick(this, () => {
        this.nav.click()
        this.$.targetFirmwareDropdown.focus()
      })
    $.statusTarget = new DOM('div')
    $.statusTarget.innerText = Msg['NotConnected']
    $.statusTargetButton = new DOM('button', {
        className:'status-icon',
        id:'device',
        title:Msg['ConnectedDevice']
      })
      .append($.statusTarget)
      .onclick(this, () => {
        this.nav.click()
        this.$.buttonWebSerial.focus()
      })

    new DOM(DOM.get('div#status-bar #globals')).append([
      $.statusDeviceButton,
      $.statusFirmwareButton,
      $.statusTargetButton
    ])

    // Cross tabs event handler on connecting and disconnecting device
    command.add(this, {
      use: this._use,
      unuse: this._unuse,
      updateInfo: this._updateInfo
    })

    this.checkAPISupport()
  }

  /** Setup the pipes for pages, if don't exist, sink. */
  connectPipes (){
    this.pipe = Pipes({
      blocks:{
        deviceTarget:(name) => {
          bipes.page.blocks.deviceTarget(name)
        }
      }
    })
  }
  /**
   * Create this page empty object
   * @return {Object} This page scope in the project file.
   */
  empty (){
    return {
      firmware:rosetta.language(''),
      target:'RPIPicoW'
    }
  }
  load (obj){
    // Set/check language and check target
    obj.firmware = rosetta.language(obj.firmware)
    obj.target = Object.keys(this.deviceInfo).includes(obj.target) ? obj.target : 'RPIPicoW'

    // Trigger blocks because blocks might be inited
    if (obj.hasOwnProperty('target'))
      bipes.page.blocks.toolbox(obj.target)

    // Update status bar
    this.$.statusDevice.innerText = this.deviceInfo[obj.target].name
    this.$.statusFirmware.innerText = obj.firmware

    if (!this.inited)
      return
    if (obj.hasOwnProperty('target')){
      DOM.setSelected(this.$.targetDropdown, obj.target),
      this.$.pinout.$.src = `./static/page/device/media/${this.deviceInfo[obj.target].img}`
    }
    if (obj.hasOwnProperty('firmware')){
      DOM.setSelected(this.$.targetFirmwareDropdown, obj.firmware)
    }
  }
  /*
   * Trigger WebSerial connection to a device.
   */
  connectWebSerial (){
    channel.connect('webserial', [this, this.use], this.$.baudRateDropdown.$.value)
  }
  /*
   * Trigger WebSocket connection to a device.
   * @param{string} url - Device's URL (IP + port number)
   * @param{string} passwd - Device's password.
   */
  connectWebSocket (url, passwd){
    if (this.isGuestMode) {
      notification.send('Wi-fi/Internet connections require login.')
      return
    }

    channel.connect('websocket', [this, this.use], {url:url,passwd:passwd})
  }
  /*
   * Trigger WebBluetooth connection to a device.
   */
  connectWebBluetooth (){
    channel.connect('webbluetooth', [this, this.use])
  }
 /*
  * Check if should reconnect after disconnection and do if so.
  * @param{string} protocol - Protocol that was connected.
  */
  reconnect (protocol){
    if (!this.userDisconnectInput){
      if (protocol == "WebSocket" && this.webSocketSetup && this.webSocketSetup.config.reconnect){
        setTimeout(()=>{this.connectWebSocket(
          this.webSocketSetup.config.address,
          this.webSocketSetup.config.password
        )}, 1000)
      }
    }
    this.userDisconnectInput = false
  }
  _updateConnectedClass (){
    let hasConnections = Object.keys(channel.connections || {}).length > 0
    this.$.nav.$.classList.toggle('device-connected', hasConnections)
  }

  use (){
    let timestamp = +new Date()

    if (channel.targetDevice == undefined){
      console.error("Device: Use function called without a established connection")
      return
    }
    let str = {
        protocol: channel.currentProtocol,
        nodename: Msg['Unknown'],
        version: '-'
      }
    command.dispatch(this, 'use', [
      channel.targetDevice, timestamp, str, command.tabUID
    ])
    // Only on a master tab
    this.$.nav.$.classList.add('using')
    this.$.wrapper.$.classList.add('master')
    this._updateConnectedClass()
    let child = DOM.get(`[data-uid=${channel.targetDevice}]`, this.$.devices.$)
    // User exited tab before resolving function
    if (child !== null){
      child.classList.add('on')
    }

    // Update status bar
    this.$.statusTarget.innerText = this._statusText(str)
    this.$.statusTargetButton.classList.add('on')

    // If not inited, fill devices from StorageBroker
    if (!this.inited) {
      this.devices = this._liveDevices(JSON.parse(storage.fetch('device')))
      this._devicePush(channel.targetDevice, timestamp, str, command.tabUID)
    }
    // Update StorageBroker once
    storage.set('device', JSON.stringify(this.devices))

    // Request info
    setTimeout(()=>{this.fetchInfo(channel.targetDevice)},500)
  }

  _devicePush (uid, timestamp, str, tabUID){
    let device = {
      uid: uid,
      timestamp: timestamp,
      protocol: str.protocol,
      nodename: str.nodename,
      version: str.version,
      tab: tabUID
    }
    let index = this.devices.findIndex((item) => item.uid == uid)
    if (index === -1)
      this.devices.push(device)
    else
      this.devices[index] = device
  }

  _liveDevices (devices){
    let clients = new Set(command.clients || [])
    return (devices || []).filter((item) => {
      if (!item || !item.uid)
        return false
      if (item.tab == command.tabUID)
        return channel.hasConnection(item.uid)
      return clients.has(item.tab)
    })
  }

  _persistLiveDevices (){
    this.devices = this._liveDevices(this.devices)
    storage.set('device', JSON.stringify(this.devices))
  }

  // Visual and instance object
  _use (uid, timestamp, str, tabUID){
    this._devicePush(uid, timestamp, str, tabUID)

    if (!this.inited)
      return

    this.renderConnectedDevices()
  }
  init (){
    if (this.inited)
      return

    if (!this.imageSourceUnsubscribe) {
      this.imageSourceUnsubscribe = subscribeImageSourceDevices((devices) => {
        this.imageSourceDevices = devices
        if (this.inited)
          this.renderConnectedDevices()
      })
    }

    this._persistLiveDevices()
    this.nav.classList.remove('new')
    this.renderConnectedDevices()

    // Only on a slave tab
    if (channel.targetDevice != undefined) {
      let child = DOM.get(`[data-uid=${channel.targetDevice}]`, this.$.devices.$)
      if (child !== null)
        child.classList.add('on')
    }

    this.inited = true
    if (typeof project.ensureCurrent == 'function')
      project.ensureCurrent()
    let obj = project.projects[project.currentUID]
    if (!obj)
      return
    if (obj.hasOwnProperty('device'))
      this.load(obj.device)
  }
  /*
   * On dropdown change, set the new target.
   */
  setProjectTarget (){
    let target = this.$.targetDropdown.$.value
    let firmware = this.$.targetFirmwareDropdown.$.value

    if (target != project.current.device.target && typeof this.pipe.blocks_deviceTarget == 'function')
      this.pipe.blocks_deviceTarget(target)

    this.persistProjectDeviceState({
      target:target,
      firmware:firmware
    })
    // Update status bar
    this.$.statusDevice.innerText = this.deviceInfo[target].name
    this.$.statusFirmware.innerText = firmware
  }

  persistProjectDeviceState (extra = {}){
    let currentDevice = project.current && project.current.device ? project.current.device : this.empty()

    project.update({
      device:{
        target: currentDevice.target || this.$.targetDropdown.$.value || 'RPIPicoW',
        firmware: currentDevice.firmware || this.$.targetFirmwareDropdown.$.value || rosetta.language(''),
        ...extra
      }
    })
  }

  _noDevice (){
    this.$.devices.append(
      new DOM('span', {innerText:Msg['NoConnectedLong']})
    )
  }
  renderConnectedDevices (){
    this.$.devices.removeChilds()

    let cards = []
    this.devices.forEach((item) => {
      cards.unshift(this.$Card(item))
    })
    this.imageSourceDevices.forEach((item) => {
      cards.unshift(this.$ImageSourceCard(item))
    })

    if (cards.length > 0)
      this.$.devices.append(cards)
    else
      this._noDevice()

    if (channel.targetDevice != undefined) {
      let child = DOM.get(`[data-uid=${channel.targetDevice}]`, this.$.devices.$)
      if (child !== null)
        child.classList.add('on')
    }
  }
  // Creates a DOM notificaton card
  $Card (item){
    let about = item.tab == command.tabUID ? Msg['OnThisTab'] : Msg['OnOtherTab']
    let using = Msg['UsingThisDevice']
    // Two-column card: actions (left) + status (right). Grouping into two
    // containers gives a clean side-by-side layout with no overlap, regardless
    // of how long the (translated) labels get.
    let actions = new DOM('div', {className:'device-actions'}).append([
      new DOM('button', {
        id:'fetch',
        className:'icon text',
        innerText:Msg['GetInfo']
      }).onclick(this, this.fetchInfo, [item.uid]),
      new DOM('button', {
        id:'disconnect',
        className:'icon text',
        innerText:Msg['Disconnect']
      }).onclick(this, ()=>{
        this.userDisconnectInput = true
        channel.disconnect(false, item.uid)
      }, [])
    ])
    let status = new DOM('div', {className:'device-status'}).append([
      new DOM('h4', {id:'nodename', innerText: item.nodename}),
      new DOM('div', {id:'version', innerText: `${item.version}`}),
      new DOM('div', {id:'method', className:'method-text', innerText: this.connectionMethodLabel(this._deviceProtocol(item))}),
      new DOM('div', {id:'mode', className:'mode-text', innerText: this._modeLabel(item.mode)}),
      new DOM('div', {innerText: about}),
      new DOM('div', {className:'using-text', innerText: using})
    ])
    return new DOM('button', {uid: item.uid})
      .append([
        new DOM('div').append([
          new DOM('div', {className:'silk'})
            .onclick(this, this.select, [item.uid]),
          new DOM('div', {className:'device-card-body'}).append([actions, status])
        ])
      ])
  }
  $ImageSourceCard (item){
    let latestFrame = item.latestFrame || null
    let headerSummary = latestFrame && latestFrame.summary ? latestFrame.summary : ''
    let headerHelp = 'Header: JPEG requestId width height bytes data=image vision=<input-id> label=<name>'
    return new DOM('button', {uid: item.uid, className:'image-source'})
      .append([
        new DOM('div').append([
          new DOM('h4', {id:'nodename', innerText: item.nodename || Msg['SourceDevice'] || 'Source device'}),
          new DOM('div', {id:'version', innerText: `${item.version || '-'}`}),
          new DOM('div', {innerText: this.connectionMethodLabel(this._deviceProtocol(item)) || 'Image source'}),
          new DOM('div', {
            className:'image-source-header',
            innerText: headerSummary || headerHelp
          }),
          new DOM('div', {innerText: Msg['OnThisTab']}),
          new DOM('button', {
            id:'disconnect',
            className:'icon text',
            innerText:Msg['Disconnect']
          }).onclick(this, async () => {
            await disconnectImageSourceDevice(item.uid)
          }, [])
        ])
      ])
  }
  deinit (){
    if(!this.inited)
      return
    this.$.devices.removeChilds()
    this.inited = false
  }
  select (uid, ev){
    if (ev !== undefined)
      ev.preventDefault()

    let unselect = (targetUid) => {
      this.$.nav.$.classList.remove('using')
      let child = DOM.get(`[data-uid=${targetUid}]`, this.$.devices.$)
      if (child != null)
        child.classList.remove('on')
    }
    if (uid != channel.targetDevice){
      let previousTarget = channel.targetDevice

      if (!channel.activate(uid)) {
        notification.send(Msg['NotConnectedWarning'])
        return
      }

      // Only on a slave tab
      if (previousTarget != undefined)
        unselect(previousTarget)

      this.devices.forEach((device) => {
        if (device.uid == uid) {
          if (channel.currentProtocol == undefined)
            channel.currentProtocol = device.protocol
          // Update status bar
          this.$.statusTarget.innerText = this._statusText(device)
          this.$.statusTargetButton.classList.add('on')
          prompt.on() // and prompt
        }
      })
      this.$.nav.$.classList.add('using')
      // Mark this tab as master too (like onConnect) — disconnecting the active
      // device removes 'master' from the wrapper, and the card's Get info /
      // Disconnect buttons are gated by .device-connect.master, so without this
      // the promoted device's buttons stay hidden.
      this.$.wrapper.$.classList.add('master')
      let child = DOM.get(`[data-uid=${channel.targetDevice}]`, this.$.devices.$)
      if (child != null)
        child.classList.add('on')
    }
  }
  // Friendly label for the connection method (protocol).
  connectionMethodLabel (protocol){
    switch (protocol) {
      case 'WebSerial': return Msg['ConnMethodSerial'] || 'Serial'
      case 'WebBluetooth': return Msg['ConnMethodBluetooth'] || 'Bluetooth'
      case 'WebSocket': return Msg['ConnMethodWifi'] || 'Wi-Fi'
      default: return protocol || ''
    }
  }
  // Resolve a device's protocol, falling back to the live connection so the
  // method shows even for records saved before protocol was stored.
  _deviceProtocol (item){
    if (item && item.protocol)
      return item.protocol
    let conn = item && channel.connections ? channel.connections[item.uid] : null
    return conn ? conn.currentProtocol : ''
  }
  // Connection-status text: "<name> <version> · <method> · <mode>".
  _statusText (device){
    let parts = [`${device.nodename} ${device.version}`]
    let method = this.connectionMethodLabel(this._deviceProtocol(device))
    if (method) parts.push(method)
    if (device.mode) parts.push(this._modeLabel(device.mode))
    return parts.join(' · ')
  }
  fetchInfo (uid){
    // Runtime devices answer over the message protocol, not os.uname() — send INFO;
    // the I,/M, reply refreshes the card (and its live sub-mode). The terminal's
    // "Device info" button calls THIS, so both behave identically.
    if (channel.runtimeUids && channel.runtimeUids.has(uid)){
      this._requestInfo(uid, 0)
      return
    }
    let cmd = rosetta.uname.cmd()

    channel.push(cmd, channel.targetDevice, ['device', '_fetchedInfo'])
  }
  // Current runtime sub-mode of a device ('run' / 'program' / 'runtime'), or
  // undefined. Used by the Blocks Play button to show Stop while a program runs.
  runtimeMode (uid){
    let mode
    this.devices.forEach((d) => { if (d.uid === uid) mode = d.mode })
    return mode
  }
  // Called by channel.js when a device is recognised as a bipes_runtime device.
  // Set a Runtime mode tag; keep the device's real name/version stable.
  markRuntime (uid){
    this._setMode(uid, 'runtime')
    this._requestInfo(uid, 0)
  }
  // Ask the runtime for its identity (I,<name>,<version>) and retry until it
  // answers — handles a target that isn't live on the first line and dropped
  // INFO/I, packets over BLE. Stops once the card has a real version.
  _requestInfo (uid, tries){
    if (channel.connections == undefined || channel.connections[uid] == undefined)
      return
    let device = null
    this.devices.forEach((d) => { if (d.uid === uid) device = d })
    let known = device && device.version &&
                device.version !== '-' && device.version !== Msg['Unknown']
    // Always send the FIRST INFO (tries 0) — even when the version is already
    // cached from a prior connect — so the device reports its live M,run/M,program
    // and the card shows the right sub-mode on reconnect. Later tries only RETRY
    // while the version is still unknown (handles dropped I, packets over BLE).
    if (tries > 0 && known)
      return
    if (tries >= 6)
      return
    try {
      command.dispatch(channel, 'rawPush', ['INFO\n', uid, [], command.tabUID])
    } catch (e) {}
    setTimeout(() => this._requestInfo(uid, tries + 1), 1000)
  }
  // Identity reported by a runtime device ("I,name,version"); show it on the card.
  updateRuntimeInfo (uid, name, version){
    command.dispatch(this, 'updateInfo',
      [uid, name || 'Pico', version || '-'], command.tabUID)
  }
  // Called by channel.js when a device returns to the REPL (program mode), e.g.
  // after a runtime program stops over serial (">>> " appears). Tag it Program
  // and refresh the real version (keeping the last-known value until it returns).
  markProgram (uid){
    this._setMode(uid, 'program')
    this.fetchInfo(uid)
  }
  // Set the Program/Runtime mode tag without touching name/version, so the card
  // identity stays stable and only the mode indicator changes on a mode switch.
  _setMode (uid, mode){
    this.devices.forEach((device) => {
      if (device.uid === uid) {
        device.mode = mode
        if (channel.targetDevice === uid)
          this.$.statusTarget.innerText = this._statusText(device)
      }
    })
    if (!this.inited)
      return
    let el = DOM.get(`[data-uid=${uid}] #mode`, this.$.devices.$)
    if (el != null)
      el.innerText = this._modeLabel(mode)
  }
  // Sub-mode reported by the runtime device ("M,run"/"M,program").
  markMode (uid, mode){
    this._setMode(uid, mode)
  }
  _modeLabel (mode){
    if (mode === 'run') return Msg['ModeRunning'] || 'Running'
    if (mode === 'program') return Msg['ModeProgramming'] || 'Programming'
    if (mode === 'runtime') return Msg['ModeRuntime'] || 'Runtime'
    if (mode === 'boot') return Msg['ModeStarting'] || 'Starting…'
    return ''
  }
  _fetchedInfo (str, cmd, tabUID){
    let reg = rosetta.uname.reg,
        reg_str = rosetta.uname.reg_str
    if (!reg.test(cmd) || !reg_str.test(str))
      return

    let match = str.match(reg_str)


    command.dispatch(this, 'updateInfo', [
      channel.targetDevice,
      match[1],
      match[2]
    ], command.tabUID)
    // Update localStorage once
    storage.set('device', JSON.stringify(this.devices))
  }
  _updateInfo (uid, nodename, version){
    this.devices.forEach((device) => {
      if (device.uid === uid) {
        device.nodename = nodename,
        device.version = version
        if (channel.targetDevice === uid)
          // Update status bar
          this.$.statusTarget.innerText = this._statusText(device)
      }
    })
    if (!this.inited)
      return

    DOM.get(`[data-uid=${uid}] #nodename`, this.$.devices.$).innerText = nodename
    DOM.get(`[data-uid=${uid}] #version`, this.$.devices.$).innerText = version
  }
  // Main instance call
  unuse (uid){
    // Update actual locaStorage, do right now to guarantee run before unload.
    this.devices.forEach((item, index) => {
      if (item.uid == uid) {
        this.devices.splice(index,1)
      }
    })
    storage.set('device', JSON.stringify(this.devices))

    // Only clear the active status if the disconnected device was active.
    if (channel.targetDevice == uid) {
      this.$.wrapper.$.classList.remove('master')
      this._statusNotConnected()
    }
    command.dispatch(this, 'unuse', [uid])
  }
  // Visual and instance object
  _unuse (uid){
    if (channel.targetDevice == uid){
      this.$.nav.$.classList.remove('using')
      this._statusNotConnected()
      channel.targetDevice = undefined
    }
    this.devices.forEach((item, index) => {
      if (item.uid == uid) {
        this.devices.splice(index,1)
      }
    })
    this._updateConnectedClass()

    if (!this.inited)
      return

    this.renderConnectedDevices()
  }
  _statusNotConnected(){
      // Update status and prompt
      this.$.statusTarget.innerText = Msg['NotConnected']
      this.$.statusTargetButton.classList.remove('on')
      prompt.off() // and prompt
  }
  unresponsive (uid){
    // Runtime devices have no REPL prompt, so the ping check never sees ">>> ";
    // don't falsely flag them as unresponsive.
    if (channel.runtimeUids && channel.runtimeUids.has(uid))
      return
    this.devices.forEach((item, index) => {
      if (item.uid == uid) {
        notification.send(Tool.format([Msg['DeviceUnresponsive'], item.nodename, item.version]))
      }
    })
  }
	/**
   * Wheck if the browser or current protocol (file:, https: and http) enables
   * the APIs.
   */
  checkAPISupport (){
    if (this.isGuestMode)
      this.$.buttonWebSocket.$.classList.add('unsupported')

    if (window.location.protocol == 'http:' && window.location.hostname != '127.0.0.1')
      this.$.buttonWebSerial.$.classList.add('unsupported'),
      this.$.buttonWebBluetooth.$.classList.add('unsupported')

    if (navigator.serial == undefined)
      this.$.buttonWebSerial.$.classList.add('unsupported')

    if (navigator.bluetooth == undefined)
      this.$.buttonWebBluetooth.$.classList.add('unsupported')
  }
}


/* Create the WebSocket setup popup */
class WebSocketSetup {
  constructor (dom, parent){
    this.mdTimestamp  // A timestamp to differentiate click and selection drag.
    // Persistent configuration.
    this.config = storage.has('WebSocketSetup') ?
      storage.fetch('WebSocketSetup', true) :
      storage.set('WebSocketSetup', {
        address: 'ws://192.168.0.35:8266',
        password: '',
        reconnect: false
      }, true)

    this.parent = parent

    let $ = this.$ = {}
    $.webSocketSetup = dom
    $.webSocketSetup.id = 'webSocketSetup'
    $.webSocketSetup.classList.add('popup')

    $.webSocketSetup.onclick(this, this.close)
      .onevent('contextmenu', this, this.close)
      .onevent('mousedown', this, (ev) => {this.mdTimestamp = +new Date()})
    $.title = new DOM('h3', {innerText:Msg['NewWebSocket']})
    $.urlLabel = new DOM('h4', {innerText:`${Msg['Address']}:`})
    $.urlInput = new DOM('input', {
      placeholder:`${Msg['DeviceAddress']}, ${Msg['eg']}. [ws/wss]://192.168.0.35:8266`,
      value:this.config.address
    }).onevent('change', this, () => {
      this.config.address = this.$.urlInput.value
      storage.set('WebSocketSetup', this.config, true)
    })
    $.passwordLabel = new DOM('h4', {innerText:`${Msg['Password']}:`})
    $.passwordInput = new DOM('input', {
      placeholder:Msg['DevicePassword'],
      type:'password',
      value:this.config.password
    }).onevent('change', this, () => {
      this.config.password = this.$.passwordInput.value
      storage.set('WebSocketSetup', this.config, true)
    })
    $.buttonConnect = new DOM('button', {
      innerText:Msg['Connect'],
      className:'icon text',
      id:'connect'
    }).onclick(this, () => {
      this.close()
      parent.connectWebSocket(this.config.address, this.config.password)
    })
    $.buttonScan = new DOM('button', {
      innerText:Msg['ScanDevices'],
      className:'icon text',
      id:'scan'
    })
    $.info = new DOM('span', {
      className:'icon text warnings',
      innerText:Msg['WSWarning']
    });


    [$.reconnectInput, $.reconnectContainer] = DOM.prototypeCheckSwitch({
      id:'reconnectWebSocket',
      className:'reconnectWebSocket',
      innerText:Msg['ReconnectOnLost']
    })

    $.reconnectContainer.onevent('click', this, (ev) => {
      ev.preventDefault()
      this.$.reconnectInput.$.checked = !this.$.reconnectInput.$.checked
      this.config.reconnect = this.$.reconnectInput.$.checked
      storage.set('WebSocketSetup', this.config, true)
    })

    $.reconnectInput.$.checked = this.config.reconnect === true ? true : false;

    $.wrapper = new DOM('div')
      .append([$.title, $.info]);
    this.webSocketScan = new WebSocketScan(this, $.wrapper)
    $.buttonScan.onclick (this, () => {
      DOM.switchState(this.webSocketScan.$.container.$)
      this.webSocketScan.$.inputPrefix.$.focus()
    })

    $.wrapper.append([
        $.reconnectContainer,
        $.urlLabel, $.urlInput,
        $.passwordLabel, $.passwordInput,
        new DOM ('div').append([
          $.buttonScan, $.buttonConnect
        ])
      ])

    $.webSocketSetup.append($.wrapper)

  }
  /**
  * Close the webSocketSetup menu.
  * @param {Object} ev - On click event, close when target is undefined or the
  *                      blank grey area.
  */
  close (ev) {
    if (ev != undefined)
      ev.preventDefault()
    if (ev == undefined || ev.target.id == 'webSocketSetup'){
      if (+new Date - this.mdTimestamp < 250 || ev == undefined){
        this.$.wrapper.style.marginTop = '110vh'
        Animate.off(this.$.webSocketSetup.$, undefined, 125)
      }
    }
  }
  /**
  * Render the webSocketSetup and open it.
  */
  open (){
    let $ = this.$
    setTimeout(() =>{
      $.wrapper.style.marginTop = window.innerWidth/16 > 40 ? '10vh' : `calc(${window.innerHeight}px - 21.5rem)`
      },125)
    setTimeout(() => {this.$.urlInput.$.focus()}, 125)
    Animate.on($.webSocketSetup.$, 125)
  }
}

/* Set up a WiFi/MQTT runtime device: collect WiFi SSID/password, mint per-device
 * MQTT credentials (POST /api/devices), and write /secrets.json to the connected
 * device over USB. WiFi password + MQTT creds live ON THE DEVICE, never in a
 * project — so sharing a project never leaks them. */
class WifiSetup {
  constructor (dom, parent){
    this.mdTimestamp
    this.parent = parent
    let $ = this.$ = {}
    $.wifiSetup = dom
    $.wifiSetup.id = 'wifiSetup'
    $.wifiSetup.classList.add('popup')
    $.wifiSetup.onclick(this, this.close)
      .onevent('contextmenu', this, this.close)
      .onevent('mousedown', this, () => {this.mdTimestamp = +new Date()})

    $.title = new DOM('h3', {innerText: Msg['SetUpWifiDevice'] || 'Set up WiFi device'})
    $.info = new DOM('span', {className:'icon text warnings',
      innerText: Msg['WifiSetupInfo'] ||
        'Connect the Pico over USB (it must be running) and enter your WiFi details. They are written to the device over serial — never into your project. USB is only for this one-time setup; the device joins WiFi on its own afterwards.'})

    $.devicesTitle = new DOM('h4', {innerText: Msg['YourWifiDevices'] || 'Your WiFi devices'})
    $.devicesList = new DOM('div', {id:'wifiDeviceList'})

    // "Add a new device" is a toggle button that reveals the credential fields.
    $.addToggle = new DOM('button', {
      innerText: Msg['AddWifiDevice'] || 'Add a new device', className:'icon text', id:'add'
    }).onclick(this, () => this._toggleAdd())
    $.ssidLabel = new DOM('h4', {innerText:(Msg['WifiName'] || 'WiFi name (SSID)') + ':'})
    $.ssidInput = new DOM('input', {placeholder:Msg['WifiName'] || 'WiFi name (SSID)'})
    $.pwLabel = new DOM('h4', {innerText:(Msg['WifiPassword'] || 'WiFi password') + ':'})
    $.pwInput = new DOM('input', {placeholder:Msg['WifiPassword'] || 'WiFi password', type:'password'})
    $.nameLabel = new DOM('h4', {innerText:(Msg['DeviceName'] || 'Device name') + ':'})
    $.nameInput = new DOM('input', {placeholder:Msg['DeviceName'] || 'Device name', value:'Pico device'})
    // Broker host the Pico connects to. Defaults to how you reached BIPES, but if
    // that's "localhost" the device can't reach it — set the server's LAN IP.
    $.hostLabel = new DOM('h4', {innerText:(Msg['BrokerHost'] || 'Broker host (server LAN IP)') + ':'})
    $.hostInput = new DOM('input', {placeholder:'192.168.x.x', value:window.location.hostname})
    $.buttonSave = new DOM('button', {
      innerText:Msg['SaveToDevice'] || 'Save to device', className:'icon text', id:'connect'
    }).onclick(this, () => this.save())
    $.addForm = new DOM('div', {className:'wifi-add-form'}).append([
      $.ssidLabel, $.ssidInput,
      $.pwLabel, $.pwInput,
      $.nameLabel, $.nameInput,
      $.hostLabel, $.hostInput,
      new DOM('div').append([$.buttonSave])
    ])
    $.addForm.$.style.display = 'none'

    $.wrapper = new DOM('div').append([
      $.title, $.info,
      $.devicesTitle, $.devicesList,
      $.addToggle, $.addForm
    ])
    $.wifiSetup.append($.wrapper)
  }

  _toggleAdd (){
    let s = this.$.addForm.$.style
    let show = s.display === 'none'
    s.display = show ? '' : 'none'
    if (show) setTimeout(() => this.$.ssidInput.$.focus(), 50)
  }

  // Session-aware fetch for the device API. When the login session expires the page
  // still shows the WiFi UI, so these calls 401 and the user got cryptic "HTTP 401"
  // errors (and could click Connect into a dead session). On 401 we tell the user and
  // send them to login, preserving theme/lang. One-shot guard so several concurrent
  // 401s don't stack notifications or fire the redirect twice.
  async _apiFetch (url, opts){
    let resp = await fetch(url, opts)
    if (resp.status === 401){
      this._sessionExpired()
      throw new Error(Msg['SessionExpired'] || 'session expired')
    }
    return resp
  }
  _sessionExpired (){
    // Shared one-shot guard with the global csrf.js 401 handler so a device-call 401
    // and the global interceptor don't both notify + redirect.
    if (window.__bipesSessionExpiredHandled)
      return
    window.__bipesSessionExpiredHandled = true
    notification.send(Msg['SessionExpired'] || 'Your session expired — please log in again.')
    let p = new URLSearchParams(window.location.search)
    let theme = p.get('theme') || 'light'
    let lang = p.get('lang') || 'en'
    setTimeout(() => {
      window.location.href = `/login?theme=${encodeURIComponent(theme)}&lang=${encodeURIComponent(lang)}`
    }, 1500)
  }

  // List provisioned WiFi devices as cards with a live online/offline dot
  // (online = the device published telemetry recently — its periodic "seen").
  async loadDevices (){
    let $ = this.$
    $.devicesList.removeChilds()
    this._cards = []          // {prefix, dot} for live online refresh
    try {
      let resp = await this._apiFetch('/api/devices', {credentials:'include'})
      if (!resp.ok) throw new Error('HTTP ' + resp.status)
      let list = (await resp.json()).devices || []
      if (!list.length){
        $.devicesList.append(new DOM('div', {className:'emptyDir',
          innerText: Msg['NoWifiDevices'] || 'No WiFi devices yet — add one below.'}))
        return
      }
      list.forEach((d) => this._renderDevice(d))
      this._refreshPresence()   // subscribe to retained presence; dots update live
    } catch (e) {
      $.devicesList.append(new DOM('div', {className:'warnings',
        innerText:(Msg['WifiListFailed'] || 'Could not load devices') + ': ' + (e.message || e)}))
    }
  }

  _renderDevice (d){
    let dot = new DOM('span', {className:'wifi-dot', innerText:'●', title:Msg['Offline'] || 'Offline'})
    // The name area is the connect affordance (no "Connect" label): clicking it
    // opens the MQTT connection, which then shows up as a normal device card in the
    // main connected-devices area — same as serial/Bluetooth.
    let nameEl = new DOM('span', {className:'wifi-device-name', innerText:d.display_name || d.device_uid,
      title:Msg['Connect'] || 'Connect'})
      .onclick(this, () => this._connectDevice(d))
    this.$.devicesList.append(
      new DOM('div', {className:'wifi-device-row'}).append([
        dot,
        nameEl,
        new DOM('button', {innerText:Msg['Remove'] || 'Remove', className:'icon text wifi-remove',
          title:Msg['Remove'] || 'Remove'})
          .onclick(this, () => this._removeDevice(d.device_uid))
      ])
    )
    this._cards.push({prefix:d.mqtt_topic_prefix, dot})
  }

  /** Mint (and cache) short-lived, session-scoped MQTT creds for the browser.
   *  Cached because each mint rotates the password and would drop earlier
   *  MQTT connections in this same browser. */
  async _browserMqttCreds (){
    if (this._browserCreds)
      return this._browserCreds
    let resp = await this._apiFetch('/api/devices/browser-credentials', {
      method:'POST', credentials:'include',
      headers:{'Content-Type':'application/json'}, body:'{}'
    })
    if (!resp.ok) throw new Error('HTTP ' + resp.status)
    let j = await resp.json()
    if (!j.success) throw new Error(j.error || 'credentials error')
    this._browserCreds = j
    return j
  }

  /** Connect to a WiFi device over MQTT-on-WebSocket. It then shows up as a normal
   *  connected device (dashboard/terminal target it like serial/BLE). */
  async _connectDevice (d){
    let prefix = d.mqtt_topic_prefix
    let already = Object.values(channel.connections).some(
      (c) => c.current && c.current.name === 'WebMqtt' && c.current.prefix === prefix)
    if (already){
      notification.send((d.display_name || d.device_uid) + ': ' + (Msg['AlreadyConnected'] || 'already connected'))
      return
    }
    try {
      let creds = await this._browserMqttCreds()
      // Pass [Device, Device.use] as the connect callback — the SAME one serial and
      // Bluetooth use — so on connect it flows through use()/_devicePush and renders
      // as a normal device card in the main connected-devices area.
      channel.connect('webmqtt', [this.parent, this.parent.use], {
        prefix: prefix,
        username: creds.mqtt_username,
        password: creds.mqtt_password,
        displayName: d.display_name || d.device_uid,
        deviceUid: d.device_uid
      })
      notification.send((Msg['Connecting'] || 'Connecting to') + ' ' + (d.display_name || d.device_uid) + ' …')
      this.close()        // reveal the device card behind the dialog
    } catch (e) {
      notification.send((Msg['WifiSaveFailed'] || 'Could not connect') + ': ' + (e.message || e))
    }
  }

  // Online presence over MQTT: each device publishes a RETAINED telemetry/online
  // (1 on connect, 0 via last-will on drop). We subscribe once to the session-wide
  // wildcard; the broker delivers the retained value immediately, so dots reflect
  // live state with no DB writes and no HTTP polling.
  async _refreshPresence (){
    try {
      if (typeof Paho == 'undefined' || !Paho.MQTT) return
      let creds = await this._browserMqttCreds()
      let topic = creds.session + '/devices/+/telemetry/online'
      if (this._presence && this._presence.isConnected()) {
        try { this._presence.subscribe(topic) } catch (e) {}   // re-deliver retained
        return
      }
      let ssl = window.location.protocol === 'https:'
      let port = window.location.port ? Number(window.location.port) : (ssl ? 443 : 80)
      let cli = new Paho.MQTT.Client(window.location.hostname, port, '/wss',
        'bipes-presence-' + Math.random().toString(16).slice(2))
      this._presence = cli
      cli.onMessageArrived = (m) => this._onPresence(m.destinationName, m.payloadString)
      cli.onConnectionLost = () => {}
      cli.connect({
        useSSL: ssl, userName: creds.mqtt_username, password: creds.mqtt_password,
        onSuccess: () => { try { cli.subscribe(topic) } catch (e) {} },
        onFailure: () => {}
      })
    } catch (e) {}
  }
  _onPresence (topic, payload){
    let online = String(payload) === '1'
    ;(this._cards || []).forEach((c) => {
      if (topic === c.prefix + '/telemetry/online'){
        c.dot.$.style.color = online ? '#3c3' : '#999'
        c.dot.$.title = online ? (Msg['Online'] || 'Online') : (Msg['Offline'] || 'Offline')
      }
    })
  }
  _presenceDisconnect (){
    try { if (this._presence && this._presence.isConnected()) this._presence.disconnect() } catch (e) {}
    this._presence = undefined
  }

  async _removeDevice (uid){
    try {
      let resp = await this._apiFetch('/api/devices/' + uid, {method:'DELETE', credentials:'include'})
      if (!resp.ok) throw new Error('HTTP ' + resp.status)
      notification.send(Msg['WifiDeviceRemoved'] || 'Device removed')
      this.loadDevices()
    } catch (e) {
      notification.send((Msg['WifiSaveFailed'] || 'Could not remove device') + ': ' + (e.message || e))
    }
  }

  async save (){
    let $ = this.$
    let ssid = $.ssidInput.$.value.trim()
    let pw = $.pwInput.$.value
    let name = $.nameInput.$.value.trim() || 'Pico device'
    let host = $.hostInput.$.value.trim() || window.location.hostname
    if (!ssid){ notification.send(Msg['WifiNeedSsid'] || 'Enter the WiFi name (SSID).'); return }
    if (host === 'localhost' || host === '127.0.0.1'){
      notification.send(Msg['BrokerHostLocal'] ||
        'Broker host is localhost — the Pico cannot reach that. Set the server\'s LAN IP.'); return
    }
    if (!/^[A-Za-z0-9.\-]+$/.test(host) || host.indexOf('..') !== -1 || /^[.\-]|[.\-]$/.test(host)){
      notification.send((Msg['BrokerHostInvalid'] || 'Broker host looks invalid') + ': "' + host + '"'); return
    }
    if (channel.targetDevice == undefined || !channel.hasConnection(channel.targetDevice)){
      notification.send(Msg['ConnectUsbFirst'] || 'Connect the device over USB first.'); return
    }
    let uid = channel.targetDevice
    try {
      // Mint per-device MQTT credentials; the server fills in the session + topic
      // prefix (browser never sees the broker admin creds).
      let resp = await this._apiFetch('/api/devices', {
        method:'POST', credentials:'include',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({display_name:name})
      })
      if (!resp.ok) throw new Error('HTTP ' + resp.status)
      let d = (await resp.json()).device
      let secrets = {
        wifi:{ssid:ssid, pw:pw},
        mqtt:{host:host, port:1884,
              user:d.mqtt_username, password:d.mqtt_password, prefix:d.mqtt_topic_prefix}
      }
      let json = JSON.stringify(secrets)
      // Write /secrets.json as a DEVICE file (never the project). Two cases:
      //  - runtime running over serial -> use the message PUT;
      //  - at the >>> REPL (most setup) -> a chunked f.write() paste, like the Files
      //    page (a raw PUT line at the REPL would be a SyntaxError).
      if (channel.runtimeUids && channel.runtimeUids.has(uid)) {
        command.dispatch(channel, 'rawPush',
          ['PUT,/secrets.json\n' + json + '__END__\n', uid, [], command.tabUID])
      } else {
        let esc = (s) => s
          .replaceAll(/\\/g, '\\\\').replaceAll(/(\r\n|\r|\n)/g, '\\r')
          .replaceAll(/'/g, "\\'").replaceAll(/"/g, '\\"')
        let CH = 256, lines = ['f=open("/secrets.json",\'w\')']
        for (let i = 0; i < json.length; i += CH)
          lines.push("_=f.write('" + esc(json.slice(i, i + CH)) + "')")
        lines.push('f.close()')
        command.dispatch(channel, 'push',
          [channel.pasteMode(lines.join('\n') + '\n'), uid, [], command.tabUID])
      }
      notification.send((Msg['WifiSaved'] ||
        'WiFi set up on the device. Reboot it and run "Start program over WiFi".') + ' [' + d.device_uid + ']')
      this.loadDevices()
    } catch (e) {
      notification.send((Msg['WifiSaveFailed'] || 'Could not set up WiFi device') + ': ' + (e.message || e))
    }
  }

  close (ev){
    if (ev != undefined) ev.preventDefault()
    if (ev == undefined || ev.target.id == 'wifiSetup'){
      if (+new Date - this.mdTimestamp < 250 || ev == undefined){
        this._presenceDisconnect()     // stop the live MQTT presence subscription
        this.$.wrapper.style.marginTop = '110vh'
        Animate.off(this.$.wifiSetup.$, undefined, 125)
      }
    }
  }

  open (){
    let $ = this.$
    // loadDevices() renders the cards then subscribes to retained MQTT presence
    // (telemetry/online); dots update live with no polling.
    this.loadDevices()
    setTimeout(() => {
      $.wrapper.style.marginTop = window.innerWidth/16 > 40 ? '10vh' : `calc(${window.innerHeight}px - 21.5rem)`
    }, 125)
    Animate.on($.wifiSetup.$, 125)
  }
}

/* Scan network for devices acessible through WebSocket */
class WebSocketScan {
  /*
   * Construct class with parent class and target to insert
   * @param {Object} parent - Parent class.
   * @param {Object} dom - target to insert the device scanner.
   */
  constructor (parent, dom) {
    this.parent = parent
    this.last = 255             // Last valid id
    this.multiplier = 0         // protocol*prefix*port
    this.count = 0              // Increment for every error or connect
    this.found = 0              // How many have been found.
    this.scanning = false       // Is currently scanning?
    this.done = false           // Should be done already? (Some IPs hangs)

    let $ = this.$ = {}
    $.label = new DOM('h4', {
      innerText:Msg['ScanPattern']
    })
    $.inputProtocol = new DOM('input', {
      value: 'ws',
      placeholder: 'xx'
    })
    $.inputPrefix = new DOM('input', {
      value: '192.168.0',
      placeholder: '000.000.0'
    })
    $.inputPort = new DOM('input', {
      value: '8266,8261',
      placeholder: '0000'
    })
    $.buttonScan = new DOM('button', {
      innerText:Msg['StartScan'],
      className:'noicon text',
      id:'scan'
      }).onclick(this, this.scan)
    $.container = new DOM('div', {id:'addressConf'})
      .append([$.label,
        new DOM('div').append([
          $.inputProtocol, new DOM('span', {innerText:'://'}),
          $.inputPrefix, new DOM('span', {innerText:'.0/24:'}),
          $.inputPort,
        ]),
        $.buttonScan
    ])
    $.status = new DOM('div')
    $.found = new DOM('div', {className:'listy'})
    $.addressFound = new DOM('div', {id:'addressFound'}).append([
      $.status, $.found
    ])
    dom.append([
      $.container,
      $.addressFound
    ])
  }
  /*
   * Start network scan.
   */
  scan (){
    if (this.scanning)
      return

    this.done = false

    this.$.container.$.classList.remove('on')
    this.$.addressFound.$.classList.add('on')
    let $ = this.$
    let protocol = $.inputProtocol.$.value.replaceAll(' ','').split(','),
        prefix = $.inputPrefix.$.value.replaceAll(' ','').split(','),
        ports = $.inputPort.$.value.replaceAll(' ','').split(','),
        last = 0

    if (!protocol.every(this._checkIPAddress)) {
      notification.send(`${Msg['PageDevice']}: ${Msg['InvalidPrefix']}.`)
      return
    }
    this.multiplier = protocol.length * prefix.length * ports.length
    this.scanning = true
    this.clear()
    protocol.forEach (pro => {
      prefix.forEach (pre => {
        ports.forEach (por => {
          for (let i = 1; i <= this.last; i++) {
            let addr = `${pro}://${pre}.${i}:${por}`
            let ws = new WebSocket(addr)
            ws.start = performance.now
            ws.port = por
            ws.onerror = () => {
              this.progress()
            }
            ws.onopen = () => {
              this.include(ws.url)
              this.progress()
              ws.close()
            }
          }
        })
      })
    })
  }
  /*
   * Update process status.
   */
  progress (){
    if (this.done)
      return
    this.$.status.$.innerText = Tool.format([Msg['ScanningInfo'],this.count, this.last*this.multiplier, this.found])

    if (this.count + 1 == (this.last * this.multiplier)){
      this.$.status.$.innerText = Tool.format([Msg['DoneScanning'],this.last*this.multiplier,this.found])
      this.done = true
      this.scanning = false
      this.multiplier = 0
      this.count = 0
      this.found = 0
    }
    this.count++
  }
  /*
   * Include found url to the list.
   * @param{string} url - Reachable url.
   */
  include (url){
    this.found++
    url = url.substring(0, url.length - 1)
    this.$.found.append(
      new DOM('button', {
        className:'noicon text'
      }).append([new DOM('div', {innerText:url})])
        .onclick(this, this.apply, [url])
    )
  }
  /*
   * Apply url to WebSocket setup.
   * @param{string} url - Reachable url to apply.
   */
  apply (url){
    this.parent.$.urlInput.$.value = url
    this.parent.$.passwordInput.$.focus()
  }
  /*
   * Clear previous urls.
   */
  clear (){
    this.$.found.removeChilds()
  }
  /*
   * Apply url to WebSocket setup.
   */
  _checkIPAddress (ipaddress){
    if (/^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(ipaddress))
      return (false)
    return (true)
  }
}

export let device = new Device()
