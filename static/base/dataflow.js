"use strict";

import {Tool} from './tool.js'

const DEFAULT_FLOW = {
  name:'Robot Camera Flow',
  type:'pipeline',
  architecture:{
    pattern:'source-bipes',
    description:'',
    nodes:[
      {id:'device', type:'device', label:'Device', x:72, y:120},
      {id:'bipes', type:'bipes', label:'BIPES', x:370, y:120}
    ],
    links:[
      {id:'device-to-bipes', sourceId:'device', targetId:'bipes', direction:'forward', communication:'auto', exchange:'data', format:'application/json', mode:'request', envelope:'auto', header:'', footer:''}
    ]
  }
}

const DEFAULT_WIDGET_FLOW = {
  id:'bipes-basic-widget-architecture',
  name:'Basic Widget Device Architecture',
  type:'pipeline',
  locked:true,
  architecture:{
    pattern:'bipes-device',
    description:'Built-in architecture for simple widgets sending commands to, and receiving values from, the current device.',
    nodes:[
      {id:'bipes', type:'bipes', label:'BIPES', x:72, y:120},
      {id:'device', type:'device', label:'Current device', x:370, y:120}
    ],
    links:[
      {id:'bipes-device-exchange', sourceId:'bipes', targetId:'device', direction:'bidirectional', communication:'auto', exchange:'widget commands and values', format:'widget-value', outputFormat:'raw-binary', mode:'manual', envelope:'auto', header:'', footer:''}
    ]
  }
}

class DataFlowRegistry {
  constructor (){
    this.listeners = new Set()
    this.persistHandler = null
    this.flows = []
    this.selectedFlowId = ''
    this.load(this.empty())
  }

  empty (){
    let widgetFlow = this.makeFlow(DEFAULT_WIDGET_FLOW, 1)
    let flow = this.makeFlow(DEFAULT_FLOW, 2)
    return {
      flows:[widgetFlow, flow],
      selectedId:widgetFlow.id
    }
  }

  load (data){
    let rawFlows = data && data.flows instanceof Array ? data.flows : data instanceof Array ? data : []
    this.flows = rawFlows.map((flow) => this.normalize(flow))
    if (this.flows.length == 0)
      this.flows = this.empty().flows
    this.ensureSystemArchitecture()

    let selected = data && typeof data.selectedId == 'string' ? data.selectedId : ''
    this.selectedFlowId = this.flows.some((flow) => flow.id == selected) ? selected : this.flows[0].id
    this.notify()
    return this.export()
  }

  export (){
    return {
      flows:this.all(),
      selectedId:this.selectedId()
    }
  }

  setPersistHandler (callback){
    this.persistHandler = typeof callback == 'function' ? callback : null
  }

  all (){
    return this.flows.map((flow) => this.clone(flow))
  }

  get (id){
    let flow = this.flows.find((item) => item.id == id)
    return flow ? this.clone(flow) : null
  }

  selectedId (){
    if (this.selectedFlowId && this.flows.some((flow) => flow.id == this.selectedFlowId))
      return this.selectedFlowId
    return this.flows[0] ? this.flows[0].id : ''
  }

  select (id){
    if (!this.flows.some((flow) => flow.id == id))
      return this.selectedId()
    this.selectedFlowId = id
    this.persist()
    return id
  }

  create (partial = {}){
    let flow = this.makeFlow(partial)
    this.flows.push(flow)
    this.selectedFlowId = flow.id
    this.persist()
    return this.clone(flow)
  }

  save (flow){
    let normalized = this.normalize(flow)
    let index = this.flows.findIndex((item) => item.id == normalized.id)
    if (index != -1 && this.flows[index].locked)
      return this.clone(this.flows[index])
    if (index == -1)
      this.flows.push(normalized)
    else
      this.flows[index] = normalized
    this.persist()
    return this.clone(normalized)
  }

  remove (id){
    if (this.flows.length <= 1)
      return false
    let flow = this.flows.find((item) => item.id == id)
    if (flow && flow.locked)
      return false
    this.flows = this.flows.filter((flow) => flow.id != id)
    if (!this.flows.some((flow) => flow.id == this.selectedFlowId))
      this.selectedFlowId = this.flows[0].id
    this.persist()
    return true
  }

  subscribe (callback){
    this.listeners.add(callback)
    return () => {this.listeners.delete(callback)}
  }

  describe (flow){
    flow = this.normalize(flow)
    let input = this.flowInput(flow)
    let output = this.flowOutput(flow)
    return {
      obtain:`${input.sourceType} (${input.format})`,
      output:output.format,
      relation:this.patternLabel(flow.architecture.pattern)
    }
  }

