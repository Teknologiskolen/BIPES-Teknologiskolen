"use strict";

import {DOM, ContextMenu, Animate} from '../../base/dom.js'
import {Tool} from '../../base/tool.js'
import {command} from '../../base/command.js'

import {project} from '../project/main.js'

function visionMsg (key, fallback){
  return (window.Msg && Msg[key]) || fallback
}

class Vision {
  constructor (){
    this.name = 'vision'
    this.available = false
    this.inited = false
    this.tree = {}
    this.currentSID = undefined
    this.selectedGraphId = null
    this.graphSessions = {}
    this.loadingProjectState = false

    this.originalImageData = null
    this.originalFilename = ''
    this.inputImages = {}
    this.selectedNodeId = null
    this.outputCache = {}
    this.boardPadding = 120
    this.nodeDrag = null
    this.connectionDrag = null
    this.contextMenu = null
    this.contextMenuSubmenu = null
    this.contextMenuSubmenuTrigger = null
    this.expandedNodeHelp = {}
    this.addNodeMenuOpen = false

    this.bufferCanvas = document.createElement('canvas')
    this.bufferContext = this.bufferCanvas.getContext('2d', {willReadFrequently:true})
    this.processingCanvas = document.createElement('canvas')
    this.processingContext = this.processingCanvas.getContext('2d', {willReadFrequently:true})
    this.defaultNodes = this.makeDefaultNodes()
    this.nodes = this.cloneNodes(this.defaultNodes)
    this.selectedNodeId = this.nodes[0].id

    let $ = this.$ = {}

    const section = DOM.get('section#vision')
    if (!section)
      return

    this.available = true
    $.section = new DOM(section)
    $.section.$.classList.add('default')

    $.container = new DOM('div', {className:'container vision-container'})
    $.tabContextMenu = new DOM('div')
    this.tabContextMenu = new ContextMenu($.tabContextMenu, this)

    $.section.append([
      $.container,
      $.tabContextMenu
    ])

    this.handlePointerMove = (ev) => {this.onPointerMove(ev)}
    this.handlePointerUp = (ev) => {this.onPointerUp(ev)}
    this.handleWindowPointerDown = (ev) => {this.onWindowPointerDown(ev)}
    window.addEventListener('mousemove', this.handlePointerMove)
    window.addEventListener('mouseup', this.handlePointerUp)
    window.addEventListener('mousedown', this.handleWindowPointerDown)

    command.add(this, {
      add: this._add,
      remove: this._remove,
      rename: this._rename
    })

    this.load(this.empty())
  }

  init (){
    if (!this.available || this.inited)
      return

    if (this.tree instanceof Array)
      this.tree = {}

    if (!this.tree || Object.keys(this.tree).length === 0) {
      let graph = this.makeGraph()
      this.tree[graph.id] = graph
      this.selectedGraphId = graph.id
    }

    this.renderShell()
    this.restore()
    this.inited = true
    this.select(this.selectedGraphId || Object.keys(this.tree)[0])
  }

  deinit (){
    if (!this.available || !this.inited)
      return

    this.saveCurrentGraphState()
    this.nodeDrag = null
    this.connectionDrag = null
    this.addNodeMenuOpen = false
    this.closeContextMenu()

    if (this.$.tabs)
      this.$.tabs.removeChilds()

    if (this.$.container)
      this.$.container.$.innerHTML = ''

    this.currentSID = undefined
    this.inited = false
  }

  resize (){
    if (!this.available || !this.inited)
      return

    this.renderConnections()
  }

  empty (){
    let graph = this.makeGraph()
    let tree = {}
    tree[graph.id] = graph

    return {
      selectedGraphId:graph.id,
      tree:tree
    }
  }

  load (obj){
    let wasInited = this.inited
    this.loadingProjectState = true

    try {
      if (wasInited)
        this.deinit()

      let data = this.normalizeData(obj)
      this.tree = data.tree
      this.selectedGraphId = data.selectedGraphId
      this.currentSID = undefined
      this.graphSessions = {}
      this.loadGraphState(this.selectedGraphId)

      if (wasInited)
        this.init()
    } finally {
      this.loadingProjectState = false
    }
  }

  renderShell (){
    let $ = this.$
    $.container.$.innerHTML = ''

    $.tabs = new DOM('span', {className:'vision-tabs'})
    $.add = new DOM('button', {
      className:'icon',
      id:'add',
      title:visionMsg('VisionNewGraph', 'New vision graph')
    }).onclick(this, this.add, [true])

    $.resetButton = new DOM('button', {
      id:'discard',
      className:'icon text',
      innerText:Msg['VisionResetGraph']
    }).onclick(this, this.resetGraph)

    if (!$.addNodeMenuBtn) {
      $.addNodeMenuBtn = new DOM('button', {
        id:'vision-add-node',
        className:'icon',
        title:visionMsg('VisionAddNode', 'Add node')
      }).onclick(this, this.toggleAddNodeMenu)
      $.section.append([$.addNodeMenuBtn])
    }

    $.addNodePopup = new DOM('div', {id:'vision-node-popup', className:'popup'})
    $.addNodePopup.$.addEventListener('click', (ev) => {
      if (ev.target === $.addNodePopup.$) this.closeAddNodeMenu()
    })

    $.header = new DOM('div', {className:'vision-header'}).append([
      new DOM('div', {className:'vision-header-left'}).append([
        $.tabs,
        $.add
      ]),
      new DOM('span', {className:'vision-header-right'}).append([
        $.resetButton
      ])
    ])

    $.workspace = new DOM('div', {className:'vision-panel vision-workspace-panel'})

    $.layout = new DOM('div', {className:'vision-layout'})
      .append([
        $.workspace
      ])

    $.container.append([
      $.header,
      $.layout,
      $.addNodePopup
    ])

    this.renderWorkspaceShell()
  }

  restore (){
    this.renderTabs()
  }

  renderTabs (){
    if (!this.$.tabs)
      return

    this.$.tabs.removeChilds()

    for (const sid in this.tree)
      this.include(sid, this.tree[sid])
  }

  include (sid, obj){
    let h3 = new DOM('h3', {innerText:obj.name})

    obj.dom = new DOM('button', {
      sid:sid,
      className:`vision-tab${sid === this.selectedGraphId ? ' on' : ''}`
    })
      .append([h3])
      .onevent('contextmenu', this, (ev) => {
        ev.preventDefault()
        this.tabContextMenu.open([
          {
            id:'rename',
            innerText:Msg['Rename'],
            fun:this.rename,
            args:[sid, obj.name]
          }, {
            id:'remove',
            innerText:Msg['Remove'],
            fun:this.remove,
            args:[sid]
          }
        ], ev)
      })
      .onclick(this, this.select, [sid])

    this.$.tabs.append(obj.dom)
  }

  commit (){
    if (this.loadingProjectState)
      return

    this.syncProject()
  }

  add (select){
    let sid = `vision-graph-${Tool.SID()}`
    command.dispatch(this, 'add', [sid, project.currentUID])
    this.commit()

    if (select === true)
      this.select(sid)
  }

  _add (sid, projectUID){
    if (projectUID !== project.currentUID)
      return

    this.tree[sid] = this.makeGraph(sid)

    if (this.inited)
      this.renderTabs()
  }

  remove (sid){
    if (this.tabContextMenu)
      this.tabContextMenu.close()

    if (!this.tree[sid] || Object.keys(this.tree).length <= 1)
      return

    command.dispatch(this, 'remove', [sid, project.currentUID])
    this.commit()
  }

  _remove (sid, projectUID){
    if (projectUID !== project.currentUID)
      return

    if (!this.tree[sid] || Object.keys(this.tree).length <= 1)
      return

    if (sid === this.currentSID)
      this.unselect()

    delete this.tree[sid]
    delete this.graphSessions[sid]

    if (!this.tree[this.selectedGraphId])
      this.selectedGraphId = Object.keys(this.tree)[0] || null

    if (this.inited) {
      this.renderTabs()
      if (this.selectedGraphId)
        this.select(this.selectedGraphId)
    }
  }

  rename (sid, name){
    this.tabContextMenu.oninput({
      title:visionMsg('VisionGraphName', 'Vision graph name'),
      placeholder:name,
      value:name
    }, (input, ev) => {
      ev.preventDefault()
      let next = input.value
      this.tabContextMenu.close()

      if (next == undefined || next.trim() === '')
        return

      command.dispatch(this, 'rename', [sid, next, project.currentUID])
      this.commit()
    })
  }

  _rename (sid, name, projectUID){
    if (projectUID !== project.currentUID)
      return

    let graph = this.tree[sid]
    let trimmed = String(name || '').trim()

    if (!graph || trimmed === '')
      return

    graph.name = trimmed

    if (this.inited) {
      let title = DOM.get(`[data-sid='${sid}'] h3`, this.$.tabs)
      if (title)
        title.innerText = trimmed
    }
  }

  select (sid){
    if (!this.tree[sid])
      return

    if (this.currentSID !== undefined && this.currentSID !== sid)
      this.unselect()

    this.currentSID = sid
    this.selectedGraphId = sid
    this.loadGraphState(sid)

    let tab = DOM.get(`[data-sid='${sid}']`, this.$.tabs)
    if (tab)
      tab.classList.add('on')

    this.commit()
    this.render()
  }

  unselect (){
    if (this.currentSID === undefined)
      return

    this.saveCurrentGraphState()

    let tab = DOM.get(`[data-sid='${this.currentSID}']`, this.$.tabs)
    if (tab)
      tab.classList.remove('on')

    this.currentSID = undefined
  }

  makeGraph (sid){
    let graphNumber = Object.keys(this.tree || {}).length + 1
    return {
      id:sid || `vision-graph-${DOM.UID()}`,
      name:`${visionMsg('VisionGraph', 'Vision graph')} ${graphNumber}`,
      nodes:this.cloneNodes(this.defaultNodes)
    }
  }

  normalizeData (obj){
    if (obj && obj.tree && typeof obj.tree === 'object' && !Array.isArray(obj.tree)) {
      let tree = this.normalizeTree(obj.tree)
      let selectedGraphId = tree[obj.selectedGraphId] ? obj.selectedGraphId : Object.keys(tree)[0]
      return {
        selectedGraphId:selectedGraphId,
        tree:tree
      }
    }

    if (obj && obj.nodes instanceof Array) {
      let graph = this.makeGraph()
      graph.name = visionMsg('VisionGraphLegacyName', 'Vision graph 1')
      graph.nodes = this.normalizeNodes(obj.nodes)
      let tree = {}
      tree[graph.id] = graph
      return {
        selectedGraphId:graph.id,
        tree:tree
      }
    }

    return this.empty()
  }

  normalizeTree (tree){
    let normalized = {}

    Object.keys(tree || {}).forEach((sid, index) => {
      let item = tree[sid] || {}
      normalized[sid] = {
        id:sid,
        name:typeof item.name === 'string' && item.name.trim() !== ''
          ? item.name.trim()
          : `${visionMsg('VisionGraph', 'Vision graph')} ${index + 1}`,
        nodes:this.normalizeNodes(item.nodes instanceof Array ? item.nodes : this.defaultNodes)
      }
    })

    if (Object.keys(normalized).length === 0) {
      let fallback = this.makeGraph()
      normalized[fallback.id] = fallback
    }

    return normalized
  }

  getGraphSession (sid){
    if (!sid)
      sid = this.currentSID || this.selectedGraphId || '__session__'

    if (!this.graphSessions[sid]) {
      this.graphSessions[sid] = {
        originalImageData:null,
        originalFilename:'',
        inputImages:{},
        outputCache:{},
        expandedNodeHelp:{},
        selectedNodeId:null
      }
    }

    return this.graphSessions[sid]
  }

  saveCurrentGraphState (){
    if (!this.currentSID || !this.tree[this.currentSID])
      return

    this.tree[this.currentSID].nodes = this.cloneNodes(this.nodes)

    let session = this.getGraphSession(this.currentSID)
    session.originalImageData = this.originalImageData
    session.originalFilename = this.originalFilename
    session.inputImages = this.inputImages
    session.outputCache = this.outputCache
    session.expandedNodeHelp = this.expandedNodeHelp
    session.selectedNodeId = this.selectedNodeId
  }

  loadGraphState (sid){
    let graph = this.tree[sid]
    if (!graph)
      return

    let session = this.getGraphSession(sid)
    this.nodes = this.normalizeNodes(graph.nodes || this.defaultNodes)
    this.originalImageData = session.originalImageData
    this.originalFilename = session.originalFilename || ''
    this.inputImages = session.inputImages || {}
    this.outputCache = session.outputCache || {}
    this.expandedNodeHelp = session.expandedNodeHelp || {}
    this.selectedNodeId = this.findNode(session.selectedNodeId)
      ? session.selectedNodeId
      : (this.nodes[0] ? this.nodes[0].id : null)
  }

  makeDefaultNodes (){
    return [{
      id:'vision-input',
      type:'input',
      sourceId:null,
      sourceIds:{},
      params:{},
      x:84,
      y:96
    }]
  }

  cloneNodes (nodes){
    return nodes.map((node) => {
      let sourceIds = {}
      if (node.sourceIds && typeof node.sourceIds == 'object')
        Object.keys(node.sourceIds).forEach((key) => {
          sourceIds[key] = node.sourceIds[key]
        })

      return {
        id:node.id,
        type:node.type,
        sourceId:node.sourceId,
        sourceIds:sourceIds,
        params:{...node.params},
        x:node.x,
        y:node.y
      }
    })
  }

  normalizeNodes (nodes){
    let normalized = []
    let hasInput = false

    nodes.forEach((node, index) => {
      let type = VisionNodeTypes[node.type] ? node.type : 'input'
      if (type === 'input')
        hasInput = true

      let inputSlots = this.getNodeInputSlots(type)
      let sourceIds = {}
      inputSlots.forEach((slot, slotIndex) => {
        let sourceId = null
        if (node.sourceIds && typeof node.sourceIds == 'object' && typeof node.sourceIds[slot.name] == 'string')
          sourceId = node.sourceIds[slot.name]
        else if (slotIndex === 0 && typeof node.sourceId == 'string')
          sourceId = node.sourceId
        sourceIds[slot.name] = sourceId
      })
      let primarySourceId = inputSlots[0] ? sourceIds[inputSlots[0].name] : null

      normalized.push({
        id:typeof node.id == 'string' ? node.id : `vision-node-${index}`,
        type:type,
        sourceId:type === 'input' ? null : primarySourceId,
        sourceIds:type === 'input' ? {} : sourceIds,
        params:VisionNodeTypes[type].sanitize(node.params || {}),
        x:Number.isFinite(node.x) ? node.x : 84 + index * 240,
        y:Number.isFinite(node.y) ? node.y : 96 + (index % 2) * 188
      })
    })

    if (!hasInput)
      normalized.unshift(this.makeDefaultNodes()[0])

    let normalizedById = {}
    normalized.forEach((node) => {
      normalizedById[node.id] = node
    })

    let wouldCreateCycle = (sourceNodeId, targetNodeId) => {
      let stack = [sourceNodeId]
      let visited = {}
      while (stack.length > 0) {
        let current = stack.pop()
        if (!current || visited[current])
          continue
        visited[current] = true
        if (current === targetNodeId)
          return true

        let currentNode = normalizedById[current]
        if (!currentNode)
          continue

        this.getNodeInputSlots(currentNode).forEach((slot) => {
          let sourceId = this.getNodeSourceId(currentNode, slot.name)
          if (sourceId)
            stack.push(sourceId)
        })
      }
      return false
    }

    normalized.forEach((node) => {
      if (node.type === 'input') {
        node.sourceId = null
        node.sourceIds = {}
        return
      }
      this.getNodeInputSlots(node).forEach((slot, slotIndex) => {
        let sourceId = this.getNodeSourceId(node, slot.name)
        if (!normalizedById[sourceId] || sourceId === node.id || wouldCreateCycle(sourceId, node.id))
          this.setNodeSourceId(node, null, slot.name)
        else if (slotIndex === 0)
          node.sourceId = sourceId
      })
    })

    return normalized
  }

  getNodeInputSlots (nodeOrType){
    let type = typeof nodeOrType == 'string' ? nodeOrType : nodeOrType && nodeOrType.type
    if (!type || type === 'input')
      return []

    let nodeType = VisionNodeTypes[type]
    if (nodeType && Array.isArray(nodeType.inputSlots))
      return nodeType.inputSlots

    return [{
      name:'image',
      labelKey:'VisionInputSlotImage',
      fallbackLabel:'Image'
    }]
  }

  getInputSlotLabel (slot){
    return visionMsg(slot.labelKey, slot.fallbackLabel || slot.name)
  }

  getInputSourceLabel (node){
    let inputIndex = this.getInputNodeIndex(node)
    if (inputIndex >= 0)
      return String(inputIndex)

    return node && node.id ? node.id : visionMsg('VisionNodeInputBadge', 'Source')
  }

  getInputNodeIndex (node){
    if (!node)
      return -1

    let inputs = this.nodes.filter((item) => item.type === 'input')
    return inputs.findIndex((item) => item.id === node.id)
  }

  getPrimaryInputName (node){
    let slots = this.getNodeInputSlots(node)
    return slots[0] ? slots[0].name : 'image'
  }

  getNodeSourceId (node, inputName){
    if (!node)
      return null

    let slotName = inputName || this.getPrimaryInputName(node)
    if (node.sourceIds && typeof node.sourceIds == 'object' && typeof node.sourceIds[slotName] == 'string')
      return node.sourceIds[slotName]

    return slotName === this.getPrimaryInputName(node) ? node.sourceId || null : null
  }

  setNodeSourceId (node, sourceId, inputName){
    if (!node)
      return

    let slotName = inputName || this.getPrimaryInputName(node)
    if (!node.sourceIds || typeof node.sourceIds != 'object')
      node.sourceIds = {}

    if (sourceId)
      node.sourceIds[slotName] = sourceId
    else
      delete node.sourceIds[slotName]

    if (slotName === this.getPrimaryInputName(node))
      node.sourceId = sourceId || null
  }

