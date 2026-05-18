"use strict";

import {Tool} from './tool.js'

const DEFAULT_FLOW = {
  name:'Robot Camera Flow',
  type:'pipeline',
  architecture:{
    pattern:'source-bipes',
    actors:['bipes', 'source-device'],
    description:'',
    nodes:[
      {id:'source-device', type:'source-device', label:'Source device', x:72, y:120},
      {id:'bipes', type:'bipes', label:'BIPES', x:370, y:120}
    ],
    links:[
      {id:'source-to-bipes', sourceId:'source-device', targetId:'bipes', direction:'forward', communication:'webserial', exchange:'image frame', format:'image/jpeg', mode:'request', envelope:'raw', header:'', footer:''}
    ]
  },
  input:{
    enabled:true,
    sourceType:'device',
    format:'image/jpeg',
    mode:'request',
    transport:'webserial',
    fps:4,
    deviceUid:'',
    url:'',
    notifyMessage:'NEW_DATA',
    header:'',
    footer:''
  },
  process:{
    type:'raw',
    visionSetupId:'current',
    mlWorkspaceId:'',
    steps:[]
  },
  output:{
    useInBipes:['preview'],
    destination:'none',
    transport:'auto',
    targetDevice:'active',
    format:'json',
    envelope:'auto',
    sendPolicy:'onResult',
    ruleMetric:'confidence',
    ruleOperator:'>=',
    ruleValue:'0.65',
    header:'',
    footer:'',
    commandTemplate:''
  }
}

const DEFAULT_WIDGET_FLOW = {
  id:'bipes-basic-widget-architecture',
  name:'Basic Widget Device Architecture',
  type:'pipeline',
  locked:true,
  architecture:{
    pattern:'bipes-device',
    actors:['bipes', 'target-device'],
    description:'Built-in architecture for simple widgets sending commands to, and receiving values from, the active device.',
    nodes:[
      {id:'bipes', type:'bipes', label:'BIPES', x:72, y:120},
      {id:'target-device', type:'target-device', label:'Active device', x:370, y:120}
    ],
    links:[
      {id:'bipes-device-exchange', sourceId:'bipes', targetId:'target-device', direction:'bidirectional', communication:'auto', exchange:'widget commands and values', format:'widget-value', mode:'manual', envelope:'auto', header:'', footer:'\\n'}
    ]
  },
  input:{
    enabled:true,
    sourceType:'bipes',
    format:'widget-value',
    mode:'manual',
    transport:'bipes',
    fps:4,
    deviceUid:'',
    url:'',
    notifyMessage:'',
    header:'',
    footer:''
  },
  process:{
    type:'raw'
  },
  output:{
    useInBipes:[],
    destination:'device',
    transport:'auto',
    targetDevice:'active',
    format:'raw-binary',
    envelope:'auto',
    header:'',
    footer:'\n',
    commandTemplate:''
  }
}

