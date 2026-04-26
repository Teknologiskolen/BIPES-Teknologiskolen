"use strict";

import {DOM} from '../../base/dom.js'

import {project} from '../project/main.js'

function visionMsg (key, fallback){
  return (window.Msg && Msg[key]) || fallback
}

class Vision {
  constructor (){
    this.name = 'vision'
    this.available = false
    this.inited = false
    this.originalImageData = null
    this.originalFilename = ''
    this.selectedNodeId = null
    this.outputCache = {}
    this.boardPadding = 120
    this.nodeDrag = null
    this.connectionDrag = null
    this.contextMenu = null
    this.contextMenuSubmenu = null
    this.contextMenuSubmenuTrigger = null

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

    $.header = new DOM('h2', {innerText:Msg['PageVision']})
    $.intro = new DOM('p', {
      className:'vision-intro',
      innerText:Msg['VisionIntro']
    })

    $.resetButton = new DOM('button', {
      id:'discard',
      className:'icon text',
      innerText:Msg['VisionResetGraph']
    }).onclick(this, this.resetGraph)

    $.toolActions = new DOM('div', {className:'vision-actions'})
      .append([
        $.resetButton
      ])

    $.workspace = new DOM('div', {className:'vision-panel vision-workspace-panel'})

    $.layout = new DOM('div', {className:'vision-layout'})
      .append([
        $.workspace
      ])

    $.container = new DOM('div', {className:'container vision-container'})
      .append([
        $.header,
        $.intro,
        $.toolActions,
        $.layout
      ])

    $.section.append($.container)

    this.handlePointerMove = (ev) => {this.onPointerMove(ev)}
    this.handlePointerUp = (ev) => {this.onPointerUp(ev)}
    this.handleWindowPointerDown = (ev) => {this.onWindowPointerDown(ev)}
    window.addEventListener('mousemove', this.handlePointerMove)
    window.addEventListener('mouseup', this.handlePointerUp)
    window.addEventListener('mousedown', this.handleWindowPointerDown)

    this.renderWorkspaceShell()
    this.render()
  }

  init (){
    if (!this.available || this.inited)
      return

    this.inited = true
    this.render()
  }

  deinit (){
    if (!this.available || !this.inited)
      return

    this.inited = false
  }

  resize (){
    if (!this.available || !this.inited)
      return

    this.renderConnections()
  }

  empty (){
    return {
      nodes:this.cloneNodes(this.defaultNodes)
    }
  }

  load (obj){
    let nodes = obj && obj.nodes instanceof Array ? obj.nodes : this.defaultNodes
    this.nodes = this.normalizeNodes(nodes)
    this.selectedNodeId = this.findNode(this.selectedNodeId) ? this.selectedNodeId : this.nodes[0].id
    this.invalidateOutputs()
    if (this.available && this.inited)
      this.render()
  }

  makeDefaultNodes (){
    return [{
      id:'vision-input',
      type:'input',
      sourceId:null,
      params:{},
      x:84,
      y:96
    }]
  }