  makeFlow (partial = {}, index = null){
    let architecture = {...DEFAULT_FLOW.architecture, ...(partial.architecture || {})}
    if (partial.architecture && !(partial.architecture.nodes instanceof Array))
      delete architecture.nodes
    if (partial.architecture && !(partial.architecture.links instanceof Array))
      delete architecture.links
    return this.normalize({
      ...DEFAULT_FLOW,
      ...partial,
      id:partial.id || Tool.UID(),
      name:partial.name || `Data Flow ${index || (this.flows ? this.flows.length + 1 : 1)}`,
      architecture
    })
  }

  normalize (flow = {}){
    let architecture = {...DEFAULT_FLOW.architecture, ...(flow.architecture || {})}
    if (!flow.architecture || !(flow.architecture.nodes instanceof Array))
      delete architecture.nodes
    if (!flow.architecture || !(flow.architecture.links instanceof Array))
      delete architecture.links
    let pattern = this.oneOf(architecture.pattern, [
      'bipes-device',
      'bipes-target',
      'source-bipes',
      'source-bipes-target',
      'webcam-bipes',
      'bipes-only',
      'custom'
    ], 'source-bipes')

    // The node graph (architecture.nodes/links) is the single source of truth. The dashboard's
    // input/output/process config is derived from it on demand via flowInput/flowOutput/
    // flowHasProcessor — there are no separately-stored input/process/output blocks.
    return {
      id:flow.id || Tool.UID(),
      name:String(flow.name || DEFAULT_FLOW.name),
      type:'pipeline',
      locked:Boolean(flow.locked || flow.system || false),
      architecture:{
        pattern,
        description:String(architecture.description || ''),
        nodes:this.normalizeArchitectureNodes(architecture.nodes, pattern),
        links:this.normalizeArchitectureLinks(architecture.links, pattern)
      }
    }
  }

  oneOf (value, values, fallback){
    return values.includes(value) ? value : fallback
  }

  //--------------------------------------------------------------------------
  // Node-graph derivation. These project the node graph into the input/output/process
  // shape the dashboard consumes, so the graph stays the single source of truth.
  //--------------------------------------------------------------------------

  bipesNodeId (flow){
    let node = (flow.architecture.nodes || []).find((n) => n.type == 'bipes')
    return node ? node.id : null
  }

  flowHasProcessor (flow){
    return (flow.architecture.nodes || []).some((n) => n.type == 'ml' || n.type == 'vision')
  }

  // The source relation is a non-return link feeding BIPES from a device/webcam node.
  // A bidirectional device<->BIPES exchange (a widget flow) has no such forward source,
  // so it reports sourceType 'bipes'.
  flowInput (flow){
    let nodes = flow.architecture.nodes || []
    let links = flow.architecture.links || []
    let bipes = this.bipesNodeId(flow)
    let byId = (id) => nodes.find((n) => n.id == id)
    let inLink = links.find((l) => l.targetId == bipes
      && !String(l.id).endsWith('-return')
      && ['webcam', 'device'].includes((byId(l.sourceId) || {}).type))
    let src = inLink ? byId(inLink.sourceId) : null

    if (!src)
      return {sourceType:'bipes', format:'widget-value', mode:'manual', transport:'bipes', fps:4, deviceUid:'', url:'', notifyMessage:''}

    let sourceType = src.type
    return {
      sourceType,
      format:sourceType == 'webcam' ? 'browser-image-frame' : 'image/jpeg',
      mode:this.oneOf(inLink.mode, ['request', 'stream', 'notify'], 'request'),
      transport:sourceType == 'device' ? (src.url ? 'websocket' : 'webserial') : sourceType,
      fps:Math.max(1, Math.min(30, Number(inLink.fps) || 4)),
      deviceUid:String(src.deviceUid || ''),
      url:String(src.url || ''),
      notifyMessage:String(inLink.notifyMessage || 'NEW_DATA')
    }
  }

  // The output relation is a forward link from BIPES to a device node.
  flowOutput (flow){
    let nodes = flow.architecture.nodes || []
    let links = flow.architecture.links || []
    let bipes = this.bipesNodeId(flow)
    let byId = (id) => nodes.find((n) => n.id == id)
    let outLink = links.find((l) => l.sourceId == bipes && (byId(l.targetId) || {}).type == 'device')
    let target = outLink ? byId(outLink.targetId) : null

    if (!outLink)
      return {destination:'none', transport:'auto', targetDevice:'active', format:'json', envelope:'auto', sendPolicy:'onResult', ruleMetric:'confidence', ruleOperator:'>=', ruleValue:'0.65', header:'', footer:'', commandTemplate:''}

    return {
      destination:outLink.transport == 'mqtt' ? 'mqtt' : 'device',
      transport:'auto',
      targetDevice:(target && target.deviceUid) ? target.deviceUid : 'active',
      format:outLink.outputFormat || 'json',
      envelope:outLink.envelope || 'auto',
      sendPolicy:outLink.sendPolicy || 'onResult',
      ruleMetric:outLink.ruleMetric || 'confidence',
      ruleOperator:outLink.ruleOperator || '>=',
      ruleValue:String(outLink.ruleValue == null ? '0.65' : outLink.ruleValue),
      header:outLink.header || '',
      footer:outLink.footer || '',
      commandTemplate:outLink.commandTemplate || ''
    }
  }