  getNodeTypeLabel (type){
    let nodeType = VisionNodeTypes[type]
    if (!nodeType)
      return type
    return visionMsg(nodeType.labelKey, nodeType.fallbackLabel || type)
  }

  getNodeTypeDescription (type){
    let nodeType = VisionNodeTypes[type]
    if (!nodeType)
      return ''
    return visionMsg(nodeType.descriptionKey, nodeType.fallbackDescription || '')
  }

  getNodeTypeHelp (type){
    let nodeType = VisionNodeTypes[type]
    if (!nodeType)
      return ''
    return visionMsg(nodeType.helpKey, nodeType.fallbackHelp || '')
  }

  toggleNodeHelp (nodeId, ev){
    if (ev)
      ev.stopPropagation()

    this.expandedNodeHelp[nodeId] = !this.expandedNodeHelp[nodeId]
    this.renderNodes()
    this.renderConnections()
  }

  getControlLabel (control){
    return visionMsg(control.labelKey, control.fallbackLabel || control.name)
  }

  getNodeSourceImageData (node, inputName){
    let sourceId = this.getNodeSourceId(node, inputName)
    if (!node || !sourceId)
      return this.originalImageData

    let sourceOutput = this.getNodeOutput(sourceId)
    return this.getOutputImageData(sourceOutput)
  }

  resolveControlForNode (node, control){
    let resolved = {...control}
    let sourceImage = this.getNodeSourceImageData(node)
    if (!sourceImage)
      return resolved

    if (node.type === 'crop') {
      let minWidth = Number.isFinite(control.min) ? control.min : 1
      let minHeight = Number.isFinite(control.min) ? control.min : 1
      let widthControl = VisionNodeTypes.crop.controls.find((item) => item.name === 'width')
      let heightControl = VisionNodeTypes.crop.controls.find((item) => item.name === 'height')
      if (widthControl && Number.isFinite(widthControl.min))
        minWidth = widthControl.min
      if (heightControl && Number.isFinite(heightControl.min))
        minHeight = heightControl.min

      let currentX = Math.max(0, Math.min(sourceImage.width - minWidth, Number(node.params.x) || 0))
      let currentY = Math.max(0, Math.min(sourceImage.height - minHeight, Number(node.params.y) || 0))
      let currentWidth = Math.max(minWidth, Math.min(sourceImage.width - currentX, Number(node.params.width) || minWidth))
      let currentHeight = Math.max(minHeight, Math.min(sourceImage.height - currentY, Number(node.params.height) || minHeight))

      if (control.name === 'x') {
        resolved.min = 0
        resolved.max = Math.max(0, sourceImage.width - currentWidth)
      } else if (control.name === 'y') {
        resolved.min = 0
        resolved.max = Math.max(0, sourceImage.height - currentHeight)
      } else if (control.name === 'width') {
        resolved.min = minWidth
        resolved.max = Math.max(minWidth, sourceImage.width - currentX)
      } else if (control.name === 'height') {
        resolved.min = minHeight
        resolved.max = Math.max(minHeight, sourceImage.height - currentY)
      }
    }

    if (
      ['objectCountOutput', 'objectCenterOutput', 'boundingBoxOutput', 'rotationOutput'].includes(node.type) &&
      control.name === 'minAreaPixels'
    ) {
      resolved.max = Math.max(1, sourceImage.width * sourceImage.height)
    }

    if (node.type === 'adaptiveThreshold' && control.name === 'blockSize') {
      let maxBlock = Math.min(51, Math.max(3, Math.min(sourceImage.width, sourceImage.height)))
      if (maxBlock % 2 === 0)
        maxBlock = Math.max(3, maxBlock - 1)
      resolved.max = maxBlock
    }

    return resolved
  }

  getEffectiveNodeParams (node){
    let params = {...node.params}
    let controls = (VisionNodeTypes[node.type] && VisionNodeTypes[node.type].controls) || []
    controls.forEach((control) => {
      let resolved = this.resolveControlForNode(node, control)
      params[control.name] = this.clampControlValue(resolved, params[control.name])
    })
    return params
  }

  clampControlValue (control, value){
    if (!control)
      return value

    if (control.type !== 'range' && control.type !== 'number')
      return value

    let numeric = Number(value)
    if (!Number.isFinite(numeric))
      numeric = Number(control.min)
    if (!Number.isFinite(numeric))
      numeric = 0

    if (Number.isFinite(control.min))
      numeric = Math.max(control.min, numeric)
    if (Number.isFinite(control.max))
      numeric = Math.min(control.max, numeric)

    if (Number.isFinite(control.step) && control.step > 0) {
      let min = Number.isFinite(control.min) ? control.min : 0
      numeric = Math.round((numeric - min) / control.step) * control.step + min
      if (Number.isFinite(control.min))
        numeric = Math.max(control.min, numeric)
      if (Number.isFinite(control.max))
        numeric = Math.min(control.max, numeric)
    }

    return numeric
  }

  applyRangeInputState (input, control, value){
    if (!input)
      return

    let numericValue = this.clampControlValue(control, value)
    let min = Number.isFinite(control.min) ? control.min : 0
    let max = Number.isFinite(control.max) ? control.max : numericValue
    let step = Number.isFinite(control.step) && control.step > 0 ? control.step : 1

    input.setAttribute('min', String(min))
    input.setAttribute('max', String(max))
    input.setAttribute('step', String(step))
    input.min = String(min)
    input.max = String(max)
    input.step = String(step)
    input.value = String(numericValue)

    if (typeof input.valueAsNumber == 'number' && Number.isFinite(numericValue))
      input.valueAsNumber = numericValue
  }

  bindNodeControlEvents (input){
    if (!input || !input.$)
      return input

    ;['mousedown', 'mouseup', 'click', 'pointerdown', 'pointerup', 'touchstart', 'touchend'].forEach((eventName) => {
      input.$.addEventListener(eventName, (ev) => {
        ev.stopPropagation()
      })
    })
    return input
  }

  refreshNodeControls (nodeId){
    let node = this.findNode(nodeId)
    if (!node || !this.$.nodes || !this.$.nodes.$)
      return

    let card = this.$.nodes.$.querySelector(`[data-node-id="${nodeId}"]`)
    if (!card)
      return

    let nodeType = VisionNodeTypes[node.type]
    if (!nodeType || !Array.isArray(nodeType.controls))
      return

    nodeType.controls.forEach((control) => {
      let resolvedControl = this.resolveControlForNode(node, control)
      let currentValue = this.clampControlValue(resolvedControl, node.params[control.name])
      node.params[control.name] = currentValue

      card.querySelectorAll(`[data-value-target="${control.name}"]`).forEach((input) => {
        if (input.dataset.valueRole === 'label') {
          input.innerText = String(currentValue)
          return
        }

        if (resolvedControl.type === 'range') {
          this.applyRangeInputState(input, resolvedControl, currentValue)
          return
        }

        if (typeof resolvedControl.min != 'undefined') {
          input.min = resolvedControl.min
          input.setAttribute('min', String(resolvedControl.min))
        }
        if (typeof resolvedControl.max != 'undefined') {
          input.max = resolvedControl.max
          input.setAttribute('max', String(resolvedControl.max))
        }
        if (typeof resolvedControl.step != 'undefined') {
          input.step = resolvedControl.step
          input.setAttribute('step', String(resolvedControl.step))
        }
        input.value = String(currentValue)
      })
    })
  }

  hasOpenCV (){
    return Boolean(
      typeof window != 'undefined' &&
      window.cv &&
      typeof window.cv.Mat == 'function'
    )
  }

  visionEngine (){
    return this.hasOpenCV() ? 'opencv' : 'builtin'
  }

  renderWorkspaceShell (){
    this.$.workspace.removeChilds()
    this.$.graphScroll = new DOM('div', {className:'vision-graph-scroll'})
    this.$.graphBoard = new DOM('div', {className:'vision-graph-board'})

    let svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svgEl.setAttribute('class', 'vision-connections-svg')
    svgEl.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:visible;z-index:3;width:100%;height:100%;'
    svgEl.innerHTML = `<defs>
  <marker id="vision-arr" markerWidth="7" markerHeight="6" refX="7" refY="3" orient="auto">
    <path d="M0,0 L0,6 L7,3 Z" fill="#38bdf8"/>
  </marker>
  <marker id="vision-arr-active" markerWidth="7" markerHeight="6" refX="7" refY="3" orient="auto">
    <path d="M0,0 L0,6 L7,3 Z" fill="#facc15"/>
  </marker>
</defs>
<path id="vision-drag-preview" display="none" stroke="#facc15" stroke-dasharray="6,3" fill="none" stroke-width="1.8" marker-end="url(#vision-arr-active)"/>`
    this.$.graphBoard.$.appendChild(svgEl)
    this.$.connectionsSvg = { $: svgEl }

    this.$.nodes = new DOM('div', {className:'vision-node-list'})
    this.$.contextMenu = this.makeContextMenu()
    this.$.graphBoard.onclick(this, this.clearSelection)
    this.$.graphBoard.$.addEventListener('contextmenu', (ev) => {
      ev.preventDefault()
    })

    this.$.graphBoard.append([this.$.nodes, this.$.contextMenu])
    this.$.graphScroll.append(this.$.graphBoard)
    this.$.workspace.append([this.$.graphScroll])
  }

  render (){
    if (!this.available || !this.inited)
      return

    this.updateBoardSize()
    this.renderTabs()
    this.renderNodes()
    window.requestAnimationFrame(() => {this.renderConnections()})
  }

  renderNodes (){
    this.$.nodes.removeChilds()
    let inputNodeCount = this.nodes.filter((item) => item.type === 'input').length

    this.nodes.forEach((node) => {
      let nodeType = VisionNodeTypes[node.type]
      let card = new DOM('div', {
        className:`vision-node${this.selectedNodeId === node.id ? ' selected' : ''}`
      })
      card.$.dataset.nodeId = node.id
      card.$.dataset.nodeType = node.type
      card.style.left = `${node.x}px`
      card.style.top = `${node.y}px`
      card.onclick(this, this.selectNode, [node.id])

      let header = new DOM('div', {className:'vision-node-header'})
      let headerActions = new DOM('div', {className:'vision-node-actions'})
      let helpButton = new DOM('button', {
        innerText:this.expandedNodeHelp[node.id] ? '−' : '+',
        className:'vision-node-help-toggle',
        title:'Read more about this node'
      })
      helpButton
        .ondown(this, (ev) => {ev.stopPropagation()})
        .onup(this, (ev) => {ev.stopPropagation()})
        .onclick(this, this.toggleNodeHelp, [node.id])

      if (node.type === 'input') {
        headerActions.append(new DOM('span', {
          className:'vision-node-badge',
          innerText:Msg['VisionNodeInputBadge']
        }))
        if (inputNodeCount > 1) {
          headerActions.append(
            new DOM('button', {
              id:'remove',
              innerText:'×',
              className:'vision-node-remove',
              title:Msg['VisionRemoveNode']
            })
              .ondown(this, (ev) => {ev.stopPropagation()})
              .onup(this, (ev) => {ev.stopPropagation()})
              .onclick(this, this.removeNode, [node.id])
          )
        }
      } else {
        headerActions.append(
          new DOM('button', {
            id:'remove',
            innerText:'×',
            className:'vision-node-remove',
            title:Msg['VisionRemoveNode']
          })
            .ondown(this, (ev) => {ev.stopPropagation()})
            .onup(this, (ev) => {ev.stopPropagation()})
            .onclick(this, this.removeNode, [node.id])
        )
      }

      header.ondown(this, this.startNodeDrag, [node.id])
        .append([
          new DOM('div', {
            className:'vision-node-title',
            innerText:node.type === 'input'
              ? `${this.getNodeTypeLabel(node.type)} ${this.getInputSourceLabel(node)}`
              : this.getNodeTypeLabel(node.type)
          }),
          headerActions
        ])

      let body = new DOM('div', {className:'vision-node-body'})
      let uploadInput = null
      let uploadLabel = null
      let metaRow = new DOM('div', {className:'vision-node-meta-row'})
      let metaText = null

      if (node.type === 'input') {
        let uploadId = `vision-upload-${DOM.UID()}`
        uploadInput = new DOM('input', {
          type:'file',
          accept:'image/*'
        }).onevent('change', this, this.uploadImage, [node.id])
        uploadInput.id = uploadId

        uploadLabel = new DOM('label', {
          id:'upload',
          className:'icon text vision-upload-trigger',
          innerText:Msg['VisionUploadImage']
        })
        uploadLabel.$.htmlFor = uploadId
        uploadLabel.$.addEventListener('click', (ev) => {
          ev.preventDefault()
          ev.stopPropagation()
          uploadInput.$.click()
        })

        uploadInput.$.addEventListener('click', (ev) => {
          ev.stopPropagation()
        })

        metaText = new DOM('div', {
          className:'vision-node-meta',
          innerText:this.getInputNodeFilename(node) || Msg['VisionAwaitingImage']
        })
      } else {
        metaText = new DOM('div', {
          className:'vision-node-meta',
          innerText:(this.getNodeTypeDescription(node.type) || '').split('.')[0]
        })
      }

      metaRow.append([metaText, helpButton])
      body.append(metaRow)

      let helpText = this.getNodeTypeHelp(node.type)
      if (helpText && this.expandedNodeHelp[node.id]) {
        body.append(new DOM('div', {
          className:'vision-node-help',
          innerText:helpText
        }))
      }

      nodeType.controls.forEach((control) => {
        let resolvedControl = this.resolveControlForNode(node, control)
        let currentValue = this.clampControlValue(resolvedControl, node.params[control.name])
        node.params[control.name] = currentValue
        let wrapper = new DOM('label', {
          className:`vision-field${control.type === 'range' ? ' range' : ''}`
        })
        wrapper.append(new DOM('span', {
          className:'vision-field-label',
          innerText:this.getControlLabel(resolvedControl)
        }))

        if (resolvedControl.type === 'range') {
          let inputs = new DOM('div', {className:'vision-field-inputs'})
          let slider = new DOM('input')
          slider.$.type = 'range'
          this.applyRangeInputState(slider.$, resolvedControl, currentValue)
          this.bindNodeControlEvents(slider)
          slider.onevent('input', this, this.changeNodeParam, [node.id, control.name, resolvedControl.type])
          slider.onevent('change', this, this.changeNodeParam, [node.id, control.name, resolvedControl.type])
          let valueLabel = new DOM('div', {
            className:'vision-field-value',
            innerText:String(currentValue)
          })

          slider.$.dataset.valueTarget = control.name
          valueLabel.$.dataset.valueTarget = control.name
          valueLabel.$.dataset.valueRole = 'label'
          inputs.append(slider)
          wrapper.append(inputs)
          wrapper.append(valueLabel)
        } else {
          let input = new DOM('input', {
            type:resolvedControl.type,
            value:String(currentValue),
            min:resolvedControl.min,
            max:resolvedControl.max,
            step:resolvedControl.step
          })
          this.bindNodeControlEvents(input)
          input.onevent('input', this, this.changeNodeParam, [node.id, control.name, resolvedControl.type])
          input.onevent('change', this, this.changeNodeParam, [node.id, control.name, resolvedControl.type])
          input.$.dataset.valueTarget = control.name
          wrapper.append(input)
        }

        body.append(wrapper)
      })

      let preview = new DOM('canvas', {
        className:'vision-node-preview',
        width:200,
        height:140
      })
      preview.$.dataset.previewNodeId = node.id
      body.append(preview)

      if (node.type === 'input') {
        body.append(
          new DOM('div', {className:'vision-upload-control'})
            .append([uploadLabel, uploadInput])
        )
      }

      let status = new DOM('div', {
        className:'vision-node-meta',
        innerText:this.getNodeStatus(node)
      })

      let ports = new DOM('div', {className:'vision-node-ports'})
      let inputSlots = this.getNodeInputSlots(node)
      inputSlots.forEach((slot, slotIndex) => {
        let inputPort = new DOM('button', {
          className:'vision-port input',
          title:`${Msg['VisionInputPort']}: ${this.getInputSlotLabel(slot)}`
        })
        inputPort.$.dataset.portNodeId = node.id
        inputPort.$.dataset.portType = 'input'
        inputPort.$.dataset.portInputName = slot.name
        inputPort.$.dataset.portLabel = inputSlots.length > 1 ? this.getInputSlotLabel(slot) : ''
        inputPort.$.style.top = `${1.15 + slotIndex * 1.55}rem`
        inputPort.$.setAttribute('aria-label', `${Msg['VisionInputPort']}: ${this.getInputSlotLabel(slot)}`)
        inputPort.$.addEventListener('mousedown', (ev) => {
          ev.stopPropagation()
          if (typeof ev.button !== 'undefined' && ev.button !== 0)
            return
          if (this.connectionDrag && this.connectionDrag.fromPortType === 'output')
            this.completeConnectionOnInput(node.id, slot.name)
          else
            this.startConnectionFromInput(node.id, slot.name, ev)
        })
        inputPort.$.addEventListener('mouseup', (ev) => {
          ev.stopPropagation()
          if (this.connectionDrag && this.connectionDrag.fromPortType === 'output')
            this.completeConnectionOnInput(node.id, slot.name)
        })
        inputPort.$.addEventListener('click', (ev) => {
          ev.stopPropagation()
        })
        ports.append(inputPort)
      })

      let outputPort = new DOM('button', {
        className:'vision-port output',
        title:Msg['VisionOutputPort']
      })
      outputPort.$.dataset.portNodeId = node.id
      outputPort.$.dataset.portType = 'output'
      outputPort.$.addEventListener('mousedown', (ev) => {
        ev.stopPropagation()
        if (typeof ev.button !== 'undefined' && ev.button !== 0)
          return
        if (this.connectionDrag && this.connectionDrag.fromPortType === 'input')
          this.completeConnectionOnOutput(node.id)
        else
          this.startConnectionFromOutput(node.id, ev)
      })
      outputPort.$.addEventListener('mouseup', (ev) => {
        ev.stopPropagation()
        if (this.connectionDrag && this.connectionDrag.fromPortType === 'input')
          this.completeConnectionOnOutput(node.id)
      })
      outputPort.$.addEventListener('click', (ev) => {
        ev.stopPropagation()
      })

      ports.append(outputPort)

      card.append([ports, header, body, status])
      this.$.nodes.append(card)

      this.drawNodePreview(node.id, preview.$)
    })
  }