const LOCKED_INPUT_FORMATS = {
  bipes:'widget-value',
  webcam:'browser-image-frame'
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
    return {
      obtain:`${flow.input.sourceType} (${flow.input.format})`,
      understand:flow.process.type,
      use:flow.output.useInBipes.length ? flow.output.useInBipes.join(', ') : 'not used in BIPES',
      destination:flow.output.destination,
      output:flow.output.format,
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
      architecture,
      input:{...DEFAULT_FLOW.input, ...(partial.input || {})},
      process:{...DEFAULT_FLOW.process, ...(partial.process || {})},
      output:{...DEFAULT_FLOW.output, ...(partial.output || {})}
    })
  }

  normalize (flow = {}){
    let architecture = {...DEFAULT_FLOW.architecture, ...(flow.architecture || {})}
    if (!flow.architecture || !(flow.architecture.nodes instanceof Array))
      delete architecture.nodes
    if (!flow.architecture || !(flow.architecture.links instanceof Array))
      delete architecture.links
    let input = {...DEFAULT_FLOW.input, ...(flow.input || {})}
    let process = {...DEFAULT_FLOW.process, ...(flow.process || {})}
    let output = {...DEFAULT_FLOW.output, ...(flow.output || {})}
    let legacyOutputOnly = flow.type == 'output-only' || (flow.input && flow.input.enabled === false)
    let legacyInputFormats = {
      image:'image/jpeg',
      audio:'audio/*',
      text:'text/plain',
      sensor:'application/json'
    }
    let inputFormat = String(input.format || legacyInputFormats[input.dataKind] || 'application/octet-stream')
    let migratedSourceType = input.sourceType == 'url' || input.sourceType == 'upload' ? 'webcam' : input.sourceType
    let sourceType = legacyOutputOnly ? 'bipes' : this.oneOf(migratedSourceType, ['bipes', 'webcam', 'device'], 'webcam')
    if (LOCKED_INPUT_FORMATS[sourceType])
      inputFormat = LOCKED_INPUT_FORMATS[sourceType]
    let useInBipes = output.useInBipes instanceof Array
      ? output.useInBipes
      : output.targets instanceof Array ? output.targets.filter((target) => target != 'device') : []
    let destination = output.destination || (output.targets instanceof Array && output.targets.includes('device') ? 'device' : 'none')
    let pattern = this.oneOf(architecture.pattern || this.inferPattern(sourceType, destination), [
      'bipes-device',
      'bipes-target',
      'source-bipes',
      'source-bipes-target',
      'webcam-bipes',
      'bipes-only',
      'custom'
    ], this.inferPattern(sourceType, destination))

    return {
      id:flow.id || Tool.UID(),
      name:String(flow.name || DEFAULT_FLOW.name),
      type:'pipeline',
      locked:Boolean(flow.locked || flow.system || false),
      architecture:{
        pattern,
        actors:this.deriveActors(pattern, sourceType, destination),
        description:String(architecture.description || ''),
        nodes:this.normalizeArchitectureNodes(architecture.nodes, pattern, sourceType, destination),
        links:this.normalizeArchitectureLinks(architecture.links, pattern, sourceType, destination)
      },
      input:{
        enabled:true,
        sourceType,
        format:inputFormat,
        mode:sourceType == 'device' ? this.oneOf(input.mode, ['request', 'stream', 'notify'], 'request') : 'manual',
        transport:sourceType == 'device' ? this.oneOf(input.transport || input.connection || input.protocol, ['webserial', 'webbluetooth', 'websocket', 'mqtt'], 'webserial') : sourceType,
        fps:Math.max(1, Math.min(30, Number(input.fps) || 4)),
        deviceUid:String(input.deviceUid || ''),
        url:String(input.url || ''),
        notifyMessage:String(input.notifyMessage || input.triggerMessage || 'NEW_DATA'),
        header:String(input.header || ''),
        footer:String(input.footer || '')
      },
      process:{
        type:this.oneOf(process.type, ['raw', 'vision', 'mlTraining', 'mlPrediction'], 'raw'),
        visionSetupId:String(process.visionSetupId || 'current'),
        mlWorkspaceId:String(process.mlWorkspaceId || ''),
        steps:process.steps instanceof Array ? process.steps : []
      },
      output:{
        useInBipes:useInBipes.filter(Boolean),
        destination:this.oneOf(destination, ['none', 'device', 'mqtt'], 'none'),
        transport:this.oneOf(output.transport, ['auto', 'webserial', 'webbluetooth', 'websocket'], 'auto'),
        targetDevice:String(output.targetDevice || 'active'),
        format:this.oneOf(output.format, ['json', 'csv', 'avro', 'parquet', 'raw-binary', 'command'], 'json'),
        envelope:this.oneOf(output.envelope, ['auto', 'function-call', 'topic-message-packet', 'raw'], 'auto'),
        sendPolicy:this.oneOf(output.sendPolicy, ['onResult', 'onChange', 'onRule', 'manual'], 'onResult'),
        ruleMetric:String(output.ruleMetric || 'confidence'),
        ruleOperator:this.oneOf(output.ruleOperator, ['>=', '>', '<=', '<', '==', '!='], '>='),
        ruleValue:String(output.ruleValue || '0.65'),
        header:String(output.header || ''),
        footer:String(output.footer || ''),
        commandTemplate:String(output.commandTemplate || '')
      }
    }
  }

  oneOf (value, values, fallback){
    return values.includes(value) ? value : fallback
  }

  inferPattern (sourceType, destination){
    if (sourceType == 'bipes' && destination != 'none')
      return 'bipes-target'
    if (sourceType == 'bipes')
      return 'bipes-only'
    if (sourceType == 'webcam' && destination == 'none')
      return 'webcam-bipes'
    if (destination != 'none')
      return 'source-bipes-target'
    return 'source-bipes'
  }

  deriveActors (pattern, sourceType, destination){
    let actors = new Set(['bipes'])

    if (sourceType == 'webcam' || pattern == 'webcam-bipes')
      actors.add('webcam')
    if (sourceType == 'device' || pattern == 'source-bipes' || pattern == 'source-bipes-target')
      actors.add('source-device')
    if (destination == 'device' || pattern == 'bipes-device' || pattern == 'bipes-target' || pattern == 'source-bipes-target')
      actors.add('target-device')
    if (destination == 'mqtt')
      actors.add('mqtt')

    return Array.from(actors)
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
        type:this.oneOf(node.type, ['bipes', 'source-device', 'target-device', 'webcam', 'ml', 'vision', 'transform', 'rule', 'mqtt', 'service', 'widget', 'custom'], 'custom'),
        label:String(node.label || this.actorLabel(node.type || id)),
        x:Number.isFinite(node.x) ? node.x : 72 + index * 260,
        y:Number.isFinite(node.y) ? node.y : 120,
        deviceUid:String(node.deviceUid || '')
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
        exchange:String(link.exchange || 'data'),
        format:String(link.format || 'application/json'),
        mode:this.oneOf(link.mode, ['manual', 'request', 'stream', 'notify', 'onResult', 'onRule'], 'manual'),
        envelope:this.oneOf(link.envelope, ['auto', 'raw', 'json', 'topic-message-packet', 'function-call'], 'auto'),
        header:String(link.header || ''),
        footer:String(link.footer || '')
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
      'source-device':'Source device',
      'target-device':'Target device',
      webcam:'Webcam',
      ml:'ML inference',
      vision:'Vision',
      transform:'Transform',
      rule:'Rule / filter',
      mqtt:'MQTT',
      service:'Service',
      widget:'Widget',
      custom:'Actor'
    }[type] || 'Actor'
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
      if (flow.name == 'BIPES Default Output' && flow.input && flow.input.sourceType == 'bipes')
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