  cloneNodes (nodes){
    return nodes.map((node) => {
      return {
        id:node.id,
        type:node.type,
        sourceId:node.sourceId,
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
      if (type === 'input') {
        if (hasInput)
          return
        hasInput = true
      }
      normalized.push({
        id:typeof node.id == 'string' ? node.id : `vision-node-${index}`,
        type:type,
        sourceId:type === 'input' ? null : node.sourceId || null,
        params:VisionNodeTypes[type].sanitize(node.params || {}),
        x:Number.isFinite(node.x) ? node.x : 84 + index * 240,
        y:Number.isFinite(node.y) ? node.y : 96 + (index % 2) * 188
      })
    })

    if (!hasInput)
      normalized.unshift(this.makeDefaultNodes()[0])

    normalized.forEach((node, index) => {
      if (node.type === 'input') {
        node.sourceId = null
        return
      }
      let previousNodes = normalized.slice(0, index)
      if (!previousNodes.some((item) => item.id === node.sourceId))
        node.sourceId = null
    })

    return normalized
  }

  getNodeTypeLabel (type){
    let nodeType = VisionNodeTypes[type]
    if (!nodeType)
      return type
    return visionMsg(nodeType.labelKey, nodeType.fallbackLabel || type)
  }

  getControlLabel (control){
    return visionMsg(control.labelKey, control.fallbackLabel || control.name)
  }

  getNodeSourceImageData (node){
    if (!node || !node.sourceId)
      return this.originalImageData

    let sourceOutput = this.getNodeOutput(node.sourceId)
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
    this.$.workspace.removeChilds().append([
      new DOM('div', {className:'vision-panel-header', innerText:Msg['VisionWorkspace']})
    ])

    this.$.workspaceHint = new DOM('p', {
      className:'vision-panel-copy',
      innerText:Msg['VisionWorkspaceHelp']
    })
    this.$.graphScroll = new DOM('div', {className:'vision-graph-scroll'})
    this.$.graphBoard = new DOM('div', {className:'vision-graph-board'})
    this.$.graphConnections = new DOM('div', {className:'vision-connections'})
    this.$.nodes = new DOM('div', {className:'vision-node-list'})
    this.$.contextMenu = this.makeContextMenu()
    this.$.graphBoard.onclick(this, this.clearSelection)
    this.$.graphBoard.$.addEventListener('contextmenu', (ev) => {
      ev.preventDefault()
      this.handleBoardContextMenu(ev)
    })

    this.$.graphBoard.append([this.$.graphConnections, this.$.nodes, this.$.contextMenu])
    this.$.graphScroll.append(this.$.graphBoard)
    this.$.workspace.append([this.$.workspaceHint, this.$.graphScroll])
  }

  render (){
    this.updateBoardSize()
    this.renderNodes()
    window.requestAnimationFrame(() => {this.renderConnections()})
  }

  renderNodes (){
    this.$.nodes.removeChilds()

    this.nodes.forEach((node) => {
      let nodeType = VisionNodeTypes[node.type]
      let card = new DOM('div', {
        className:`vision-node${this.selectedNodeId === node.id ? ' selected' : ''}`
      })
      card.$.dataset.nodeId = node.id
      card.style.left = `${node.x}px`
      card.style.top = `${node.y}px`
      card.onclick(this, this.selectNode, [node.id])

      let header = new DOM('div', {className:'vision-node-header'})
      header.ondown(this, this.startNodeDrag, [node.id])
        .append([
          new DOM('div', {
            className:'vision-node-title',
            innerText:this.getNodeTypeLabel(node.type)
          }),
          node.type === 'input' ?
            new DOM('span', {
              className:'vision-node-badge',
              innerText:Msg['VisionNodeInputBadge']
            }) :
            new DOM('button', {
              id:'remove',
              innerText:'×',
              className:'vision-node-remove',
              title:Msg['VisionRemoveNode']
            })
              .ondown(this, (ev) => {ev.stopPropagation()})
              .onup(this, (ev) => {ev.stopPropagation()})
              .onclick(this, this.removeNode, [node.id])
        ])

      let body = new DOM('div', {className:'vision-node-body'})
      let uploadInput = null
      let uploadLabel = null

      if (node.type === 'input') {
        let uploadId = `vision-upload-${DOM.UID()}`
        uploadInput = new DOM('input', {
          type:'file',
          accept:'image/*'
        }).onevent('change', this, this.uploadImage)
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

        body.append(new DOM('div', {
          className:'vision-node-meta',
          innerText:this.originalFilename === '' ? Msg['VisionAwaitingImage'] : this.originalFilename
        }))
      } else {
        let source = this.findNode(node.sourceId)
        body.append(new DOM('div', {
          className:'vision-node-meta',
          innerText:source ? Msg['VisionInspectorSource'].replace('{0}', this.getNodeTypeLabel(source.type)) : Msg['VisionWireHelp']
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
          let slider = new DOM('input', {
            type:'range',
            value:String(currentValue),
            min:resolvedControl.min,
            max:resolvedControl.max,
            step:resolvedControl.step
          })
          slider.$.setAttribute('min', String(resolvedControl.min))
          slider.$.setAttribute('max', String(resolvedControl.max))
          slider.$.setAttribute('step', String(resolvedControl.step))
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
      let inputPort = new DOM('button', {
        className:`vision-port input${node.type === 'input' ? ' disabled' : ''}`,
        title:Msg['VisionInputPort']
      })
      inputPort.$.dataset.portNodeId = node.id
      inputPort.$.dataset.portType = 'input'
      if (node.type !== 'input') {
        inputPort.onclick(this, (ev) => {
          ev.stopPropagation()
          this.completeConnection(node.id)
        })
        inputPort.$.addEventListener('mouseup', (ev) => {
          ev.stopPropagation()
          this.completeConnection(node.id)
        })
      }

      let outputPort = new DOM('button', {
        className:'vision-port output',
        title:Msg['VisionOutputPort']
      })
      outputPort.$.dataset.portNodeId = node.id
      outputPort.$.dataset.portType = 'output'
      outputPort.onclick(this, (ev) => {
        ev.stopPropagation()
        this.startConnection(node.id, ev)
      })
      outputPort.$.addEventListener('mousedown', (ev) => {
        ev.stopPropagation()
        this.startConnection(node.id, ev)
      })

      ports.append([inputPort, outputPort])

      card.append([ports, header, body, status])
      this.$.nodes.append(card)

      this.drawNodePreview(node.id, preview.$)
    })
  }

  renderConnections (){
    if (!this.$.graphConnections || !this.$.graphBoard)
      return

    let layer = this.$.graphConnections
    layer.removeChilds()

    this.nodes.forEach((node) => {
      if (!node.sourceId)
        return

      let start = this.getPortCenter(node.sourceId, 'output')
      let end = this.getPortCenter(node.id, 'input')
      if (!start || !end)
        return

      layer.append(this.makeConnectionElement(
        start.x,
        start.y,
        end.x,
        end.y,
        false,
        node.id
      ))
    })

    if (this.connectionDrag) {
      let start = this.getPortCenter(this.connectionDrag.nodeId, 'output')
      if (start)
        layer.append(this.makeConnectionElement(start.x, start.y, this.connectionDrag.x, this.connectionDrag.y, true, null))
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

    if (nodeId === this.nodes[0].id)
      return

    let nodes = this.nodes.filter((node) => node.id !== nodeId)
    let fallback = nodes[0] ? nodes[0].id : null
    nodes.forEach((node) => {
      if (node.type === 'input')
        return
      if (!nodes.some((item) => item.id === node.sourceId))
        node.sourceId = null
    })
    this.nodes = nodes
    if (!this.findNode(this.selectedNodeId))
      this.selectedNodeId = fallback
    this.changed()
  }

  selectNode (nodeId){
    this.selectedNodeId = nodeId
    this.closeContextMenu()
    this.render()
  }

  clearSelection (ev){
    if (ev.target !== this.$.graphBoard.$ && ev.target !== this.$.graphConnections.$ && ev.target !== this.$.nodes.$)
      return
    this.selectedNodeId = null
    this.closeContextMenu()
    this.render()
  }

  resetGraph (){
    this.nodes = this.cloneNodes(this.defaultNodes)
    this.selectedNodeId = this.nodes[0].id
    this.invalidateOutputs()
    this.syncProject()
    this.closeContextMenu()
    this.render()
  }

  changeNodeParam (nodeId, name, type, ev){
    let node = this.findNode(nodeId)
    if (!node)
      return

    let control = (VisionNodeTypes[node.type] && VisionNodeTypes[node.type].controls || []).find((item) => item.name === name)
    let resolvedControl = this.resolveControlForNode(node, control)
    let value = type === 'range' || type === 'number'
      ? this.clampControlValue(resolvedControl, ev.target.value)
      : ev.target.value
    node.params[name] = value
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
    this.syncProject()
    this.render()
  }

  syncProject (){
    if (!project.currentUID)
      return

    project.update({
      vision:{
        nodes:this.cloneNodes(this.nodes)
      }
    })
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
    if (typeof ev.button !== 'undefined' && ev.button !== 0)
      return

    let pointer = this.getPointerPositionInBoard(ev)
    this.connectionDrag = {
      nodeId:nodeId,
      x:pointer.x,
      y:pointer.y
    }
    this.selectedNodeId = nodeId
    this.closeContextMenu()
    this.renderConnections()
  }

  completeConnection (targetNodeId){
    if (!this.connectionDrag)
      return

    this.connectNodes(this.connectionDrag.nodeId, targetNodeId)
    this.connectionDrag = null
  }

  connectNodes (sourceNodeId, targetNodeId){
    let targetNode = this.findNode(targetNodeId)
    if (!targetNode || targetNode.type === 'input')
      return

    if (sourceNodeId === targetNodeId)
      return

    if (this.wouldCreateCycle(sourceNodeId, targetNodeId))
      return

    targetNode.sourceId = sourceNodeId
    this.changed()
  }

  disconnectNode (targetNodeId){
    let node = this.findNode(targetNodeId)
    if (!node || node.type === 'input')
      return

    node.sourceId = null
    this.changed()
  }

  wouldCreateCycle (sourceNodeId, targetNodeId){
    let current = sourceNodeId
    while (current) {
      if (current === targetNodeId)
        return true
      let node = this.findNode(current)
      current = node ? node.sourceId : null
    }
    return false
  }

  onPointerMove (ev){
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
    if (this.nodeDrag) {
      this.nodeDrag = null
      this.syncProject()
      this.renderConnections()
    }

    if (this.connectionDrag) {
      let targetNodeId = this.getInputPortTargetIdAtPoint(ev.clientX, ev.clientY)
      if (targetNodeId)
        this.connectNodes(this.connectionDrag.nodeId, targetNodeId)
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

  getPortCenter (nodeId, type){
    let port = DOM.get(`[data-port-node-id="${nodeId}"][data-port-type="${type}"]`, this.$.graphBoard.$)
    if (!port)
      return null
    let rect = port.getBoundingClientRect()
    let boardRect = this.$.graphBoard.$.getBoundingClientRect()
    return {
      x:rect.left + rect.width / 2 - boardRect.left,
      y:rect.top + rect.height / 2 - boardRect.top
    }
  }

  getInputPortTargetIdAtPoint (clientX, clientY){
    let element = document.elementFromPoint(clientX, clientY)
    if (!element || typeof element.closest != 'function')
      return null

    let port = element.closest('[data-port-type="input"][data-port-node-id]')
    if (!port || !this.$.graphBoard.$.contains(port))
      return null

    return port.dataset.portNodeId || null
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
      if (target.closest('.vision-node') || target.closest('.vision-connection-wrap')) {
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

  makeConnectionElement (x1, y1, x2, y2, active, targetNodeId){
    let dx = x2 - x1
    let dy = y2 - y1
    let distance = Math.max(1, Math.hypot(dx, dy))
    let angle = Math.atan2(dy, dx)

    let wrapper = new DOM('div', {
      className:`vision-connection-wrap${targetNodeId ? ' interactive' : ''}${active ? ' active' : ''}`
    })
    wrapper.style.left = `${x1}px`
    wrapper.style.top = `${y1}px`
    wrapper.style.width = `${distance}px`
    wrapper.style.transform = `rotate(${angle}rad)`

    if (targetNodeId) {
      let removeConnection = (ev) => {
        ev.preventDefault()
        ev.stopPropagation()
        this.disconnectNode(targetNodeId)
      }
      wrapper.$.dataset.targetNodeId = targetNodeId
      wrapper.$.addEventListener('contextmenu', removeConnection)
      wrapper.$.addEventListener('pointerdown', (ev) => {
        if (ev.button === 2)
          removeConnection(ev)
      })
    }

    let hitbox = new DOM('div', {
      className:`vision-connection-hitbox${targetNodeId ? ' interactive' : ''}`
    })
    if (targetNodeId) {
      let removeConnection = (ev) => {
        ev.preventDefault()
        ev.stopPropagation()
        this.disconnectNode(targetNodeId)
      }
      hitbox.$.addEventListener('contextmenu', removeConnection)
      hitbox.$.addEventListener('mousedown', (ev) => {
        if (ev.button === 2)
          removeConnection(ev)
      })
      hitbox.$.addEventListener('mouseup', (ev) => {
        if (ev.button === 2)
          removeConnection(ev)
      })
      hitbox.$.addEventListener('auxclick', (ev) => {
        if (ev.button === 2)
          removeConnection(ev)
      })
    }
    let line = new DOM('div', {className:'vision-connection'})

    wrapper.append([hitbox, line])
    return wrapper
  }

  updateBoardSize (){
    let maxX = 760
    let maxY = 520
    this.nodes.forEach((node) => {
      maxX = Math.max(maxX, node.x + 320)
      maxY = Math.max(maxY, node.y + 280)
    })
    this.$.graphBoard.style.width = `${maxX + this.boardPadding}px`
    this.$.graphBoard.style.height = `${maxY + this.boardPadding}px`
  }

  uploadImage (ev){
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
      this.originalImageData = this.processingContext.getImageData(0, 0, width, height)
      this.originalFilename = file.name
      this.invalidateOutputs()
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
      output = this.originalImageData ? this.cloneImageData(this.originalImageData) : null
    else {
      let source = this.getNodeOutput(node.sourceId)
      let params = this.getEffectiveNodeParams(node)
      output = source ? VisionNodeTypes[node.type].run(source, params, this) : null
    }

    this.outputCache[nodeId] = output
    return output
  }

  getNodeStatus (node){
    let output = this.getNodeOutput(node.id)
    if (!output)
      return Msg['VisionAwaitingImage']
    return this.getOutputSummary(output)
  }

  getNodeDescription (node){
    if (node.type === 'input')
      return this.originalFilename === '' ? Msg['VisionInspectorEmpty'] : this.originalFilename
    let source = this.findNode(node.sourceId)
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
    return [{
      id:'current',
      name:'Current vision setup',
      nodes:this.cloneNodes(this.nodes),
      runsOn:['browser']
    }]
  }

  getSetup (setupId){
    let setups = this.getSetups()
    return setups.find((setup) => setup.id === setupId) || setups[0]
  }

  getFinalNodeId (nodes){
    let consumed = {}
    nodes.forEach((node) => {
      if (node.sourceId)
        consumed[node.sourceId] = true
    })

    let terminals = nodes.filter((node) => !consumed[node.id])
    return terminals.length > 0 ? terminals[terminals.length - 1].id : nodes[nodes.length - 1].id
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
        output = this.cloneImageData(imageData)
      else {
        let source = runNode(node.sourceId)
        let params = this.getEffectiveNodeParams(node)
        output = source ? VisionNodeTypes[node.type].run(source, params, this) : null
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
}

const VisionNodeTypes = {
  input:{
    labelKey:'VisionNodeInput',
    fallbackLabel:'Input image',
    controls:[],
    sanitize:() => {
      return {}
    },
    run:(imageData) => imageData
  },
  grayscale:{
    labelKey:'VisionNodeGrayscale',
    fallbackLabel:'Grayscale',
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
  threshold:{
    labelKey:'VisionNodeThreshold',
    fallbackLabel:'Threshold',
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
    fallbackLabel:'Object count output',
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
          minAreaPixels:params.minAreaPixels,
          largestArea:largest ? largest.area : 0,
          largestAreaPercent:largest ? largest.areaPercent : 0,
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

const VisionPaletteGroups = [{
  label:'Basic transforms',
  nodes:['grayscale', 'resize', 'crop', 'brightness', 'contrast', 'blur', 'invert']
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