  renderConnections (){
    if (!this.$.connectionsSvg || !this.$.graphBoard)
      return

    let svg = this.$.connectionsSvg.$
    let pathEls = svg.querySelectorAll('g.vision-conn, path#vision-drag-preview')
    pathEls.forEach((el) => {
      if (el.id !== 'vision-drag-preview')
        el.remove()
    })

    let dragPreview = svg.querySelector('#vision-drag-preview')

    this.nodes.forEach((node) => {
      this.getNodeInputSlots(node).forEach((slot) => {
        let sourceId = this.getNodeSourceId(node, slot.name)
        if (!sourceId)
          return

        let start = this.getPortCenter(sourceId, 'output')
        let end = this.getPortCenter(node.id, 'input', slot.name)
        if (!start || !end)
          return

        let g = this.makeSvgConnection(start.x, start.y, end.x, end.y, false, node.id, slot.name)
        svg.insertBefore(g, dragPreview || null)
      })
    })

    if (this.connectionDrag) {
      let start = this.connectionDrag.fromPortType === 'input'
        ? this.getPortCenter(this.connectionDrag.nodeId, 'input', this.connectionDrag.inputName)
        : this.getPortCenter(this.connectionDrag.nodeId, 'output')
      if (start && dragPreview) {
        let d = this.makeBezierPath(start.x, start.y, this.connectionDrag.x, this.connectionDrag.y)
        dragPreview.setAttribute('d', d)
        dragPreview.removeAttribute('display')
      }
    } else if (dragPreview) {
      dragPreview.setAttribute('display', 'none')
    }
  }

  addNode (type){
    let defaults = VisionNodeTypes[type]
    let previous = this.nodes[this.nodes.length - 1]
    let position = this.contextMenu && this.contextMenu.position ? this.contextMenu.position : null
    this.nodes.push({
      id:`vision-${DOM.UID()}`,
      type:type,
      sourceId:null,
      sourceIds:{},
      params:defaults.sanitize({}),
      x:position ? position.x : previous ? previous.x + 250 : 320,
      y:position ? position.y : previous ? previous.y : 96
    })
    this.selectedNodeId = this.nodes[this.nodes.length - 1].id
    this.closeContextMenu()
    this.changed()
  }

  removeNode (nodeId, ev){
    if (ev)
      ev.stopPropagation()

    let nodeToRemove = this.findNode(nodeId)
    if (!nodeToRemove)
      return

    if (nodeToRemove.type === 'input' && this.nodes.filter((node) => node.type === 'input').length <= 1)
      return

    if (this.nodeDrag && this.nodeDrag.nodeId === nodeId)
      this.nodeDrag = null
    if (this.connectionDrag && this.connectionDrag.nodeId === nodeId)
      this.connectionDrag = null

    delete this.expandedNodeHelp[nodeId]
    delete this.outputCache[nodeId]
    delete this.inputImages[nodeId]

    let nodes = this.cloneNodes(this.nodes.filter((node) => node.id !== nodeId))
    let fallback = nodes[0] ? nodes[0].id : null

    nodes.forEach((node) => {
      if (node.type === 'input')
        return

      if (node.sourceId === nodeId)
        node.sourceId = null
      if (node.sourceIds && typeof node.sourceIds == 'object') {
        Object.keys(node.sourceIds).forEach((inputName) => {
          if (node.sourceIds[inputName] === nodeId)
            delete node.sourceIds[inputName]
        })
      }
    })

    this.nodes = this.normalizeNodes(nodes)
    if (!this.findNode(this.selectedNodeId) || this.selectedNodeId === nodeId)
      this.selectedNodeId = fallback
    this.changed()
  }

  selectNode (nodeId){
    this.selectedNodeId = nodeId
    this.closeContextMenu()
    this.render()
  }

  clearSelection (ev){
    if (ev.target !== this.$.graphBoard.$ && ev.target !== this.$.connectionsSvg.$ && ev.target !== this.$.nodes.$)
      return
    this.selectedNodeId = null
    this.closeContextMenu()
    this.render()
  }

  resetGraph (){
    this.nodes = this.cloneNodes(this.defaultNodes)
    this.selectedNodeId = this.nodes[0].id
    this.inputImages = {}
    this.originalImageData = null
    this.originalFilename = ''
    this.expandedNodeHelp = {}
    this.invalidateOutputs()
    this.changed()
    this.closeContextMenu()
  }

  changeNodeParam (nodeId, name, type, ev){
    let node = this.findNode(nodeId)
    if (!node)
      return

    let control = (VisionNodeTypes[node.type] && VisionNodeTypes[node.type].controls || []).find((item) => item.name === name)
    let resolvedControl = this.resolveControlForNode(node, control)
    let rawValue = (type === 'range' && typeof ev.target.valueAsNumber == 'number' && Number.isFinite(ev.target.valueAsNumber))
      ? ev.target.valueAsNumber
      : ev.target.value
    let value = type === 'range' || type === 'number'
      ? this.clampControlValue(resolvedControl, rawValue)
      : ev.target.value
    node.params[name] = value
    if (type === 'range')
      this.applyRangeInputState(ev.target, resolvedControl, value)
    else
      ev.target.value = String(value)
    let wrapper = ev.target.closest('.vision-field')
    if (wrapper) {
      wrapper.querySelectorAll(`[data-value-target="${name}"]`).forEach((input) => {
        if (input.dataset.valueRole === 'label') {
          input.innerText = String(value)
          return
        }

        if (input !== ev.target)
          input.value = String(value)
      })
    }
    if (ev.type === 'input' && (type === 'range' || type === 'number')) {
      this.invalidateOutputs()
      this.refreshNodeControls(nodeId)
      return
    }
    this.changed()
  }

  changed (){
    this.invalidateOutputs()
    this.saveCurrentGraphState()
    this.syncProject()
    this.render()
  }

  syncProject (){
    if (this.loadingProjectState || !project.currentUID)
      return

    let currentProject = project.projects[project.currentUID]
    if (!currentProject)
      return

    this.saveCurrentGraphState()

    let tree = {}
    Object.keys(this.tree).forEach((sid) => {
      tree[sid] = {
        name:this.tree[sid].name,
        nodes:this.cloneNodes(this.tree[sid].nodes)
      }
    })

    currentProject.vision = {
      selectedGraphId:this.selectedGraphId,
      tree:tree
    }
    if (currentProject.project)
      currentProject.project.lastEdited = +new Date()/1000
    project.write(project.currentUID)
  }

  findNode (nodeId){
    return this.nodes.find((node) => node.id === nodeId)
  }

  invalidateOutputs (){
    this.outputCache = {}
  }

  startNodeDrag (nodeId, ev){
    if (ev.button !== 0)
      return

    if (ev.target && typeof ev.target.closest == 'function' && ev.target.closest('button'))
      return

    let node = this.findNode(nodeId)
    if (!node)
      return

    let pointer = this.getPointerPositionInBoard(ev)
    this.nodeDrag = {
      nodeId:nodeId,
      offsetX:pointer.x - node.x,
      offsetY:pointer.y - node.y
    }
    this.selectedNodeId = nodeId
    this.closeContextMenu()
    this.render()
  }

  startConnection (nodeId, ev){
    this.startConnectionFromOutput(nodeId, ev)
  }

  startConnectionFromOutput (nodeId, ev){
    if (typeof ev.button !== 'undefined' && ev.button !== 0)
      return

    let pointer = this.getPointerPositionInBoard(ev)
    this.connectionDrag = {
      fromPortType:'output',
      nodeId:nodeId,
      inputName:null,
      x:pointer.x,
      y:pointer.y
    }
    this.selectedNodeId = nodeId
    this.closeContextMenu()
    this.renderConnections()
  }

  startConnectionFromInput (nodeId, inputName, ev){
    if (typeof ev.button !== 'undefined' && ev.button !== 0)
      return

    let node = this.findNode(nodeId)
    if (!node || node.type === 'input')
      return

    let pointer = this.getPointerPositionInBoard(ev)
    this.connectionDrag = {
      fromPortType:'input',
      nodeId:nodeId,
      inputName:inputName,
      x:pointer.x,
      y:pointer.y
    }
    this.selectedNodeId = nodeId
    this.closeContextMenu()
    this.renderConnections()
  }

  completeConnection (targetNodeId, targetInputName){
    this.completeConnectionOnInput(targetNodeId, targetInputName)
  }

  completeConnectionOnInput (targetNodeId, targetInputName){
    if (!this.connectionDrag || this.connectionDrag.fromPortType !== 'output')
      return

    this.connectNodes(this.connectionDrag.nodeId, targetNodeId, targetInputName)
    this.connectionDrag = null
    this.renderConnections()
  }

  completeConnectionOnOutput (sourceNodeId){
    if (!this.connectionDrag || this.connectionDrag.fromPortType !== 'input')
      return

    this.connectNodes(sourceNodeId, this.connectionDrag.nodeId, this.connectionDrag.inputName)
    this.connectionDrag = null
    this.renderConnections()
  }

  connectNodes (sourceNodeId, targetNodeId, targetInputName){
    let sourceNode = this.findNode(sourceNodeId)
    let targetNode = this.findNode(targetNodeId)

    if (!sourceNode || !targetNode || targetNode.type === 'input')
      return

    if (sourceNodeId === targetNodeId)
      return

    if (this.wouldCreateCycle(sourceNodeId, targetNodeId))
      return

    this.setNodeSourceId(targetNode, sourceNodeId, targetInputName)
    this.changed()
  }

  disconnectNode (targetNodeId, targetInputName){
    let node = this.findNode(targetNodeId)
    if (!node || node.type === 'input')
      return

    if (targetInputName)
      this.setNodeSourceId(node, null, targetInputName)
    else {
      this.getNodeInputSlots(node).forEach((slot) => {
        this.setNodeSourceId(node, null, slot.name)
      })
    }
    this.changed()
  }

  wouldCreateCycle (sourceNodeId, targetNodeId){
    let stack = [sourceNodeId]
    let visited = {}

    while (stack.length > 0) {
      let current = stack.pop()
      if (!current || visited[current])
        continue
      visited[current] = true

      if (current === targetNodeId)
        return true
      let node = this.findNode(current)
      if (!node)
        continue

      this.getNodeInputSlots(node).forEach((slot) => {
        let sourceId = this.getNodeSourceId(node, slot.name)
        if (sourceId)
          stack.push(sourceId)
      })
    }
    return false
  }

  onPointerMove (ev){
    if (!this.inited || !this.$.graphBoard)
      return

    if (this.nodeDrag) {
      let pointer = this.getPointerPositionInBoard(ev)
      let node = this.findNode(this.nodeDrag.nodeId)
      if (!node)
        return
      node.x = Math.max(24, Math.round(pointer.x - this.nodeDrag.offsetX))
      node.y = Math.max(24, Math.round(pointer.y - this.nodeDrag.offsetY))
      this.updateBoardSize()
      this.renderNodes()
      this.renderConnections()
      return
    }

    if (this.connectionDrag) {
      let pointer = this.getPointerPositionInBoard(ev)
      this.connectionDrag.x = pointer.x
      this.connectionDrag.y = pointer.y
      this.renderConnections()
    }
  }

  onPointerUp (ev){
    if (!this.inited || !this.$.graphBoard)
      return

    if (this.nodeDrag) {
      this.nodeDrag = null
      this.saveCurrentGraphState()
      this.syncProject()
      this.renderConnections()
    }

    if (this.connectionDrag) {
      if (this.connectionDrag.fromPortType === 'output') {
        let target = this.getInputPortTargetAtPoint(ev.clientX, ev.clientY)
        if (target)
          this.connectNodes(this.connectionDrag.nodeId, target.nodeId, target.inputName)
      } else {
        let source = this.getOutputPortTargetAtPoint(ev.clientX, ev.clientY)
        if (source)
          this.connectNodes(source.nodeId, this.connectionDrag.nodeId, this.connectionDrag.inputName)
      }
      this.connectionDrag = null
      this.renderConnections()
    }
  }

  onWindowPointerDown (ev){
    if (!this.contextMenu || !this.contextMenu.open)
      return
    if (!this.$.contextMenu || !this.$.contextMenu.$)
      return
    if (this.$.contextMenu.$.contains(ev.target))
      return
    this.closeContextMenu()
  }

  getPointerPositionInBoard (ev){
    let rect = this.$.graphBoard.$.getBoundingClientRect()
    return {
      x:ev.clientX - rect.left,
      y:ev.clientY - rect.top
    }
  }

  getPortCenter (nodeId, type, inputName){
    let selector = `[data-port-node-id="${nodeId}"][data-port-type="${type}"]`
    if (inputName)
      selector += `[data-port-input-name="${inputName}"]`
    let port = DOM.get(selector, this.$.graphBoard.$)
    if (!port)
      return null
    let rect = port.getBoundingClientRect()
    let boardRect = this.$.graphBoard.$.getBoundingClientRect()
    return {
      x:rect.left + rect.width / 2 - boardRect.left,
      y:rect.top + rect.height / 2 - boardRect.top
    }
  }

  getInputPortTargetAtPoint (clientX, clientY){
    let element = document.elementFromPoint(clientX, clientY)
    if (!element || typeof element.closest != 'function')
      return null

    let port = element.closest('[data-port-type="input"][data-port-node-id]')
    if (!port || !this.$.graphBoard.$.contains(port))
      return null

    return {
      nodeId:port.dataset.portNodeId || null,
      inputName:port.dataset.portInputName || null
    }
  }

  getOutputPortTargetAtPoint (clientX, clientY){
    let element = document.elementFromPoint(clientX, clientY)
    if (!element || typeof element.closest != 'function')
      return null

    let port = element.closest('[data-port-type="output"][data-port-node-id]')
    if (!port || !this.$.graphBoard.$.contains(port))
      return null

    return {
      nodeId:port.dataset.portNodeId || null
    }
  }

  makeContextMenu (){
    let menu = new DOM('div', {className:'vision-context-menu'})
    let root = new DOM('div', {className:'vision-context-menu-root'})
    let submenu = new DOM('div', {className:'vision-context-submenu'})

    VisionPaletteGroups.forEach((group) => {
      let title = new DOM('button', {
        className:'vision-context-menu-group-trigger icon text',
        type:'button',
        innerText:group.label
      })
      title.$.addEventListener('mouseenter', () => {
        this.showContextSubmenu(group, title)
      })
      title.$.addEventListener('focus', () => {
        this.showContextSubmenu(group, title)
      })
      title.$.addEventListener('click', (ev) => {
        ev.preventDefault()
        this.showContextSubmenu(group, title)
      })
      root.append(title)
    })

    menu.$.addEventListener('mouseleave', () => {
      this.hideContextSubmenu()
    })
    menu.append([root, submenu])
    this.$.contextSubmenu = submenu
    return menu
  }

  showContextSubmenu (group, trigger){
    if (!this.$.contextSubmenu || !this.$.contextMenu)
      return

    this.$.contextSubmenu.removeChilds()
    group.nodes.forEach((type) => {
      this.$.contextSubmenu.append(
        new DOM('button', {
          id:'add',
          className:'icon text',
          type:'button',
          innerText:this.getNodeTypeLabel(type)
        }).onclick(this, this.addNode, [type])
      )
    })

    if (this.contextMenuSubmenuTrigger)
      this.contextMenuSubmenuTrigger.$.classList.remove('active')

    this.contextMenuSubmenuTrigger = trigger
    this.contextMenuSubmenuTrigger.$.classList.add('active')
    this.$.contextSubmenu.$.classList.add('open')
    this.$.contextMenu.$.classList.add('submenu-open')
    this.$.contextMenu.style.display = 'grid'
    this.$.contextMenu.style.gridTemplateColumns = '13.5rem 15rem'
    this.$.contextMenu.style.gap = '0.35rem'
    this.$.contextMenu.style.width = 'calc(13.5rem + 15rem + 0.35rem + 0.8rem)'
    this.$.contextSubmenu.style.display = 'flex'
    this.$.contextSubmenu.style.flexDirection = 'column'
    this.$.contextSubmenu.style.alignItems = 'stretch'
  }

  hideContextSubmenu (){
    if (this.$.contextSubmenu) {
      this.$.contextSubmenu.removeChilds()
      this.$.contextSubmenu.$.classList.remove('open')
      this.$.contextSubmenu.style.display = ''
      this.$.contextSubmenu.style.flexDirection = ''
      this.$.contextSubmenu.style.alignItems = ''
    }
    if (this.contextMenuSubmenuTrigger) {
      this.contextMenuSubmenuTrigger.$.classList.remove('active')
      this.contextMenuSubmenuTrigger = null
    }
    if (this.$.contextMenu) {
      this.$.contextMenu.style.display = ''
      this.$.contextMenu.style.gridTemplateColumns = ''
      this.$.contextMenu.style.gap = ''
      this.$.contextMenu.style.width = ''
    }
  }

  handleBoardContextMenu (ev){
    let target = ev.target
    if (!target)
      return
    if (typeof target.closest == 'function') {
      if (target.closest('.vision-node') || target.closest('.vision-conn')) {
        this.closeContextMenu()
        return
      }
    }

    let pointer = this.getPointerPositionInBoard(ev)
    this.openContextMenu(pointer.x, pointer.y)
  }

  openContextMenu (x, y){
    if (!this.$.contextMenu)
      return

    let menuWidth = 240
    let boardWidth = this.$.graphBoard.$.clientWidth
    let boardHeight = this.$.graphBoard.$.clientHeight

    this.$.contextMenu.$.classList.add('open')
    this.$.contextMenu.$.classList.remove('measuring')
    this.$.contextMenu.style.visibility = 'hidden'
    this.$.contextMenu.style.left = '0px'
    this.$.contextMenu.style.top = '0px'

    let menuHeight = this.$.contextMenu.$.offsetHeight || Math.min(boardHeight - 32, 420)
    let clampedX = Math.max(16, Math.min(x, boardWidth - menuWidth - 16))
    let clampedY = Math.max(16, Math.min(y, boardHeight - menuHeight - 16))

    this.contextMenu = {
      open:true,
      position:{
        x:clampedX,
        y:clampedY
      }
    }

    this.$.contextMenu.style.left = `${clampedX}px`
    this.$.contextMenu.style.top = `${clampedY}px`
    this.$.contextMenu.style.visibility = ''
  }

