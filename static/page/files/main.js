"use strict";

import {DOM, ContextMenu, Animate} from '../../base/dom.js'
import {Tool} from '../../base/tool.js'
import {command} from '../../base/command.js'
import {rosetta} from '../../base/rosetta.js'
import {channel} from '../../base/channel.js'

import {notification} from '../notification/main.js'
import {prompt} from '../prompt/main.js'
import {project} from '../project/main.js'

// True when the active device speaks the bipes_runtime message protocol.
function isRuntime () {
  // Route file ops through the bipes_runtime message protocol ONLY on transports
  // that have no REPL — Bluetooth and WiFi/MQTT. Over serial the device is a normal
  // REPL, so programming and file management use the classic REPL path (and only the
  // dashboard reads the runtime telemetry). Serial: REPL for files; BLE/MQTT: messages.
  let c = channel.connections && channel.connections[channel.targetDevice]
  return !!(c && /bluetooth|mqtt/i.test(c.currentProtocol || ''))
}

// File operations over the bipes_runtime message protocol (LS/GET/PUT/DEL/RUN),
// for devices that aren't a REPL (e.g. running over Bluetooth). Each returns a
// Promise; responses are captured via channel.subscribeText. The device emits
// each response atomically, so telemetry can't interleave a GET body.
const runtimeFiles = {
  _send (line) {
    command.dispatch(channel, 'rawPush', [line, channel.targetDevice, [], command.tabUID])
  },
  // Resolve when a response line satisfies parse(line) (non-null); reject on timeout.
  // Accumulates across chunks and only parses COMPLETE (newline-terminated) lines —
  // over Bluetooth a reply like "L,a.py,b.py,...\n" is split across 20-byte
  // notifications, so parsing each chunk on its own would match a truncated line.
  _expect (parse, timeoutMs) {
    return new Promise((resolve, reject) => {
      let done = false, buf = ''
      let unsub = channel.subscribeText((chunk) => {
        buf += String(chunk)
        let nl
        while ((nl = buf.search(/[\r\n]/)) >= 0) {
          let ln = buf.slice(0, nl).trim()
          buf = buf.slice(nl + 1)
          let r = parse(ln)
          if (r !== undefined && r !== null) { finish(); resolve(r); return }
        }
      })
      let timer = setTimeout(() => { if (!done) { finish(); reject(new Error('timeout')) } }, timeoutMs || 8000)
      function finish () { done = true; try { unsub() } catch (e) {}; clearTimeout(timer) }
    })
  },
  ls () {
    let p = this._expect((ln) => ln.indexOf('L,') === 0 ? ln.slice(2).split(',').filter(s => s.length) : null, 6000)
    this._send('LS\n')
    return p
  },
  get (name) {
    // Collect the raw body between the "G,<name>" header and "__END__".
    return new Promise((resolve, reject) => {
      let acc = '', done = false
      let unsub = channel.subscribeText((chunk) => {
        acc += String(chunk)
        let si = acc.indexOf('G,' + name)
        if (si < 0) return
        let bodyStart = acc.indexOf('\n', si)
        if (bodyStart < 0) return
        let ei = acc.indexOf('__END__', bodyStart)
        if (ei < 0) return
        finish(); resolve(acc.slice(bodyStart + 1, ei))
      })
      let timer = setTimeout(() => { if (!done) { finish(); reject(new Error('timeout')) } }, 12000)
      function finish () { done = true; try { unsub() } catch (e) {}; clearTimeout(timer) }
      this._send('GET,' + name + '\n')
    })
  },
  put (name, content) {
    // 30 s: a device that just rebooted may still be joining WiFi (a blocking step)
    // when the PUT arrives, so it can't ACK until the join finishes.
    let p = this._expect((ln) => ln.indexOf('ACK,PUT_DONE') === 0 ? true : null, 30000)
    this._send('PUT,' + name + '\n' + content + '__END__\n')
    return p
  },
  del (name) {
    let p = this._expect((ln) => ln.indexOf('ACK,DEL') === 0 ? true : null, 6000)
    this._send('DEL,' + name + '\n')
    return p
  },
  run () {
    this._send('RUN\n')
  },
  stop () {
    // STOP -> program mode. Idempotent: the runtime ACKs STOP even when already
    // stopped, so this is safe to call whether the device is running or stopped.
    // 30 s: a freshly rebooted device may be mid-WiFi-join (blocking) and can't ACK
    // until that finishes.
    let p = this._expect((ln) => ln.indexOf('ACK,STOP') === 0 ? true : null, 30000)
    this._send('STOP\n')
    return p
  }
}

class Files {
  constructor (){
    this.name = 'files'

    let $ = this.$ = {}

    $.section = new DOM(DOM.get('section#files'))

    $.sidebar = new DOM('div', {id:'sidebar'})
    $.pane = new DOM('div', {id:'pane'})
      .append([
        new DOM('div', {
          className:'header',
          innerText:Msg['FileManager']
          }),
        $.sidebar
      ])


    $.filename = new DOM('input', {
      id:'filename',
      autocomplete:'off',
      placeholder:Msg['Filename']}
    ).onchange(this, () => {
      let _$ = $.filename.$
      let str = _$.value
      str = str [0] != '/' && str.length > 1 ?
                   '/' + str : str
      str += str.indexOf('.') == -1 ? '.py' : ''
      str = str
      _$.value = str
      document.title = `${str} - BIPES`
    })


    $.codemirror = new DOM('div', {id:'codemirror'})

    $.header = new DOM('div', {id:'header'}).append([
          new DOM('button', {
            id:'hidePane',
            title:Msg['HideShowProjectTree']
          }).onclick(this, () => {
            DOM.switchState($.section.$, 'hidePane')
          }),
          $.filename
        ])
    $.editor = new DOM('div', {id:'editor'})
      .append([
        $.header,
        $.codemirror
        ])

    $.container = new DOM('div', {className:'container'})
      .append([$.pane, $.editor])

    $.section.append([$.container])

    this.project = new ProjectFiles(this)
    this.device = new DeviceFiles(this)

    // Codemirror
    this.codemirror = CodeMirror($.codemirror.$, Tool.fromUrl('theme'))
    /* ::TODO:: Include more functionalities before replacing browser default.
    $.contextMenu = new DOM('div')
    this.contextMenu = new ContextMenu($.contextMenu, this)
    $.section.append($.contextMenu)

    $.codemirror.onevent('contextmenu', this, this.showContextMenu)
    */
  }
  init (){
    if (this.inited)
      return

    this.project.init()
    this.inited = true
  }
  deinit (){
    if (!this.inited)
      return

    this.project.deinit()
    this.inited = false
  }
  load (obj){
    if (obj.hasOwnProperty('tree'))
      this.project.load(obj)
  }
  /**
    * Create this page empty object
    * @return {Object} This page scope in the project file.
    */
  empty (){
    return {
      tree:{
        name:'',
        files:[{
          name:`${Msg['my_script']}.py`,
          script:Tool.format([Msg['CreateScriptHere'],`${Msg['my_script']}.py`])
        }]
      }
    }
  }
  /** Create a context menu for codemirror [::TODO:: Limited, keeping browser default]*/
  /*showContextMenu (ev){
    let str = '',
        doc = this.codemirror.state.doc.toString()
    for (const range of this.codemirror.state.selection.ranges){
      str += doc.substring(range.from, range.to)
    }
    this.contextMenu.open([
    {
      id:'copy',
      innerText:Msg['Copy'],
      fun:() => {
        if (str != '')
	        navigator.clipboard.writeText(str)
	      this.contextMenu.close()
      }
    }
    ], ev)
  }*/
}