  patternLabel (pattern){
    return {
      'bipes-device':'BIPES <-> device',
      'bipes-target':'BIPES -> target',
      'source-bipes':'source -> BIPES',
      'source-bipes-target':'source -> BIPES -> target',
      'webcam-bipes':'webcam -> BIPES',
      'bipes-only':'BIPES only',
      'custom':'custom architecture'
    }[pattern] || 'architecture'
  }

  normalizeArchitectureNodes (nodes, pattern, sourceType, destination){
    let defaults = this.defaultArchitectureNodes(pattern, sourceType, destination)
    let rawNodes = nodes instanceof Array && nodes.length ? nodes : defaults
    let used = {}
    return rawNodes.map((node, index) => {
      let id = String(node.id || `actor-${index}`)
      if (used[id])
        id = `${id}-${index}`
      used[id] = true
      return {
        id,
        type:this.oneOf(node.type, ['bipes', 'device', 'webcam', 'ml', 'vision'], 'device'),
        label:String(node.label || this.actorLabel(node.type || id)),
        x:Number.isFinite(node.x) ? node.x : 72 + index * 260,
        y:Number.isFinite(node.y) ? node.y : 120,
        deviceUid:String(node.deviceUid || ''),
        url:String(node.url || ''),
        mlWorkspaceId:String(node.mlWorkspaceId || ''),
        visionSetupId:String(node.visionSetupId || '')
      }
    })
  }

  normalizeArchitectureLinks (links, pattern, sourceType, destination){
    let defaults = this.defaultArchitectureLinks(pattern, sourceType, destination)
    let rawLinks = links instanceof Array && links.length ? links : defaults
    let used = {}
    return rawLinks.flatMap((link, index) => {
      let id = String(link.id || `relation-${index}`)
      if (used[id])
        id = `${id}-${index}`
      used[id] = true
      let normalized = {
        id,
        sourceId:String(link.sourceId || ''),
        targetId:String(link.targetId || ''),
        sourcePort:this.migratePort(link.sourcePort, 'right'),
        targetPort:this.migratePort(link.targetPort, 'left'),
        direction:'forward',
        communication:this.oneOf(link.communication, ['auto', 'webserial', 'webbluetooth', 'websocket', 'mqtt', 'browser', 'internal'], 'auto'),
        // User-selected transport for the relation: 'auto' derives it from how the device
        // is connected; 'mqtt' overrides it and exposes the publish/subscribe topics below.
        transport:this.oneOf(link.transport, ['auto', 'mqtt'], 'auto'),
        mqttPublishTopic:String(link.mqttPublishTopic || ''),
        mqttSubscribeTopic:String(link.mqttSubscribeTopic || ''),
        qos:this.oneOf(Number(link.qos), [0, 1, 2], 0),
        retain:this.oneOf(String(link.retain), ['true', 'false'], 'false'),
        exchange:String(link.exchange || 'data'),
        format:String(link.format || 'application/json'),
        mode:this.oneOf(link.mode, ['manual', 'request', 'stream', 'notify', 'onResult', 'onRule'], 'manual'),
        envelope:this.oneOf(link.envelope, ['auto', 'raw', 'json', 'topic-message-packet', 'function-call'], 'auto'),
        header:String(link.header || ''),
        footer:String(link.footer || ''),
        // Trigger timing (input relations: source -> BIPES)
        fps:Math.max(1, Math.min(30, Number(link.fps) || 4)),
        notifyMessage:String(link.notifyMessage || ''),
        // Output payload + gating (output relations: BIPES -> device)
        outputFormat:this.oneOf(link.outputFormat, ['json', 'csv', 'avro', 'parquet', 'raw-binary', 'command'], 'json'),
        commandTemplate:String(link.commandTemplate || ''),
        sendPolicy:this.oneOf(link.sendPolicy, ['onResult', 'onChange', 'onRule', 'manual'], 'onResult'),
        ruleMetric:String(link.ruleMetric || 'confidence'),
        ruleOperator:this.oneOf(link.ruleOperator, ['>=', '>', '<=', '<', '==', '!='], '>='),
        ruleValue:String(link.ruleValue == null ? '0.65' : link.ruleValue)
      }
      if (link.direction == 'reverse')
        return [{
          ...normalized,
          sourceId:normalized.targetId,
          targetId:normalized.sourceId,
          sourcePort:normalized.targetPort,
          targetPort:normalized.sourcePort
        }]
      if (link.direction == 'bidirectional')
        return [
          normalized,
          {
            ...normalized,
            id:`${normalized.id}-return`,
            sourceId:normalized.targetId,
            targetId:normalized.sourceId,
            sourcePort:normalized.targetPort,
            targetPort:normalized.sourcePort
          }
        ]
      return normalized
    }).filter((link) => link.sourceId && link.targetId && link.sourceId != link.targetId)
  }