  closeContextMenu (){
    if (this.contextMenu)
      this.contextMenu.open = false
    this.hideContextSubmenu()
    if (this.$.contextMenu)
      this.$.contextMenu.$.classList.remove('open', 'submenu-open')
  }

  toggleAddNodeMenu (){
    if (this.addNodeMenuOpen) {
      this.closeAddNodeMenu()
    } else {
      this.openAddNodeMenu()
    }
  }

  openAddNodeMenu (){
    let popup = this.$.addNodePopup
    if (!popup) return

    popup.$.innerHTML = ''
    let card = document.createElement('div')
    card.className = 'vision-node-popup-card'

    let header = document.createElement('div')
    header.className = 'vision-node-popup-header'

    let title = document.createElement('h2')
    title.className = 'vision-node-popup-title'
    title.textContent = visionMsg('VisionAddNode', 'Add node')
    header.appendChild(title)

    let tabBar = document.createElement('div')
    tabBar.className = 'vision-node-popup-tabs'

    let grid = document.createElement('div')
    grid.className = 'vision-node-group-grid'

    const showGroup = (groupIndex) => {
      grid.innerHTML = ''
      tabBar.querySelectorAll('.vision-node-tab').forEach((t, i) => {
        t.classList.toggle('on', i === groupIndex)
      })
      VisionPaletteGroups[groupIndex].nodes.forEach((type) => {
        let btn = document.createElement('button')
        btn.type = 'button'
        btn.className = 'vision-node-btn'
        btn.innerHTML = `${VISION_NODE_ICONS[type] || VISION_NODE_ICONS['_default']}<span>${this.getNodeTypeLabel(type)}</span>`
        btn.addEventListener('click', () => {
          this.addNode(type)
          this.closeAddNodeMenu()
        })
        grid.appendChild(btn)
      })
    }

    VisionPaletteGroups.forEach((group, i) => {
      let tab = document.createElement('button')
      tab.type = 'button'
      tab.className = 'vision-node-tab'
      tab.textContent = group.label
      tab.addEventListener('click', () => showGroup(i))
      tabBar.appendChild(tab)
    })

    header.appendChild(tabBar)
    card.appendChild(header)
    card.appendChild(grid)
    popup.$.appendChild(card)
    showGroup(0)
    this.addNodeMenuOpen = true
    Animate.on(popup.$)
  }

  closeAddNodeMenu (){
    if (!this.$.addNodePopup) return
    this.addNodeMenuOpen = false
    Animate.off(this.$.addNodePopup.$)
  }

  makeBezierPath (x1, y1, x2, y2){
    let offset = Math.max(60, Math.hypot(x2 - x1, y2 - y1) * 0.4)
    return `M${x1},${y1} C${x1 + offset},${y1} ${x2 - offset},${y2} ${x2},${y2}`
  }

  makeSvgConnection (x1, y1, x2, y2, _active, targetNodeId, targetInputName){
    let ns = 'http://www.w3.org/2000/svg'
    let g = document.createElementNS(ns, 'g')
    g.setAttribute('class', 'vision-conn')

    let d = this.makeBezierPath(x1, y1, x2, y2)

    let hit = document.createElementNS(ns, 'path')
    hit.setAttribute('d', d)
    hit.setAttribute('fill', 'none')
    hit.setAttribute('stroke', 'transparent')
    hit.setAttribute('stroke-width', '12')
    hit.setAttribute('pointer-events', 'none')

    let line = document.createElementNS(ns, 'path')
    line.setAttribute('d', d)
    line.setAttribute('fill', 'none')
    line.setAttribute('stroke', '#38bdf8')
    line.setAttribute('stroke-width', '1.8')
    line.setAttribute('marker-end', 'url(#vision-arr)')
    line.style.pointerEvents = 'none'

    if (targetNodeId) {
      g.setAttribute('pointer-events', 'all')
      hit.setAttribute('pointer-events', 'stroke')
      let removeConnection = (ev) => {
        ev.preventDefault()
        ev.stopPropagation()
        this.disconnectNode(targetNodeId, targetInputName)
      }
      g.dataset.targetNodeId = targetNodeId
      if (targetInputName)
        g.dataset.targetInputName = targetInputName
      g.addEventListener('contextmenu', removeConnection)
      g.addEventListener('mousedown', (ev) => {
        if (ev.button === 2)
          removeConnection(ev)
      })
      g.addEventListener('mouseenter', () => {
        line.setAttribute('stroke', '#facc15')
        line.setAttribute('marker-end', 'url(#vision-arr-active)')
      })
      g.addEventListener('mouseleave', () => {
        line.setAttribute('stroke', '#38bdf8')
        line.setAttribute('marker-end', 'url(#vision-arr)')
      })
    }

    g.appendChild(hit)
    g.appendChild(line)
    return g
  }

  updateBoardSize (){
    let maxX = 760
    let maxY = 520
    this.nodes.forEach((node) => {
      maxX = Math.max(maxX, node.x + 320)
      maxY = Math.max(maxY, node.y + 280)
    })
    let w = maxX + this.boardPadding
    let h = maxY + this.boardPadding
    this.$.graphBoard.style.width = `${w}px`
    this.$.graphBoard.style.height = `${h}px`
    if (this.$.connectionsSvg && this.$.connectionsSvg.$) {
      // Read actual rendered board size (min-width:100% may make it wider than w)
      let actualW = this.$.graphBoard.$.offsetWidth || w
      let actualH = this.$.graphBoard.$.offsetHeight || h
      let svg = this.$.connectionsSvg.$
      svg.setAttribute('width', String(actualW))
      svg.setAttribute('height', String(actualH))
      svg.setAttribute('viewBox', `0 0 ${actualW} ${actualH}`)
    }
  }

  getInputNodeImageData (node){
    if (node && this.inputImages[node.id] && this.inputImages[node.id].imageData)
      return this.inputImages[node.id].imageData

    let firstInputNode = this.nodes.find((item) => item.type === 'input')
    return !node || (firstInputNode && node.id === firstInputNode.id) ? this.originalImageData : null
  }

  getInputNodeFilename (node){
    if (node && this.inputImages[node.id] && this.inputImages[node.id].filename)
      return this.inputImages[node.id].filename

    let firstInputNode = this.nodes.find((item) => item.type === 'input')
    return !node || (firstInputNode && node.id === firstInputNode.id) ? this.originalFilename : ''
  }

  uploadImage (nodeId, ev){
    let file = ev.target.files && ev.target.files[0]
    if (!file)
      return

    let image = new Image()
    let objectUrl = URL.createObjectURL(file)
    image.onload = () => {
      let maxSide = 720
      let ratio = Math.min(1, maxSide / Math.max(image.width, image.height))
      let width = Math.max(1, Math.round(image.width * ratio))
      let height = Math.max(1, Math.round(image.height * ratio))
      this.processingCanvas.width = width
      this.processingCanvas.height = height
      this.processingContext.clearRect(0, 0, width, height)
      this.processingContext.drawImage(image, 0, 0, width, height)
      let imageData = this.processingContext.getImageData(0, 0, width, height)
      this.inputImages[nodeId] = {
        imageData:imageData,
        filename:file.name
      }
      if (!this.originalImageData || nodeId === this.nodes[0].id) {
        this.originalImageData = imageData
        this.originalFilename = file.name
      }
      this.invalidateOutputs()
      this.saveCurrentGraphState()
      this.render()
      ev.target.value = ''
      URL.revokeObjectURL(objectUrl)
    }
    image.src = objectUrl
  }

  drawNodePreview (nodeId, canvas){
    let output = this.getNodeOutput(nodeId)
    let imageData = this.getOutputImageData(output)
    if (!imageData) {
      this.drawPlaceholder(canvas, this.getOutputSummary(output) || Msg['VisionNoImage'])
      return
    }

    let context = canvas.getContext('2d')
    context.clearRect(0, 0, canvas.width, canvas.height)
    context.fillStyle = getComputedStyle(document.body).getPropertyValue('--vision-preview-background') || '#111'
    context.fillRect(0, 0, canvas.width, canvas.height)

    this.bufferCanvas.width = imageData.width
    this.bufferCanvas.height = imageData.height
    this.bufferContext.putImageData(imageData, 0, 0)

    let ratio = Math.min(canvas.width / imageData.width, canvas.height / imageData.height)
    let drawWidth = imageData.width * ratio
    let drawHeight = imageData.height * ratio
    let x = (canvas.width - drawWidth) / 2
    let y = (canvas.height - drawHeight) / 2
    context.imageSmoothingEnabled = false
    context.drawImage(this.bufferCanvas, x, y, drawWidth, drawHeight)
  }

  drawPlaceholder (canvas, text){
    let context = canvas.getContext('2d')
    context.clearRect(0, 0, canvas.width, canvas.height)
    context.fillStyle = getComputedStyle(document.body).getPropertyValue('--vision-preview-background') || '#111'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.strokeStyle = 'rgba(255,255,255,0.15)'
    context.strokeRect(10, 10, canvas.width - 20, canvas.height - 20)
    context.fillStyle = 'rgba(255,255,255,0.72)'
    context.font = '14px sans-serif'
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillText(text, canvas.width / 2, canvas.height / 2, canvas.width - 32)
  }

  getNodeOutput (nodeId){
    if (this.outputCache.hasOwnProperty(nodeId))
      return this.outputCache[nodeId]

    let node = this.findNode(nodeId)
    if (!node)
      return null

    let output
    if (node.type === 'input')
      output = this.getInputNodeImageData(node) ? this.cloneImageData(this.getInputNodeImageData(node)) : null
    else {
      let nodeType = VisionNodeTypes[node.type]
      let params = this.getEffectiveNodeParams(node)
      if (nodeType.runInputs)
        output = nodeType.runInputs(this.getNodeInputs(node), params, this, node)
      else {
        let source = this.getNodeOutput(this.getNodeSourceId(node))
        output = source ? nodeType.run(source, params, this, node) : null
      }
    }

    this.outputCache[nodeId] = output
    return output
  }

  getNodeInputs (node){
    let inputs = {}
    this.getNodeInputSlots(node).forEach((slot) => {
      let sourceId = this.getNodeSourceId(node, slot.name)
      let output = sourceId ? this.getNodeOutput(sourceId) : null
      inputs[slot.name] = {
        sourceId:sourceId,
        output:output,
        imageData:this.getOutputImageData(output)
      }
    })
    return inputs
  }

  getNodeStatus (node){
    let output = this.getNodeOutput(node.id)
    if (!output)
      return Msg['VisionAwaitingImage']
    return this.getOutputSummary(output)
  }

  getNodeDescription (node){
    if (node.type === 'input')
      return this.getInputNodeFilename(node) === '' ? Msg['VisionInspectorEmpty'] : this.getInputNodeFilename(node)
    let source = this.findNode(this.getNodeSourceId(node))
    let sourceLabel = source ? this.getNodeTypeLabel(source.type) : Msg['VisionWireHelp']
    return Msg['VisionInspectorSource'].replace('{0}', sourceLabel)
  }

  isImageDataOutput (output){
    return output instanceof ImageData ||
      (
        output &&
        typeof output == 'object' &&
        typeof output.width == 'number' &&
        typeof output.height == 'number' &&
        output.data instanceof Uint8ClampedArray
      )
  }

  isStructuredOutput (output){
    return Boolean(output && typeof output == 'object' && output.kind === 'vision-output')
  }

  getOutputImageData (output){
    if (this.isImageDataOutput(output))
      return output
    if (this.isStructuredOutput(output) && this.isImageDataOutput(output.imageData))
      return output.imageData
    return null
  }

  getOutputMetrics (output){
    if (this.isStructuredOutput(output) && output.metrics)
      return output.metrics

    let imageData = this.getOutputImageData(output)
    return imageData ? this.measureImageData(imageData) : null
  }

  getOutputSummary (output){
    if (!output)
      return Msg['VisionAwaitingImage']

    if (this.isStructuredOutput(output)) {
      if (output.text)
        return output.text
      if (typeof output.value != 'undefined')
        return `${output.type}: ${output.value}`
      return output.type || Msg['VisionAwaitingImage']
    }

    if (this.isImageDataOutput(output))
      return `${output.width} x ${output.height}`

    return Msg['VisionAwaitingImage']
  }

  buildDefaultOutput (imageData, metrics){
    if (!metrics)
      return null

    return {
      kind:'vision-output',
      type:'metrics',
      value:metrics.whitePercent,
      text:`whitePercent: ${(metrics.whitePercent * 100).toFixed(1)}%`,
      confidence:1,
      fields:{
        engine:this.visionEngine(),
        detected:metrics.whitePercent >= 0.02,
        state:metrics.whitePercent >= 0.02 ? 'on' : 'off',
        ...metrics
      },
      metrics:metrics,
      imageData:imageData
    }
  }

  getSetups (){
    return Object.keys(this.tree).map((sid) => {
      return {
        id:sid,
        name:this.tree[sid].name,
        nodes:this.cloneNodes(this.tree[sid].nodes),
        runsOn:['browser']
      }
    })
  }

  getSetup (setupId){
    let setups = this.getSetups()
    return setups.find((setup) => setup.id === setupId) || setups[0]
  }

  getSetupInputNodes (setupId){
    let setup = this.getSetup(setupId)
    let nodes = this.normalizeNodes(setup.nodes)
    return nodes.filter((node) => node.type === 'input')
  }

  getFinalNodeId (nodes){
    let consumed = {}
    nodes.forEach((node) => {
      this.getNodeInputSlots(node).forEach((slot) => {
        let sourceId = this.getNodeSourceId(node, slot.name)
        if (sourceId)
          consumed[sourceId] = true
      })
    })

    let terminals = nodes.filter((node) => !consumed[node.id])
    let processingTerminals = terminals.filter((node) => node.type !== 'input')
    if (processingTerminals.length > 0)
      return processingTerminals[processingTerminals.length - 1].id

    return terminals.length > 0 ? terminals[terminals.length - 1].id : nodes[nodes.length - 1].id
  }

  getRuntimeInputImageData (node, inputImages){
    if (this.isImageDataOutput(inputImages))
      return inputImages

    if (inputImages && typeof inputImages == 'object') {
      let imageData = inputImages[node.id] || inputImages.default || inputImages.imageData
      if (this.isImageDataOutput(imageData))
        return imageData
    }

    return null
  }

  runSetupOnImageData (setupId, imageData){
    let setup = this.getSetup(setupId)
    let nodes = this.normalizeNodes(setup.nodes)
    let cache = {}
    let finalNodeId = this.getFinalNodeId(nodes)

    let runNode = (nodeId) => {
      if (cache.hasOwnProperty(nodeId))
        return cache[nodeId]

      let node = nodes.find((item) => item.id === nodeId)
      if (!node)
        return null

      let output = null
      if (node.type === 'input')
        output = this.getRuntimeInputImageData(node, imageData)
          ? this.cloneImageData(this.getRuntimeInputImageData(node, imageData))
          : null
      else {
        let nodeType = VisionNodeTypes[node.type]
        let params = this.getEffectiveNodeParams(node)
        if (nodeType.runInputs) {
          let inputs = {}
          this.getNodeInputSlots(node).forEach((slot) => {
            let sourceId = this.getNodeSourceId(node, slot.name)
            let sourceOutput = sourceId ? runNode(sourceId) : null
            inputs[slot.name] = {
              sourceId:sourceId,
              output:sourceOutput,
              imageData:this.getOutputImageData(sourceOutput)
            }
          })
          output = nodeType.runInputs(inputs, params, this, node)
        } else {
          let source = runNode(this.getNodeSourceId(node))
          output = source ? nodeType.run(source, params, this, node) : null
        }
      }

      cache[nodeId] = output
      return output
    }

    let output = runNode(finalNodeId)
    let finalImageData = this.getOutputImageData(output)
    let metrics = this.getOutputMetrics(output)
    let structuredOutput = this.isStructuredOutput(output) ? output : this.buildDefaultOutput(finalImageData, metrics)

    return {
      setup:setup,
      finalNodeId:finalNodeId,
      imageData:finalImageData,
      metrics:metrics,
      output:structuredOutput,
      rawOutput:output
    }
  }

  async videoElementToImageData (video){
    let width = video.videoWidth || 320
    let height = video.videoHeight || 240
    this.processingCanvas.width = width
    this.processingCanvas.height = height
    this.processingContext.clearRect(0, 0, width, height)
    this.processingContext.drawImage(video, 0, 0, width, height)
    return this.processingContext.getImageData(0, 0, width, height)
  }

  imageBlobToImageData (blob){
    return new Promise((resolve, reject) => {
      let image = new Image()
      let objectUrl = URL.createObjectURL(blob)
      image.onload = () => {
        let maxSide = 720
        let ratio = Math.min(1, maxSide / Math.max(image.width, image.height))
        let width = Math.max(1, Math.round(image.width * ratio))
        let height = Math.max(1, Math.round(image.height * ratio))
        this.processingCanvas.width = width
        this.processingCanvas.height = height
        this.processingContext.clearRect(0, 0, width, height)
        this.processingContext.drawImage(image, 0, 0, width, height)
        URL.revokeObjectURL(objectUrl)
        resolve(this.processingContext.getImageData(0, 0, width, height))
      }
      image.onerror = () => {
        URL.revokeObjectURL(objectUrl)
        reject(new Error('Failed to load vision image'))
      }
      image.src = objectUrl
    })
  }