class DeviceFiles {
  constructor (parent){
    this.parent = parent
    this.dom = {}

    this.name = "device"

    this.fileOnTarget = [{name:'', files:[]}] // Files stored on target device, default depth 1 (root)

    // Miscellaneous variables to get/put through WebSocket
    this.arrayBufferFile = new Uint8Array(0) // Temporaly store incoming files comming as buffer
    this.arrayBufferFilename                 // Temporaly store file filename
    this.arrayBufferTarget                   // After fetch, download or show
    this.arrayBufferPos                      // Position on the current file being sent
    this.runAfterWriteFilename = null        // Filename to execute after upload finishes

    let $ = this.$ = {}

    $.contextMenu = new DOM('div')
    this.contextMenu = new ContextMenu($.contextMenu, this)
    this.parent.$.section.append($.contextMenu)

    $.fileOnTarget = new DOM('span')
    $.detailsFileOnTarget = DOM.prototypeDetails({
      id:'fileOnTarget',
      innerText: Msg['DeviceFiles'],
      onevent: [{
        event:'click',
        self:this,
        fun:this.listDir,
        args:['/', undefined]
      }, {
        event:'contextmenu',
        fun: (path, dom, ev) => {
          ev.preventDefault()
          this.contextMenu.open([
            {
              id:'add',
              innerText:Msg['NewFolder'],
              fun:this.newFolder,
              args:[path]
            }, {
              id:'script',
              innerText:Msg['NewFile'],
              fun:this.newScript,
              args:[path]
            }, {
              id:'upload',
              accept:'.py,.csv,.md',
              innerText:Msg['UploadFile'],
              fun:this.uploadFile,
              args:[path]
            }
          ], ev)
        },
        args:['/']
      }]
    })
    .append($.fileOnTarget)

    $.saveToTarget = new DOM('button', {
      id:'upload',
      className:'icon text',
      innerText:Msg['Write'],
      title:Msg['WriteToDevice']
    }).onclick(this, this._fromEditor)

    $.executeOnTarget = new DOM('button', {
      id:'run',
      className:'icon',
      title:Msg['ExecuteScript']
    }).onclick(this, this._execEditorOnTarget)
    // Reflect the device's run state on the button: '.on' swaps the play icon to a
    // stop icon while a program runs; '.busy' locks it during a reboot — same read as
    // the dashboard/Blocks Run button.
    setInterval(() => {
      try {
        $.executeOnTarget.$.classList.toggle('on', this._deviceRunning() || this._deviceBooting())
        $.executeOnTarget.$.classList.toggle('busy', this._deviceBooting())
      } catch (e) {}
    }, 250)

    this.parent.$.sidebar.append($.detailsFileOnTarget)
    this.parent.$.header.append([$.saveToTarget, $.executeOnTarget])

    command.add([this.parent, this], {
      buildFileTree: this._buildTargetFileTree,
      editorSetValue: this._editorSetValue,
      downloadValue: this._downloadValue,
      // miscellanious WebSocket file handling (run on master)
      getFileArrayBuffer: this._getFileArrayBuffer,
      gotFileArrayBuffer: this.__gotFileArrayBuffer,
      putFileArrayBuffer: this._putFileArrayBuffer,
      putFileArrayBufferEnd: this.__putFileArrayBufferEnd,
    })
  }