  defaultArchitectureNodes (pattern, sourceType, destination){
    if (pattern == 'bipes-device')
      return DEFAULT_WIDGET_FLOW.architecture.nodes
    if (pattern == 'bipes-only')
      return [{id:'bipes', type:'bipes', label:'BIPES', x:72, y:120}]
    if (pattern == 'webcam-bipes' || sourceType == 'webcam')
      return [
        {id:'webcam', type:'webcam', label:'Webcam', x:72, y:120},
        {id:'bipes', type:'bipes', label:'BIPES', x:370, y:120}
      ]
    if (pattern == 'bipes-target')
      return [
        {id:'bipes', type:'bipes', label:'BIPES', x:72, y:120},
        {id:'target-device', type:destination == 'mqtt' ? 'mqtt' : 'target-device', label:destination == 'mqtt' ? 'MQTT' : 'Target device', x:370, y:120}
      ]
    if (pattern == 'source-bipes-target')
      return [
        {id:'source-device', type:'source-device', label:'Source device', x:72, y:120},
        {id:'bipes', type:'bipes', label:'BIPES', x:370, y:120},
        {id:'target-device', type:destination == 'mqtt' ? 'mqtt' : 'target-device', label:destination == 'mqtt' ? 'MQTT' : 'Target device', x:668, y:120}
      ]
    return DEFAULT_FLOW.architecture.nodes
  }

  defaultArchitectureLinks (pattern, sourceType, destination){
    if (pattern == 'bipes-device')
      return DEFAULT_WIDGET_FLOW.architecture.links
    if (pattern == 'bipes-only')
      return []
    if (pattern == 'bipes-target')
      return [{id:'bipes-to-target', sourceId:'bipes', targetId:'target-device', direction:'forward', communication:'auto', exchange:'result or command', format:'json', mode:'manual', envelope:'auto', header:'', footer:''}]
    if (pattern == 'source-bipes-target')
      return [
        {id:'source-to-bipes', sourceId:'source-device', targetId:'bipes', direction:'forward', communication:sourceType == 'webcam' ? 'browser' : 'webserial', exchange:'input data', format:sourceType == 'webcam' ? 'browser-image-frame' : 'image/jpeg', mode:'request', envelope:'raw', header:'', footer:''},
        {id:'bipes-to-target', sourceId:'bipes', targetId:'target-device', direction:'forward', communication:destination == 'mqtt' ? 'mqtt' : 'auto', exchange:'processed result', format:'json', mode:'onResult', envelope:'auto', header:'', footer:''}
      ]
    if (pattern == 'webcam-bipes' || sourceType == 'webcam')
      return [{id:'webcam-to-bipes', sourceId:'webcam', targetId:'bipes', direction:'forward', communication:'browser', exchange:'camera frame', format:'browser-image-frame', mode:'manual', envelope:'raw', header:'', footer:''}]
    return DEFAULT_FLOW.architecture.links
  }

  actorLabel (type){
    return {
      bipes:'BIPES',
      device:'Device',
      webcam:'Webcam',
      ml:'ML',
      vision:'Vision'
    }[type] || 'Device'
  }

  migratePort (portId, fallback){
    const map = {
      'out':'right',    'in':'left',
      'right-1':'right','right-2':'right',
      'left-1':'left',  'left-2':'left',
      'top-1':'top',    'top-2':'top',
      'bottom-1':'bottom','bottom-2':'bottom'
    }
    return map[portId] || portId || fallback
  }

  ensureSystemArchitecture (){
    let systemFlow = this.makeFlow(DEFAULT_WIDGET_FLOW, 1)
    this.flows = this.flows.filter((flow) => {
      if (!flow)
        return false
      if (flow.id == systemFlow.id)
        return false
      if (flow.name == 'BIPES Default Output' && this.flowInput(flow).sourceType == 'bipes')
        return false
      return true
    })
    this.flows.unshift(systemFlow)
  }

  clone (value){
    return JSON.parse(JSON.stringify(value))
  }

  persist (){
    if (this.persistHandler) {
      try {
        this.persistHandler(this.export())
      } catch (error) {
        console.error('Data flow persistence failed', error)
      }
    }
    this.notify()
  }

  notify (){
    let snapshot = this.all()
    this.listeners.forEach((callback) => {
      try {
        callback(snapshot)
      } catch (error) {
        console.error(error)
      }
    })
  }
}

export let dataflow = new DataFlowRegistry()