  drawImageDataToCanvas (imageData, canvas){
    let context = canvas.getContext('2d')
    context.clearRect(0, 0, canvas.width, canvas.height)
    if (!imageData)
      return

    this.bufferCanvas.width = imageData.width
    this.bufferCanvas.height = imageData.height
    this.bufferContext.putImageData(imageData, 0, 0)
    let ratio = Math.min(canvas.width / imageData.width, canvas.height / imageData.height)
    let drawWidth = imageData.width * ratio
    let drawHeight = imageData.height * ratio
    let x = (canvas.width - drawWidth) / 2
    let y = (canvas.height - drawHeight) / 2
    context.fillStyle = '#111827'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.imageSmoothingEnabled = false
    context.drawImage(this.bufferCanvas, x, y, drawWidth, drawHeight)
  }

  measureImageData (imageData){
    let pixels = imageData.width * imageData.height
    let sum = 0
    let brightPixels = 0
    let darkPixels = 0
    let centerXSum = 0
    let centerYSum = 0

    for (let y = 0; y < imageData.height; y++) {
      for (let x = 0; x < imageData.width; x++) {
        let base = (y * imageData.width + x) * 4
        let value = Math.round(
          imageData.data[base] * 0.299 +
          imageData.data[base + 1] * 0.587 +
          imageData.data[base + 2] * 0.114
        )
        sum += value
        if (value >= 128) {
          brightPixels += 1
          centerXSum += x
          centerYSum += y
        } else {
          darkPixels += 1
        }
      }
    }

    return {
      width:imageData.width,
      height:imageData.height,
      mean:sum / Math.max(1, pixels),
      brightPixels:brightPixels,
      darkPixels:darkPixels,
      whitePercent:brightPixels / Math.max(1, pixels),
      darkPercent:darkPixels / Math.max(1, pixels),
      centerX:brightPixels > 0 ? centerXSum / brightPixels : -1,
      centerY:brightPixels > 0 ? centerYSum / brightPixels : -1
    }
  }

  findForegroundComponentsOpenCV (imageData, minAreaPixels = 1){
    let cv = window.cv
    if (!cv || typeof cv.connectedComponentsWithStats != 'function')
      return null

    let width = imageData.width
    let height = imageData.height
    let gray = this.grayscaleArray(imageData)
    let src = null
    let binary = null
    let labels = null
    let stats = null
    let centroids = null

    try {
      src = new cv.Mat(height, width, cv.CV_8UC1)
      src.data.set(gray)
      binary = new cv.Mat()
      labels = new cv.Mat()
      stats = new cv.Mat()
      centroids = new cv.Mat()

      cv.threshold(src, binary, 127, 255, cv.THRESH_BINARY)
      let count = cv.connectedComponentsWithStats(binary, labels, stats, centroids, 8, cv.CV_32S)
      let labelData = labels.data32S
      let statsData = stats.data32S
      let centroidData = centroids.data64F || centroids.data32F
      let minArea = Math.max(1, Number(minAreaPixels) || 1)
      let components = []
      let accumulators = {}
      let statStride = stats.cols || 5
      let centroidStride = centroids.cols || 2
      let STAT_LEFT = typeof cv.CC_STAT_LEFT == 'number' ? cv.CC_STAT_LEFT : 0
      let STAT_TOP = typeof cv.CC_STAT_TOP == 'number' ? cv.CC_STAT_TOP : 1
      let STAT_WIDTH = typeof cv.CC_STAT_WIDTH == 'number' ? cv.CC_STAT_WIDTH : 2
      let STAT_HEIGHT = typeof cv.CC_STAT_HEIGHT == 'number' ? cv.CC_STAT_HEIGHT : 3
      let STAT_AREA = typeof cv.CC_STAT_AREA == 'number' ? cv.CC_STAT_AREA : 4

      for (let label = 1; label < count; label++) {
        let base = label * statStride
        let area = statsData[base + STAT_AREA]
        if (area < minArea)
          continue
        let bboxX = statsData[base + STAT_LEFT]
        let bboxY = statsData[base + STAT_TOP]
        let bboxWidth = statsData[base + STAT_WIDTH]
        let bboxHeight = statsData[base + STAT_HEIGHT]

        accumulators[label] = {
          area:area,
          areaPercent:area / Math.max(1, width * height),
          centerX:centroidData ? centroidData[label * centroidStride] : bboxX + bboxWidth / 2,
          centerY:centroidData ? centroidData[label * centroidStride + 1] : bboxY + bboxHeight / 2,
          minX:bboxX,
          minY:bboxY,
          maxX:bboxX + bboxWidth - 1,
          maxY:bboxY + bboxHeight - 1,
          bboxX:bboxX,
          bboxY:bboxY,
          bboxWidth:bboxWidth,
          bboxHeight:bboxHeight,
          sumXX:0,
          sumYY:0,
          sumXY:0,
          rotationRad:0,
          rotationDeg:0
        }
      }

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          let label = labelData[y * width + x]
          let component = accumulators[label]
          if (!component)
            continue

          component.sumXX += x * x
          component.sumYY += y * y
          component.sumXY += x * y
        }
      }

      Object.keys(accumulators).forEach((key) => {
        let component = accumulators[key]
        let mu20 = component.sumXX - component.centerX * component.centerX * component.area
        let mu02 = component.sumYY - component.centerY * component.centerY * component.area
        let mu11 = component.sumXY - component.centerX * component.centerY * component.area
        component.rotationRad = component.area > 1 ? 0.5 * Math.atan2(2 * mu11, mu20 - mu02) : 0
        component.rotationDeg = component.rotationRad * 180 / Math.PI
        delete component.sumXX
        delete component.sumYY
        delete component.sumXY
        components.push(component)
      })