  listDir (path, tabUID, dom, ev) {
    // A click on the <summary> lands here. Every branch below preventDefaults,
    // which cancels the native <details> open/close — so we drive it ourselves.
    // (Without this, "Device files" never expanded: fileOnTarget was exempted
    // from the old toggle logic and dom.open was never set.)
    if (dom != undefined && ev != undefined) {
      ev.preventDefault()
      dom.open = !dom.open
      if (!dom.open)        // collapsing -> nothing to list
        return
      // expanding -> fall through and fetch this directory's contents
    }
    if (this._serialRuntimeRunning()) {   // serial: list at the REPL (classic path)
      this._quitToRepl().then(() => this.listDir(path, tabUID))
      return
    }
    if (isRuntime()) {
      // Runtime device: flat root listing over the message protocol (no REPL,
      // no recursion). Stops the REPL "WITH OPEN(...)" spam on these devices.
      let tab = tabUID == undefined ? command.tabUID : tabUID
      // File operations require program mode (a quiet channel) — stop the program
      // first if it's running, so telemetry can't corrupt the listing.
      this.ensureProgramMode().then(() => runtimeFiles.ls()).then((names) => {
        // Device tree builder expects a depth-1 root: [{name:'', files:[...]}].
        let entries = names.length ? names.map((n) => ({name: n})) : [{empty: true}]
        this.fileOnTarget = [{name: '', files: entries}]
        command.dispatch([this.parent, this], 'buildFileTree', [this.fileOnTarget, [""], tab])
      }).catch((e) => {
        notification.send(`${Msg['PageFiles']}: ${e.message || e}`)
      })
      return
    }

    path = (path == undefined) ? '/' : path
    let cmd = rosetta.ls.cmd(path)
    command.dispatch(channel, 'push', [
      cmd,
      channel.targetDevice,
      ['files', 'device', '_fetchRecursive'],
      tabUID == undefined ? command.tabUID : tabUID
    ])
  }
  _fetchRecursive (str, cmd, tabUID) {
    let reg_cmd = rosetta.ls.reg
    if (!reg_cmd.test(cmd)){
      console.error('Files: Incorrect command structure on _FetchRecursive')
      return true
    }
    cmd = cmd.match(reg_cmd)[1]

    let map = cmd == '/' ? [""] : cmd.split('/'),
        ref = this.fileOnTarget,
        found = new Array(map.length).fill(false)

    map.forEach ((m, i) => {
      ref.every(p => {
        if (p.name == m){
          found[i] = true
          ref = p.files
          return false
        }
        return true
      })
    })
    if (found.includes(false)){
      console.error(`${Msg['PageFiles']}: ${Msg['DirectoriesNotExistMapped']}`)
      return true
    }
    ref.length = 0 // clear reference pointer to update with files

    let reg = /(['])(?:(?=(\\?))\2.)*?\1/g
    let matches = str.match(reg)
    if (matches != null) {
      matches = matches.map(str => str.replaceAll("'",""))
      matches.forEach ((match) => {
        if(match.match(/\./) == null) {
          ref.push({
            name:match,
            files:[]
          })
        } else
          ref.push({name:match})
      })
    } else
        ref.push({empty:true})

    command.dispatch([this.parent, this], 'buildFileTree', [this.fileOnTarget, map, tabUID])
  }
  /**
   * Build the file tree
   * @param{object} fileOnTarget - DOM node of the file tree
   * @param{object} map - Array path to a directory
   * @param{string} tabUID - UID from the requesting tab
   */
  _buildTargetFileTree (fileOnTarget, map, tabUID) {
    this.fileOnTarget = fileOnTarget

    if (tabUID != command.tabUID)
      return

    let _iterate = (obj, dom, path) => {
      let doms = []
      obj.forEach(item => {
        if (item.files != undefined) {
          path.push(item.name)
          doms.push(
            DOM.prototypeDetails({
              id:`path_${path.join('_')}`,
              innerText: item.name,
              onevent: [
              {
                event:'click',
                self:this,
                fun:this.listDir,
                args:[`/${path.join('/')}`, undefined]
              }, {
                event:'contextmenu',
                fun: (path, dom, ev) => {
                  ev.preventDefault()
                  this.contextMenu.open([
                    {
                      id:'add',
                      innerText:Msg['NewFolder'],
                      fun:this.newFolder,
                      args:[path]
                    }, {
                      id:'script',
                      innerText:Msg['NewFile'],
                      fun:this.newScript,
                      args:[path]
                    }, {
                      id:'upload',
                      innerText:Msg['UploadFile'],
                      fun:this.uploadFile,
                      args:[path]
                    }, {
                      id:'remove',
                      innerText:Msg['RemoveFolder'],
                      fun:this.remove,
                      args:[path]
                    }
                  ], ev)
                },
                args:[`/${path.join('/')}`]
              }]
            })
          )
          if (item.files.length > 0) {
            doms[doms.length - 1].$.open = true
            if (item.files[0].hasOwnProperty('empty')) {
              doms[doms.length - 1].$.open = true
              doms[doms.length - 1].append(
                new DOM('span', {innerText:`(${Msg['Empty']})`, className:'emptyDir'})
              )
            } else
            _iterate (item.files, doms[doms.length - 1], path)
          }
          path.pop()
        } else {
          let _path = path.length == 0 ? '' : `/${path.join('/')}`

          doms.push(item.dom = new DOM('button',{
              innerText:item.name,
              className:'listedFile'
            })
            .onclick(this, () => {this.fetchFile('editor', `${_path}/${item.name}`)})
            .onevent('contextmenu', this, (ev) => {
              ev.preventDefault()
              this.contextMenu.open([
                {
                  id:'run',
                  innerText:Msg['ExecuteScript'],
                  fun:this.runOnTarget,
                  args:[`${_path}/${item.name}`]
                }, {
                  id:'download',
                  innerText:Msg['Download'],
                  fun:this.download,
                  args:[`${_path}/${item.name}`]
                }, {
                  id:'remove',
                  innerText:Msg['Remove'],
                  fun:this.remove,
                  args:[`${_path}/${item.name}`]
                },
              ], ev)
            })
          )
        }
      })

      dom.append(doms)

      return
    },
    path = []

    this.$.fileOnTarget.removeChilds()
    _iterate(this.fileOnTarget[0].files, this.$.fileOnTarget,path)

    this.$.detailsFileOnTarget.$.open = true
  }
  /**
   * Fetch file from a device
   * @param{string} target - Target device uid
   * @param{string} filename - Path to file, eg. /libs/my_lib.py
   */
  fetchFile (target, filename) {
    if (this._serialRuntimeRunning()) {   // serial: read at the REPL (classic path)
      this._quitToRepl().then(() => this.fetchFile(target, filename))
      return
    }
    if (isRuntime()) {
      // Program mode for a clean read (telemetry would otherwise interleave into the
      // file body and corrupt it).
      this.ensureProgramMode().then(() => runtimeFiles.get(filename)).then((content) => {
        command.dispatch([this.parent, this],
          target == 'editor' ? 'editorSetValue' : 'downloadValue',
          [filename, content, command.tabUID])
      }).catch((e) => notification.send(`${Msg['PageFiles']}: ${e.message || e}`))
      return
    }
    switch (channel.currentProtocol) {
      case 'WebSocket':
        command.dispatch([this.parent, this], 'getFileArrayBuffer', [
          filename,
          target,
          command.tabUID,
          channel.targetDevice
        ])
        break
      case 'WebSerial':
      case 'WebBluetooth':
        let cmd1 = rosetta.preopen.cmd(filename),
            cmd2 = channel.pasteMode(
              rosetta.open.cmd(filename)
            )

        command.dispatch(channel, 'push', [
          cmd1,
          channel.targetDevice,
          []
        ])
        command.dispatch(channel, 'push', [
          cmd2,
          channel.targetDevice,
          ['files', 'device', target == 'editor' ? '_fetchFileToEditor' : '_fetchFileToDownload'],
          command.tabUID
        ])
        break
    }
  }
  _getFileArrayBuffer (filename, target, tabUID, targetDevice){
    if (channel.current == undefined || channel.targetDevice != targetDevice)
      return
    if (this.arrayBufferFile.length !== 0){
      console.error('Files: another hexastream is running')
      return
    }
    // get request
    let rec1 = new Uint8Array(2 + 1 + 1 + 8 + 4 + 2 + 64)
    rec1[0] = 'W'.charCodeAt(0) // 87 (retruns 87)
    rec1[1] = 'A'.charCodeAt(0) // 65 (returns 66)
    rec1[2] = 2 // get
    rec1[16] = filename.length & 0xff
    rec1[17] = (filename.length >> 8) & 0xff
    for (let i = 0; i < filename.length && i < 64; i++)
      rec1[18 + i] = filename.charCodeAt(i)

    command.dispatch(channel, 'push', [
      rec1,
      channel.targetDevice,
      ['files', 'device', '__checkHexaGet'],
      tabUID
    ])

    this.arrayBufferTarget = target == 'editor' ? 'editor' : 'download'
    this.arrayBufferFilename = filename
  }


  __checkHexaGet (uint8, cmd, tabUID){
    if (uint8[0] == cmd[0] && uint8[1] == cmd[1] + 1) {
      // clear any other
      this.arrayBufferFile = new Uint8Array(0)
      console.log('Files: Got get match')
      // confirm get
      let rec2 = new Uint8Array([0x00])
      command.dispatch(channel, 'push', [
        rec2,
        channel.targetDevice,
        ['files', 'device', '__checkFileGet'],
        tabUID
      ])
    }
  }
  __checkFileGet (uint8, cmd, tabUID){
    if (cmd[0] == 0x03) {
      console.log('Files: Got file!')
      let str = new TextDecoder().decode(this.arrayBufferFile)
      // Converts MicroPython output \r into unix new line \n and 4 spaces to \t
      let script = str,
          filename = this.arrayBufferFilename,
          then = this.arrayBufferTarget

      command.dispatch([this.parent, this], 'gotFileArrayBuffer', [filename, str, then, tabUID])
      // End request, clear variables
      this.arrayBufferTarget = undefined
      this.arrayBufferFilename = undefined
      this.arrayBufferFile = new Uint8Array(0)
    } else {
      // concatanate array
      let ar = new Uint8Array(uint8.length - 2 + this.arrayBufferFile.length)
      ar.set(this.arrayBufferFile)
      ar.set(uint8.slice(2), this.arrayBufferFile.length)
      this.arrayBufferFile = ar
      // continue get
      let rec2 = new Uint8Array([0x00])
      command.dispatch(channel, 'push', [
        rec2,
        channel.targetDevice,
        ['files', 'device', '__checkFileGet'],
        tabUID
      ])
    }
  }
  __gotFileArrayBuffer (filename, script, then, tabUID){
    if (command.tabUID != tabUID)
      return
    if (then == 'editor')
      this._editorSetValue(filename, script, tabUID)
    else if (then == 'download')
      this._downloadValue(filename, script, tabUID)
  }

  _fetchFileToEditor (str, cmd, tabUID){
    this._fetchFile ('editor', str, cmd, tabUID)
  }
  _fetchFileToDownload (str, cmd, tabUID){
    this._fetchFile ('download', str, cmd, tabUID)
  }
  _fetchFile (then, str, cmd, tabUID){
    // Get filename from cmd
    let filename = cmd.match(rosetta.open.reg)
    if (filename != null)
      filename = filename [1]
    else {
      console.error('Files: Could not fetch requested filename')
      return
    }

    // Converts MicroPython output \r into unix new line \n and 4 spaces to \t
    let script = str.substring(2)

    if (then == 'editor')
      command.dispatch([this.parent, this], 'editorSetValue', [filename, script, tabUID])
    else if (then == 'download')
      command.dispatch([this.parent, this], 'downloadValue', [filename, script, tabUID])
  }
  _editorSetValue (filename, script, tabUID){
    if (command.tabUID != tabUID)
      return

    this.parent.$.filename.$.value = filename
    this.parent.codemirror.dispatch({
      changes: {from:0, to:this.parent.codemirror.state.doc.length, insert:script}
    })
    document.title = `${filename} - BIPES`
  }
  /*
   * Download fetched file.
   * @param{string} filename - filename
   * @param{string} script - file to download
   * @param{string} tabUID - target tab UID
   */
  _downloadValue = (filename, script, tabUID) => {
    if (command.tabUID != tabUID)
      return
    DOM.prototypeDownload(filename.substring(1), script)
  }
  /**
   * Get file from ``codemirror`` editor and calls :js:func:`Files.writeToTarget` to upload.
   */
  _fromEditor (){
    //For codemirror
      let script = this.parent.codemirror.state.doc.toString(),
        filename = this.editorFilename()
    //let uint8Array = new Uint8Array([...script].map(s => s.charCodeAt(0)))

    this.writeToTarget (filename, script)
  }
  editorFilename (){
    let filename = this.parent.$.filename.$.value || ''
    filename = filename.trim()
    if (filename && filename[0] != '/')
      filename = '/' + filename
    if (filename && filename.indexOf('.') == -1)
      filename += '.py'
    this.parent.$.filename.$.value = filename
    return filename
  }
  /**
   * Execute the current editor contents on the active target device.
   */
  _execEditorOnTarget (){
    if (channel.targetDevice == undefined) {
      notification.send(Msg["NotConnectedWarning"])
      return
    }

    if (prompt.locked) {
      command.dispatch(channel, 'rawPush', [
        '\x03',
        channel.targetDevice, [], command.tabUID
      ])
      return
    }

    let script = this.parent.codemirror.state.doc.toString()
    let filename = this.editorFilename()
    if (!filename) {
      notification.send(`${Msg['PageFiles']}: ${Msg['Filename']}`)
      return
    }

    this.runAfterWriteFilename = filename
    this.writeToTarget(filename, script)
  }
  _ranEditorOnTarget (str, cmd, tabUID){
    if (command.tabUID != tabUID)
      return

    this.runAfterWriteFilename = null
    notification.send(`${Msg['PageFiles']}: ${Msg['ScriptFinishedExecuting']}`)
  }
  /**
   * The mode guard for ALL file operations (list, open, save, delete, install
   * library, deploy blocks). File work only happens in program mode — a quiet file
   * server. If the program is running we STOP it first (and wait until the device has
   * actually reached program mode, so the op isn't sent during the run->program switch
   * and lost/corrupted). No-op if it's already stopped.
   */
  ensureProgramMode (){
    let uid = channel.targetDevice
    let dev = (window.bipes && window.bipes.page) ? window.bipes.page.device : undefined
    let modeOf = () => (dev && dev.runtimeMode) ? dev.runtimeMode(uid) : undefined
    if (modeOf() === 'program')
      return Promise.resolve()
    notification.send(`${Msg['PageFiles'] || 'Files'}: ${Msg['PausedToManageFiles'] || 'paused the program to manage files'}`)
    return runtimeFiles.stop()
      .then(() => new Promise((resolve) => {
        // Wait for M,program (device.runtimeMode flips) so the program-mode reader is
        // up before we PUT — otherwise the PUT lands during the run->program switch
        // (reader briefly down) and is lost.
        let tries = 0
        let poll = () => {
          if (modeOf() === 'program' || ++tries > 50) { resolve(); return }  // ~10 s cap
          setTimeout(poll, 200)
        }
        poll()
      }))
      .catch(() => {})   // STOP timed out -> still attempt the transfer
  }
  // True when the active device is a runtime running OVER SERIAL. Over USB there is a
  // real REPL, so program mode = the bare >>> REPL: file work uses the classic REPL
  // path, not the runtime's message-protocol file server (which is BLE/WiFi-only).
  // True only when a serial device is ACTUALLY running a program (in runtimeUids AND
  // run mode). A device sitting at the >>> REPL (mode 'program' / stale flag) is NOT
  // "running", so we won't QUIT it (which would NameError at the REPL).
  _serialRuntimeRunning (){
    let uid = channel.targetDevice
    let conn = channel.connections[uid]
    let serial = conn && conn.current && conn.current.name === 'WebSerial'
    let dev = window.bipes && window.bipes.page && window.bipes.page.device
    return !!(serial && channel.runtimeUids && channel.runtimeUids.has(uid) &&
              dev && dev.runtimeMode && dev.runtimeMode(uid) === 'run')
  }
  // Drop a RUNNING serial program to the >>> REPL (QUIT) and resolve once it's no
  // longer running (mode left 'run' / left runtimeUids). Only called when actually
  // running, so QUIT is valid. No-op otherwise.
  _quitToRepl (){
    let uid = channel.targetDevice
    let dev = window.bipes && window.bipes.page && window.bipes.page.device
    let running = () => channel.runtimeUids && channel.runtimeUids.has(uid) &&
                        dev && dev.runtimeMode && dev.runtimeMode(uid) === 'run'
    if (!running())
      return Promise.resolve()
    notification.send(`${Msg['PageFiles'] || 'Files'}: ${Msg['ReplForFiles'] || 'stopped to the REPL to manage files'}`)
    command.dispatch(channel, 'rawPush', ['QUIT\n', uid, [], command.tabUID])
    return new Promise((resolve) => {
      let tries = 0
      let poll = () => {
        if (!running() || ++tries > 40) { resolve(); return }  // ~8 s cap
        setTimeout(poll, 200)
      }
      poll()
    })
  }
  /**
   * Get file from ``codemirror`` editor and calls :js:func:`Files.writeToTarget` to upload.
   * @param{string} filename - Filename with full path
   * @param{string/ArrayBuffer} script - File to be saved
   */
  writeToTarget (filename, script){
    // Serial: program mode is the REPL — drop to it, then the classic write path runs.
    if (this._serialRuntimeRunning()) {
      this._quitToRepl().then(() => this.writeToTarget(filename, script))
      return
    }
    if (isRuntime()) {
      if (script instanceof ArrayBuffer)
        script = new TextDecoder().decode(script)
      // Over WiFi/MQTT, push the program via OTA-over-HTTP (the server stores it and
      // notifies the device, which fetches it over HTTP and reboots into it). This is
      // far faster than a chunked MQTT PUT and is what OTA is for. Other files still
      // use the message PUT path below.
      let conn = channel.connections[channel.targetDevice]
      if (conn && conn.current && conn.current.name === 'WebMqtt' &&
          (filename === 'blocks.py' || filename === '/blocks.py')) {
        let uid = (conn.current.prefix || '').split('/')[2]   // <session>/devices/<uid>
        if (uid) {
          fetch('/api/devices/' + uid + '/ota', {
            method:'POST', credentials:'include',
            headers:{'Content-Type':'application/json'},
            body: JSON.stringify({code: script, filename: 'blocks.py'})
          }).then((r) => r.json()).then((j) => {
            if (j && j.success)
              notification.send(`${Msg['PageFiles']}: ${Msg['OtaSent'] || 'Program sent over WiFi — the device will fetch it and reboot'}`)
            else
              notification.send(`${Msg['PageFiles']}: OTA ${(j && j.error) || 'failed'}`)
          }).catch((e) => notification.send(`${Msg['PageFiles']}: OTA ${e.message || e}`))
          this.runAfterWriteFilename = null
          return
        }
      }
      // Over MQTT the command channel is line-oriented (each line is published to its
      // own topic), so a multi-line file like a library gets shredded — only blocks.py
      // (handled above via OTA-over-HTTP) can cross WiFi. Refuse instead of silently
      // corrupting the file, and tell the user to install it over USB. (This is why a
      // device could keep running an OLD bipes_runtime.py after a "WiFi" re-flash.)
      if (conn && conn.current && conn.current.name === 'WebMqtt') {
        notification.send(`${Msg['PageFiles']}: ${Msg['LibOverUsbOnly'] || ('connect over USB to install ' + filename + ' — library transfer over WiFi is not supported')}`)
        this.runAfterWriteFilename = null
        return
      }
      // Stop the running program FIRST and wait until it's idle, so the PUT goes over
      // a quiet link (no telemetry/loop interleaving -> no missend packets).
      this.ensureProgramMode()
        .then(() => runtimeFiles.put(filename, script))
        .then(() => {
        notification.send(`${Msg['PageFiles']}: ${Msg['FileSaved'] || 'Saved'} ${filename}`)
        // "Save & run" sets runAfterWriteFilename; on a runtime device that's RUN.
        if (this.runAfterWriteFilename === filename) {
          this.runAfterWriteFilename = null
          runtimeFiles.run()
        }
        this.listDir('/', command.tabUID)   // refresh the file list
      }).catch((e) => notification.send(`${Msg['PageFiles']}: ${e.message || e}`))
      return
    }

    switch (channel.currentProtocol) {
      case 'WebSocket':
        script = script
        command.dispatch([this.parent, this], 'putFileArrayBuffer', [
          filename,
          script,
          command.tabUID,
          channel.targetDevice
        ])
        break
      case 'WebSerial':
      case 'WebBluetooth': {
        if (script instanceof ArrayBuffer)
          script = new TextDecoder().decode(script)
        // Write in many small f.write() chunks instead of ONE giant string literal.
        // A Pico can't allocate a 30 KB string in a single (contiguous) block —
        // it raises MemoryError even when total free RAM is larger (fragmentation).
        // Each chunk is escaped independently; chunking the RAW text never splits an
        // escape sequence. Starts with f=open(...) so rosetta.write.reg still matches.
        let esc = (s) => s
          .replaceAll(/\\/g, '\\\\')
          .replaceAll(/(\r\n|\r|\n)/g, '\\r')
          .replaceAll(/'/g, "\\'")
          .replaceAll(/"/g, '\\"')
        // `_=f.write(...)` assigns the byte-count result to a throwaway so the REPL
        // doesn't echo "256" for every chunk while writing.
        let CH = 256, lines = ['f=open("' + filename + '",\'w\')']
        for (let i = 0; i < script.length; i += CH)
          lines.push("_=f.write('" + esc(script.slice(i, i + CH)) + "')")
        lines.push('f.close()')
        let cmd = channel.pasteMode(lines.join('\n') + '\n')

        command.dispatch(channel, 'push', [
          cmd,
          channel.targetDevice,
          ['files', 'device', '_wroteToTarget'],
          command.tabUID
        ])
        break
      }
    }
  }
  /**
   * Canonical STOP — used by BOTH the Blocks Play/Stop button and the terminal Stop
   * button so they behave identically. Transport-aware program mode:
   *   - Serial: drop to the bare >>> REPL (QUIT) — over USB there IS a REPL, so that
   *     is what "stopped / program mode" means; re-running reboots into the runtime.
   *   - Bluetooth/WiFi: STOP to the runtime's program-mode file server (no REPL there,
   *     and this keeps the BLE/MQTT link up so it doesn't have to reconnect).
   *   - Already at the REPL (not a runtime): plain Ctrl-C.
   */
  stopExecution (){
    let uid = channel.targetDevice
    let dev = window.bipes && window.bipes.page && window.bipes.page.device
    let inRt = channel.runtimeUids && channel.runtimeUids.has(uid)
    let mode = (inRt && dev && dev.runtimeMode) ? dev.runtimeMode(uid) : undefined
    let conn = channel.connections[uid]
    let serial = conn && conn.current && conn.current.name === 'WebSerial'
    if (inRt && mode === 'run')
      // Actively running: serial drops to the >>> REPL (QUIT); BLE/WiFi to the
      // program-mode file server (STOP, keeps the link up).
      command.dispatch(channel, 'rawPush', [serial ? 'QUIT\n' : 'STOP\n', uid, [], command.tabUID])
    else if (inRt && !serial)
      // BLE/WiFi runtime already idle in program mode — STOP is idempotent.
      command.dispatch(channel, 'rawPush', ['STOP\n', uid, [], command.tabUID])
    else
      // At the bare REPL (or stale flag): Ctrl-C. NEVER QUIT here — at the REPL it's
      // just an undefined name ("NameError: name 'QUIT' isn't defined").
      command.dispatch(channel, 'rawPush', ['\x03', uid, [], command.tabUID])
  }
  /**
   * Canonical RUN (re-run the program already on the device) — shared by the terminal
   * Run button. Runtime device -> RUN; plain REPL -> Ctrl-D soft reboot (main.py
   * re-runs the program). To DEPLOY new blocks and run, use runProgram() (write+run).
   */
  startExecution (){
    let uid = channel.targetDevice
    if (channel.runtimeUids && channel.runtimeUids.has(uid))
      command.dispatch(channel, 'rawPush', ['RUN\n', uid, [], command.tabUID])
    else
      command.dispatch(channel, 'rawPush', ['\x04', uid, [], command.tabUID])
  }
  // True when the active device is currently RUNNING a program — same read as the
  // Blocks/console Run button: a runtime device in run mode, or a plain REPL device
  // whose channel is locked/busy. Drives the header Run button's play/stop icon.
  _deviceRunning (){
    let uid = channel.targetDevice
    let dev = window.bipes && window.bipes.page && window.bipes.page.device
    if (uid && channel.runtimeUids && channel.runtimeUids.has(uid))
      return !!(dev && dev.runtimeMode && dev.runtimeMode(uid) === 'run')
    return !!prompt.locked
  }
  // True while a runtime device is rebooting (emitted M,boot) — lock the button.
  _deviceBooting (){
    let uid = channel.targetDevice
    let dev = window.bipes && window.bipes.page && window.bipes.page.device
    return !!(uid && channel.runtimeUids && channel.runtimeUids.has(uid) &&
              dev && dev.runtimeMode && dev.runtimeMode(uid) === 'boot')
  }
  // Normalize a program for comparison: unify line endings, strip trailing whitespace
  // and trailing blank lines, so cosmetic-only differences don't force a re-transfer.
  _normScript (s){
    return String(s).replace(/\r\n/g, '\n').replace(/[ \t]+$/gm, '').replace(/\n+$/, '')
  }
  /**
   * Run a program on a RUNTIME device (one with main.py + bipes_runtime.py):
   * persist it as blocks.py and start it. Used by the Blocks "Run" button when the
   * active device is a runtime device. Works from BOTH runtime sub-modes:
   *   - serial / BLE: STOP (-> program mode; idempotent if already stopped) so the
   *     old program isn't running while we overwrite, then PUT blocks.py, then RUN.
   *   - WiFi / MQTT: OTA over HTTP, which reboots into the new blocks.py (handles
   *     either mode, since the MQTT link is command/line-oriented, not a byte
   *     stream suitable for a raw PUT body).
   * @param{string} script - the generated program.
   */
  runProgram (script){
    if (script instanceof ArrayBuffer)
      script = new TextDecoder().decode(script)
    let uid = channel.targetDevice
    let conn = channel.connections[uid]
    let proto = conn && conn.current && conn.current.name

    // Don't re-transfer an unchanged program. Compare against what we last deployed to
    // THIS device (= its current blocks.py, since we wrote it). If it matches, skip the
    // slow write/OTA: if it's already running, leave it; otherwise just start it.
    if (!this._deployed) this._deployed = {}
    let norm = this._normScript(script)
    let dev = window.bipes && window.bipes.page && window.bipes.page.device
    let running = channel.runtimeUids && channel.runtimeUids.has(uid) &&
                  dev && dev.runtimeMode && dev.runtimeMode(uid) === 'run'
    if (this._deployed[uid] === norm) {
      if (running)
        notification.send(`${Msg['PageFiles'] || 'Files'}: ${Msg['ProgramUnchangedRunning'] || 'program unchanged — already running'}`)
      else {
        notification.send(`${Msg['PageFiles'] || 'Files'}: ${Msg['ProgramUnchanged'] || 'program unchanged — starting it'}`)
        this.startExecution()
      }
      return
    }
    this._deployed[uid] = norm   // remember what we're deploying (cleared on disconnect)

    if (proto === 'WebMqtt'){
      this.runAfterWriteFilename = 'blocks.py'
      this.writeToTarget('blocks.py', script)   // -> OTA (writeToTarget MQTT path)
      return
    }
    if (proto === 'WebSerial'){
      // Serial = REPL. Write blocks.py AND soft-reset in ONE paste, so it doesn't
      // depend on a write-completion callback (which doesn't fire while the device is
      // still flagged a runtime -> the button used to freeze). The trailing
      // soft_reset() makes main.py boot the new blocks.py (M,boot -> run).
      this._quitToRepl().then(() => {
        let esc = (s) => s.replaceAll(/\\/g, '\\\\').replaceAll(/(\r\n|\r|\n)/g, '\\r')
                          .replaceAll(/'/g, "\\'").replaceAll(/"/g, '\\"')
        let CH = 256, lines = ['f=open("blocks.py",\'w\')']
        for (let i = 0; i < script.length; i += CH)
          lines.push("_=f.write('" + esc(script.slice(i, i + CH)) + "')")
        lines.push('f.close()')
        lines.push('import machine; machine.soft_reset()')   // boot main.py -> runs blocks.py
        command.dispatch(channel, 'rawPush',
          [channel.pasteMode(lines.join('\n') + '\n'), uid, [], command.tabUID])
        notification.send(`${Msg['PageFiles'] || 'Files'}: ${Msg['FileSaved'] || 'Saved'} blocks.py`)
      })
      return
    }
    // Bluetooth: no REPL — use the message-protocol file server (stop -> put -> run).
    runtimeFiles.stop()
      .then(() => runtimeFiles.put('blocks.py', script))
      .then(() => {
        notification.send(`${Msg['PageFiles'] || 'Files'}: ${Msg['FileSaved'] || 'Saved'} blocks.py`)
        runtimeFiles.run()
      })
      .catch((e) => notification.send(`${Msg['PageFiles'] || 'Files'}: ${e.message || e}`))
  }
  /**
   * Does the connected device have the runtime installed (main.py + bipes_runtime.py)?
   * Asked over the bare REPL (serial / WebREPL) — BLE/MQTT devices are always runtime,
   * so this path isn't reached for them. Resolves false on timeout (-> classic run).
   */
  deviceHasRuntime (){
    return new Promise((resolve) => {
      let acc = '', done = false
      let finish = (v) => {
        if (done) return
        done = true
        try { unsub() } catch (e) {}
        clearTimeout(timer)
        resolve(v)
      }
      let unsub = channel.subscribeText((chunk) => {
        acc += String(chunk)
        // The output line is `__BIPESLS__ ['boot.py', 'main.py', ...]`; the echoed
        // command has `__BIPESLS__"` (no space+bracket), so this won't match it.
        let m = acc.match(/__BIPESLS__ (\[[^\]]*\])/)
        if (m)
          finish(m[1].indexOf("'main.py'") >= 0 && m[1].indexOf("'bipes_runtime.py'") >= 0)
      })
      let timer = setTimeout(() => finish(false), 4000)
      command.dispatch(channel, 'rawPush', [
        '\r\nimport os; print("__BIPESLS__", os.listdir("/"))\r\n',
        channel.targetDevice, [], command.tabUID
      ])
    })
  }
  /**
   * Soft-reset so main.py boots into the runtime, wait until it's up (flagged in
   * channel.runtimeUids — program mode counts; a missing blocks.py just lands it in
   * program mode), then run `cb`.
   */
  bootRuntimeThen (cb){
    let uid = channel.targetDevice
    command.dispatch(channel, 'rawPush', ['\x04', uid, [], command.tabUID])   // Ctrl-D soft reset
    let tries = 0
    let poll = () => {
      if (channel.runtimeUids && channel.runtimeUids.has(uid)) { cb(); return }
      if (++tries > 50) {                                       // ~10 s
        notification.send(`${Msg['PageFiles'] || 'Device'}: runtime did not start`)
        return
      }
      setTimeout(poll, 200)
    }
    setTimeout(poll, 700)   // let the 1 s boot window pass
  }
  _putFileArrayBuffer (filename, script, tabUID, targetDevice){
    if (channel.current == undefined || channel.targetDevice != targetDevice)
      return
    if (this.arrayBufferFile.length !== 0){
      console.error('Files: another hexastream is running')
      return
    }
    let fsize = script.length
    // get request
    let rec1 = new Uint8Array(2 + 1 + 1 + 8 + 4 + 2 + 64)
    rec1[0] = 'W'.charCodeAt(0) // 87 (returns 87)
    rec1[1] = 'A'.charCodeAt(0) // 65 (returns 66)
    rec1[2] = 1 // put
    rec1[12] = fsize & 0xff
    rec1[13] = (fsize >> 8) & 0xff
    rec1[14] = (fsize >> 16) & 0xff
    rec1[15] = (fsize >> 24) & 0xff
    rec1[16] = filename.length & 0xff
    rec1[17] = (filename.length >> 8) & 0xff
    for (let i = 0; i < filename.length && i < 64; i++)
      rec1[18 + i] = filename.charCodeAt(i)

    this.arrayBufferFilename = filename
    this.arrayBufferFile = new TextEncoder().encode(script)

    command.dispatch(channel, 'push', [
      rec1,
      channel.targetDevice,
      ['files', 'device', '__checkHexaPut'],
      tabUID
    ])
  }
  __checkHexaPut (uint8, cmd, tabUID){
    if (uint8[0] == cmd[0] && uint8[1] == cmd[1] + 1) {
      console.log('Files: Got put match')
      let rec2 = this.arrayBufferFile
      command.dispatch(channel, 'push', [
        rec2,
        channel.targetDevice,
        ['files', 'device', '__checkFilePut'],
        tabUID
      ])
    }
  }
  __checkFilePut (uint8, cmd, tabUID){
    console.log('Files: file put finished')
    command.dispatch([this.parent, this], 'putFileArrayBufferEnd', [this.arrayBufferFilename, tabUID])
    this.arrayBufferFile = new Uint8Array(0)
    this.arrayBufferPos = undefined
    this.arrayBufferFilename = undefined
  }
  __putFileArrayBufferEnd (filename, tabUID){
    if (command.tabUID != tabUID)
      return
    this.listDir(filename.match(/(.*)\/(?:.*)/)[1], tabUID)
    if (this.runAfterWriteFilename === filename)
      this.runOnTarget(filename)
  }

  _wroteToTarget (str, cmd, tabUID){
    let reg = rosetta.write.reg
    if (!reg.test(cmd))
      return

    if (this._rebootAfterWrite) {
      // Deploy over serial: soft-reset (Ctrl-D) so main.py boots the new blocks.py
      // (M,boot -> launcher runs it). Skip the dir refresh; we're rebooting.
      this._rebootAfterWrite = false
      this.runAfterWriteFilename = null
      command.dispatch(channel, 'rawPush', ['\x04', channel.targetDevice, [], command.tabUID])
      return
    }
    this.listDir(cmd.match(reg)[1], tabUID)
    if (this.runAfterWriteFilename)
      this.runOnTarget(this.runAfterWriteFilename)
  }
  newScript (path){
    this.contextMenu.oninput({
      title:Msg['NewFilename'],
      placeholder:`${Msg['eg']}: ${Msg['my_script']}.py`
    }, (input, ev) => {
      ev.preventDefault()
      let filename = input.value,
          script = `${Tool.format([Msg['CreateScriptHere'], filename])}`

      this.contextMenu.close()

      if (filename == undefined || filename == '')
        return

      if (filename.indexOf('.') == -1)
        filename += '.py'

      this.writeToTarget(
        `${path}/${filename}`,
        script
      )
    })
  }
  remove (filename){
    this.contextMenu.close()

    if (this._serialRuntimeRunning()) {   // serial: delete at the REPL (classic path)
      this._quitToRepl().then(() => this.remove(filename))
      return
    }
    if (isRuntime()) {
      this.ensureProgramMode()
        .then(() => runtimeFiles.del(filename))
        .then(() => this.listDir('/', command.tabUID))
        .catch((e) => notification.send(`${Msg['PageFiles']}: ${e.message || e}`))
      return
    }

    let cmd = rosetta.rm.cmd(filename)

    command.dispatch(channel, 'push', [
      cmd,
      channel.targetDevice,
      ['files', 'device', '_removedFromTarget'],
      command.tabUID
    ])
  }
  _removedFromTarget (str, cmd, tabUID){
    let reg = rosetta.rm.reg;
    if (!reg.test(cmd))
      return

    let reg_oserror = rosetta.error.reg
    let path = cmd.match(reg)

    if (reg_oserror.test(str)) {
      let error = str.match(reg_oserror)[1]
      switch (error) {
        case '39':
          notification.send(`${Msg['PageFiles']}: ${Tool.format([Msg['FolderNotEmpty'], path[1], path[2]])}`)
          break
        default:
          notification.send(`${Msg['PageFiles']}: ${Tool.format([Msg['CouldNotRemoveFolder'], path[1], path[2]])}`)
          break;
      }
    }
    this.listDir(path[1], tabUID)
  }
  runOnTarget (filename){
    this.contextMenu.close()

    if (isRuntime()) {
      // The runtime re-execs blocks.py in place (running mode).
      runtimeFiles.run()
      notification.send(`${Msg['PageFiles']}: RUN`)
      return
    }

    let cmd = rosetta.exec.cmd(filename)
    let callback = this.runAfterWriteFilename === filename ? '_ranEditorOnTarget' : '_ranOnTarget'

    command.dispatch(channel, 'push', [
      cmd,
      channel.targetDevice,
      ['files', 'device', callback],
      command.tabUID
    ])
  }
  _ranOnTarget (str, cmd, tabUID){
    //let reg = rosetta.exec.reg
    //if (!reg.test(cmd))
    //  return

    //notification.send(`Script ${cmd.match(reg)[1]} finished executing!`)
    notification.send(`${Msg['PageFiles']}: ${Msg['ScriptFinishedExecuting']}`)
  }
  /* Download a file
   * @param{string} filename - Full path with filename
   */
  download (filename){
    this.contextMenu.close()

    this.fetchFile('download', filename)
  }
  /*
   * Create a new folder.
   * @param {string} path - Folder path.
   */
  newFolder (path){
    this.contextMenu.oninput({
      title:Msg['NewFolderName'],
      placeholder:`${Msg['eg']}: ${Msg['my_examples']}`
    }, (input, ev) => {
      ev.preventDefault()
      let folder = input.value.replaceAll('.', '-')

      this.contextMenu.close()

      if (folder == undefined || folder == '')
        return

      let cmd = rosetta.mkdir.cmd(path, folder)

      command.dispatch(channel, 'push', [
        cmd,
        channel.targetDevice,
        ['files', 'device', '_addedFolderOnTarget'],
        command.tabUID
      ])
    })
  }
  /*
   * After command execution callback to the :js:func:`newFolder` command.
   * @param {string} str - Sent command.
   * @param {string} cmd - Repplied back command plus output.
   * @param {string} tabUID - UID from the origin tab.
   */
  _addedFolderOnTarget (str, cmd, tabUID){
    let reg = rosetta.mkdir.reg
    if (!reg.test(cmd))
      return

    this.listDir(cmd.match(reg)[1], tabUID)
  }
  /*
   * Upload a file from the operation system's file picker to the device.
   * @param {string} path - Target path to upload the file
   * @param {Object} dom - Node containig the file
   * @param {string} ev - Input on change event
   */
  uploadFile (path, dom, ev){
    if  (dom.files [0] == undefined)
      return

    let file = dom.files[0]
    let filename = `${path}/${file.name}`

    let reader = new FileReader()
    reader.onload = (e) => {
        this.writeToTarget (filename, e.target.result)
    }
    reader.readAsArrayBuffer(file)

    this.contextMenu.close()
  }
}

class ProjectFiles {
  constructor (parent){
    this.name = 'project'
    this.parent = parent
    this.dom = {}

    this.tree               //  Reference to project file tree

    let $ = this.$ = {}

    $.contextMenu = new DOM('div')
    this.contextMenu = new ContextMenu($.contextMenu, this)
    this.parent.$.section.append($.contextMenu)

    $.section = new DOM(DOM.get('section#files'))
    $.detailsFileOnProject = DOM.prototypeDetails({
      id:'fileOnProject',
      innerText: Msg['ProjectFiles'],
      onevent: [{
        event:'contextmenu',
        fun: (path, dom, ev) => {
          ev.preventDefault()
          this.contextMenu.open([
            {
              id:'add',
              innerText:Msg['NewFolder'],
              fun:this.newFolder,
              args:[path]
            }, {
              id:'script',
              innerText:Msg['NewFile'],
              fun:this.newScript,
              args:[path]
            }, {
              id:'upload',
              accept:'.py,.csv,.md',
              innerText:Msg['UploadFile'],
              fun:this.uploadFile,
              args:[path]
            }
          ], ev)
        },
        args:['/']
      }]
    })


    $.saveToLocal = new DOM('button', {
      id:'save',
      className:'icon',
      title:Msg['SaveToProject']
    }).onclick(this, this._fromEditor)

    this.parent.$.sidebar.append($.detailsFileOnProject)
    this.parent.$.header.append($.saveToLocal)


    command.add([this.parent, this], {
      newFolder: this._newFolder,
      newScript: this._newScript,
      remove: this._remove,
      save: this._save
    })
  }
  init(){
    if (this.tree === undefined){
      let obj = project.projects[project.currentUID]
      if (!obj.hasOwnProperty('files'))
        obj.files = {tree:{name:'',files:[]}}

      this.tree = obj.files.tree
    }
    this._buildFileTree([])
  }
  deinit(){
    this._destroyFileTree()
  }
  load (obj){
    this.tree = obj.tree

    if (!this.parent.inited)
      return

    this._destroyFileTree()
    this._buildFileTree([])
  }
  /**
   * Get file from ``codemirror`` editor and save to project.
   */
  _fromEditor (){
    // From codemirror
    let script = this.parent.codemirror.state.doc.toString(),
      filename = this.parent.$.filename.$.value

    // Apply to all tabs
    command.dispatch([this.parent, this], 'save', [
      filename, script,
      project.currentUID,
      command.tabUID
    ])
    // Changed by reference, just write to localStorage
    project.write()
  }
  /**
   * Save file to project. Will not save if path does not exist.
   * @param{string} filename - Full path to file
   * @param{string} file - Name of the new folder
   * @param{string} projectUID - UID of the project with a new folder
   * @param{string} tabUID - UID of the tab
   */
  _save (filename, file, projectUID, tabUID){
    let path = filename.split('/')
    path.shift()

    if (path == undefined || path == '')
      return

    let obj
    if (projectUID === project.currentUID)
      obj = this.objByName(path)
    else
      obj = this.objByName(path, projectUID)
    if (obj === true){
      if (tabUID === command.tabUID)
        notification.send(`${Msg['PageFiles']}: ${Tool.format([Msg['CreatePathFileBeforeSaving'], filename])}`)
      return
    } else if (obj === false){
      // Redirect to new file function
      let filename = path[path.length - 1]
      path.pop()
      command.dispatch([this.parent, this], 'newScript', [
        '/' + path.join('/'), filename, file,
        project.currentUID
      ])
      // Changed by reference, just write to localStorage
      project.write()
      return
    }
    obj.script = file
  }
  /**
   * Create a new folder, context menu input.
   * Will dispatch command and update project by reference on input.
   * @param {string} path - Path to new folder.
   */
  newFolder (path){
    this.contextMenu.oninput({
      title:Msg['NewFolderName'],
      placeholder:`${Msg['eg']}: ${Msg['my_examples']}`
    }, (input, ev) => {
      ev.preventDefault()
      let folder = input.value.replaceAll('.', '-')

      this.contextMenu.close()

      if (folder == undefined || folder == '')
        return

      // Apply to all tabs
      command.dispatch([this.parent, this], 'newFolder', [
        path, folder,
        project.currentUID
      ])
      // Changed by reference, just write to localStorage
      project.write()
    })
  }
  /**
   * Create a new folder.
   * @param {string} path - Path to new folder.
   * @param {string} folder - Name of the new folder.
   * @param {string} projectUID - UID of the project with a new folder.
   */
  _newFolder (path, folder, projectUID){
    if (projectUID !== project.currentUID)
      return
    let obj = this.objByName(path)

    if (obj === true || obj.files == undefined)
      return
    let item = {
      name:folder,
      files:[]
    }

    // Search if already exist
    if  (!obj.files.every(item => item.name !== folder)){
      console.log(`${Msg['PageFiles']}: ${Tool.format([Msg['FolderAlreadyExist'], folder, path])}"`)
      return
    }

    path += path == '/' ? folder : '/' + folder
    let map = path.split('/')
      map.shift()
    obj.files.push(item)

    if (!this.parent.inited || projectUID !== project.currentUID)
      return

    item.dom = this.$Span(item, map, false)
    obj.dom.$.append(item.dom.$)

    obj.dom.$.open = true
  }
  /**
   * Remove folder or file, dispatch command and update project by reference.
   * @param {string} path - Path to folder or file.
   */
  remove (path){
    this.contextMenu.close()

    // Apply to all tabs
    command.dispatch([this.parent, this], 'remove', [
      path,
      project.currentUID
    ])
    // Changed by reference, just write to localStorage
    project.write()
  }
  /**
   * Remove folder or path.
   * @param {string} path - Path to new folder.
   * @param {string} projectUID - UID of the project.
   */
  _remove (path, projectUID){
    // Remove DOM Node
    if (projectUID !== project.currentUID)
      return

    let obj = this.objByName(path)
    if (this.parent.inited)
      obj.dom.$.remove()

    // Get parent object
    let ar = path.split('/')
    let toRemoval = ar[ar.length - 1]
    ar.shift()
    ar.pop()

    obj = this.objByName(ar)
    if (obj === true || obj.files == undefined)
      return

    obj.files.forEach((item, index) => {
      if (item.name == toRemoval) {
        obj.files.splice(index,1)
      }
    })
  }
  /**
   * Create a new file, context menu input.
   * Will dispatch command and update project by reference on input.
   * @param {string} path - Path to new file.
   */
  newScript (path){
    this.contextMenu.oninput({
      title:Msg['NewFilename'],
      placeholder:`${Msg['eg']}: ${Msg['my_script']}.py`
    }, (input, ev) => {
      ev.preventDefault()
      let filename = input.value.replaceAll(' ','_')
      this.contextMenu.close()

      if (filename == undefined || filename == '')
        return

      if (filename.indexOf('.') == -1)
        filename += '.py'

      // Apply to all tabs
      command.dispatch([this.parent, this], 'newScript', [
        path, filename, undefined,
        project.currentUID
      ])
      // Changed by reference, just write to localStorage
      project.write()
    })
  }
  /**
   * Create a new file
   * @param {string} path - Path to new file
   * @param {string} filename - Name of the new file
   * @param {string} file - Content of the new file, if empty, will default
   * @param {string} projectUID - UID of the project with a new file
   */
  _newScript (path, filename, file, projectUID){
    if (projectUID !== project.currentUID)
      return

    let obj = this.objByName(path)

    if (obj === true || obj.files == undefined)
      return
    let item = {
      name:filename,
      script: file == undefined ? `${Tool.format([Msg['CreateScriptHere'], filename])}` : file
    }

    // Search if already exist
    if  (!obj.files.every(item => item.name !== filename)){
      notification.send(`${Msg['PageFiles']}: ${Tool.format([Msg['FileAlreadyExist'], filename, path])}`)
      return
    }

    //path += path == '/' ? filename : '/' + filename
    let map = path.split('/')
      map.shift()
    obj.files.push(item)

    if (!this.parent.inited)
      return

    item.dom = this.$Span(item, map, true)
    obj.dom.$.append(item.dom.$)

    obj.dom.$.open = true
  }
  /*
   * Upload a file from the operation system's file picker to the project.
   * @param{string} path - target path to upload the file
   * @param{object} dom - Node containig the file
   * @param{string} ev - input on change event
   */
  uploadFile (path, dom, ev){
    if (dom.files [0] == undefined)
      return

    let file = dom.files[0]
    let filename = `${path}/${file.name}`

    let reader = new FileReader()
    reader.onload = (e) => {
      command.dispatch([this.parent, this], 'newScript', [
        path, file.name, e.target.result,
        project.currentUID
      ])

      // Changed by reference, just write to localStorage
      project.write()
    }
    reader.readAsText(file)

    this.contextMenu.close()
  }
  /* Download a file
   * @param{string} filename - Full path with filename
   */
  download (filename){
    this.contextMenu.close()

    let path = filename.split('/')
    path.shift()

    if (path == undefined || path == '')
      return

    let obj = this.objByName(path)

    if (obj === true || obj.script == undefined) {
      console.error(`${Msg['PageFiles']}: ${Msg['FileNotExist']}`)
      return
    }
    DOM.prototypeDownload(filename.substring(1), obj.script)
  }
  /* Execute file on paste mode
   * @param{string} filename - Full path with filename
   */
  execOnTarget (filename){
    this.contextMenu.close()

    let path = filename.split('/')
    path.shift()

    if (path == undefined || path == '')
      return

    let obj = this.objByName(path)

    if (obj === true || obj.script == undefined) {
      console.error(`${Msg['PageFiles']}: ${Msg['FileNotExist']}`)
      return
    }

    let cmd = channel.pasteMode(obj.script)
    command.dispatch(channel, 'push', [
      cmd,
      channel.targetDevice,
      ['files', 'project', '_execedOnTarget'],
      command.tabUID
    ])
  }
  _execedOnTarget (str, cmd, tabUID){
    notification.send(`${Msg['PageFiles']}: ${Msg['ScriptFinishedExecuting']}`)
  }
  /**
   * Build the file tree
   * @param{object} map - Array path to a directory
   */
  _buildFileTree (map) {
    let _iterate = (obj, dom, path) => {
      let doms = []
      obj.forEach(item => {
        if (item.files != undefined) {
          path.push(item.name)
          doms.push(item.dom = this.$Span(item, path, false))
          if (item.files.length > 0) {
            doms[doms.length - 1].$.open = true
            if (item.files[0].hasOwnProperty('empty')) {
              doms[doms.length - 1].$.open = true
              doms[doms.length - 1].append(
                new DOM('span', {innerText:`(${Msg['Empty']})`, className:'emptyDir'})
              )
            } else
            _iterate (item.files, doms[doms.length - 1], path)
          }
          path.pop()
        } else {
          let _path = path.length == 0 ? '' : `/${path.join('/')}`

          doms.push(item.dom = this.$Span(item, path, true))
        }
      })
      dom.append(doms)

      return
    },
    path = []
    _iterate(this.tree.files, this.$.detailsFileOnProject, path)

    this.tree.dom = {}
    this.tree.dom.$ = this.$.detailsFileOnProject.$
    this.$.detailsFileOnProject.$.open = true

  }
  /**
   * Destroy the file tree, triggered by ::js::fun::Files::devinit.
   */
  _destroyFileTree () {
    let $ = this.$.detailsFileOnProject.$

    let child = $.lastElementChild
    while (child) {
      if (child.nodeName === 'SUMMARY')
        return
      $.removeChild(child)
      child = $.lastElementChild
    }
  }
  /*
   * Generate the folder or file DOM node.
   * @param {String} item - folder/file object.
   * @param {Array} path - array path to folder/file object.
   * @param {bool} type - false equals folder and true a file.
   */
  $Span (item, path, type){
    switch (type) {
      case false:
        return DOM.prototypeDetails({
          id:`path_${path.join('_')}`,
          innerText: item.name,
          onevent: [{
            event:'contextmenu',
            fun: (path, dom, ev) => {
              ev.preventDefault()
              this.contextMenu.open([
                {
                  id:'add',
                  innerText:Msg['NewFolder'],
                  fun:this.newFolder,
                  args:[path]
                }, {
                  id:'script',
                  innerText:Msg['NewFile'],
                  fun:this.newScript,
                  args:[path]
                }, {
                  id:'upload',
                  innerText:Msg['UploadFile'],
                  fun:this.uploadFile,
                  args:[path]
                }, {
                  id:'remove',
                  innerText:Msg['RemoveFolder'],
                  fun:this.remove,
                  args:[path]
                }
              ], ev)
            },
            args:[`/${path.join('/')}`]
          }]
        })
      case true:
        let _path = `/${path.join('/')}`
        _path += _path == '/' ? item.name : '/' + item.name
        return new DOM('button',{
          innerText:item.name,
          className:'listedFile'
        })
        .onclick(this, () => {this.open(_path)})
        .onevent('contextmenu', this, (ev) => {
          ev.preventDefault()
          this.contextMenu.open([
            {
              id:'run',
              innerText:Msg['ExecuteScript'],
              fun:this.execOnTarget,
              args:[_path]
            }, {
              id:'download',
              innerText:Msg['Download'],
              fun:this.download,
              args:[_path]
            }, {
              id:'remove',
              innerText:Msg['Remove'],
              fun:this.remove,
              args:[_path]
            },
          ], ev)
        })
    }
  }
  /*
   * Open file.
   * @param {String/Array} path - array or string path.
   */
  open (path){
    let file = this.objByName(path)
    if (file === true)
      return

    this.parent.$.filename.$.value = path
    this.parent.codemirror.dispatch({
      changes: {from:0, to:this.parent.codemirror.state.doc.length, insert:file.script}
    })
    document.title = `${path} - BIPES`
  }
  /*
   * Gets object in the file tree by array path or string path.
   * If projectUID is null, assume current project.
   * @param{string/array} path - array or string path.
   * @param{string} projectUID - UID of the project with the path.
   * @return True for some directory not found, false does not exist or reference
   *         if found.
   */
  objByName (path, projectUID) {
    let tree
    if (projectUID === undefined)
      tree = this.tree
    else
      tree = project.projects[projectUID].files.tree

    if (path == '/')
      return tree

    let map
    if (typeof path == 'string'){
      map = path.split('/')
      map.shift()
    } else if (path instanceof Array){
      map = path
      if (path.length == 0)
        return tree
    }

    let ref_dir = tree.files,
        ref = tree.files,
      found = new Array(map.length).fill(false)

    map.forEach ((m, i) => {
      ref_dir.every(p => {
        if (p.name == m){
          found[i] = true
          ref_dir = p.files
          ref = p
          return false
        }
        return true
      })
    })
    if (found.includes(false)){
      // Distinguish directory from file not found
      let subfound = found.slice(0, found.length -  1)
      if (subfound.includes(false) && subfound.length != 0){
        console.error(`${Msg['PageFiles']}: ${Msg['DirectoriesNotExistMapped']}`)
        return true
      } else
        return false
    }
    return ref
  }
}


export let files = new Files()
