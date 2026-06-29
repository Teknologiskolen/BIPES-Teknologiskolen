"use strict";

import {DOM, Animate} from '../../base/dom.js'
import {Tool} from '../../base/tool.js'
import {command} from '../../base/command.js'
import {channel} from '../../base/channel.js'
import {navigation} from '../../base/navigation.js'
import {notification} from '../notification/main.js'

import {files} from '../files/main.js'
import {prompt} from '../prompt/main.js'
import {project} from '../project/main.js'
import {device} from '../device/main.js'

import {knownDocs, knownExamples, knownLibs} from './external.js'

/* Code visually, uses Google Blockly as visual language library. */
class Blocks {
  /* Construct the object, is executed on load of the window. */
  constructor (){
    this.name = 'blocks'
    this.timedResize // To guarantee that blockly is ocuppying 100%
    this.inited = false
    this.loadedWorkspace = false

    // Make some tools acessible to Blockly
    this.convertColor = blocksConvertColor
    this.warningIfTrue = blocksWarningIfTrue

    let $ = this.$ = {}

    $.section = new DOM (DOM.get('section#blocks'))
      .append(new DOM('div', {id:'blockly'}))

    // Empty toolbox to use in the workspace until loading project
    let emptyToolbox = Blockly.Xml.textToDom("<xml><category name='...'></category></xml>")
    this.workspace = Blockly.inject('blockly', {
      theme: Tool.fromUrl('theme') === 'dark' ? Blockly.Themes.Dark : Blockly.Themes.Light,
      toolbox: emptyToolbox,
      visible: false,
      grid: {
        spacing: 25,
        length: 3,
        colour: Tool.fromUrl('theme') === 'dark' ? '#444' : '#ccc',
        snap: true
      },
      media: './static/page/blocks/media/',
      oneBasedIndex: false,
      zoom: {
        controls: false,
        wheel: true
      },
      move:{
        scrollbars: {
          horizontal: true,
          vertical: true
        },
        drag: true,
        wheel: false
        }
    })
    // Change Indent
    Blockly.Python.INDENT = '    '

    // RegisterCallbacks
    blocksRegisterCallbacks(this.workspace)
    // Enable export workspace screenshot tool
    this.export = blocksExport

    // Init language strings
    for (const target in blockly_toolbox){
      blockly_toolbox[target] = blockly_toolbox[target].replace(/%{(\w+)}/g,
        (m, p1) => Blockly.Msg[p1]
      )
    }

    // Init code generation and viewer module.
    this.code = new BlocksCode(this, $.section)
  }
  /*
   * On display, initiates the page.
   */
  init (){
    if (this.inited)
      return

    this.workspace.setVisible(true)
    this.code.init()
    this.inited = true
    if (typeof project.ensureCurrent == 'function')
      project.ensureCurrent()
    let obj = project.projects[project.currentUID]
    if (!obj)
      return
    if (obj.hasOwnProperty('blocks'))
      this.load(obj.blocks)
    if (obj.hasOwnProperty('device'))
      this.toolbox(obj.device.target)
    // Update project on changes
    this.workspace.addChangeListener(this.update)
    // Warn when functions are wired into (direct or mutual) recursion.
    this.workspace.addChangeListener(blocksRecursionGuard)

    // Shortcuts
    shortcut.add("Ctrl+Shift+L", () => {this.export.png()})
    shortcut.add("Ctrl+Shift+Alt+L", () => {this.export.svg()})

    // "Paste blocks" in the workspace right-click menu (reads the clipboard).
    if (!this._pasteMenuRegistered) {
      this._pasteMenuRegistered = true
      try {
        Blockly.ContextMenuRegistry.registry.register({
          id: 'bipesPasteBlocks',
          weight: 99,
          scopeType: Blockly.ContextMenuRegistry.ScopeType.WORKSPACE,
          displayText: () => Msg['PasteBlocks'] || 'Paste blocks',
          preconditionFn: () => 'enabled',
          callback: () => { this.pasteFromClipboard() }
        })
      } catch (e) { console.warn('Blocks: could not register paste menu', e) }
    }

    // Ctrl+V: paste block XML copied from an embedded lesson chain. Blockly 7
    // already registers its own Ctrl+V shortcut (pastes its INTERNAL clipboard —
    // the last block stack copied inside the editor), so a separate document
    // 'paste' listener would fire IN ADDITION to Blockly's: that pasted both the
    // embed chain AND Blockly's internal stack ("all blocks in the project").
    // The right-click "Paste blocks" menu only calls our handler, which is why it
    // was correct.
    //
    // Blockly 7's register() only stores the shortcut object; the Ctrl+V -> name
    // key mapping lives separately in keyMap_ and is NOT rebuilt by register().
    // So we must NOT unregister/re-register (that drops the key mapping and Ctrl+V
    // stops working). Instead, wrap the existing shortcut's callback IN PLACE so
    // the key mapping is untouched: prefer block XML from the SYSTEM clipboard
    // (same as the right-click "Paste blocks" menu), and only fall back to
    // Blockly's internal paste when the clipboard isn't block XML (so in-editor
    // keyboard copy/paste still works).
    if (!this._pasteShortcutPatched) {
      this._pasteShortcutPatched = true
      try {
        let SR = Blockly.ShortcutRegistry.registry
        let shortcut = SR.registry_ && SR.registry_['paste']
        if (shortcut && !shortcut._bipesPatched) {
          shortcut._bipesPatched = true
          let originalCallback = shortcut.callback
          shortcut.callback = (ws, e, sc) => {
            let fallback = () => originalCallback ? originalCallback(ws, e, sc) : false
            if (navigator.clipboard && navigator.clipboard.readText) {
              navigator.clipboard.readText()
                .then((text) => {
                  if (text && /<(xml|block)\b/i.test(text)) this.pasteXml(text)
                  else fallback()
                })
                .catch(() => fallback())
              return true
            }
            return fallback()
          }
        }
      } catch (e) { console.warn('Blocks: could not patch paste shortcut', e) }
    }
  }
  /*
   * On hidden, deinitiate the page.
   */
  deinit(){
    if (!this.inited)
      return

    this.workspace.removeChangeListener(this.update)
    this.workspace.clear()
    this.workspace.setVisible(false)
    this.code.deinit()
    this.inited = false

    // Shortcuts
    shortcut.remove("Ctrl+Shift+L")
    shortcut.remove("Ctrl+Shift+Alt+L")
  }
  /*
   * On resize, resize the page.
   */
  resize (){
    Blockly.svgResize(this.workspace)
    clearTimeout(this.timedResize)
    this.timedResize = setTimeout(()=>{
      Blockly.svgResize(this.workspace)
    },250)
  }
  sanitizeLegacyXml (xmlText){
    if (typeof xmlText !== 'string' || !xmlText)
      return xmlText

    if (xmlText.indexOf('strip_name') !== -1)
      xmlText = xmlText.replace(/<field name="strip_name">[\s\S]*?<\/field>/g, '')

    // runtime_start lost its TRANSPORT dropdown (Bluetooth/WiFi have their own start
    // blocks now). Drop the orphaned field from old saved projects so Blockly doesn't
    // warn "Ignoring non-existent field TRANSPORT". TRANSPORT was unique to that block.
    if (xmlText.indexOf('TRANSPORT') !== -1)
      xmlText = xmlText.replace(/<field name="TRANSPORT">[\s\S]*?<\/field>/g, '')

    // Strip stale top-level <shadow> blocks. These occur when saved projects have
    // shadow blocks whose type is now incompatible with the input they used to fill
    // (e.g. a math_number shadow where an SPI block is now required). Blockly orphans
    // them at the top level of the XML and then throws "Shadow block cannot be a
    // top-level block" when trying to load the workspace.
    if (xmlText.indexOf('<shadow') !== -1) {
      try {
        const dom = new DOMParser().parseFromString(xmlText, 'text/xml')
        const root = dom.documentElement
        Array.from(root.childNodes)
          .filter(n => n.nodeName === 'shadow')
          .forEach(n => root.removeChild(n))
        xmlText = new XMLSerializer().serializeToString(dom)
      } catch(_e) { /* keep original if XML parsing fails */ }
    }

    return xmlText
  }
  /*
   * Append block XML (e.g. copied from an embed) to the current workspace
   * without clearing it. Returns true on success.
   */
  pasteXml (text){
    if (!text)
      return false
    try {
      let dom = Blockly.Xml.textToDom(this.sanitizeLegacyXml(text))
      let ids = Blockly.Xml.domToWorkspace(dom, this.workspace)   // appends, doesn't clear
      // Nudge pasted blocks so they don't land exactly on existing ones.
      if (ids && ids.forEach)
        ids.forEach((id) => {
          let b = this.workspace.getBlockById(id)
          if (b && b.moveBy) b.moveBy(24, 24)
        })
      this.code.update()
      notification.send(`${Msg['PageBlocks'] || 'Blocks'}: ${Msg['BlocksPasted'] || 'Blocks pasted'}`)
      return true
    } catch (e) {
      console.warn('Blocks: paste failed', e)
      notification.send(`${Msg['PageBlocks'] || 'Blocks'}: ${Msg['PasteFailed'] || 'Could not paste blocks'}`)
      return false
    }
  }
  /* Read the clipboard and paste block XML (for the Paste button). */
  pasteFromClipboard (){
    if (navigator.clipboard && navigator.clipboard.readText)
      navigator.clipboard.readText()
        .then((t) => this.pasteXml(t))
        .catch(() => notification.send(`${Msg['PageBlocks'] || 'Blocks'}: ${Msg['UseCtrlV'] || 'Press Ctrl+V to paste'}`))
    else
      notification.send(`${Msg['PageBlocks'] || 'Blocks'}: ${Msg['UseCtrlV'] || 'Press Ctrl+V to paste'}`)
  }
  /*
   * On load a project, load the blocks' scope of the project.
   */
  load (obj, tabUID){
    if (!this.inited || tabUID == command.tabUID)
      return
    if (obj.hasOwnProperty('xml')) {
      this.loadedWorkspace = false
      Blockly.Events.disable()
      try {
        Blockly.Xml.clearWorkspaceAndLoadFromXml(
          Blockly.Xml.textToDom(this.sanitizeLegacyXml(obj.xml)),
          this.workspace
        )
      } catch(e) {
        console.warn('Blocks: could not restore workspace, starting fresh.', e.message)
        this.workspace.clear()
      } finally {
        Blockly.Events.enable()
      }
      // Update code if generating
      this.code.update()
    }
  }
  /*
   * On change applied to the workspace, update the blocks'.
   * When event does not conatin `recordUndo` property, it means the event
   * does not affect the project, for example, while dragging the block.
   * scope of the project.
   * @param {Object} ev - Blockly event of the change.
   */
  update (ev){
    if (!ev.recordUndo)
        return

    // Update code if generating
    blocks.code.update()

    let xml = Blockly.Xml.domToText(
      Blockly.Xml.workspaceToDom(blocks.workspace)
    )
    project.update({
      blocks:{
        xml:xml
      }
    })
  }
  /*
   * On target device change, update the blocks toolbox.
   * @param {string} target - Target device.
   */
  toolbox (target){
    if (!this.inited)
      return

    let toolbox_id = device.deviceInfo[target].toolbox.replace('.xml', '')
    this.workspace.updateToolbox(blockly_toolbox[toolbox_id])
    this.workspace.scrollCenter()
  }
  /**
   * Create this page empty object
   * @return {Object} This page scope in the project file.
   */
  empty (){
    return {
      xml:'<xml xmlns="https://bipes.net.br/ide"></xml>'
    }
  }
  /**
   * Change target device.
   * @param {string} target - Target device toolbox.
   */
  deviceTarget (target){
    /* refreshes block pinout with device change */
    let blocks = this.workspace.getBlocksByType('pinout')

    blocks.forEach((block) => {
      block.refresh(target)
    })
    if (blocks.length != 0) notification.send(`${Msg['PageBlocks']}: ${Msg['DeviceChangedCheckPins']}`)
  }
}