      components.sort((a, b) => b.area - a.area)
      return components
    } catch (error) {
      console.warn('Vision OpenCV analysis failed, falling back to built-in engine.', error)
      return null
    } finally {
      ;[src, binary, labels, stats, centroids].forEach((mat) => {
        if (mat && typeof mat.delete == 'function')
          mat.delete()
      })
    }
  }

  findForegroundComponentsBuiltin (imageData, minAreaPixels = 1){
    let width = imageData.width
    let height = imageData.height
    let gray = this.grayscaleArray(imageData)
    let visited = new Uint8Array(width * height)
    let components = []
    let threshold = 128
    let minArea = Math.max(1, Number(minAreaPixels) || 1)
    let offsets = [-1, 0, 1]

    for (let startIndex = 0; startIndex < gray.length; startIndex++) {
      if (visited[startIndex] || gray[startIndex] < threshold)
        continue

      let queue = [startIndex]
      visited[startIndex] = 1
      let area = 0
      let sumX = 0
      let sumY = 0
      let sumXX = 0
      let sumYY = 0
      let sumXY = 0
      let minX = width
      let minY = height
      let maxX = 0
      let maxY = 0

      while (queue.length > 0) {
        let index = queue.pop()
        let x = index % width
        let y = Math.floor(index / width)

        area += 1
        sumX += x
        sumY += y
        sumXX += x * x
        sumYY += y * y
        sumXY += x * y
        minX = Math.min(minX, x)
        minY = Math.min(minY, y)
        maxX = Math.max(maxX, x)
        maxY = Math.max(maxY, y)

        for (let oy of offsets) {
          for (let ox of offsets) {
            if (ox == 0 && oy == 0)
              continue
            let nx = x + ox
            let ny = y + oy
            if (nx < 0 || nx >= width || ny < 0 || ny >= height)
              continue
            let neighborIndex = ny * width + nx
            if (visited[neighborIndex] || gray[neighborIndex] < threshold)
              continue
            visited[neighborIndex] = 1
            queue.push(neighborIndex)
          }
        }
      }

      if (area < minArea)
        continue

      let centerX = sumX / area
      let centerY = sumY / area
      let mu20 = sumXX - centerX * sumX
      let mu02 = sumYY - centerY * sumY
      let mu11 = sumXY - centerX * sumY
      let rotationRad = area > 1 ? 0.5 * Math.atan2(2 * mu11, mu20 - mu02) : 0
      let rotationDeg = rotationRad * 180 / Math.PI
      let bboxWidth = maxX - minX + 1
      let bboxHeight = maxY - minY + 1

      components.push({
        area:area,
        areaPercent:area / Math.max(1, width * height),
        centerX:centerX,
        centerY:centerY,
        minX:minX,
        minY:minY,
        maxX:maxX,
        maxY:maxY,
        bboxX:minX,
        bboxY:minY,
        bboxWidth:bboxWidth,
        bboxHeight:bboxHeight,
        rotationRad:rotationRad,
        rotationDeg:rotationDeg
      })
    }

    components.sort((a, b) => b.area - a.area)
    return components
  }

  findForegroundComponents (imageData, minAreaPixels = 1){
    let components = this.hasOpenCV() ? this.findForegroundComponentsOpenCV(imageData, minAreaPixels) : null
    return components || this.findForegroundComponentsBuiltin(imageData, minAreaPixels)
  }

  annotateComponents (imageData, components, options = {}){
    let showBox = options.showBox !== false
    let showCenter = options.showCenter !== false
    let showRotation = Boolean(options.showRotation)
    let limit = Math.max(1, Number(options.limit) || components.length || 1)
    let color = options.color || '#f97316'

    this.bufferCanvas.width = imageData.width
    this.bufferCanvas.height = imageData.height
    this.bufferContext.putImageData(imageData, 0, 0)
    this.bufferContext.lineWidth = 2
    this.bufferContext.strokeStyle = color
    this.bufferContext.fillStyle = color

    components.slice(0, limit).forEach((component) => {
      if (showBox)
        this.bufferContext.strokeRect(component.bboxX + 0.5, component.bboxY + 0.5, component.bboxWidth, component.bboxHeight)

      if (showCenter) {
        this.bufferContext.beginPath()
        this.bufferContext.arc(component.centerX, component.centerY, 3, 0, Math.PI * 2)
        this.bufferContext.fill()
      }

      if (showRotation) {
        let lineLength = Math.max(component.bboxWidth, component.bboxHeight) * 0.5
        let dx = Math.cos(component.rotationRad) * lineLength
        let dy = Math.sin(component.rotationRad) * lineLength
        this.bufferContext.beginPath()
        this.bufferContext.moveTo(component.centerX - dx, component.centerY - dy)
        this.bufferContext.lineTo(component.centerX + dx, component.centerY + dy)
        this.bufferContext.stroke()
      }
    })

    return this.bufferContext.getImageData(0, 0, imageData.width, imageData.height)
  }

  cloneImageData (imageData){
    return new ImageData(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height)
  }

  clampByte (value){
    return Math.max(0, Math.min(255, Math.round(value)))
  }

  grayscaleArray (imageData){
    let gray = new Uint8ClampedArray(imageData.width * imageData.height)
    for (let index = 0; index < gray.length; index++) {
      let base = index * 4
      gray[index] = Math.round(
        imageData.data[base] * 0.299 +
        imageData.data[base + 1] * 0.587 +
        imageData.data[base + 2] * 0.114
      )
    }
    return gray
  }

  grayscaleImageFromArray (gray, width, height){
    let data = new Uint8ClampedArray(width * height * 4)
    for (let index = 0; index < gray.length; index++) {
      let value = gray[index]
      let base = index * 4
      data[base] = value
      data[base + 1] = value
      data[base + 2] = value
      data[base + 3] = 255
    }
    return new ImageData(data, width, height)
  }

  runResize (imageData, params){
    let width = Math.max(16, Math.min(720, Number(params.width) || imageData.width))
    let height = Math.max(16, Math.min(720, Number(params.height) || imageData.height))

    return this.resizeImageDataTo(imageData, width, height)
  }

  resizeImageDataTo (imageData, width, height){
    width = Math.max(1, Math.round(width))
    height = Math.max(1, Math.round(height))

    this.bufferCanvas.width = imageData.width
    this.bufferCanvas.height = imageData.height
    this.bufferContext.putImageData(imageData, 0, 0)

    this.processingCanvas.width = width
    this.processingCanvas.height = height
    this.processingContext.clearRect(0, 0, width, height)
    this.processingContext.imageSmoothingEnabled = true
    this.processingContext.drawImage(this.bufferCanvas, 0, 0, width, height)
    return this.processingContext.getImageData(0, 0, width, height)
  }

  runCrop (imageData, params){
    let startX = Math.max(0, Math.min(imageData.width - 1, Number(params.x) || 0))
    let startY = Math.max(0, Math.min(imageData.height - 1, Number(params.y) || 0))
    let width = Math.max(1, Math.min(imageData.width - startX, Number(params.width) || imageData.width))
    let height = Math.max(1, Math.min(imageData.height - startY, Number(params.height) || imageData.height))
    let output = new Uint8ClampedArray(width * height * 4)

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let sourceBase = ((startY + y) * imageData.width + (startX + x)) * 4
        let targetBase = (y * width + x) * 4
        output[targetBase] = imageData.data[sourceBase]
        output[targetBase + 1] = imageData.data[sourceBase + 1]
        output[targetBase + 2] = imageData.data[sourceBase + 2]
        output[targetBase + 3] = imageData.data[sourceBase + 3]
      }
    }

    return new ImageData(output, width, height)
  }

  runGrayscale (imageData){
    return this.grayscaleImageFromArray(this.grayscaleArray(imageData), imageData.width, imageData.height)
  }

  runBrightness (imageData, params){
    let output = this.cloneImageData(imageData)
    let offset = Number(params.amount) || 0
    for (let index = 0; index < output.data.length; index += 4) {
      output.data[index] = this.clampByte(output.data[index] + offset)
      output.data[index + 1] = this.clampByte(output.data[index + 1] + offset)
      output.data[index + 2] = this.clampByte(output.data[index + 2] + offset)
    }
    return output
  }

  runContrast (imageData, params){
    let output = this.cloneImageData(imageData)
    let contrast = Math.max(-100, Math.min(100, Number(params.amount) || 0))
    let scaled = contrast * 2.55
    let factor = (259 * (scaled + 255)) / (255 * (259 - scaled || 1))
    for (let index = 0; index < output.data.length; index += 4) {
      output.data[index] = this.clampByte(factor * (output.data[index] - 128) + 128)
      output.data[index + 1] = this.clampByte(factor * (output.data[index + 1] - 128) + 128)
      output.data[index + 2] = this.clampByte(factor * (output.data[index + 2] - 128) + 128)
    }
    return output
  }

  runInvert (imageData){
    let output = this.cloneImageData(imageData)
    for (let index = 0; index < output.data.length; index += 4) {
      output.data[index] = 255 - output.data[index]
      output.data[index + 1] = 255 - output.data[index + 1]
      output.data[index + 2] = 255 - output.data[index + 2]
    }
    return output
  }

  runThreshold (imageData, params){
    let gray = this.grayscaleArray(imageData)
    let output = new Uint8ClampedArray(gray.length)
    for (let index = 0; index < gray.length; index++) {
      output[index] = gray[index] >= params.value ? 255 : 0
    }
    return this.grayscaleImageFromArray(output, imageData.width, imageData.height)
  }

  runBoxBlur (imageData, params){
    let radius = Math.max(0, Number(params.radius) || 0)
    if (radius < 1)
      return this.cloneImageData(imageData)

    let width = imageData.width
    let height = imageData.height
    let output = new Uint8ClampedArray(imageData.data.length)
    let data = imageData.data

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let red = 0
        let green = 0
        let blue = 0
        let alpha = 0
        let count = 0
        for (let dy = -radius; dy <= radius; dy++) {
          let py = y + dy
          if (py < 0 || py >= height)
            continue
          for (let dx = -radius; dx <= radius; dx++) {
            let px = x + dx
            if (px < 0 || px >= width)
              continue
            let base = (py * width + px) * 4
            red += data[base]
            green += data[base + 1]
            blue += data[base + 2]
            alpha += data[base + 3]
            count++
          }
        }
        let target = (y * width + x) * 4
        output[target] = Math.round(red / count)
        output[target + 1] = Math.round(green / count)
        output[target + 2] = Math.round(blue / count)
        output[target + 3] = Math.round(alpha / count)
      }
    }

    return new ImageData(output, width, height)
  }

  runConvolutionMatrix (imageData, params){
    let width = imageData.width
    let height = imageData.height
    let data = imageData.data
    let output = new Uint8ClampedArray(data.length)
    let kernel = [
      Number(params.k00) || 0,
      Number(params.k01) || 0,
      Number(params.k02) || 0,
      Number(params.k10) || 0,
      Number(params.k11) || 0,
      Number(params.k12) || 0,
      Number(params.k20) || 0,
      Number(params.k21) || 0,
      Number(params.k22) || 0
    ]
    let divisor = Number(params.divisor)
    if (!Number.isFinite(divisor) || divisor === 0) {
      divisor = kernel.reduce((sum, value) => sum + value, 0)
      if (divisor === 0)
        divisor = 1
    }
    let bias = Number(params.bias) || 0

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let red = 0
        let green = 0
        let blue = 0

        for (let ky = -1; ky <= 1; ky++) {
          let sampleY = Math.max(0, Math.min(height - 1, y + ky))
          for (let kx = -1; kx <= 1; kx++) {
            let sampleX = Math.max(0, Math.min(width - 1, x + kx))
            let kernelValue = kernel[(ky + 1) * 3 + (kx + 1)]
            let sourceBase = (sampleY * width + sampleX) * 4
            red += data[sourceBase] * kernelValue
            green += data[sourceBase + 1] * kernelValue
            blue += data[sourceBase + 2] * kernelValue
          }
        }

        let targetBase = (y * width + x) * 4
        output[targetBase] = this.clampByte(red / divisor + bias)
        output[targetBase + 1] = this.clampByte(green / divisor + bias)
        output[targetBase + 2] = this.clampByte(blue / divisor + bias)
        output[targetBase + 3] = data[targetBase + 3]
      }
    }

    return new ImageData(output, width, height)
  }

  runBlendMatrix (primaryImageData, secondaryImageData, params){
    if (!primaryImageData)
      return null
    if (!secondaryImageData)
      return this.cloneImageData(primaryImageData)

    let width = primaryImageData.width
    let height = primaryImageData.height
    let secondary = secondaryImageData
    if (secondary.width !== width || secondary.height !== height)
      secondary = this.resizeImageDataTo(secondary, width, height)

    let output = new Uint8ClampedArray(primaryImageData.data.length)
    let weightA = Number(params.weightA)
    let weightB = Number(params.weightB)
    let bias = Number(params.bias) || 0
    if (!Number.isFinite(weightA))
      weightA = 1
    if (!Number.isFinite(weightB))
      weightB = 1

    for (let index = 0; index < output.length; index += 4) {
      output[index] = this.clampByte(primaryImageData.data[index] * weightA + secondary.data[index] * weightB + bias)
      output[index + 1] = this.clampByte(primaryImageData.data[index + 1] * weightA + secondary.data[index + 1] * weightB + bias)
      output[index + 2] = this.clampByte(primaryImageData.data[index + 2] * weightA + secondary.data[index + 2] * weightB + bias)
      output[index + 3] = this.clampByte(primaryImageData.data[index + 3] * weightA + secondary.data[index + 3] * weightB)
    }

    return new ImageData(output, width, height)
  }

  runDifferenceMatrix (primaryImageData, secondaryImageData, params){
    if (!primaryImageData)
      return null
    if (!secondaryImageData)
      return this.cloneImageData(primaryImageData)

    let width = primaryImageData.width
    let height = primaryImageData.height
    let secondary = secondaryImageData
    if (secondary.width !== width || secondary.height !== height)
      secondary = this.resizeImageDataTo(secondary, width, height)

    let gain = Number(params.gain)
    let bias = Number(params.bias) || 0
    if (!Number.isFinite(gain))
      gain = 1

    let output = new Uint8ClampedArray(primaryImageData.data.length)
    for (let index = 0; index < output.length; index += 4) {
      output[index] = this.clampByte(Math.abs(primaryImageData.data[index] - secondary.data[index]) * gain + bias)
      output[index + 1] = this.clampByte(Math.abs(primaryImageData.data[index + 1] - secondary.data[index + 1]) * gain + bias)
      output[index + 2] = this.clampByte(Math.abs(primaryImageData.data[index + 2] - secondary.data[index + 2]) * gain + bias)
      output[index + 3] = Math.max(primaryImageData.data[index + 3], secondary.data[index + 3])
    }

    return new ImageData(output, width, height)
  }

  runMultiplyMatrix (primaryImageData, secondaryImageData, params){
    if (!primaryImageData)
      return null
    if (!secondaryImageData)
      return this.cloneImageData(primaryImageData)

    let width = primaryImageData.width
    let height = primaryImageData.height
    let secondary = secondaryImageData
    if (secondary.width !== width || secondary.height !== height)
      secondary = this.resizeImageDataTo(secondary, width, height)

    let scale = Number(params.scale)
    let bias = Number(params.bias) || 0
    if (!Number.isFinite(scale))
      scale = 1

    let output = new Uint8ClampedArray(primaryImageData.data.length)
    for (let index = 0; index < output.length; index += 4) {
      output[index] = this.clampByte(primaryImageData.data[index] * secondary.data[index] / 255 * scale + bias)
      output[index + 1] = this.clampByte(primaryImageData.data[index + 1] * secondary.data[index + 1] / 255 * scale + bias)
      output[index + 2] = this.clampByte(primaryImageData.data[index + 2] * secondary.data[index + 2] / 255 * scale + bias)
      output[index + 3] = this.clampByte(primaryImageData.data[index + 3] * secondary.data[index + 3] / 255)
    }

    return new ImageData(output, width, height)
  }

  runColorMatrix (imageData, params){
    let output = new Uint8ClampedArray(imageData.data.length)
    let matrix = [
      Number(params.rr) || 0,
      Number(params.rg) || 0,
      Number(params.rb) || 0,
      Number(params.gr) || 0,
      Number(params.gg) || 0,
      Number(params.gb) || 0,
      Number(params.br) || 0,
      Number(params.bg) || 0,
      Number(params.bb) || 0
    ]
    let bias = Number(params.bias) || 0

    for (let index = 0; index < output.length; index += 4) {
      let red = imageData.data[index]
      let green = imageData.data[index + 1]
      let blue = imageData.data[index + 2]
      output[index] = this.clampByte(red * matrix[0] + green * matrix[1] + blue * matrix[2] + bias)
      output[index + 1] = this.clampByte(red * matrix[3] + green * matrix[4] + blue * matrix[5] + bias)
      output[index + 2] = this.clampByte(red * matrix[6] + green * matrix[7] + blue * matrix[8] + bias)
      output[index + 3] = imageData.data[index + 3]
    }

    return new ImageData(output, imageData.width, imageData.height)
  }

  runAdaptiveThresholdBuiltin (imageData, params){
    let width = imageData.width
    let height = imageData.height
    let gray = this.grayscaleArray(imageData)
    let blockSize = Math.max(3, Number(params.blockSize) || 15)
    if (blockSize % 2 === 0)
      blockSize += 1
    let radius = Math.floor(blockSize / 2)
    let offset = Number(params.offset) || 5
    let output = new Uint8ClampedArray(gray.length)

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let sum = 0
        let count = 0
        for (let dy = -radius; dy <= radius; dy++) {
          let py = y + dy
          if (py < 0 || py >= height)
            continue
          for (let dx = -radius; dx <= radius; dx++) {
            let px = x + dx
            if (px < 0 || px >= width)
              continue
            sum += gray[py * width + px]
            count += 1
          }
        }

        let threshold = sum / Math.max(1, count) - offset
        let index = y * width + x
        output[index] = gray[index] >= threshold ? 255 : 0
      }
    }

    return this.grayscaleImageFromArray(output, width, height)
  }

  runAdaptiveThresholdOpenCV (imageData, params){
    let cv = window.cv
    if (!cv || typeof cv.adaptiveThreshold != 'function')
      return null

    let gray = this.grayscaleArray(imageData)
    let src = null
    let dst = null

    try {
      let blockSize = Math.max(3, Number(params.blockSize) || 15)
      if (blockSize % 2 === 0)
        blockSize += 1

      src = new cv.Mat(imageData.height, imageData.width, cv.CV_8UC1)
      src.data.set(gray)
      dst = new cv.Mat()
      cv.adaptiveThreshold(src, dst, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, blockSize, Number(params.offset) || 5)
      return this.grayscaleImageFromArray(new Uint8ClampedArray(dst.data), imageData.width, imageData.height)
    } catch (error) {
      console.warn('Vision OpenCV adaptive threshold failed, falling back to built-in engine.', error)
      return null
    } finally {
      ;[src, dst].forEach((mat) => {
        if (mat && typeof mat.delete == 'function')
          mat.delete()
      })
    }
  }

  runAdaptiveThreshold (imageData, params){
    let output = this.hasOpenCV() ? this.runAdaptiveThresholdOpenCV(imageData, params) : null
    return output || this.runAdaptiveThresholdBuiltin(imageData, params)
  }

  runMorphologyOpenCV (imageData, params, mode){
    let cv = window.cv
    if (!cv)
      return null

    let gray = this.grayscaleArray(imageData)
    let src = null
    let dst = null
    let kernel = null

    try {
      let radius = Math.max(1, Math.min(4, Number(params.radius) || 1))
      let kernelSize = radius * 2 + 1

      src = new cv.Mat(imageData.height, imageData.width, cv.CV_8UC1)
      src.data.set(gray)
      dst = new cv.Mat()
      kernel = cv.Mat.ones(kernelSize, kernelSize, cv.CV_8U)

      if (mode === 'dilate' && typeof cv.dilate == 'function')
        cv.dilate(src, dst, kernel)
      else if (mode === 'erode' && typeof cv.erode == 'function')
        cv.erode(src, dst, kernel)
      else if (mode === 'open' && typeof cv.morphologyEx == 'function')
        cv.morphologyEx(src, dst, cv.MORPH_OPEN, kernel)
      else if (mode === 'close' && typeof cv.morphologyEx == 'function')
        cv.morphologyEx(src, dst, cv.MORPH_CLOSE, kernel)
      else
        return null

      return this.grayscaleImageFromArray(new Uint8ClampedArray(dst.data), imageData.width, imageData.height)
    } catch (error) {
      console.warn('Vision OpenCV morphology failed, falling back to built-in engine.', error)
      return null
    } finally {
      ;[src, dst, kernel].forEach((mat) => {
        if (mat && typeof mat.delete == 'function')
          mat.delete()
      })
    }
  }

  runMorphologyBuiltin (imageData, params, mode){
    let radius = Math.max(1, Math.min(4, Number(params.radius) || 1))
    let width = imageData.width
    let height = imageData.height
    let gray = this.grayscaleArray(imageData)
    let output = new Uint8ClampedArray(gray.length)

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let value = mode === 'dilate' ? 0 : 255
        for (let dy = -radius; dy <= radius; dy++) {
          let py = y + dy
          if (py < 0 || py >= height)
            continue
          for (let dx = -radius; dx <= radius; dx++) {
            let px = x + dx
            if (px < 0 || px >= width)
              continue
            let sample = gray[py * width + px]
            if (mode === 'dilate')
              value = Math.max(value, sample)
            else
              value = Math.min(value, sample)
          }
        }
        output[y * width + x] = value
      }
    }

    return this.grayscaleImageFromArray(output, width, height)
  }

  runMorphology (imageData, params, mode){
    let output = this.hasOpenCV() ? this.runMorphologyOpenCV(imageData, params, mode) : null
    if (output)
      return output

    if (mode === 'open')
      return this.runMorphologyBuiltin(this.runMorphologyBuiltin(imageData, params, 'erode'), params, 'dilate')
    if (mode === 'close')
      return this.runMorphologyBuiltin(this.runMorphologyBuiltin(imageData, params, 'dilate'), params, 'erode')

    return this.runMorphologyBuiltin(imageData, params, mode)
  }

  runEdges (imageData, params){
    let width = imageData.width
    let height = imageData.height
    let gray = this.grayscaleArray(imageData)
    let threshold = Math.max(0, Number(params.threshold) || 0)
    let edges = new Uint8ClampedArray(gray.length)

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let p00 = gray[(y - 1) * width + (x - 1)]
        let p01 = gray[(y - 1) * width + x]
        let p02 = gray[(y - 1) * width + (x + 1)]
        let p10 = gray[y * width + (x - 1)]
        let p12 = gray[y * width + (x + 1)]
        let p20 = gray[(y + 1) * width + (x - 1)]
        let p21 = gray[(y + 1) * width + x]
        let p22 = gray[(y + 1) * width + (x + 1)]

        let gx = -p00 + p02 - 2 * p10 + 2 * p12 - p20 + p22
        let gy = -p00 - 2 * p01 - p02 + p20 + 2 * p21 + p22
        let magnitude = Math.min(255, Math.sqrt(gx * gx + gy * gy))
        edges[y * width + x] = magnitude >= threshold ? 255 : 0
      }
    }

    return this.grayscaleImageFromArray(edges, width, height)
  }

  runContours (imageData, params){
    let width = imageData.width
    let height = imageData.height
    let gray = this.grayscaleArray(imageData)
    let threshold = Math.max(0, Math.min(255, Number(params.threshold) || 128))
    let binary = new Uint8ClampedArray(gray.length)
    let output = this.cloneImageData(imageData)

    for (let index = 0; index < gray.length; index++)
      binary[index] = gray[index] >= threshold ? 255 : 0

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let index = y * width + x
        let value = binary[index]
        let top = y > 0 ? binary[index - width] : value
        let bottom = y < height - 1 ? binary[index + width] : value
        let left = x > 0 ? binary[index - 1] : value
        let right = x < width - 1 ? binary[index + 1] : value
        let boundary = value !== top || value !== bottom || value !== left || value !== right
        let base = index * 4

        if (boundary) {
          output.data[base] = 249
          output.data[base + 1] = 115
          output.data[base + 2] = 22
          output.data[base + 3] = 255
          continue
        }

        output.data[base] = this.clampByte(output.data[base] * 0.35)
        output.data[base + 1] = this.clampByte(output.data[base + 1] * 0.35)
        output.data[base + 2] = this.clampByte(output.data[base + 2] * 0.35)
      }
    }

    return output
  }

  componentOutputData (components){
    let objects = components.map((component, index) => {
      return {
        index:index,
        area:component.area,
        areaPercent:component.areaPercent,
        centerX:component.centerX,
        centerY:component.centerY,
        bboxX:component.bboxX,
        bboxY:component.bboxY,
        bboxWidth:component.bboxWidth,
        bboxHeight:component.bboxHeight,
        rotationDeg:component.rotationDeg,
        rotationRad:component.rotationRad
      }
    })

    let indexedFields = {}
    objects.forEach((object, index) => {
      Object.keys(object).forEach((key) => {
        if (key === 'index')
          return
        indexedFields[`object${index}${key.charAt(0).toUpperCase()}${key.slice(1)}`] = object[key]
      })
    })

    return {
      objects:objects,
      objectsJson:JSON.stringify(objects),
      indexedFields:indexedFields
    }
  }
}


