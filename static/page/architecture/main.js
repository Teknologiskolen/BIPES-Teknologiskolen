"use strict";

import {dataflow} from '../../base/dataflow.js'
import {DOM, ContextMenu, Animate} from '../../base/dom.js'

function dataMsg (key, fallback){
  return (window.Msg && Msg[key]) || fallback
}

function escapeHTML (value){
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function fieldName (path){
  return `data-architecture-${String(path).replace(/[^a-z0-9_-]+/gi, '-')}`
}

// Pipeline node types. A "device" is one shared node that can be both a data source and
// a target (hence bidirectional relations). BIPES is the always-present middle-man hub
// and is not offered in the palette. ML / Vision are processing nodes that BIPES feeds.
const ACTOR_TYPES = [
  ['device', dataMsg('DataNodeDevice',  'Device')],
  ['webcam', dataMsg('DataNodeWebcam',  'Webcam')],
  ['ml',     dataMsg('DataNodeML',      'ML')],
  ['vision', dataMsg('DataNodeVision',  'Vision')],
  ['bipes',  'BIPES']
]

const TRANSPORT_CONFIG = {
  webserial:    {label:'USB/Serial',     short:'USB',      stroke:'#d97706', marker:'amber'},
  webbluetooth: {label:'Bluetooth',      short:'BT',       stroke:'#2563eb', marker:'blue'},
  websocket:    {label:'WiFi/WebSocket', short:'WiFi',     stroke:'#16a34a', marker:'green'},
  mqtt:         {label:'MQTT',           short:'MQTT',     stroke:'#9333ea', marker:'purple'},
  browser:      {label:'Browser',        short:'Browser',  stroke:'#0284c7', marker:'sky'},
  internal:     {label:'Internal',       short:'Internal', stroke:'#94a3b8', marker:'slate'},
  auto:         {label:'Auto',           short:'Auto',     stroke:'#0f766e', marker:'teal'}
}

const ACTOR_ICONS = {
  'bipes':         '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="5" y="5" width="10" height="10" rx="1.5"/><line x1="7.5" y1="5" x2="7.5" y2="2.5"/><line x1="10" y1="5" x2="10" y2="2.5"/><line x1="12.5" y1="5" x2="12.5" y2="2.5"/><line x1="7.5" y1="15" x2="7.5" y2="17.5"/><line x1="10" y1="15" x2="10" y2="17.5"/><line x1="12.5" y1="15" x2="12.5" y2="17.5"/><line x1="5" y1="7.5" x2="2.5" y2="7.5"/><line x1="5" y1="12.5" x2="2.5" y2="12.5"/><line x1="15" y1="7.5" x2="17.5" y2="7.5"/><line x1="15" y1="12.5" x2="17.5" y2="12.5"/></svg>',
  'device':        '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3" width="10" height="14" rx="1.5"/><line x1="8.5" y1="14.5" x2="11.5" y2="14.5"/><polyline points="2.5,8 1,10 2.5,12"/><polyline points="17.5,8 19,10 17.5,12"/><line x1="1" y1="10" x2="4" y2="10"/><line x1="16" y1="10" x2="19" y2="10"/></svg>',
  'webcam':        '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="2" y="4" width="16" height="12" rx="2"/><circle cx="10" cy="10" r="3.5"/></svg>',
  'ml':            '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="10" cy="10" r="2"/><circle cx="3" cy="5" r="1.5"/><circle cx="3" cy="15" r="1.5"/><circle cx="17" cy="5" r="1.5"/><circle cx="17" cy="15" r="1.5"/><line x1="4.5" y1="5.5" x2="8.5" y2="9.2"/><line x1="4.5" y1="14.5" x2="8.5" y2="10.8"/><line x1="15.5" y1="5.5" x2="11.5" y2="9.2"/><line x1="15.5" y1="14.5" x2="11.5" y2="10.8"/></svg>',
  'vision':        '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M1 10s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z"/><circle cx="10" cy="10" r="2.5"/></svg>'
}

class DataPage {
  constructor (){
    this.name = 'architecture'
    this.available = false
    this.inited = false
    this.selectedId = dataflow.selectedId()
    this.selectedNodeId = ''
    this.selectedLinkId = ''
    this.nodeDrag = null
    this.connectionDrag = null
    this.pendingPort = null
    this.boardPadding = 120
    this.addActorMenuOpen = false
    this.$ = {}

    this.mount()
    if (!this.available)
      return

    dataflow.setPersistHandler((snapshot) => {this.commit(snapshot)})
    dataflow.subscribe(() => {
      if (this.available && this.inited)
        this.render()
    })

    this.handlePointerMove = (ev) => {this.onPointerMove(ev)}
    this.handlePointerUp = (ev) => {this.onPointerUp(ev)}
    this.handleKeyDown = (ev) => {
      if (ev.key === 'Escape' && this.pendingPort) {
        this.pendingPort = null
        if (this.inited) this.renderNodes(dataflow.get(this.selectedId))
      }
    }
    window.addEventListener('mousemove', this.handlePointerMove)
    window.addEventListener('mouseup', this.handlePointerUp)
    window.addEventListener('keydown', this.handleKeyDown)

    this.render()
  }

  mount (){
    if (this.available && this.$.section)
      return true

    let section = DOM.get('section#architecture')
    if (!section) {
      section = document.createElement('section')
      section.id = 'architecture'
      let statusBar = DOM.get('#status-bar')
      if (statusBar && statusBar.parentNode)
        statusBar.parentNode.insertBefore(section, statusBar)
      else if (document.body)
        document.body.appendChild(section)
      else
        return false
    }

    this.available = true
    this.$.section = new DOM(section)
    this.$.section.$.classList.add('default')
    this.$.contextMenu = new DOM('div')
    this.contextMenu = new ContextMenu(this.$.contextMenu, this)
    window.bipesDataPage = this
    this.renderShell()
    return true
  }

  init (){
    if (!this.mount() || this.inited)
      return
    this.inited = true
    this.render()
  }

  deinit (){
    this.inited = false
    this.nodeDrag = null
    this.connectionDrag = null
    this.pendingPort = null
  }

  connectPipes (){
    return {
      device_connect: () => { if (this.inited) this.renderConnections() },
      device_disconnect: () => { if (this.inited) this.renderConnections() }
    }
  }

  resize (){
    if (!this.available)
      return
    this.renderConnections()
  }

  empty (){
    return dataflow.empty()
  }

  load (obj){
    dataflow.load(obj)
    dataflow.setPersistHandler((snapshot) => {this.commit(snapshot)})
    this.selectedId = dataflow.selectedId()
    this.selectedNodeId = ''
    this.selectedLinkId = ''
    this.nodeDrag = null
    this.connectionDrag = null
    if (this.mount())
      this.render()
  }

  commit (snapshot){
    if (!this.ensureProjectData())
      return
    let projectPage = window.bipes && bipes.page ? bipes.page.project : null
    projectPage.projects[projectPage.currentUID].data = snapshot
    projectPage.write(projectPage.currentUID)
  }

  ensureProjectData (){
    let projectPage = window.bipes && bipes.page ? bipes.page.project : null
    if (!projectPage)
      return false
    if (typeof projectPage.ensureCurrent == 'function')
      projectPage.ensureCurrent()
    if (!projectPage.currentUID || !projectPage.projects[projectPage.currentUID])
      return false
    if (!projectPage.projects[projectPage.currentUID].data)
      projectPage.projects[projectPage.currentUID].data = dataflow.export()
    return true
  }

  renderShell (){
    this.$.section.removeChilds()

    this.$.tabs = new DOM('span', {className:'data-tabs'})

    this.$.add = new DOM('button', {
      className:'icon',
      id:'add',
      title:dataMsg('DataFlowNew', 'New architecture')
    }).onclick(this, this.createArchitecture)

    this.$.addActorMenuBtn = new DOM('button', {
      id:'data-add-actor',
      className:'icon',
      title:dataMsg('DataNodeAdd', 'Add node')
    }).onclick(this, this.toggleActorMenu)

    this.$.headerLeft = new DOM('div', {className:'data-header-left'}).append([
      this.$.tabs,
      this.$.add
    ])

    this.$.header = new DOM('div', {className:'data-header'}).append([
      this.$.headerLeft
    ])

    this.$.addActorPopup = new DOM('div', {id:'data-actor-popup', className:'popup'})
    this.$.addActorPopup.$.addEventListener('click', (ev) => {
      if (ev.target === this.$.addActorPopup.$) this.closeActorMenu()
    })

    this.$.workspace = new DOM('div', {className:'data-panel data-workspace-panel'})
    this.$.workspaceHeader = new DOM('div', {className:'data-panel-header'})
    this.$.graphScroll = new DOM('div', {className:'data-graph-scroll'})
    this.$.graphBoard = new DOM('div', {className:'data-graph-board'})
    let svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svgEl.setAttribute('class', 'data-connections-svg')
    this.$.connectionsSvg = {$: svgEl}
    this.$.nodes = new DOM('div', {className:'data-node-list'})
    this.$.inspector = new DOM('div', {className:'data-inspector'})

    this.$.graphBoard.onclick(this, this.clearSelection)
    this.$.graphBoard.$.appendChild(svgEl)
    this.$.graphBoard.append([this.$.nodes])
    this.$.graphScroll.append(this.$.graphBoard)
    this.$.workspace.append([
      this.$.workspaceHeader,
      this.$.graphScroll
    ])

    this.$.container = new DOM('div', {className:'container data-container'}).append([
      this.$.header
    ])

    this.$.container.append([this.$.workspace])

    this.$.section.append([
      this.$.container,
      this.$.inspector,
      this.$.contextMenu,
      this.$.addActorPopup,
      this.$.addActorMenuBtn
    ])
  }

  render (){
    if (!this.available)
      return
    this.renderTabs()
    this.renderWorkspace()
  }

  renderTabs (){
    if (!this.$.tabs)
      return

    let flows = dataflow.all()
    if (!flows.length) {
      dataflow.load(dataflow.empty())
      flows = dataflow.all()
    }
    this.selectedId = flows.some((flow) => flow.id == this.selectedId) ? this.selectedId : dataflow.selectedId()

    this.$.tabs.removeChilds()
    flows.forEach((flow) => {this.include(flow.id, flow)})

    let selected = dataflow.get(this.selectedId)
    this.$.addActorMenuBtn.$.disabled = !!(selected && selected.locked)
  }

  include (sid, flow){
    let title = flow.locked
      ? `${flow.name} (${dataMsg('DataSystemBadge', 'System')})`
      : flow.name
    let h3 = new DOM('h3', {innerText:title})

    let tab = new DOM('button', {
      sid:sid,
      className:`data-tab${sid == this.selectedId ? ' on' : ''}`
    })
      .append([h3])
      .onevent('contextmenu', this, (ev) => {
        ev.preventDefault()
        let actions = []
        if (!flow.locked) {
          actions.push({
            id:'rename',
            innerText:Msg['Rename'],
            fun:this.renameArchitectureDialog,
            args:[sid, flow.name]
          })
          actions.push({
            id:'remove',
            innerText:Msg['Remove'],
            fun:this.deleteArchitecture,
            args:[sid]
          })
        }
        if (actions.length)
          this.contextMenu.open(actions, ev)
      })
      .onclick(this, this.selectArchitecture, [sid])

    this.$.tabs.append(tab)
  }

  renderWorkspace (){
    let flow = dataflow.get(this.selectedId)
    if (!flow)
      return

    let description = dataflow.describe(flow)
    this.$.workspaceHeader.$.innerHTML = `
      <p class="data-panel-description">${escapeHTML(description.relation)} · ${(flow.architecture.nodes || []).length} ${dataMsg('DataNodesCount', 'nodes')} · ${(flow.architecture.links || []).length} ${dataMsg('DataRelationsCount', 'relations')}</p>
    `

    this.updateBoardSize(flow)
    this.renderNodes(flow)
    this.renderInspector(flow)
    window.requestAnimationFrame(() => {this.renderConnections()})
  }

  updateBoardSize (flow = dataflow.get(this.selectedId)){
    let width = 980
    let height = 520
    ;(flow?.architecture?.nodes || []).forEach((node) => {
      width = Math.max(width, (Number(node.x) || 0) + 340)
      height = Math.max(height, (Number(node.y) || 0) + 240)
    })
    let w = width + this.boardPadding
    let h = height + this.boardPadding
    this.$.graphBoard.style.width = `${w}px`
    this.$.graphBoard.style.height = `${h}px`
    if (this.$.connectionsSvg) {
      let actualW = this.$.graphBoard.$.offsetWidth || w
      let actualH = this.$.graphBoard.$.offsetHeight || h
      this.$.connectionsSvg.$.setAttribute('width', actualW)
      this.$.connectionsSvg.$.setAttribute('height', actualH)
      this.$.connectionsSvg.$.setAttribute('viewBox', `0 0 ${actualW} ${actualH}`)
    }
  }

  renderNodes (flow){
    this.$.nodes.removeChilds()
    let nodes = flow.architecture.nodes || []
    nodes.forEach((node) => {
      let card = new DOM('div', {
        className:`data-node${this.selectedNodeId == node.id ? ' selected' : ''}`
      })
      card.$.dataset.nodeId = node.id
      card.$.dataset.type = node.type
      card.style.left = `${Number(node.x) || 0}px`
      card.style.top = `${Number(node.y) || 0}px`
      card.onclick(this, this.selectNode, [node.id])

      let iconWrap = new DOM('div', {className:'data-node-icon-wrap'})
      iconWrap.$.innerHTML = this.actorIcon(node.type)

      let inner = new DOM('div', {className:'data-node-inner'})
        .ondown(this, this.startNodeDrag, [node.id])
        .append([
          iconWrap,
          new DOM('div', {className:'data-node-name', innerText:node.label || this.actorTypeLabel(node.type)}),
          new DOM('div', {className:'data-node-type-label', innerText:this.actorTypeLabel(node.type)})
        ])

      let isPending = this.pendingPort?.nodeId === node.id
      let isConnectable = this.pendingPort && this.pendingPort.nodeId !== node.id

      let ports = ['top', 'right', 'bottom', 'left'].map((side) => this.makeNodePort(node.id, side))
      let [portTop, portRight, portBottom, portLeft] = ports

      if (isPending) {
        let pendingEl = {top:portTop, right:portRight, bottom:portBottom, left:portLeft}[this.pendingPort.portId]
        pendingEl?.$.classList.add('pending')
      }
      if (isConnectable) {
        ports.forEach((p) => p.$.classList.add('connectable'))
      }

      let elements = [inner, portTop, portRight, portBottom, portLeft]
      if (!flow.locked && node.type != 'bipes') {
        let removeBtn = new DOM('button', {
          className:'data-node-remove',
          title:dataMsg('DataNodeDelete', 'Remove node'),
          innerText:'×'
        })
          .ondown(this, (ev) => {ev.stopPropagation()})
          .onup(this, (ev) => {ev.stopPropagation()})
          .onclick(this, this.removeNode, [node.id])
        elements.push(removeBtn)
      }

      card.append(elements)
      this.$.nodes.append(card)
    })
  }

  renderConnections (){
    if (!this.$.connectionsSvg)
      return
    let flow = dataflow.get(this.selectedId)
    this.$.connectionsSvg.$.innerHTML = this.buildConnectionsSVG(flow)
    this.$.connectionsSvg.$.querySelectorAll('[data-link-id]').forEach((g) => {
      let linkId = g.dataset.linkId
      g.addEventListener('click', (ev) => {ev.stopPropagation(); this.selectLink(linkId)})
      g.addEventListener('contextmenu', (ev) => {
        ev.preventDefault(); ev.stopPropagation()
        this.removeLink(linkId)
        if (g.dataset.reverseLinkId) this.removeLink(g.dataset.reverseLinkId)
      })
    })
    if (this.connectionDrag)
      this.updateDragPreview()
  }

  buildSVGDefs (){
    let markers = Object.entries(TRANSPORT_CONFIG).flatMap(([, cfg]) => [
      `<marker id="arr-${cfg.marker}" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto" markerUnits="strokeWidth">
        <path d="M0,0 L0,6 L7,3 Z" fill="${cfg.stroke}"/>
      </marker>`,
      `<marker id="arr-rev-${cfg.marker}" markerWidth="7" markerHeight="7" refX="1" refY="3" orient="auto" markerUnits="strokeWidth">
        <path d="M7,0 L7,6 L0,3 Z" fill="${cfg.stroke}"/>
      </marker>`
    ]).join('')
    return `<defs>${markers}</defs>`
  }

  buildConnectionsSVG (flow){
    let defs = this.buildSVGDefs()
    if (!flow) return defs
    let links = flow.architecture.links || []
    let rendered = new Set()
    let paths = links.map((link) => {
      if (rendered.has(link.id)) return ''
      let reverse = links.find((l) =>
        l.sourceId === link.targetId && l.targetId === link.sourceId && !rendered.has(l.id)
      )
      rendered.add(link.id)
      if (reverse) rendered.add(reverse.id)
      let start = this.getPortCenter(link.sourceId, link.sourcePort || 'right')
      let end = this.getPortCenter(link.targetId, link.targetPort || 'left')
      if (!start || !end) return ''
      let transport = this.visualTransport(link, flow)
      let cfg = TRANSPORT_CONFIG[transport] || TRANSPORT_CONFIG['auto']
      let isSelected = link.id === this.selectedLinkId || reverse?.id === this.selectedLinkId
      let sw = isSelected ? 2.5 : 1.8
      let label = escapeHTML(this.linkVisualLabel(link))
      let pid = `cp-${link.id.replace(/[^a-z0-9_-]/gi, '-')}`
      let revLinkAttr = reverse ? ` data-reverse-link-id="${escapeHTML(reverse.id)}"` : ''
      if (reverse) {
        let d = this.bezierPath(start.x, start.y, end.x, end.y, link.sourcePort, link.targetPort)
        return `
          <g class="data-conn data-conn-bidir${isSelected ? ' selected' : ''}" data-link-id="${escapeHTML(link.id)}"${revLinkAttr} style="pointer-events:auto;cursor:pointer">
            <path d="${d}" stroke="transparent" stroke-width="12" fill="none" class="data-conn-hit"/>
            <path id="${pid}" d="${d}" stroke="${cfg.stroke}" stroke-width="${sw}" fill="none"
              marker-start="url(#arr-rev-${cfg.marker})" marker-end="url(#arr-${cfg.marker})"
              opacity="${isSelected ? '1' : '0.82'}" class="data-conn-line"/>
            ${label ? `<text font-size="11" font-weight="600" fill="${cfg.stroke}" pointer-events="none" class="data-conn-label"><textPath href="#${pid}" startOffset="50%" text-anchor="middle" dy="-6">${label} ↔</textPath></text>` : ''}
          </g>`
      }
      let d = this.bezierPath(start.x, start.y, end.x, end.y, link.sourcePort, link.targetPort)
      return `
        <g class="data-conn${isSelected ? ' selected' : ''}" data-link-id="${escapeHTML(link.id)}" style="pointer-events:auto;cursor:pointer">
          <path d="${d}" stroke="transparent" stroke-width="12" fill="none" class="data-conn-hit"/>
          <path id="${pid}" d="${d}" stroke="${cfg.stroke}" stroke-width="${sw}" fill="none" marker-end="url(#arr-${cfg.marker})" opacity="${isSelected ? '1' : '0.82'}" class="data-conn-line"/>
          ${label ? `<text font-size="11" font-weight="600" fill="${cfg.stroke}" pointer-events="none" class="data-conn-label"><textPath href="#${pid}" startOffset="50%" text-anchor="middle" dy="-6">${label}</textPath></text>` : ''}
        </g>`
    }).join('')
    let preview = `<path id="data-drag-preview" display="none" fill="none" stroke-dasharray="6,3" stroke-width="1.8" stroke="#facc15"/>`
    return defs + paths + preview
  }

  bezierPath (x1, y1, x2, y2, srcPort = 'right', dstPort = 'left'){
    const dir = {top:[0,-1], right:[1,0], bottom:[0,1], left:[-1,0]}
    let [sx, sy] = dir[srcPort] || dir.right
    let [tx, ty] = dir[dstPort] || dir.left
    let cp = Math.max(60, Math.hypot(x2 - x1, y2 - y1) * 0.4)
    return `M ${x1} ${y1} C ${x1+sx*cp} ${y1+sy*cp}, ${x2+tx*cp} ${y2+ty*cp}, ${x2} ${y2}`
  }

  updateDragPreview (){
    if (!this.$.connectionsSvg || !this.connectionDrag) return
    let preview = this.$.connectionsSvg.$.querySelector('#data-drag-preview')
    if (!preview) return
    let start = this.getPortCenter(this.connectionDrag.nodeId, this.connectionDrag.portId)
    if (!start) return
    let d = this.bezierPath(start.x, start.y, this.connectionDrag.x, this.connectionDrag.y, this.connectionDrag.portId)
    preview.setAttribute('d', d)
    preview.removeAttribute('display')
  }

  makeNodePort (nodeId, portSide){
    let button = new DOM('button', {
      className:`data-port data-port-${portSide}`,
      title:dataMsg('DataGraphPort', 'Click or drag to connect')
    })
    button.$.dataset.portNodeId = nodeId
    button.$.dataset.portId = portSide
    button.$.addEventListener('mousedown', (ev) => {
      ev.stopPropagation()
      this.startConnection(nodeId, portSide, ev)
    })
    button.$.addEventListener('mouseup', (ev) => {
      ev.stopPropagation()
      this.completeConnection(nodeId, portSide)
    })
    button.$.addEventListener('click', (ev) => {
      ev.stopPropagation()
      if (this.connectionDrag) return
      let flow = dataflow.get(this.selectedId)
      if (flow && flow.locked) return
      if (this.pendingPort) {
        if (this.pendingPort.nodeId === nodeId) {
          this.pendingPort = null
        } else {
          let {nodeId:srcId, portId:srcPort} = this.pendingPort
          this.pendingPort = null
          this.connectNodes(srcId, nodeId, srcPort, portSide)
          return
        }
        this.renderNodes(dataflow.get(this.selectedId))
        this.renderConnections()
      } else {
        this.pendingPort = {nodeId, portId:portSide}
        this.renderNodes(dataflow.get(this.selectedId))
      }
    })
    return button
  }

  renderInspector (flow){
    let selectedNode = this.findNode(this.selectedNodeId, flow)
    if (selectedNode) {
      this.renderNodeInspector(flow, selectedNode)
      return
    }
    let selectedLink = this.findLink(this.selectedLinkId, flow)
    if (selectedLink) {
      this.renderLinkInspector(flow, selectedLink)
      return
    }
    this.$.inspector.$.classList.remove('data-inspector--open')
    this.$.inspector.$.innerHTML = ''
  }

  renderNodeInspector (flow, node){
    let isDeviceNode = node.type === 'device'
    let isMlNode = node.type === 'ml'
    let isVisionNode = node.type === 'vision'
    let deviceOptions = isDeviceNode ? this.connectedDeviceOptions() : []
    let transport = isDeviceNode ? (this.getDeviceProtocol(node.deviceUid) || this.getActiveDeviceTransport()) : null
    let transportCfg = transport ? (TRANSPORT_CONFIG[transport] || TRANSPORT_CONFIG['auto']) : null
    let mlOptions = isMlNode ? this.mlWorkspaceOptions() : []
    let visionOptions = isVisionNode ? this.visionSetupOptions() : []
    this.$.inspector.$.innerHTML = `
      <div class="data-inspector-head">
        <strong>${dataMsg('DataNodeInspectorTitle', 'Node settings')}</strong>
        <button type="button" class="data-inspector-close" title="${dataMsg('DataInspectorClose', 'Close')}">×</button>
      </div>
      <div class="data-inspector-body">
        <p>${dataMsg('DataNodeInspectorHelp', 'Configure the node name, type and connection.')}</p>
        ${this.nodeInput(node, 'label', dataMsg('DataNodeLabel', 'Node name'), flow.locked || node.type == 'bipes')}
        ${this.nodeSelect(node, 'type', dataMsg('DataNodeType', 'Node type'), ACTOR_TYPES, flow.locked || node.type == 'bipes')}
        ${isDeviceNode ? `
          <div class="data-field">
            <span>${dataMsg('DataNodeDevicePick', 'Device')}</span>
            <select data-node-id="${escapeHTML(node.id)}" data-node-field="deviceUid" ${flow.locked ? 'disabled' : ''}>
              <option value="">${dataMsg('DataNodeDeviceCurrent', 'Current device')}</option>
              ${deviceOptions.map(({uid, label}) => `<option value="${escapeHTML(uid)}" ${node.deviceUid == uid ? 'selected' : ''}>${escapeHTML(label)}</option>`).join('')}
            </select>
            ${deviceOptions.length === 0 ? `<span class="data-transport-hint">${dataMsg('DataNoDeviceConnected', 'No device connected yet — using current device')}</span>` : ''}
          </div>
          ${transport ? `
            <div class="data-field">
              <span>${dataMsg('DataNodeTransport', 'Connection type')}</span>
              <div class="data-transport-indicator" data-transport="${escapeHTML(transport)}">
                <span class="data-transport-badge">${escapeHTML(transportCfg.label)}</span>
                <span class="data-transport-hint">${dataMsg('DataTransportFromConnection', 'From how the device is connected')}</span>
              </div>
            </div>
          ` : ''}
        ` : ''}
        ${isMlNode ? `
          <div class="data-field">
            <span>${dataMsg('DataNodeMlWorkspace', 'ML workspace')}</span>
            ${mlOptions.length > 0 ? `
              <select data-node-id="${escapeHTML(node.id)}" data-node-field="mlWorkspaceId" ${flow.locked ? 'disabled' : ''}>
                <option value="">${dataMsg('DataNodeBindNone', 'Not selected')}</option>
                ${mlOptions.map(({id, name}) => `<option value="${escapeHTML(id)}" ${node.mlWorkspaceId == id ? 'selected' : ''}>${escapeHTML(name)}</option>`).join('')}
              </select>
            ` : `<span class="data-transport-hint">${dataMsg('DataNodeNoMlWorkspace', 'No ML workspaces yet')}</span>`}
          </div>
        ` : ''}
        ${isVisionNode ? `
          <div class="data-field">
            <span>${dataMsg('DataNodeVisionSetup', 'Vision graph')}</span>
            ${visionOptions.length > 0 ? `
              <select data-node-id="${escapeHTML(node.id)}" data-node-field="visionSetupId" ${flow.locked ? 'disabled' : ''}>
                <option value="">${dataMsg('DataNodeBindNone', 'Not selected')}</option>
                ${visionOptions.map(({id, name}) => `<option value="${escapeHTML(id)}" ${node.visionSetupId == id ? 'selected' : ''}>${escapeHTML(name)}</option>`).join('')}
              </select>
            ` : `<span class="data-transport-hint">${dataMsg('DataNodeNoVisionSetup', 'No Vision graphs yet')}</span>`}
          </div>
        ` : ''}
      </div>
    `
    this.$.inspector.$.classList.add('data-inspector--open')
    this.$.inspector.$.querySelector('.data-inspector-close')?.addEventListener('click', () => {
      this.selectedNodeId = ''
      this.selectedLinkId = ''
      this.$.inspector.$.classList.remove('data-inspector--open')
    })
    this.attachInspectorFields()
  }

  linkRole (link, flow){
    let source = this.findNode(link.sourceId, flow)
    let target = this.findNode(link.targetId, flow)
    if (target?.type === 'bipes' && (source?.type === 'device' || source?.type === 'webcam'))
      return 'input'
    if (source?.type === 'bipes' && target?.type === 'device')
      return 'output'
    return 'internal'
  }

  renderLinkInspector (flow, link){
    this.selectedLinkId = link.id
    let transport = this.visualTransport(link, flow)
    let transportCfg = TRANSPORT_CONFIG[transport] || TRANSPORT_CONFIG['auto']
    let role = this.linkRole(link, flow)
    let locked = flow.locked
    this.$.inspector.$.innerHTML = `
      <div class="data-inspector-head">
        <strong>${dataMsg('DataGraphInspectorTitle', 'Relation settings')}</strong>
        <button type="button" class="data-inspector-close" title="${dataMsg('DataInspectorClose', 'Close')}">×</button>
      </div>
      <div class="data-inspector-body">
        <p>${escapeHTML(this.relationLabel(link, flow))}</p>
        ${this.linkSelect(link, 'transport', dataMsg('DataRelationTransport', 'Transport'), [
          ['auto', dataMsg('DataTransportAutoDevice', 'Auto (from device)')],
          ['mqtt', 'MQTT']
        ], locked)}
        <div class="data-field">
          <span>${dataMsg('DataRelationResolved', 'Resolved connection')}</span>
          <div class="data-transport-indicator" data-transport="${escapeHTML(transport)}">
            <span class="data-transport-badge">${escapeHTML(transportCfg.label)}</span>
            <span class="data-transport-hint">${dataMsg('DataTransportFromDevice', 'Reflects how the device is connected')}</span>
          </div>
        </div>
        ${link.transport === 'mqtt' ? `
          ${this.linkInput(link, 'mqttPublishTopic', dataMsg('DataRelationMqttPublish', 'Publish topic'), locked)}
          ${this.linkInput(link, 'mqttSubscribeTopic', dataMsg('DataRelationMqttSubscribe', 'Subscribe topic'), locked)}
          ${this.linkSelect(link, 'qos', dataMsg('DataRelationMqttQos', 'QoS'), [['0', '0'], ['1', '1'], ['2', '2']], locked)}
          ${this.linkPills(link, 'retain', dataMsg('DataRelationMqttRetain', 'Retain'), [['false', dataMsg('DataOff', 'Off')], ['true', dataMsg('DataOn', 'On')]], locked)}
        ` : ''}
        ${this.linkPills(link, 'mode', dataMsg('DataRelationMode', 'Mode'), [
          ['manual', dataMsg('DataModeManual', 'Manual')],
          ['request', dataMsg('DataModeRequest', 'Request')],
          ['stream', dataMsg('DataModeStream', 'Stream')],
          ['notify', dataMsg('DataModeNotify', 'Notify')]
        ], locked)}
        ${role === 'input' ? `
          ${link.mode === 'stream' ? this.linkInput(link, 'fps', dataMsg('DataRelationFps', 'Frames per second'), locked) : ''}
          ${link.mode === 'notify' ? this.linkInput(link, 'notifyMessage', dataMsg('DataRelationNotifyMessage', 'New-data message'), locked) : ''}
        ` : ''}
        ${role === 'output' ? `
          ${this.linkSelect(link, 'outputFormat', dataMsg('DataOutputFormat', 'Output format'), [
            ['json', 'JSON'],
            ['csv', 'CSV'],
            ['avro', 'Avro'],
            ['parquet', 'Parquet'],
            ['raw-binary', dataMsg('DataFormatRawBinary', 'Raw binary')],
            ['command', dataMsg('DataFormatCommand', 'Device command')]
          ], locked)}
          ${link.outputFormat === 'command' ? this.linkInput(link, 'commandTemplate', dataMsg('DataRelationCommandTemplate', 'Command template'), locked) : ''}
          ${this.linkSelect(link, 'envelope', dataMsg('DataOutputEnvelope', 'Message envelope'), [
            ['auto', dataMsg('DataEnvelopeAuto', 'Auto for connection')],
            ['raw', dataMsg('DataEnvelopeRaw', 'Raw payload')],
            ['json', 'JSON'],
            ['topic-message-packet', dataMsg('DataEnvelopeTopicMessage', 'Topic/message packet')],
            ['function-call', dataMsg('DataEnvelopeFunctionCall', 'Function call')]
          ], locked)}
          ${this.linkInput(link, 'header', dataMsg('DataInputHeader', 'Start/header'), locked)}
          ${this.linkInput(link, 'footer', dataMsg('DataInputFooter', 'End/footer'), locked)}
          ${this.linkPills(link, 'sendPolicy', dataMsg('DataRelationSendPolicy', 'Send policy'), [
            ['onResult', dataMsg('DataSendOnResult', 'On result')],
            ['onChange', dataMsg('DataSendOnChange', 'On change')],
            ['onRule', dataMsg('DataSendOnRule', 'On rule')],
            ['manual', dataMsg('DataModeManual', 'Manual')]
          ], locked)}
          ${link.sendPolicy === 'onRule' ? `
            ${this.linkInput(link, 'ruleMetric', dataMsg('DataRelationRuleMetric', 'Rule metric'), locked)}
            ${this.linkSelect(link, 'ruleOperator', dataMsg('DataRelationRuleOperator', 'Operator'), [['>=', '≥'], ['>', '>'], ['<=', '≤'], ['<', '<'], ['==', '='], ['!=', '≠']], locked)}
            ${this.linkInput(link, 'ruleValue', dataMsg('DataRelationRuleValue', 'Rule value'), locked)}
          ` : ''}
        ` : ''}
        ${locked ? '' : `<button type="button" class="data-danger" data-action="remove-link" data-link-id="${escapeHTML(link.id)}">${dataMsg('DataRelationDelete', 'Remove relation')}</button>`}
      </div>
    `
    this.$.inspector.$.classList.add('data-inspector--open')
    this.$.inspector.$.querySelector('.data-inspector-close')?.addEventListener('click', () => {
      this.selectedNodeId = ''
      this.selectedLinkId = ''
      this.$.inspector.$.classList.remove('data-inspector--open')
    })
    this.$.inspector.$.querySelector('[data-action="remove-link"]')?.addEventListener('click', (ev) => {
      this.removeLink(ev.target.dataset.linkId)
    })
    this.attachInspectorFields()
  }

  nodeInput (node, field, label, disabled){
    let id = fieldName(`node.${node.id}.${field}`)
    return `
      <label class="data-field">
        <span>${label}</span>
        <input id="${id}" name="${id}" data-node-id="${escapeHTML(node.id)}" data-node-field="${field}" value="${escapeHTML(node[field])}" ${disabled ? 'disabled' : ''}>
      </label>
    `
  }

  nodeSelect (node, field, label, options, disabled){
    let id = fieldName(`node.${node.id}.${field}`)
    return `
      <label class="data-field">
        <span>${label}</span>
        <select id="${id}" name="${id}" data-node-id="${escapeHTML(node.id)}" data-node-field="${field}" ${disabled ? 'disabled' : ''}>
          ${options.map(([value, optionLabel]) => `<option value="${escapeHTML(value)}" ${node[field] == value ? 'selected' : ''}>${escapeHTML(optionLabel)}</option>`).join('')}
        </select>
      </label>
    `
  }

  linkInput (link, field, label, disabled){
    let id = fieldName(`link.${link.id}.${field}`)
    return `
      <label class="data-field">
        <span>${label}</span>
        <input id="${id}" name="${id}" data-link-id="${escapeHTML(link.id)}" data-link-field="${field}" value="${escapeHTML(link[field])}" ${disabled ? 'disabled' : ''}>
      </label>
    `
  }

  linkSelect (link, field, label, options, disabled){
    let id = fieldName(`link.${link.id}.${field}`)
    return `
      <label class="data-field">
        <span>${label}</span>
        <select id="${id}" name="${id}" data-link-id="${escapeHTML(link.id)}" data-link-field="${field}" ${disabled ? 'disabled' : ''}>
          ${options.map(([value, optionLabel]) => `<option value="${escapeHTML(value)}" ${link[field] == value ? 'selected' : ''}>${escapeHTML(optionLabel)}</option>`).join('')}
        </select>
      </label>
    `
  }

  linkPills (link, field, label, options, disabled){
    let pills = options.map(([value, optionLabel]) =>
      `<button type="button" class="data-pill${link[field] == value ? ' on' : ''}" data-value="${escapeHTML(value)}" ${disabled ? 'disabled' : ''}>${escapeHTML(optionLabel)}</button>`
    ).join('')
    return `
      <div class="data-field">
        <span>${label}</span>
        <div class="data-pills${disabled ? ' disabled' : ''}" data-link-id="${escapeHTML(link.id)}" data-link-field="${field}">${pills}</div>
      </div>
    `
  }

  attachInspectorFields (){
    this.$.inspector.$.querySelectorAll('[data-node-field]').forEach((input) => {
      input.addEventListener('change', (ev) => {
        this.updateNodeField(ev.target.dataset.nodeId, ev.target.dataset.nodeField, ev.target.value)
      })
    })
    this.$.inspector.$.querySelectorAll('[data-link-field]:not(.data-pills)').forEach((input) => {
      input.addEventListener('change', (ev) => {
        this.updateLinkField(ev.target.dataset.linkId, ev.target.dataset.linkField, ev.target.value)
      })
    })
    this.$.inspector.$.querySelectorAll('.data-pills:not(.disabled)').forEach((group) => {
      group.querySelectorAll('.data-pill:not([disabled])').forEach((pill) => {
        pill.addEventListener('click', (ev) => {
          let groupEl = ev.target.closest('.data-pills')
          if (!groupEl) return
          this.updateLinkField(groupEl.dataset.linkId, groupEl.dataset.linkField, ev.target.dataset.value)
        })
      })
    })
  }

  selectArchitecture (id){
    if (!id || !dataflow.get(id))
      return
    this.selectedId = id
    this.selectedNodeId = ''
    this.selectedLinkId = ''
    this.connectionDrag = null
    dataflow.select(id)
    this.render()
  }

  createArchitecture (){
    this.ensureProjectData()
    let flow = dataflow.create({
      name:dataMsg('DataFlowUntitled', 'Untitled architecture'),
      architecture:{pattern:'source-bipes-target', description:''},
      input:{sourceType:'device', format:'image/jpeg', mode:'request', transport:'webserial'},
      process:{type:'raw'},
      output:{destination:'device', format:'json', envelope:'auto'}
    })
    this.selectArchitecture(flow.id)
  }

  deleteArchitecture (sid = this.selectedId){
    if (this.contextMenu)
      this.contextMenu.close()
    this.ensureProjectData()
    let flow = dataflow.get(sid)
    if (!flow || flow.locked)
      return
    dataflow.remove(sid)
    this.selectedId = dataflow.selectedId()
    this.selectedNodeId = ''
    this.selectedLinkId = ''
    this.render()
  }

  renameArchitectureDialog (sid, name){
    this.contextMenu.oninput({
      title:dataMsg('DataFlowName', 'Architecture name'),
      placeholder:name,
      value:name
    }, (input, ev) => {
      ev.preventDefault()
      let next = input.value
      this.contextMenu.close()

      if (next == undefined || next.trim() === '')
        return

      this.renameArchitecture(next, sid)
    })
  }

  renameArchitecture (name, sid = this.selectedId){
    let flow = dataflow.get(sid)
    if (!flow || flow.locked)
      return
    flow.name = String(name || dataMsg('DataFlowUntitled', 'Untitled architecture'))
    dataflow.save(flow)
  }

  toggleActorMenu (){
    if (this.addActorMenuOpen) {
      this.closeActorMenu()
    } else {
      this.openActorMenu()
    }
  }

  openActorMenu (){
    let popup = this.$.addActorPopup
    if (!popup) return

    popup.$.innerHTML = ''
    let card = document.createElement('div')
    card.className = 'data-actor-popup-card'

    let title = document.createElement('h2')
    title.className = 'data-actor-popup-title'
    title.textContent = dataMsg('DataNodeAdd', 'Add node')
    card.appendChild(title)

    let grid = document.createElement('div')
    grid.className = 'data-actor-grid'

    ACTOR_TYPES
      .filter(([type]) => type !== 'bipes')
      .forEach(([type, label]) => {
        let btn = document.createElement('button')
        btn.className = 'data-actor-btn'
        btn.dataset.actorType = type
        btn.innerHTML = `${this.actorIcon(type)}<span>${escapeHTML(label)}</span>`
        btn.addEventListener('click', () => {
          this.addNode(type)
          this.closeActorMenu()
        })
        grid.appendChild(btn)
      })

    card.appendChild(grid)
    popup.$.appendChild(card)
    this.addActorMenuOpen = true
    Animate.on(popup.$)
  }

  closeActorMenu (){
    if (!this.$.addActorPopup) return
    this.addActorMenuOpen = false
    Animate.off(this.$.addActorPopup.$)
  }

  addNode (type = 'device'){
    let flow = dataflow.get(this.selectedId)
    if (!flow || flow.locked)
      return
    let nodes = flow.architecture.nodes || []
    let previous = nodes[nodes.length - 1]
    let id = this.uniqueNodeId(flow, type)
    nodes.push({
      id,
      type,
      label:this.actorTypeLabel(type),
      x:previous ? previous.x + 260 : 120,
      y:previous ? previous.y : 120
    })
    flow.architecture.nodes = nodes
    this.selectedNodeId = id
    this.selectedLinkId = ''
    dataflow.save(flow)
    this.render()
  }

  removeNode (nodeId, ev){
    if (ev)
      ev.stopPropagation()
    let flow = dataflow.get(this.selectedId)
    if (!flow || flow.locked)
      return
    let node = this.findNode(nodeId, flow)
    if (!node || node.type == 'bipes')
      return
    flow.architecture.nodes = (flow.architecture.nodes || []).filter((item) => item.id != nodeId)
    flow.architecture.links = (flow.architecture.links || []).filter((link) => link.sourceId != nodeId && link.targetId != nodeId)
    if (this.selectedNodeId == nodeId)
      this.selectedNodeId = ''
    dataflow.save(flow)
    this.render()
  }

  selectNode (nodeId, ev){
    if (ev)
      ev.stopPropagation()
    this.selectedNodeId = nodeId
    this.selectedLinkId = ''
    this.render()
  }

  selectLink (linkId, ev){
    if (ev)
      ev.stopPropagation()
    this.selectedLinkId = linkId
    this.selectedNodeId = ''
    this.render()
  }

  openLinkMenu (linkId, ev){
    ev.preventDefault()
    ev.stopPropagation()

    this.removeLink(linkId)
  }

  clearSelection (ev){
    if (ev.target !== this.$.graphBoard.$ && ev.target !== this.$.nodes.$)
      return
    this.selectedNodeId = ''
    this.selectedLinkId = ''
    this.pendingPort = null
    this.render()
  }

  updateNodeField (nodeId, field, value){
    let flow = dataflow.get(this.selectedId)
    if (!flow || flow.locked)
      return
    let node = this.findNode(nodeId, flow)
    if (!node || node.type == 'bipes')
      return
    if (field == 'label')
      node.label = String(value || this.actorTypeLabel(node.type))
    if (field == 'type' && this.actorTypeAllowed(value))
      node.type = value
    if (field == 'deviceUid')
      node.deviceUid = String(value || '')
    if (field == 'mlWorkspaceId')
      node.mlWorkspaceId = String(value || '')
    if (field == 'visionSetupId')
      node.visionSetupId = String(value || '')
    this.selectedNodeId = nodeId
    dataflow.save(flow)
    this.render()
  }

  updateLinkField (linkId, field, value){
    let flow = dataflow.get(this.selectedId)
    if (!flow || flow.locked)
      return
    let link = this.findLink(linkId, flow)
    if (!link)
      return
    link[field] = value
    this.selectedLinkId = linkId
    dataflow.save(flow)
    this.render()
  }

  removeLink (linkId){
    if (this.contextMenu)
      this.contextMenu.close()
    let flow = dataflow.get(this.selectedId)
    if (!flow || flow.locked)
      return
    flow.architecture.links = (flow.architecture.links || []).filter((link) => link.id != linkId)
    this.selectedLinkId = ''
    dataflow.save(flow)
    this.render()
  }

  startNodeDrag (nodeId, ev){
    if (ev.button !== 0)
      return
    if (ev.target && typeof ev.target.closest == 'function' && ev.target.closest('button, input, select'))
      return
    let node = this.findNode(nodeId)
    if (!node)
      return
    let pointer = this.getPointerPositionInBoard(ev)
    this.nodeDrag = {
      nodeId,
      offsetX:pointer.x - node.x,
      offsetY:pointer.y - node.y
    }
    this.selectedNodeId = nodeId
    this.selectedLinkId = ''
    this.render()
  }

  startConnection (nodeId, portId, ev){
    if (typeof ev.button !== 'undefined' && ev.button !== 0)
      return
    let flow = dataflow.get(this.selectedId)
    if (!flow || flow.locked)
      return
    let pointer = this.getPointerPositionInBoard(ev)
    this.connectionDrag = {
      nodeId,
      portId,
      x:pointer.x,
      y:pointer.y
    }
    this.selectedNodeId = nodeId
    this.selectedLinkId = ''
    ev.stopPropagation()
    this.renderConnections()
  }

  completeConnection (targetNodeId, targetPortId){
    if (!this.connectionDrag)
      return
    let sourceId = this.connectionDrag.nodeId
    let sourcePort = this.connectionDrag.portId
    this.connectionDrag = null
    this.connectNodes(sourceId, targetNodeId, sourcePort, targetPortId)
  }

  connectNodes (sourceId, targetId, sourcePort = 'right', targetPort = 'left'){
    let flow = dataflow.get(this.selectedId)
    if (!flow || flow.locked || !sourceId || !targetId || sourceId == targetId)
      return
    if (!this.findNode(sourceId, flow) || !this.findNode(targetId, flow))
      return
    let duplicate = this.findDuplicateLink(sourceId, targetId, flow)
    if (duplicate) {
      this.selectedNodeId = ''
      this.selectedLinkId = duplicate.id
      dataflow.select(flow.id)
      this.render()
      return
    }
    let link = {
      id:this.uniqueLinkId(flow, sourceId, targetId),
      sourceId,
      targetId,
      sourcePort,
      targetPort,
      direction:'forward',
      communication:this.inferConnectionType(sourceId, targetId, flow),
      exchange:'data',
      format:'application/json',
      mode:'manual',
      envelope:'auto',
      header:'',
      footer:''
    }
    flow.architecture.links = [...(flow.architecture.links || []), link]
    this.selectedNodeId = ''
    this.selectedLinkId = link.id
    dataflow.save(flow)
    this.render()
  }

  onPointerMove (ev){
    if (!this.available || !this.$.graphBoard)
      return

    if (this.connectionDrag) {
      let pointer = this.getPointerPositionInBoard(ev)
      this.connectionDrag.x = pointer.x
      this.connectionDrag.y = pointer.y
      this.updateDragPreview()
      return
    }

    if (!this.nodeDrag)
      return

    let flow = dataflow.get(this.selectedId)
    if (!flow || flow.locked)
      return
    let node = this.findNode(this.nodeDrag.nodeId, flow)
    if (!node)
      return
    let pointer = this.getPointerPositionInBoard(ev)
    node.x = Math.max(24, Math.round(pointer.x - this.nodeDrag.offsetX))
    node.y = Math.max(24, Math.round(pointer.y - this.nodeDrag.offsetY))
    dataflow.save(flow)
    this.renderWorkspace()
  }

  onPointerUp (ev){
    if (!this.available || !this.$.graphBoard)
      return

    if (this.nodeDrag)
      this.nodeDrag = null

    if (this.connectionDrag) {
      let target = this.getPortTargetAtPoint(ev.clientX, ev.clientY)
      if (target)
        this.connectNodes(this.connectionDrag.nodeId, target.nodeId, this.connectionDrag.portId, target.portId)
      this.connectionDrag = null
      this.renderConnections()
    }
  }

  getPointerPositionInBoard (ev){
    let rect = this.$.graphBoard.$.getBoundingClientRect()
    return {
      x:ev.clientX - rect.left,
      y:ev.clientY - rect.top
    }
  }

  getPortCenter (nodeId, portId){
    let port = this.$.graphBoard.$.querySelector(`.data-node[data-node-id="${CSS.escape(nodeId)}"] .data-port[data-port-id="${CSS.escape(portId)}"]`)
    if (!port)
      return null
    let boardRect = this.$.graphBoard.$.getBoundingClientRect()
    let portRect = port.getBoundingClientRect()
    return {
      x:portRect.left - boardRect.left + portRect.width / 2,
      y:portRect.top - boardRect.top + portRect.height / 2
    }
  }

  getPortTargetAtPoint (clientX, clientY){
    let element = document.elementFromPoint(clientX, clientY)
    if (!element || typeof element.closest != 'function')
      return null

    let port = element.closest('.data-port[data-port-id]')
    if (!port || !this.$.graphBoard.$.contains(port))
      return null

    let node = port.closest('.data-node[data-node-id]')
    if (!node)
      return null

    return {
      nodeId:node.dataset.nodeId || null,
      portId:port.dataset.portId || 'left'
    }
  }

  findNode (nodeId, flow = dataflow.get(this.selectedId)){
    return (flow?.architecture?.nodes || []).find((node) => node.id == nodeId) || null
  }

  findLink (linkId, flow = dataflow.get(this.selectedId)){
    return (flow?.architecture?.links || []).find((link) => link.id == linkId) || null
  }

  nodeLabel (nodeId, flow){
    let node = this.findNode(nodeId, flow)
    return node ? node.label : nodeId
  }

  nodeMeta (node){
    return `${this.actorTypeLabel(node.type)} · id: ${node.id}`
  }

  relationLabel (link, flow){
    let source = this.nodeLabel(link.sourceId, flow)
    let target = this.nodeLabel(link.targetId, flow)
    return `${source} -> ${target}`
  }

  linkVisualLabel (link){
    return this.connectionLabel(link)
  }

  connectionLabel (link){
    return {
      auto:dataMsg('DataTransportAuto', 'Auto'),
      webserial:'USB/Serial',
      webbluetooth:'Bluetooth',
      websocket:dataMsg('DataTransportWifi', 'WiFi/WebSocket'),
      mqtt:'MQTT',
      browser:'Browser',
      internal:'Internal'
    }[link?.communication] || dataMsg('DataTransportAuto', 'Auto')
  }

  isWifiConnection (link){
    return link?.communication == 'websocket'
  }

  isSerialConnection (link){
    return link?.communication == 'webserial'
  }

  inferConnectionType (sourceId, targetId, flow){
    let source = this.findNode(sourceId, flow)
    let target = this.findNode(targetId, flow)
    if (source?.type == 'webcam' || target?.type == 'webcam')
      return 'browser'
    // A device relation resolves its real transport from how the device is connected.
    if (source?.type == 'device' || target?.type == 'device')
      return 'auto'
    // ml / vision / bipes are in-browser processing nodes.
    return 'internal'
  }

  actorTypeLabel (type){
    let item = ACTOR_TYPES.find(([value]) => value == type)
    return item ? item[1] : dataMsg('DataNodeDevice', 'Device')
  }

  actorTypeAllowed (type){
    return ACTOR_TYPES.some(([value]) => value == type)
  }

  actorIcon (type){
    return ACTOR_ICONS[type] || ACTOR_ICONS['device']
  }

  // The channel stores the protocol as connection.currentProtocol ('WebSerial' /
  // 'WebSocket' / 'WebBluetooth'); normalise it to the lowercase TRANSPORT_CONFIG keys.
  normalizeProtocol (raw){
    if (!raw) return null
    let key = String(raw).toLowerCase()
    return TRANSPORT_CONFIG[key] ? key : null
  }

  connectionProtocol (conn){
    if (!conn) return null
    return this.normalizeProtocol(conn.currentProtocol || conn.protocol || conn.type)
  }

  getDeviceProtocol (deviceUid){
    try {
      let ch = window.bipes && bipes.channel
      if (!ch || !deviceUid) return null
      let conn = ch.connections && ch.connections[deviceUid]
      return this.connectionProtocol(conn)
    } catch { return null }
  }

  getActiveDeviceTransport (){
    try {
      let ch = window.bipes && bipes.channel
      if (!ch) return 'auto'
      let uid = ch.targetDevice
      if (!uid) return 'auto'
      let conn = ch.connections && ch.connections[uid]
      return this.connectionProtocol(conn) || 'auto'
    } catch { return 'auto' }
  }

  visualTransport (link, flow = dataflow.get(this.selectedId)){
    // An explicit MQTT relation overrides the device's auto-detected protocol.
    if (link.transport === 'mqtt') return 'mqtt'

    let source = this.findNode(link.sourceId, flow)
    let target = this.findNode(link.targetId, flow)
    let deviceNode = [source, target].find((n) => n && n.type === 'device')

    if (deviceNode) {
      let protocol = this.getDeviceProtocol(deviceNode.deviceUid)
      if (protocol) return protocol
      return this.getActiveDeviceTransport()
    }

    if (source?.type === 'webcam' || target?.type === 'webcam') return 'browser'
    return link.communication || 'internal'
  }

  connectedDeviceOptions (){
    try {
      let ch = window.bipes && bipes.channel
      if (!ch || !ch.connections) return []
      return Object.entries(ch.connections).map(([uid, conn]) => {
        let proto = this.connectionProtocol(conn) || 'auto'
        let label = TRANSPORT_CONFIG[proto] ? TRANSPORT_CONFIG[proto].label : proto
        let name = conn.name || `${dataMsg('DataNodeDevice', 'Device')} ${String(uid).slice(0, 4)}`
        return {uid, label:`${name} (${label})`}
      })
    } catch { return [] }
  }

  mlWorkspaceOptions (){
    try {
      let ml = window.bipes && bipes.page && bipes.page.ml
      if (ml && typeof ml.getWorkspaces === 'function')
        return ml.getWorkspaces().map(({id, name}) => ({id, name:name || id}))
    } catch {}
    return []
  }

  visionSetupOptions (){
    try {
      let vision = window.bipes && bipes.page && bipes.page.vision
      if (vision && typeof vision.getSetups === 'function')
        return vision.getSetups().map(({id, name}) => ({id, name:name || id}))
    } catch {}
    return []
  }

  uniqueNodeId (flow, type){
    let base = type || 'actor'
    let id = base
    let index = 1
    while ((flow.architecture.nodes || []).some((node) => node.id == id)) {
      index += 1
      id = `${base}-${index}`
    }
    return id
  }

  uniqueLinkId (flow, sourceId, targetId){
    let base = `${sourceId}-to-${targetId}`
    let id = base
    let index = 1
    while ((flow.architecture.links || []).some((link) => link.id == id)) {
      index += 1
      id = `${base}-${index}`
    }
    return id
  }

  findDuplicateLink (sourceId, targetId, flow){
    return (flow.architecture.links || []).find((link) => {
      return link.sourceId == sourceId && link.targetId == targetId
    }) || null
  }
}

export let architecture = new DataPage()