/* Code generator and viewer. */
class BlocksCode {
  /*
   * Init code generator and viewer.
   * @param {Object} parent - Parent object.
   * @param {Object} dom - Target DOM.
   */
  constructor (parent, dom) {
    this.generating = false // is generating code
    this.parent = parent
    this.name = 'code'

    this.interval           // store watcher interval.
    this.executing          // store if is executing code.
    this.busy = false       // a start/stop transfer is in progress (button locked)
    this.busyTarget = ''    // the runtime mode we're transitioning to ('run'/'program')
    this.busyStable = 0     // consecutive ticks the device has held the target mode
    this.busyDeadline = 0    // safety timeout so a lost reply can't wedge the button
    this._bootTicks = 0      // ticks the device has been booting (M,boot) — caps the lock

    let $ = this.$ = {}

    $.codeButton = new DOM('button', {
      title:`${Msg['ViewBlocksCode']} (Ctrl+Shift+C)`,
      id:'code',
      className:'icon'
    }).onevent('click', this, this.show)
    $.runButton = new DOM('button', {
      title:`${Msg['RunBlocks']} (Ctrl+Shift+R)`,
      className:'icon',
      id:'run'
    }).onevent('click', this, this.exec)
    $.editAsFileButton = new DOM('button', {
      innerText:Msg['BlocksEditAsFile'],
      className:'icon text',
      id:'copy'
    }).onevent('click', this, this.copyEdit)
    $.codemirror = new DOM('div', {id:'codemirror'})
      .append([$.editAsFileButton])
    $.container = new DOM('div', {id:'blocks-code'})
      .append([$.codemirror, $.codeButton, $.runButton])
    dom.append([$.container])


    this.codemirror = CodeMirror($.codemirror.$, Tool.fromUrl('theme'),
      {contenteditable:false}
    )

    command.add([this.parent, this], {
      execedOnTarget: this._execedOnTarget,
    })
  }
  init (){
    this.interval = setInterval(() => {this.watcher()}, 250)

    // Shortcuts
    shortcut.add("Ctrl+Shift+C", () => {this.show()})
    shortcut.add("Ctrl+Shift+R", () => {this.exec()})
    shortcut.add("Ctrl+Shift+E", () => {
      this.exec()
      // Show console
      if (navigation.current[0] !== '') {
        let ev = document.createEvent('HTMLEvents')
        ev.initEvent('contextmenu', true, false)
        prompt.nav.dispatchEvent(ev)
      }
    })
  }
  deinit (){
    clearInterval(this.interval)

    // Shortcuts
    shortcut.remove("Ctrl+Alt+C")
    shortcut.remove("Ctrl+Shift+E")
    shortcut.remove("Ctrl+Shift+R")
  }
  /*
   * Show generated code.
   */
  show (){
    this.generating = !this.generating
    if (this.generating)
      this.update()

    DOM.switchState(this.$.container)
  }
  // True when the active device is currently RUNNING a program — so the Play button
  // should show (and act as) Stop. For a runtime device that means run mode (blocks.py
  // executing); for a plain REPL device it means the channel is busy (prompt.locked).
  isRunning (){
    let uid = channel.targetDevice
    if (channel.runtimeUids && channel.runtimeUids.has(uid))
      return device.runtimeMode(uid) === 'run'
    return prompt.locked
  }
  // The active device is rebooting (it emitted "M,boot" and hasn't settled into run
  // or program yet). Happens on our own deploy soft-reset AND on a terminal Run/Reset
  // we didn't initiate — so the button must lock here even when we aren't `busy`, or
  // a second Play could fire during the "starting blocks.py in 1s" countdown.
  _deviceBooting (){
    let uid = channel.targetDevice
    return !!(channel.runtimeUids && channel.runtimeUids.has(uid) &&
              device.runtimeMode(uid) === 'boot')
  }
  // Lock the button while a start/stop transfer runs, so the multi-step sequence
  // (STOP -> PUT -> RUN -> M,run) can't be interrupted by a click and the button
  // doesn't flicker as each M, line arrives. Cleared when the device settles into
  // the target mode, or after a safety timeout.
  _beginTransition (targetMode){
    this.busy = true
    this.busyTarget = targetMode
    this.busyStable = 0
    // 35 s: covers a worst-case start over serial where the device reboots and joins
    // WiFi (blocking) before it can answer the STOP/PUT/RUN handshake.
    this.busyDeadline = Date.now() + 35000
  }
  watcher (){
    let btn = this.$.runButton.$
    if (this.busy){
      btn.classList.add('busy')
      // Freeze the icon at the target state (no flicker), keep it click-locked.
      if (this.busyTarget === 'run') btn.classList.add('on')
      else btn.classList.remove('on')
      // Release only once the target mode HOLDS for a few ticks. The start sequence
      // (STOP -> PUT -> RUN) can briefly bounce run<->program before settling, so a
      // single match isn't enough — debounce it, or give up after the safety timeout.
      let uid = channel.targetDevice
      let isRuntime = channel.runtimeUids && channel.runtimeUids.has(uid)
      let atTarget
      if (this.busyTarget === 'program')
        // Stopped = either the runtime's program mode OR the device left the runtime
        // entirely (serial QUIT -> bare REPL). Both mean "not running".
        atTarget = !isRuntime || device.runtimeMode(uid) === 'program'
      else
        atTarget = isRuntime && device.runtimeMode(uid) === 'run'
      this.busyStable = atTarget ? this.busyStable + 1 : 0
      if (this.busyStable >= 4 || Date.now() > this.busyDeadline)
        this.busy = false
      return
    }
    // Not in a Blocks-initiated transfer, but the device is rebooting (e.g. the
    // terminal Run/Reset triggered a soft reboot). Lock the button and show the
    // running icon until it settles, so a second Play can't fire mid-boot. Bounded by
    // a tick cap so a stuck boot can't wedge the button forever.
    if (this._deviceBooting()){
      btn.classList.add('busy')
      btn.classList.add('on')
      if (++this._bootTicks < 80)   // ~20 s at 250 ms ticks
        return
    } else {
      this._bootTicks = 0
    }
    btn.classList.remove('busy')
    // Reflect run state on the button: '.on' swaps the play icon to a stop icon.
    if (this.isRunning())
      btn.classList.add('on')
    else
      btn.classList.remove('on')
  }
  /*
   * Update generated code, only when the panel is visible.
   */
  update (){
    if (!this.generating)
      return

    let code = Blockly.Python.workspaceToCode(this.parent.workspace)
    this.codemirror.dispatch({
      changes: {from:0, to:this.codemirror.state.doc.length,
        insert:code
     }
    })
  }
  exec (){
    // A start/stop transfer is mid-flight, or the device is rebooting (M,boot, e.g. a
    // terminal Run) — ignore the click so the user can't abort the PUT/RUN sequence,
    // spam the device, or fire a second Play during the boot countdown.
    if (this.busy || this._deviceBooting())
      return

    let target = channel.targetDevice

    // Button acts as STOP while a program is running — SAME logic as the terminal
    // Stop button (files.device.stopExecution): runtime -> STOP (program mode, stays
    // connected so Play can re-run); REPL -> Ctrl-C.
    if (this.isRunning()){
      if (channel.runtimeUids && channel.runtimeUids.has(target))
        this._beginTransition('program')
      files.device.stopExecution()
      return
    }

    let script = Blockly.Python.workspaceToCode(this.parent.workspace)

    // Runtime device installed and connected (program mode / idle): persist the
    // program as blocks.py and start it via the runtime protocol (not a paste).
    if (channel.runtimeUids && channel.runtimeUids.has(target)) {
      this._beginTransition('run')
      files.device.runProgram(script)
      return
    }

    // Not a live runtime. Decide by whether bipes_runtime is actually INSTALLED on the
    // device (main.py + bipes_runtime.py present):
    //   - installed     -> DEPLOY: persist blocks.py and boot the launcher.
    //   - NOT installed  -> just RUN the script in place (paste-exec); do NOT save it as
    //                       blocks.py (there'd be no launcher to run it anyway).
    // Serial with the runtime deploys directly (write + soft-reset); other transports
    // boot into the runtime first.
    let conn = channel.connections[target]
    let serial = !!(conn && conn.current && conn.current.name === 'WebSerial')
    files.device.deviceHasRuntime().then((hasRuntime) => {
      if (channel.targetDevice != target)
        return                                      // user switched device meanwhile
      if (hasRuntime) {
        this._beginTransition('run')
        if (serial) {
          files.device.runProgram(script)           // serial: write blocks.py + soft-reset
        } else {
          notification.send(`${Msg['PageBlocks']}: ${Msg['StartingRuntime'] || 'starting runtime…'}`)
          files.device.bootRuntimeThen(() => files.device.runProgram(script))
        }
      } else {
        // No bipes_runtime on the device — run the program as-is, don't save it.
        command.dispatch(channel, 'push', [
          channel.pasteMode(script),
          target,
          ['files', 'project', '_execedOnTarget'],
          command.tabUID
        ])
      }
    })
  }
  _execedOnTarget (str, cmd, tabUID){
    this.$.runButton.$.classList.remove('on')
    notification.send(`${Msg['PageBlocks']}:${Msg['ScriptFinishedExecuting']}`)
  }