const VisionNodeTypes = {
  input:{
    labelKey:'VisionNodeInput',
    fallbackLabel:'Input image',
    fallbackDescription:'Load an image into the Vision pipeline.',
    fallbackHelp:'Use this node to upload the starting image for your setup. Every other node in the pipeline reads its input directly or indirectly from this image.',
    controls:[],
    sanitize:() => {
      return {}
    },
    run:(imageData) => imageData
  },
  grayscale:{
    labelKey:'VisionNodeGrayscale',
    fallbackLabel:'Grayscale',
    fallbackDescription:'Convert the image to grayscale.',
    fallbackHelp:'This node converts each pixel to a gray intensity value. It is often a good first step before thresholding, edge detection, or contour-based analysis.',
    controls:[],
    sanitize:() => {
      return {}
    },
    run:(imageData, params, vision) => {
      return vision.runGrayscale(imageData)
    }
  },
  resize:{
    labelKey:'VisionNodeResize',
    fallbackLabel:'Resize',
    fallbackDescription:'Resize the image to a new width and height.',
    fallbackHelp:'Use this node to make the image smaller for faster processing or larger for easier visual inspection. Downstream nodes will work on the resized image dimensions.',
    controls:[{
      name:'width',
      type:'range',
      labelKey:'VisionResizeWidth',
      fallbackLabel:'Width',
      min:64,
      max:720,
      step:8
    }, {
      name:'height',
      type:'range',
      labelKey:'VisionResizeHeight',
      fallbackLabel:'Height',
      min:64,
      max:720,
      step:8
    }],
    sanitize:(params) => {
      return {
        width:Math.min(720, Math.max(64, Number(params.width) || 320)),
        height:Math.min(720, Math.max(64, Number(params.height) || 240))
      }
    },
    run:(imageData, params, vision) => {
      return vision.runResize(imageData, params)
    }
  },
  crop:{
    labelKey:'VisionNodeCrop',
    fallbackLabel:'Crop',
    fallbackDescription:'Crop a region of interest from the image.',
    fallbackHelp:'This node keeps only the selected area of the image. Use it to focus later processing on the part of the scene that matters and ignore the rest.',
    controls:[{
      name:'x',
      type:'range',
      labelKey:'VisionCropX',
      fallbackLabel:'X',
      min:0,
      max:640,
      step:1
    }, {
      name:'y',
      type:'range',
      labelKey:'VisionCropY',
      fallbackLabel:'Y',
      min:0,
      max:640,
      step:1
    }, {
      name:'width',
      type:'range',
      labelKey:'VisionCropWidth',
      fallbackLabel:'Width',
      min:32,
      max:720,
      step:8
    }, {
      name:'height',
      type:'range',
      labelKey:'VisionCropHeight',
      fallbackLabel:'Height',
      min:32,
      max:720,
      step:8
    }],
    sanitize:(params) => {
      return {
        x:Math.max(0, Number(params.x) || 0),
        y:Math.max(0, Number(params.y) || 0),
        width:Math.max(32, Number(params.width) || 240),
        height:Math.max(32, Number(params.height) || 180)
      }
    },
    run:(imageData, params, vision) => {
      return vision.runCrop(imageData, params)
    }
  },
  brightness:{
    labelKey:'VisionNodeBrightness',
    fallbackLabel:'Brightness',
    fallbackDescription:'Make the image brighter or darker.',
    fallbackHelp:'This node shifts pixel intensity up or down. It is useful when the camera image is consistently too dark or too bright before later analysis steps.',
    controls:[{
      name:'amount',
      type:'range',
      labelKey:'VisionBrightnessAmount',
      fallbackLabel:'Amount',
      min:-100,
      max:100,
      step:1
    }],
    sanitize:(params) => {
      return {
        amount:Math.min(100, Math.max(-100, Number(params.amount) || 0))
      }
    },
    run:(imageData, params, vision) => {
      return vision.runBrightness(imageData, params)
    }
  },
  contrast:{
    labelKey:'VisionNodeContrast',
    fallbackLabel:'Contrast',
    fallbackDescription:'Increase or decrease the image contrast.',
    fallbackHelp:'This node spreads or compresses the difference between dark and bright areas. Higher contrast can make segmentation easier when objects blend into the background.',
    controls:[{
      name:'amount',
      type:'range',
      labelKey:'VisionContrastAmount',
      fallbackLabel:'Amount',
      min:-100,
      max:100,
      step:1
    }],
    sanitize:(params) => {
      return {
        amount:Math.min(100, Math.max(-100, Number(params.amount) || 0))
      }
    },
    run:(imageData, params, vision) => {
      return vision.runContrast(imageData, params)
    }
  },
  blur:{
    labelKey:'VisionNodeBlur',
    fallbackLabel:'Blur',
    fallbackDescription:'Smooth the image to reduce noise and small details.',
    fallbackHelp:'Blur averages nearby pixels to smooth the image. Use it before thresholding or edge detection when small specks and sharp texture create unstable results.',
    controls:[{
      name:'radius',
      type:'range',
      labelKey:'VisionBlurRadius',
      fallbackLabel:'Radius',
      min:1,
      max:4,
      step:1
    }],
    sanitize:(params) => {
      return {
        radius:Math.min(4, Math.max(1, Number(params.radius) || 2))
      }
    },
    run:(imageData, params, vision) => {
      return vision.runBoxBlur(imageData, params)
    }
  },
  convolutionMatrix:{
    labelKey:'VisionNodeConvolutionMatrix',
    fallbackLabel:'Convolution matrix',
    fallbackDescription:'Apply a custom 3x3 kernel to every pixel.',
    fallbackHelp:'This node multiplies the 3x3 neighborhood around each pixel by your matrix. Try sharpen: 0 -1 0 / -1 5 -1 / 0 -1 0, or blur with all ones and divisor 9.',
    controls:[{
      name:'k00',
      type:'number',
      labelKey:'VisionMatrixK00',
      fallbackLabel:'Top-left',
      min:-10,
      max:10,
      step:0.1
    }, {
      name:'k01',
      type:'number',
      labelKey:'VisionMatrixK01',
      fallbackLabel:'Top',
      min:-10,
      max:10,
      step:0.1
    }, {
      name:'k02',
      type:'number',
      labelKey:'VisionMatrixK02',
      fallbackLabel:'Top-right',
      min:-10,
      max:10,
      step:0.1
    }, {
      name:'k10',
      type:'number',
      labelKey:'VisionMatrixK10',
      fallbackLabel:'Left',
      min:-10,
      max:10,
      step:0.1
    }, {
      name:'k11',
      type:'number',
      labelKey:'VisionMatrixK11',
      fallbackLabel:'Center',
      min:-10,
      max:10,
      step:0.1
    }, {
      name:'k12',
      type:'number',
      labelKey:'VisionMatrixK12',
      fallbackLabel:'Right',
      min:-10,
      max:10,
      step:0.1
    }, {
      name:'k20',
      type:'number',
      labelKey:'VisionMatrixK20',
      fallbackLabel:'Bottom-left',
      min:-10,
      max:10,
      step:0.1
    }, {
      name:'k21',
      type:'number',
      labelKey:'VisionMatrixK21',
      fallbackLabel:'Bottom',
      min:-10,
      max:10,
      step:0.1
    }, {
      name:'k22',
      type:'number',
      labelKey:'VisionMatrixK22',
      fallbackLabel:'Bottom-right',
      min:-10,
      max:10,
      step:0.1
    }, {
      name:'divisor',
      type:'number',
      labelKey:'VisionMatrixDivisor',
      fallbackLabel:'Divisor',
      min:-100,
      max:100,
      step:0.1
    }, {
      name:'bias',
      type:'number',
      labelKey:'VisionMatrixBias',
      fallbackLabel:'Bias',
      min:-255,
      max:255,
      step:1
    }],
    sanitize:(params) => {
      let clamp = (value, fallback, min, max) => {
        let numeric = Number(value)
        if (!Number.isFinite(numeric))
          numeric = fallback
        return Math.min(max, Math.max(min, numeric))
      }
      return {
        k00:clamp(params.k00, 0, -10, 10),
        k01:clamp(params.k01, -1, -10, 10),
        k02:clamp(params.k02, 0, -10, 10),
        k10:clamp(params.k10, -1, -10, 10),
        k11:clamp(params.k11, 5, -10, 10),
        k12:clamp(params.k12, -1, -10, 10),
        k20:clamp(params.k20, 0, -10, 10),
        k21:clamp(params.k21, -1, -10, 10),
        k22:clamp(params.k22, 0, -10, 10),
        divisor:clamp(params.divisor, 1, -100, 100),
        bias:clamp(params.bias, 0, -255, 255)
      }
    },
    run:(imageData, params, vision) => {
      return vision.runConvolutionMatrix(imageData, params)
    }
  },
  blendMatrix:{
    labelKey:'VisionNodeBlendMatrix',
    fallbackLabel:'Blend matrix',
    fallbackDescription:'Combine two image inputs with linear weights.',
    fallbackHelp:'This node has two input ports. Each output pixel is A × weight A plus B × weight B plus bias. Use it to add, subtract, average, or compare two branches.',
    inputSlots:[{
      name:'a',
      labelKey:'VisionInputSlotA',
      fallbackLabel:'A'
    }, {
      name:'b',
      labelKey:'VisionInputSlotB',
      fallbackLabel:'B'
    }],
    controls:[{
      name:'weightA',
      type:'number',
      labelKey:'VisionMatrixWeightA',
      fallbackLabel:'Weight A',
      min:-2,
      max:2,
      step:0.05
    }, {
      name:'weightB',
      type:'number',
      labelKey:'VisionMatrixWeightB',
      fallbackLabel:'Weight B',
      min:-2,
      max:2,
      step:0.05
    }, {
      name:'bias',
      type:'number',
      labelKey:'VisionMatrixBias',
      fallbackLabel:'Bias',
      min:-255,
      max:255,
      step:1
    }],
    sanitize:(params) => {
      let clamp = (value, fallback, min, max) => {
        let numeric = Number(value)
        if (!Number.isFinite(numeric))
          numeric = fallback
        return Math.min(max, Math.max(min, numeric))
      }
      return {
        weightA:clamp(params.weightA, 0.5, -2, 2),
        weightB:clamp(params.weightB, 0.5, -2, 2),
        bias:clamp(params.bias, 0, -255, 255)
      }
    },
    runInputs:(inputs, params, vision) => {
      return vision.runBlendMatrix(inputs.a && inputs.a.imageData, inputs.b && inputs.b.imageData, params)
    }
  },
  differenceMatrix:{
    labelKey:'VisionNodeDifferenceMatrix',
    fallbackLabel:'Difference matrix',
    fallbackDescription:'Show the absolute difference between two image inputs.',
    fallbackHelp:'This two-input node computes abs(A - B) for every pixel. It is useful for comparing two images, detecting movement, or seeing what changed between branches.',
    inputSlots:[{
      name:'a',
      labelKey:'VisionInputSlotA',
      fallbackLabel:'A'
    }, {
      name:'b',
      labelKey:'VisionInputSlotB',
      fallbackLabel:'B'
    }],
    controls:[{
      name:'gain',
      type:'number',
      labelKey:'VisionMatrixGain',
      fallbackLabel:'Gain',
      min:0,
      max:10,
      step:0.1
    }, {
      name:'bias',
      type:'number',
      labelKey:'VisionMatrixBias',
      fallbackLabel:'Bias',
      min:-255,
      max:255,
      step:1
    }],
    sanitize:(params) => {
      let gain = Number(params.gain)
      let bias = Number(params.bias)
      return {
        gain:Number.isFinite(gain) ? Math.min(10, Math.max(0, gain)) : 1,
        bias:Number.isFinite(bias) ? Math.min(255, Math.max(-255, bias)) : 0
      }
    },
    runInputs:(inputs, params, vision) => {
      return vision.runDifferenceMatrix(inputs.a && inputs.a.imageData, inputs.b && inputs.b.imageData, params)
    }
  },
  multiplyMatrix:{
    labelKey:'VisionNodeMultiplyMatrix',
    fallbackLabel:'Multiply matrix',
    fallbackDescription:'Multiply two image inputs pixel by pixel.',
    fallbackHelp:'This two-input node multiplies A and B per pixel. It behaves like a mask operation when one input is black and white, and can darken or combine image branches.',
    inputSlots:[{
      name:'a',
      labelKey:'VisionInputSlotA',
      fallbackLabel:'A'
    }, {
      name:'b',
      labelKey:'VisionInputSlotB',
      fallbackLabel:'B'
    }],
    controls:[{
      name:'scale',
      type:'number',
      labelKey:'VisionMatrixScale',
      fallbackLabel:'Scale',
      min:0,
      max:10,
      step:0.1
    }, {
      name:'bias',
      type:'number',
      labelKey:'VisionMatrixBias',
      fallbackLabel:'Bias',
      min:-255,
      max:255,
      step:1
    }],
    sanitize:(params) => {
      let scale = Number(params.scale)
      let bias = Number(params.bias)
      return {
        scale:Number.isFinite(scale) ? Math.min(10, Math.max(0, scale)) : 1,
        bias:Number.isFinite(bias) ? Math.min(255, Math.max(-255, bias)) : 0
      }
    },
    runInputs:(inputs, params, vision) => {
      return vision.runMultiplyMatrix(inputs.a && inputs.a.imageData, inputs.b && inputs.b.imageData, params)
    }
  },
  colorMatrix:{
    labelKey:'VisionNodeColorMatrix',
    fallbackLabel:'Color matrix',
    fallbackDescription:'Mix RGB channels with a 3x3 color matrix.',
    fallbackHelp:'This node creates each output channel from a weighted mix of input red, green, and blue. Use it for channel swapping, tinting, grayscale variants, or color isolation experiments.',
    controls:[{
      name:'rr',
      type:'number',
      labelKey:'VisionColorMatrixRR',
      fallbackLabel:'R from R',
      min:-2,
      max:2,
      step:0.05
    }, {
      name:'rg',
      type:'number',
      labelKey:'VisionColorMatrixRG',
      fallbackLabel:'R from G',
      min:-2,
      max:2,
      step:0.05
    }, {
      name:'rb',
      type:'number',
      labelKey:'VisionColorMatrixRB',
      fallbackLabel:'R from B',
      min:-2,
      max:2,
      step:0.05
    }, {
      name:'gr',
      type:'number',
      labelKey:'VisionColorMatrixGR',
      fallbackLabel:'G from R',
      min:-2,
      max:2,
      step:0.05
    }, {
      name:'gg',
      type:'number',
      labelKey:'VisionColorMatrixGG',
      fallbackLabel:'G from G',
      min:-2,
      max:2,
      step:0.05
    }, {
      name:'gb',
      type:'number',
      labelKey:'VisionColorMatrixGB',
      fallbackLabel:'G from B',
      min:-2,
      max:2,
      step:0.05
    }, {
      name:'br',
      type:'number',
      labelKey:'VisionColorMatrixBR',
      fallbackLabel:'B from R',
      min:-2,
      max:2,
      step:0.05
    }, {
      name:'bg',
      type:'number',
      labelKey:'VisionColorMatrixBG',
      fallbackLabel:'B from G',
      min:-2,
      max:2,
      step:0.05
    }, {
      name:'bb',
      type:'number',
      labelKey:'VisionColorMatrixBB',
      fallbackLabel:'B from B',
      min:-2,
      max:2,
      step:0.05
    }, {
      name:'bias',
      type:'number',
      labelKey:'VisionMatrixBias',
      fallbackLabel:'Bias',
      min:-255,
      max:255,
      step:1
    }],
    sanitize:(params) => {
      let clamp = (value, fallback, min, max) => {
        let numeric = Number(value)
        if (!Number.isFinite(numeric))
          numeric = fallback
        return Math.min(max, Math.max(min, numeric))
      }
      return {
        rr:clamp(params.rr, 1, -2, 2),
        rg:clamp(params.rg, 0, -2, 2),
        rb:clamp(params.rb, 0, -2, 2),
        gr:clamp(params.gr, 0, -2, 2),
        gg:clamp(params.gg, 1, -2, 2),
        gb:clamp(params.gb, 0, -2, 2),
        br:clamp(params.br, 0, -2, 2),
        bg:clamp(params.bg, 0, -2, 2),
        bb:clamp(params.bb, 1, -2, 2),
        bias:clamp(params.bias, 0, -255, 255)
      }
    },
    run:(imageData, params, vision) => {
      return vision.runColorMatrix(imageData, params)
    }
  },
  threshold:{
    labelKey:'VisionNodeThreshold',
    fallbackLabel:'Threshold',
    fallbackDescription:'Turn the image into black and white using one threshold value.',
    fallbackHelp:'Pixels above the threshold become white and pixels below become black. This is best when the lighting is even and the object stands out clearly from the background.',
    controls:[{
      name:'value',
      type:'range',
      labelKey:'VisionThresholdValue',
      fallbackLabel:'Value',
      min:0,
      max:255,
      step:1
    }],
    sanitize:(params) => {
      return {
        value:Math.min(255, Math.max(0, Number(params.value) || 128))
      }
    },
    run:(imageData, params, vision) => {
      return vision.runThreshold(imageData, params)
    }
  },
  adaptiveThreshold:{
    labelKey:'VisionNodeAdaptiveThreshold',
    fallbackLabel:'Adaptive threshold',
    fallbackDescription:'Turn the image into black and white using local brightness in each area.',
    fallbackHelp:'This node computes a threshold from each local neighborhood instead of one global value. It is useful when lighting changes across the image or the background is uneven.',
    controls:[{
      name:'blockSize',
      type:'range',
      labelKey:'VisionAdaptiveThresholdBlockSize',
      fallbackLabel:'Block size',
      min:3,
      max:51,
      step:2
    }, {
      name:'offset',
      type:'range',
      labelKey:'VisionAdaptiveThresholdOffset',
      fallbackLabel:'Offset',
      min:-20,
      max:20,
      step:1
    }],
    sanitize:(params) => {
      let blockSize = Number(params.blockSize) || 15
      if (blockSize % 2 === 0)
        blockSize += 1
      return {
        blockSize:Math.min(51, Math.max(3, blockSize)),
        offset:Math.min(20, Math.max(-20, Number(params.offset) || 5))
      }
    },
    run:(imageData, params, vision) => {
      return vision.runAdaptiveThreshold(imageData, params)
    }
  },
  dilate:{
    labelKey:'VisionNodeDilate',
    fallbackLabel:'Dilate',
    fallbackDescription:'Grow bright regions to fill small gaps.',
    fallbackHelp:'Dilation expands white regions outward. Use it to connect nearby bright areas or close thin breaks after thresholding.',
    controls:[{
      name:'radius',
      type:'range',
      labelKey:'VisionMorphRadius',
      fallbackLabel:'Radius',
      min:1,
      max:4,
      step:1
    }],
    sanitize:(params) => {
      return {
        radius:Math.min(4, Math.max(1, Number(params.radius) || 1))
      }
    },
    run:(imageData, params, vision) => {
      return vision.runMorphology(imageData, params, 'dilate')
    }
  },
  erode:{
    labelKey:'VisionNodeErode',
    fallbackLabel:'Erode',
    fallbackDescription:'Shrink bright regions to remove small specks.',
    fallbackHelp:'Erosion contracts white regions inward. It is useful for removing tiny bright noise and separating objects that are only lightly touching.',
    controls:[{
      name:'radius',
      type:'range',
      labelKey:'VisionMorphRadius',
      fallbackLabel:'Radius',
      min:1,
      max:4,
      step:1
    }],
    sanitize:(params) => {
      return {
        radius:Math.min(4, Math.max(1, Number(params.radius) || 1))
      }
    },
    run:(imageData, params, vision) => {
      return vision.runMorphology(imageData, params, 'erode')
    }
  },
  open:{
    labelKey:'VisionNodeOpen',
    fallbackLabel:'Open',
    fallbackDescription:'Remove small bright noise by eroding and then dilating.',
    fallbackHelp:'Opening removes small isolated white specks while keeping larger shapes. It is a strong cleanup step before contour or object extraction.',
    controls:[{
      name:'radius',
      type:'range',
      labelKey:'VisionMorphRadius',
      fallbackLabel:'Radius',
      min:1,
      max:4,
      step:1
    }],
    sanitize:(params) => {
      return {
        radius:Math.min(4, Math.max(1, Number(params.radius) || 1))
      }
    },
    run:(imageData, params, vision) => {
      return vision.runMorphology(imageData, params, 'open')
    }
  },
  close:{
    labelKey:'VisionNodeClose',
    fallbackLabel:'Close',
    fallbackDescription:'Fill small holes and gaps by dilating and then eroding.',
    fallbackHelp:'Closing fills small dark gaps inside bright objects and connects narrow breaks. Use it when your thresholded objects look fragmented.',
    controls:[{
      name:'radius',
      type:'range',
      labelKey:'VisionMorphRadius',
      fallbackLabel:'Radius',
      min:1,
      max:4,
      step:1
    }],
    sanitize:(params) => {
      return {
        radius:Math.min(4, Math.max(1, Number(params.radius) || 1))
      }
    },
    run:(imageData, params, vision) => {
      return vision.runMorphology(imageData, params, 'close')
    }
  },
  edges:{
    labelKey:'VisionNodeEdges',
    fallbackLabel:'Edges',
    fallbackDescription:'Highlight strong brightness changes as edges.',
    fallbackHelp:'This node emphasizes boundaries where image intensity changes quickly. It is useful for outline-based inspection but usually needs tuning and clean input.',
    controls:[{
      name:'threshold',
      type:'range',
      labelKey:'VisionEdgeThreshold',
      fallbackLabel:'Threshold',
      min:0,
      max:255,
      step:1
    }],
    sanitize:(params) => {
      return {
        threshold:Math.min(255, Math.max(0, Number(params.threshold) || 96))
      }
    },
    run:(imageData, params, vision) => {
      return vision.runEdges(imageData, params)
    }
  },
  contours:{
    labelKey:'VisionNodeContours',
    fallbackLabel:'Contours',
    fallbackDescription:'Extract object outlines from the image.',
    fallbackHelp:'Contours trace the borders of detected bright regions. This is often the preparation step before object-level outputs such as bounding boxes, centers, and rotations.',
    controls:[{
      name:'threshold',
      type:'range',
      labelKey:'VisionContourThreshold',
      fallbackLabel:'Threshold',
      min:0,
      max:255,
      step:1
    }],
    sanitize:(params) => {
      return {
        threshold:Math.min(255, Math.max(0, Number(params.threshold) || 128))
      }
    },
    run:(imageData, params, vision) => {
      return vision.runContours(imageData, params)
    }
  },
  invert:{
    labelKey:'VisionNodeInvert',
    fallbackLabel:'Invert',
    fallbackDescription:'Invert dark and bright pixels.',
    fallbackHelp:'This flips black to white and white to black. Use it when your object is dark on a bright background but later nodes expect bright foreground objects.',
    controls:[],
    sanitize:() => {
      return {}
    },
    run:(imageData, params, vision) => {
      return vision.runInvert(imageData)
    }
  },
  stateOutput:{
    labelKey:'VisionNodeStateOutput',
    fallbackLabel:'State output',
    fallbackDescription:'Output one of two values based on how much of the image is detected.',
    fallbackHelp:'This node compares the detected white area against the configured threshold and returns either the On value or the Off value. Use it when you want a simple state such as detected/clear or open/closed.',
    controls:[{
      name:'thresholdPercent',
      type:'range',
      labelKey:'VisionStateOutputThreshold',
      fallbackLabel:'White % threshold',
      min:0,
      max:100,
      step:1
    }, {
      name:'onValue',
      type:'text',
      labelKey:'VisionStateOutputOnValue',
      fallbackLabel:'On value'
    }, {
      name:'offValue',
      type:'text',
      labelKey:'VisionStateOutputOffValue',
      fallbackLabel:'Off value'
    }],
    sanitize:(params) => {
      return {
        thresholdPercent:Math.min(100, Math.max(0, Number(params.thresholdPercent) || 2)),
        onValue:String(params.onValue || 'detected'),
        offValue:String(params.offValue || 'clear')
      }
    },
    run:(imageData, params, vision) => {
      let metrics = vision.measureImageData(imageData)
      let threshold = params.thresholdPercent / 100
      let detected = metrics.whitePercent >= threshold
      let value = detected ? params.onValue : params.offValue
      let span = Math.max(threshold, 1 - threshold, 0.001)
      let confidence = Math.max(0, Math.min(1, Math.abs(metrics.whitePercent - threshold) / span))

      return {
        kind:'vision-output',
        type:'state',
        value:value,
        text:`state: ${value} (${(metrics.whitePercent * 100).toFixed(1)}% white)`,
        confidence:confidence,
        fields:{
          engine:vision.visionEngine(),
          detected:detected,
          state:value,
          thresholdPercent:params.thresholdPercent,
          ...metrics
        },
        metrics:metrics,
        imageData:imageData
      }
    }
  },
  objectCountOutput:{
    labelKey:'VisionNodeObjectCountOutput',
    fallbackLabel:'All detected objects output',
    fallbackDescription:'Detect all objects above the minimum area and output their count plus per-object data.',
    fallbackHelp:'This node finds every detected foreground object that is at least the chosen minimum area. It outputs the total count, a structured objects array, a JSON string version, and indexed fields like object0CenterX, object1BboxHeight, and object2RotationDeg for easy templates and MQTT messages.',
    controls:[{
      name:'minAreaPixels',
      type:'range',
      labelKey:'VisionObjectMinArea',
      fallbackLabel:'Min area (px)',
      min:1,
      max:5000,
      step:1
    }],
    sanitize:(params) => {
      return {
        minAreaPixels:Math.max(1, Number(params.minAreaPixels) || 32)
      }
    },
    run:(imageData, params, vision) => {
      let metrics = vision.measureImageData(imageData)
      let components = vision.findForegroundComponents(imageData, params.minAreaPixels)
      let largest = components[0] || null
      let annotated = components.length > 0 ? vision.annotateComponents(imageData, components, {showBox:true, showCenter:true, limit:Math.min(components.length, 12)}) : imageData
      let componentData = vision.componentOutputData(components)

      return {
        kind:'vision-output',
        type:'object-count',
        value:components.length,
        text:`objects: ${components.length}`,
        confidence:largest ? largest.areaPercent : 1,
        fields:{
          engine:vision.visionEngine(),
          detected:components.length > 0,
          state:components.length > 0 ? 'objects' : 'none',
          count:components.length,
          objectCount:components.length,
          objects:componentData.objects,
          objectsJson:componentData.objectsJson,
          minAreaPixels:params.minAreaPixels,
          largestArea:largest ? largest.area : 0,
          largestAreaPercent:largest ? largest.areaPercent : 0,
          ...componentData.indexedFields,
          ...metrics
        },
        metrics:metrics,
        imageData:annotated
      }
    }
  },
  boundingBoxOutput:{
    labelKey:'VisionNodeBoundingBoxOutput',
    fallbackLabel:'Bounding box output',
    fallbackDescription:'Output the position and size of the largest detected object.',
    fallbackHelp:'This node selects the largest detected object and reports its bounding box as x, y, width, and height. It also includes the object center and area fields so you can position or size-follow the object.',
    controls:[{
      name:'minAreaPixels',
      type:'range',
      labelKey:'VisionObjectMinArea',
      fallbackLabel:'Min area (px)',
      min:1,
      max:5000,
      step:1
    }],
    sanitize:(params) => {
      return {
        minAreaPixels:Math.max(1, Number(params.minAreaPixels) || 32)
      }
    },
    run:(imageData, params, vision) => {
      let metrics = vision.measureImageData(imageData)
      let component = vision.findForegroundComponents(imageData, params.minAreaPixels)[0] || null
      let annotated = component ? vision.annotateComponents(imageData, [component], {showBox:true, showCenter:true}) : imageData

      return {
        kind:'vision-output',
        type:'bounding-box',
        value:component ? 'found' : 'none',
        text:component ?
          `bbox: x=${Math.round(component.bboxX)}, y=${Math.round(component.bboxY)}, w=${Math.round(component.bboxWidth)}, h=${Math.round(component.bboxHeight)}` :
          'bbox: none',
        confidence:component ? component.areaPercent : 0,
        fields:{
          engine:vision.visionEngine(),
          detected:Boolean(component),
          state:component ? 'found' : 'none',
          bboxX:component ? component.bboxX : -1,
          bboxY:component ? component.bboxY : -1,
          bboxWidth:component ? component.bboxWidth : 0,
          bboxHeight:component ? component.bboxHeight : 0,
          centerX:component ? component.centerX : -1,
          centerY:component ? component.centerY : -1,
          area:component ? component.area : 0,
          areaPercent:component ? component.areaPercent : 0,
          minAreaPixels:params.minAreaPixels,
          ...metrics
        },
        metrics:metrics,
        imageData:annotated
      }
    }
  },
  rotationOutput:{
    labelKey:'VisionNodeRotationOutput',
    fallbackLabel:'Rotation output',
    fallbackDescription:'Output the angle of the largest detected object.',
    fallbackHelp:'This node selects the largest detected object and estimates its orientation from its shape. It outputs the rotation in degrees and radians, along with center, bounding box, and area fields for the same object.',
    controls:[{
      name:'minAreaPixels',
      type:'range',
      labelKey:'VisionObjectMinArea',
      fallbackLabel:'Min area (px)',
      min:1,
      max:5000,
      step:1
    }],
    sanitize:(params) => {
      return {
        minAreaPixels:Math.max(1, Number(params.minAreaPixels) || 32)
      }
    },
    run:(imageData, params, vision) => {
      let metrics = vision.measureImageData(imageData)
      let component = vision.findForegroundComponents(imageData, params.minAreaPixels)[0] || null
      let annotated = component ? vision.annotateComponents(imageData, [component], {showBox:true, showCenter:true, showRotation:true}) : imageData
      let rotationDeg = component ? component.rotationDeg : 0

      return {
        kind:'vision-output',
        type:'rotation',
        value:rotationDeg,
        text:component ? `rotation: ${rotationDeg.toFixed(1)}°` : 'rotation: none',
        confidence:component ? component.areaPercent : 0,
        fields:{
          engine:vision.visionEngine(),
          detected:Boolean(component),
          state:component ? 'found' : 'none',
          rotationDeg:rotationDeg,
          rotationRad:component ? component.rotationRad : 0,
          centerX:component ? component.centerX : -1,
          centerY:component ? component.centerY : -1,
          bboxX:component ? component.bboxX : -1,
          bboxY:component ? component.bboxY : -1,
          bboxWidth:component ? component.bboxWidth : 0,
          bboxHeight:component ? component.bboxHeight : 0,
          area:component ? component.area : 0,
          areaPercent:component ? component.areaPercent : 0,
          minAreaPixels:params.minAreaPixels,
          ...metrics
        },
        metrics:metrics,
        imageData:annotated
      }
    }
  },
  objectCenterOutput:{
    labelKey:'VisionNodeObjectCenterOutput',
    fallbackLabel:'Object center output',
    fallbackDescription:'Output the center point of the largest detected object.',
    fallbackHelp:'This node selects the largest detected object and reports its center position as x and y coordinates. It also includes bounding box and area fields so you can combine location with object size.',
    controls:[{
      name:'minAreaPixels',
      type:'range',
      labelKey:'VisionObjectMinArea',
      fallbackLabel:'Min area (px)',
      min:1,
      max:5000,
      step:1
    }],
    sanitize:(params) => {
      return {
        minAreaPixels:Math.max(1, Number(params.minAreaPixels) || 32)
      }
    },
    run:(imageData, params, vision) => {
      let metrics = vision.measureImageData(imageData)
      let component = vision.findForegroundComponents(imageData, params.minAreaPixels)[0] || null
      let annotated = component ? vision.annotateComponents(imageData, [component], {showBox:true, showCenter:true}) : imageData
      let centerText = component ? `${component.centerX.toFixed(1)},${component.centerY.toFixed(1)}` : 'none'

      return {
        kind:'vision-output',
        type:'object-center',
        value:centerText,
        text:component ? `center: x=${component.centerX.toFixed(1)}, y=${component.centerY.toFixed(1)}` : 'center: none',
        confidence:component ? component.areaPercent : 0,
        fields:{
          engine:vision.visionEngine(),
          detected:Boolean(component),
          state:component ? 'found' : 'none',
          centerX:component ? component.centerX : -1,
          centerY:component ? component.centerY : -1,
          bboxX:component ? component.bboxX : -1,
          bboxY:component ? component.bboxY : -1,
          bboxWidth:component ? component.bboxWidth : 0,
          bboxHeight:component ? component.bboxHeight : 0,
          area:component ? component.area : 0,
          areaPercent:component ? component.areaPercent : 0,
          minAreaPixels:params.minAreaPixels,
          ...metrics
        },
        metrics:metrics,
        imageData:annotated
      }
    }
  }
}