  /*
   * Generate code from blocks, copy, create script and open in the editor.
   */
  copyEdit (){
    let script = Blockly.Python.workspaceToCode(this.parent.workspace)

    files.$.filename.$.value = `/${Msg['BlocksPy']}`
    files.codemirror.dispatch({
      changes: {from:0, to:files.codemirror.state.doc.length, insert:script}
    })
    document.title = `${Msg['BlocksPy']} - BIPES`
    files.nav.click()
  }
}

/* Dark blockly theme */
Blockly.Themes.Dark = Blockly.Theme.defineTheme('dark', {
  'base': Blockly.Themes.Classic,
  'componentStyles': {
    'workspaceBackgroundColour': '#1e1e1e',
    'toolboxBackgroundColour': 'blackBackground',
    'toolboxForegroundColour': '#fff',
    'flyoutBackgroundColour': '#252526',
    'flyoutForegroundColour': '#ccc',
    'flyoutOpacity': 1,
    'scrollbarColour': '#797979',
    'insertionMarkerColour': '#fff',
    'insertionMarkerOpacity': 0.3,
    'scrollbarOpacity': 0.4,
    'cursorColour': '#d0d0d0',
    'blackBackground': '#333',
  },
})

/* Provides some color convertion to Blockly */
let blocksConvertColor = {
  /** Converts RGB to HEX
  * @param {number} r - Red color, from 0 to 255.
  * @param {number} g - Green color, from 0 to 255.
  * @param {number} b - Blue color, from 0 to 255.
  * @returns {string} HEX code for the RGB color.
  */
  RGB2HEX:(r, g, b) => {
    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b)
  },
  /**Converts HEX to RGB
  * @param {string} hex - HEX code
  * @returns {(Object|null)} RGB code for the RGB color.
  */
  HEX2RGB:(hex) => {
    // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
    let shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, function(m, r, g, b) {
      return r + r + g + g + b + b;
    });

    let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  },
  /**Converts HUE to HEX
  * @param {number} h - Hue, from 0 to 360.
  * @param {number} s - Saturation, from 0 to 100.
  * @param {number} l - Lightness, from 0 to 100.
  * @returns {string} HEX code for the HUE color.
  */
  HUE2HEX:(h,s,l) => {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = n => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');   // convert to Hex and prefix "0" if needed
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  }
}