const VISION_NODE_ICONS = {
  'input':              '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="2" y="4" width="16" height="12" rx="2"/><circle cx="10" cy="10" r="3"/><circle cx="14.5" cy="5.5" r="0.8" fill="currentColor"/></svg>',
  'grayscale':          '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="14" height="14" rx="2"/><path d="M10 3v14" stroke-linecap="round"/></svg>',
  'brightness':         '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="10" cy="10" r="3"/><line x1="10" y1="2" x2="10" y2="4"/><line x1="10" y1="16" x2="10" y2="18"/><line x1="2" y1="10" x2="4" y2="10"/><line x1="16" y1="10" x2="18" y2="10"/><line x1="4.5" y1="4.5" x2="5.9" y2="5.9"/><line x1="14.1" y1="14.1" x2="15.5" y2="15.5"/><line x1="15.5" y1="4.5" x2="14.1" y2="5.9"/><line x1="5.9" y1="14.1" x2="4.5" y2="15.5"/></svg>',
  'contrast':           '<svg viewBox="0 0 20 20" stroke="currentColor" stroke-width="1.5"><circle cx="10" cy="10" r="7" fill="none"/><path d="M10 3 A7 7 0 0 1 10 17Z" fill="currentColor" opacity="0.5" stroke="none"/></svg>',
  'invert':             '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="3" y="7" width="5.5" height="6" rx="1"/><rect x="11.5" y="7" width="5.5" height="6" rx="1" fill="currentColor" opacity="0.4" stroke="none"/><rect x="11.5" y="7" width="5.5" height="6" rx="1"/><path d="M9.5 10h1"/></svg>',
  'resize':             '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7V3h4M17 7V3h-4M3 13v4h4M17 13v4h-4"/><rect x="6.5" y="6.5" width="7" height="7" rx="1"/></svg>',
  'crop':               '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M5 2v11h11"/><path d="M2 5h11v11"/></svg>',
  'blur':               '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="10" cy="10" r="3.5"/><circle cx="10" cy="10" r="6" stroke-dasharray="2 2"/><circle cx="10" cy="10" r="8.5" stroke-dasharray="2 2" opacity="0.4"/></svg>',
  'threshold':          '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="3" y="4" width="6" height="12" rx="1" fill="currentColor" opacity="0.35" stroke="currentColor"/><rect x="11" y="4" width="6" height="12" rx="1"/><line x1="9" y1="10" x2="11" y2="10" stroke-dasharray="1.5 1"/></svg>',
  'adaptiveThreshold':  '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="3" y="4" width="14" height="12" rx="2"/><polyline points="5,13 8,7 11,13 14,7 17,13" stroke-linejoin="round"/></svg>',
  'dilate':             '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="10" cy="10" r="3" fill="currentColor" opacity="0.3"/><circle cx="10" cy="10" r="6"/><path d="M10 4v2M10 14v2M4 10h2M14 10h2"/></svg>',
  'erode':              '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="10" cy="10" r="6" stroke-dasharray="2 2"/><circle cx="10" cy="10" r="3" fill="currentColor" opacity="0.3"/></svg>',
  'open':               '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="7" cy="10" r="3.5"/><circle cx="13" cy="10" r="3.5"/><path d="M7 6.5l-3-3M13 6.5l3-3"/></svg>',
  'close':              '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="7" cy="10" r="3.5"/><circle cx="13" cy="10" r="3.5"/><path d="M7 13.5l-3 3M13 13.5l3 3"/></svg>',
  'edges':              '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="4" y="4" width="12" height="12" rx="2" stroke-dasharray="3 2"/><rect x="7" y="7" width="6" height="6" rx="1"/></svg>',
  'contours':           '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M10 3C6.13 3 3 6.13 3 10s3.13 7 7 7 7-3.13 7-7-3.13-7-7-7z"/><path d="M10 6.5C8.07 6.5 6.5 8.07 6.5 10s1.57 3.5 3.5 3.5 3.5-1.57 3.5-3.5S11.93 6.5 10 6.5z"/></svg>',
  'convolutionMatrix':  '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2.5" y="2.5" width="4" height="4" rx="0.5"/><rect x="8" y="2.5" width="4" height="4" rx="0.5"/><rect x="13.5" y="2.5" width="4" height="4" rx="0.5"/><rect x="2.5" y="8" width="4" height="4" rx="0.5"/><rect x="8" y="8" width="4" height="4" rx="0.5" fill="currentColor" opacity="0.3"/><rect x="13.5" y="8" width="4" height="4" rx="0.5"/><rect x="2.5" y="13.5" width="4" height="4" rx="0.5"/><rect x="8" y="13.5" width="4" height="4" rx="0.5"/><rect x="13.5" y="13.5" width="4" height="4" rx="0.5"/></svg>',
  'colorMatrix':        '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2.5" y="2.5" width="4" height="4" rx="0.5" fill="#f87171" stroke="#f87171"/><rect x="8" y="2.5" width="4" height="4" rx="0.5" fill="#4ade80" stroke="#4ade80"/><rect x="13.5" y="2.5" width="4" height="4" rx="0.5" fill="#60a5fa" stroke="#60a5fa"/><rect x="2.5" y="8" width="4" height="4" rx="0.5"/><rect x="8" y="8" width="4" height="4" rx="0.5"/><rect x="13.5" y="8" width="4" height="4" rx="0.5"/><rect x="2.5" y="13.5" width="4" height="4" rx="0.5"/><rect x="8" y="13.5" width="4" height="4" rx="0.5"/><rect x="13.5" y="13.5" width="4" height="4" rx="0.5"/></svg>',
  'blendMatrix':        '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="7.5" cy="10" r="5" fill="currentColor" opacity="0.25" stroke="currentColor"/><circle cx="12.5" cy="10" r="5" fill="currentColor" opacity="0.25" stroke="currentColor"/></svg>',
  'differenceMatrix':   '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="8" height="8" rx="1" fill="currentColor" opacity="0.3"/><rect x="9" y="9" width="8" height="8" rx="1" fill="currentColor" opacity="0.3"/></svg>',
  'multiplyMatrix':     '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><line x1="6" y1="6" x2="14" y2="14"/><line x1="14" y1="6" x2="6" y2="14"/><circle cx="10" cy="10" r="7"/></svg>',
  'stateOutput':        '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="10" cy="10" r="2.5" fill="currentColor" opacity="0.5"/><path d="M10 3v4M10 13v4M3 10h4M13 10h4"/></svg>',
  'objectCountOutput':  '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="3" y="3" width="5" height="5" rx="1"/><rect x="12" y="3" width="5" height="5" rx="1"/><rect x="3" y="12" width="5" height="5" rx="1"/><path d="M14 12v5M12 14.5h5"/></svg>',
  'objectCenterOutput': '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="10" cy="10" r="2"/><line x1="10" y1="3" x2="10" y2="7.5"/><line x1="10" y1="12.5" x2="10" y2="17"/><line x1="3" y1="10" x2="7.5" y2="10"/><line x1="12.5" y1="10" x2="17" y2="10"/></svg>',
  'boundingBoxOutput':  '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M5 3H3v2M15 3h2v2M5 17H3v-2M15 17h2v-2"/><rect x="5" y="5" width="10" height="10" rx="1" stroke-dasharray="2 1.5"/></svg>',
  'rotationOutput':     '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10a7 7 0 1 0 7-7"/><path d="M3 5v5h5"/></svg>',
  '_default':           '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="3" y="3" width="14" height="14" rx="2"/><path d="M8 10h4M10 8v4"/></svg>'
}

const VisionPaletteGroups = [{
  label:'Sources',
  nodes:['input']
}, {
  label:'Basic transforms',
  nodes:['grayscale', 'resize', 'crop', 'brightness', 'contrast', 'blur', 'invert']
}, {
  label:'Matrix operations',
  nodes:['convolutionMatrix', 'colorMatrix', 'blendMatrix', 'differenceMatrix', 'multiplyMatrix']
}, {
  label:'Segmentation',
  nodes:['threshold', 'adaptiveThreshold', 'edges', 'contours']
}, {
  label:'Morphology',
  nodes:['dilate', 'erode', 'open', 'close']
}, {
  label:'Outputs',
  nodes:['stateOutput', 'objectCountOutput', 'objectCenterOutput', 'boundingBoxOutput', 'rotationOutput']
}]

const VisionPalette = VisionPaletteGroups.flatMap((group) => group.nodes)

export let vision = new Vision()