/* Provides a warning to Blockly if criteria is not met */
let blocksWarningIfTrue = (self, criteria) => {
  // Don't check state if:
  //   * It's at the start of a drag.
  //   * It's not a move event.
  if (!self.workspace.isDragging || self.workspace.isDragging())
    return

  let warnings = [];
  criteria.forEach ((item, index) => {
    if (item [0] ())
      warnings.push(item [1])
  })
  self.setWarningText(warnings.length > 0 ? warnings.join("\n") : null)
}

/* Flags function (procedure) blocks that call themselves directly or indirectly.
 * A microcontroller has a tiny call stack, so any unbounded recursion overflows it
 * and crashes the board — we warn the moment a recursive cycle is wired up.
 * Implemented as a workspace change listener (leaves the stock procedure blocks
 * untouched) that builds the call graph and marks every call block that closes a
 * cycle. Recursion with a real stop condition is still valid Python, so this warns
 * rather than blocks. */
let blocksRecursionGuard = (event) => {
  if (!event || typeof Blockly == 'undefined' || !Blockly.Events)
    return
  // React only to structural edits; ignore UI-only events. Skip our own warning
  // writes so we never feed back into ourselves.
  let E = Blockly.Events
  let structural = [E.BLOCK_MOVE, E.BLOCK_CREATE, E.BLOCK_DELETE, E.BLOCK_CHANGE]
  if (structural.indexOf(event.type) === -1)
    return
  if (event.type === E.BLOCK_CHANGE && event.element === 'warning')
    return

  let ws = Blockly.Workspace.getById(event.workspaceId)
  if (!ws || ws.isFlyout || (ws.isDragging && ws.isDragging()))
    return

  const CALL_TYPES = ['procedures_callnoreturn', 'procedures_callreturn']
  const DEF_TYPES  = ['procedures_defnoreturn', 'procedures_defreturn']

  let defName  = (b) => { try { return b.getProcedureDef()[0] } catch (e) { return null } }
  let callName = (b) => { try { return b.getProcedureCall() } catch (e) { return null } }

  // Call graph: procedure name -> set of procedure names it calls.
  let graph = {}
  DEF_TYPES.forEach((t) => {
    ws.getBlocksByType(t, false).forEach((def) => {
      let name = defName(def)
      if (name == null)
        return
      let calls = graph[name] || (graph[name] = {})
      def.getDescendants(false).forEach((d) => {
        if (CALL_TYPES.indexOf(d.type) !== -1) {
          let c = callName(d)
          if (c != null)
            calls[c] = true
        }
      })
    })
  })

  // Can we travel from `start` back to `target` by following calls? (start===target counts.)
  let reaches = (start, target) => {
    let stack = [start], seen = {}
    while (stack.length) {
      let n = stack.pop()
      if (n === target)
        return true
      if (seen[n])
        continue
      seen[n] = true
      for (let k in (graph[n] || {}))
        stack.push(k)
    }
    return false
  }

  // The definition a call block physically lives inside (climb the parent chain).
  let enclosingDef = (b) => {
    let p = b.getParent()
    while (p) {
      if (DEF_TYPES.indexOf(p.type) !== -1)
        return defName(p)
      p = p.getParent()
    }
    return null
  }

  let msg = (typeof Msg != 'undefined' && Msg['FunctionRecursion']) ||
    'This function can call itself (recursion). On a microcontroller that can run forever and crash the board. Add a stop condition, or avoid calling the function from inside itself.'

  CALL_TYPES.forEach((t) => {
    ws.getBlocksByType(t, false).forEach((call) => {
      let called = callName(call)
      let inside = enclosingDef(call)
      // The call closes a cycle when the procedure it calls can reach back into the
      // definition that contains it — covers both self-calls and mutual recursion.
      let recursive = (called != null && inside != null && reaches(called, inside))
      call.setWarningText(recursive ? msg : null, 'recursion')
    })
  })
}

function isLocalContext() {
  return window.location.protocol === 'file:';
}

let moreInfo = 'is unknown, set at static/page/blocks/external.js'
let blocksRegisterCallbacks = (workspace) => {
  workspace.registerButtonCallback('installPyLib', (button) => {
    if (!/: (.*)$/.test(button.text_)){
      console.error(`Blocks: Blockly button "${button.text_}" is invalid.`)
      return
    }
    let id = button.text_.match(/: (.*)$/)[1]

    if (!Object.keys(knownLibs).includes(id)) {
      console.error(`Blocks: Blockly "${id}" library ${moreInfo}.`)
      return
    }
    //notification.send(`${Msg['PageBlocks']}: ${Tool.format([Msg['FetchingLib'], id])}`)
    let lib = knownLibs[id]
    let _toFetch
    if (typeof lib.file === "string")
      _toFetch = [lib.file]
    else
      _toFetch = lib.file

	if(isLocalContext()) {
		_toFetch.forEach(_lib_file => {
			const input = document.createElement('input')
			input.type = 'file'
			input.accept = '.' + _lib_file.split('.').pop()
			input.style.display = 'none'

			input.onchange = e => {
				const file = e.target.files[0]
				if (!file || file.name !== _lib_file) {
			  		console.error('Wrong file selected')
			  		document.body.removeChild(input)
			  		return
				}
				const reader = new FileReader()
				reader.onload = () => {
			  		files.device.writeToTarget(`/${_lib_file}`, 'WebSerial')
				}
				reader.readAsText(file)
				document.body.removeChild(input)
			}
			document.body.appendChild(input)
			input.click()
		})
	} else {
		_toFetch.forEach(_lib_file => {
		  const response = fetch(`${lib.hostname}/${_lib_file}`, {method:'Get'})
		    .then((response) => {
		      if (!response.ok)
		        throw new Error(response.status)
		      return response.text()
		    }).then(response => {
		      files.device.writeToTarget(`${_lib_file}`, response)
		    })
		})
	}
  })

  workspace.registerButtonCallback('loadExample', (button) => {
    if (!/: (.*)$/.test(button.text_)){
      console.error(`Blocks: Blockly button "${button.text_}" is invalid.`)
      return
    }
    let id = button.text_.match(/: (.*)$/)[1]

    if (!Object.keys(knownExamples).includes(id)) {
      console.error(`Blocks: Blockly "${id}" example ${moreInfo}.`)
      return
    }
    notification.send(`${Msg['PageBlocks']}: ${Tool.format([Msg['FetchingExample'], id])}`)
    let ex = knownExamples[id]
    if (typeof ex.file !== "string")
      return


    const response = fetch(`${ex.hostname}/${ex.file}`, {method:'Get'})
      .then((response) => {
        if (!response.ok)
          throw new Error(response.status)
        return response.text()
      }).then(response => {
        Blockly.Events.disable()
        try {
          Blockly.Xml.clearWorkspaceAndLoadFromXml(
            Blockly.Xml.textToDom(bipes.page.blocks.sanitizeLegacyXml(response)),
            bipes.page.blocks.workspace
          )
        } catch(e) {
          console.warn('Blocks: could not load example XML.', e.message)
          bipes.page.blocks.workspace.clear()
        } finally {
          Blockly.Events.enable()
        }
      })
  })


  workspace.registerButtonCallback('loadDoc', (button) => {
    if (!/: (.*)$/.test(button.text_)){
      console.error(`Blocks: Blockly button "${button.text_}" is invalid.`)
      return
    }
    let id = button.text_.match(/: (.*)$/)[1]

    if (!Object.keys(knownDocs).includes(id)) {
      console.error(`Blocks: Blockly "${id}" documentation ${moreInfo}.`)
      return
    }
    let doc = knownDocs[id]
    window.open(`${doc.hostname}/${doc.file}`, '_blank')
  })

  // Functions category: show the normal (synchronous) function blocks AND the
  // async-function blocks together. The category is custom="PROCEDURE", so its
  // flyout is built by a callback — we wrap Blockly's default one and append the
  // async-function / cooperative-wait / await blocks. Defensive: if anything
  // changes in the Blockly API, fall back to the default function blocks.
  workspace.registerToolboxCategoryCallback('PROCEDURE', (ws) => {
    let xmlList = Blockly.Procedures.flyoutCategory(ws)
    try {
      let toDom = (s) =>
        (Blockly.utils && Blockly.utils.xml && Blockly.utils.xml.textToDom)
          ? Blockly.utils.xml.textToDom(s)
          : Blockly.Xml.textToDom(s)
      let extras = [
        toDom('<block type="runtime_async_function"></block>'),
        toDom('<block type="runtime_wait"><value name="MS"><shadow type="math_number"><field name="NUM">1000</field></shadow></value></block>'),
        toDom('<block type="runtime_await"></block>')
      ]
      return Array.prototype.slice.call(xmlList).concat(extras)
    } catch (e) {
      console.error('Blocks: could not add async-function blocks to Functions category', e)
      return xmlList
    }
  })
}

/**
 * Code from
 * https://github.com/google/blockly/blob/096d1c46c5066cfa7e59db3b41405b7e854b95d0/tests/playgrounds/screenshot.js
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 * @fileoverview Download screenshot.
 * @author samelh@google.com (Sam El-Husseini)
 */
let blocksExport = {
  /**
   * Convert an SVG datauri into a PNG datauri.
   * @param {string} data SVG datauri.
   * @param {number} width Image width.
   * @param {number} height Image height.
   * @param {!Function} callback Callback.
   */
  svgToPng_: function (data, width, height, callback) {
    var canvas = document.createElement("canvas");
    var context = canvas.getContext("2d");
    var img = new Image();

    var pixelDensity = 10;
    canvas.width = width * pixelDensity;
    canvas.height = height * pixelDensity;
    img.onload = function() {
      context.drawImage(
          img, 0, 0, width, height, 0, 0, canvas.width, canvas.height);
      try {
        var dataUri = canvas.toDataURL('image/png');
        callback(dataUri);
      } catch (err) {
        console.warn('Error converting the workspace svg to a png');
        callback('');
      }
    };
    img.src = data;
  },
  /**
   * Create an SVG of the blocks on the workspace.
   * @param {!Blockly.WorkspaceSvg} workspace The workspace.
   * @param {!Function} callback Callback.
   * @param {boolean} _svg - True to export as svg, false png.
   * @param {string=} customCss Custom CSS to append to the SVG.
   */
  workspaceToSvg_: function (workspace, callback, _svg, customCss) {
    // Go through all text areas and set their value.
    var textAreas = document.getElementsByTagName("textarea");
    for (var i = 0; i < textAreas.length; i++) {
      textAreas[i].innerHTML = textAreas[i].value;
    }

    var bBox = workspace.getBlocksBoundingBox();
    var x = bBox.x || bBox.left;
    var y = bBox.y || bBox.top;
    var width = bBox.width || bBox.right - x;
    var height = bBox.height || bBox.bottom - y;

    var blockCanvas = workspace.getCanvas();
    var clone = blockCanvas.cloneNode(true);
    clone.removeAttribute('transform');

    var svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svg.appendChild(clone);
    svg.setAttribute('viewBox',
        x + ' ' + y + ' ' + width + ' ' + height);

    svg.setAttribute('class', 'blocklySvg ' +
      (workspace.options.renderer || 'geras') + '-renderer ' +
      (workspace.getTheme ? workspace.getTheme().name + '-theme' : ''));
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);
    svg.setAttribute("style", 'background-color: transparent');

    var css = [].slice.call(document.head.querySelectorAll('style'))
        .filter(function(el) { return /\.blocklySvg/.test(el.innerText) ||
          (el.id.indexOf('blockly-') === 0); }).map(function(el) {
          return el.innerText; }).join('\n');
    var style = document.createElement('style');
    style.innerHTML = css + '\n' + customCss;
    svg.insertBefore(style, svg.firstChild);

    var svgAsXML = (new XMLSerializer).serializeToString(svg);
    svgAsXML = svgAsXML.replace(/&nbsp/g, '&#160');

    if (_svg === true){
      DOM.prototypeDownload('workspace.bipes.svg', svgAsXML)
      return
    } else {
      let data = 'data:image/svg+xml,' + encodeURIComponent(svgAsXML);
      this.svgToPng_(data, width, height, (data) => {
        DOM.prototypeDownload('workspace.bipes.png', data)
      })
      return
    }
  },
  /**
   * Download a png screenshot of the blocks on a Blockly workspace.
   * @param {!Blockly.WorkspaceSvg} workspace The Blockly workspace.
   */
  png: function () {
    this.workspaceToSvg_(bipes.page.blocks.workspace, (datauri) => {
    })
  },
  /**
   * Download a svg screenshot of the blocks on a Blockly workspace.
   * @param {!Blockly.WorkspaceSvg} workspace The Blockly workspace.
   */
  svg: function () {
    this.workspaceToSvg_(bipes.page.blocks.workspace, (datauri) => {
    }, true)
  }
}

export let blocks = new Blocks()
