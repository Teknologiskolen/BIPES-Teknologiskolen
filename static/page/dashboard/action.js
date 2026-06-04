"use strict";

import {DOM} from '../../base/dom.js'
import {channel} from '../../base/channel.js'
import {dataflow} from '../../base/dataflow.js'
import {
  Charts,
  Streams,
  Switches,
  ThreeStateSwitches,
  Buttons,
  Ranges,
  Gauges,
  Coordinates,
  Drawings,
  MLClassifiers,
  VisionProcessors,
  listImageSourceDevices
} from './plugins.js'
import {ml} from '../ml/main.js'
import {vision} from '../vision/main.js'
export {Actions, Action}

import {project} from '../project/main.js'

function dashboardActionMsg (key, fallback, ...args){
  let text = (window.Msg && Msg[key]) || fallback
  args.forEach((arg, index) => {
    text = text.replace(`{${index}}`, arg)
  })
  return text
}

function isLiveSelectableDevice (value, kind = 'any') {
  if (!value || value == 'active' || value == 'all')
    return true

  if ((kind == 'any' || kind == 'device') && channel.hasConnection(value))
    return true

  if (kind == 'any' || kind == 'image-source')
    return listImageSourceDevices().some((device) => device && device.uid == value)

  return false
}

function formatDeviceOptionLabel (device, fallbackName = 'Device') {
  let nodename = device && device.nodename ? device.nodename : dashboardActionMsg('DashboardActionConnectedDeviceLabel', fallbackName)
  let version = device && device.version && device.version != '-' ? ` ${device.version}` : ''
  let protocol = device && device.protocol ? device.protocol : 'device'
  return `${nodename}${version} (${protocol})`
}

class Actions {
	static imageSourceOptions (){
	  return [
	    {value:'Webcam', label:dashboardActionMsg('DashboardActionWebcam', 'Webcam')},
	    {value:'Image URL', label:dashboardActionMsg('DashboardActionImageURL', 'Image URL')},
	    {value:'Source device', label:dashboardActionMsg('DashboardActionSourceDevice', 'Source device')}
	  ]
	}
	static sourceDeviceOptions (selected){
	  let options = [
	    {value:'', label:dashboardActionMsg('DashboardActionChooseConnectedSourceDevice', 'Choose connected source device')}
	  ]
	  let known = ['']
	  let devices = window.bipes && bipes.page && bipes.page.device && bipes.page.device.devices ?
	    bipes.page.device.devices : []
	  let imageSourceDevices = listImageSourceDevices()

	  devices.forEach((device) => {
	    if (!channel.hasConnection(device.uid))
	      return
	    if (known.includes(device.uid))
	      return

	    known.push(device.uid)
	    options.push({
	      value: device.uid,
	      label: formatDeviceOptionLabel(device, 'Source device')
	    })
	  })

	  imageSourceDevices.forEach((device) => {
	    if (known.includes(device.uid))
	      return

	    known.push(device.uid)
	    options.push({
	      value: device.uid,
	      label: formatDeviceOptionLabel(device, 'Source device')
	    })
	  })

	  return options
	}
	static dataFlowOptions (selected){
	  let options = []

	  dataflow.all()
	    .forEach((flow) => {
	      let description = dataflow.describe(flow)
	      options.push({
	        value:flow.id,
	        label:`${flow.name || dashboardActionMsg('DataFlowUntitled', 'Untitled data flow')} (${description.obtain})`
	      })
	    })

	  if (selected && !options.some((option) => option.value == selected)) {
	    options.push({
	      value:selected,
	      label:dashboardActionMsg('DashboardActionSavedDataFlow', 'Saved data flow')
	    })
	  }

	  return options
	}
	static outputDataFlowOptions (selected){
	  let options = []

	  dataflow.all()
	    .filter((flow) => dataflow.flowInput(flow).sourceType == 'bipes')
	    .forEach((flow) => {
	      let description = dataflow.describe(flow)
	      options.push({
	        value:flow.id,
	        label:`${flow.name || dashboardActionMsg('DataFlowUntitled', 'Untitled data flow')} (${description.output})`
	      })
	    })

	  if (selected && !options.some((option) => option.value == selected)) {
	    options.push({
	      value:selected,
	      label:dashboardActionMsg('DashboardActionSavedDataFlow', 'Saved data flow')
	    })
	  }

	  return options
	}
	static outputDataFlowId (){
	  let flow = dataflow.all().find((item) => dataflow.flowInput(item).sourceType == 'bipes')
	  return flow ? flow.id : dataflow.selectedId()
	}

	constructor (dom){
		this.actions = []

		let $ = this.$ = {}
		$.container = new DOM('span')
		dom.append($.container)
	}
	show (sid, obj){
		this.deinit()
		this.init(sid, obj)
	}
	/**
	 * Init setup panel.
	 * @param {Object} data - Plugin to setup.
	 * @param {Object} obj - Grid object.
	 */
	init (data, obj){
	  Actions.normalizeSetup(data)
	  // Generate setup panel
		for (const key in data.setup) {
			let _action = new Action(data.setup[key], data, key, obj)
			if (Object.keys(_action.$).length !== 0){
			  this.actions.push(_action)
			  let $ = this.$
			  $.container.append(_action.$.action)
			} else if (!_action.hidden) {
			  console.log(`Dashboard: When opening setup panel, ${key} was ignored.`)
			}
		}
	}
	deinit (){
		this.actions.forEach((action) => {
			action.$.action.$.remove()
		});
		this.actions = []
	}
	static _getType (plugin, key){
	  let _dict = {
	    'chart': {
	      dataFlowId: 'dropdown',
	      title: 'input',
	      topic: 'input',
	      chartType: 'dropdown',
	      labels: 'input',
	      timeseries: 'switch',
	      limitPoints: 'input',
	      xLabel: 'input',
	      yLabel: 'input'
	    },
	    'stream': {
	      source: 'dropdown',
	      manifest: 'input'
	    },
	    'switch': {
	      dataFlowId: 'dropdown',
	      title: 'input',
	      subtitle: 'input',
	      topic: 'input',
	      messageOn: 'input',
	      messageOff: 'input',
	    },
	    'threeStateSwitch': {
	      dataFlowId: 'dropdown',
	      title: 'input',
	      subtitle: 'input',
	      topic: 'input',
	      label1: 'input', message1: 'input',
	      label2: 'input', message2: 'input',
	      label3: 'input', message3: 'input',
	      defaultState: 'input',
	    },
	    'button': {
	      dataFlowId: 'dropdown',
	      title: 'input',
	      subtitle: 'input',
	      topic: 'input',
	      message: 'input',
	    },
		  'range': {
	      dataFlowId: 'dropdown',
	      title: 'input',
	      subtitle: 'input',
	      topic: 'input',
	      minValue: 'input',
	      maxValue: 'input',
	      step: 'input'
	    },
	    'gauge': {
	      dataFlowId: 'dropdown',
	      title: 'input',
	      subtitle: 'input',
	      topic: 'input',
	      minValue: 'input',
	      maxValue: 'input',
	    },
	    'coordinate': {
	      dataFlowId: 'dropdown',
	      title: 'input',
	      topic: 'input',
	      size: 'dropdown',
	      reach: 'input',
	      minX: 'input',
	      maxX: 'input',
	      minY: 'input',
	      maxY: 'input',
	    },
	    'drawing': {
	      dataFlowId: 'dropdown',
	      title: 'input',
	      filename: 'input',
	      topic: 'input',
	      startMessage: 'input',
	      homeMessage: 'input',
	      size: 'dropdown',
	      reach: 'input',
	      minX: 'input',
	      maxX: 'input',
	      minY: 'input',
	      maxY: 'input',
	    },
	    'mlClassifier': {
	      title: 'input',
	      workspaceId: 'dropdown',
	      dataFlowId: 'dropdown',
	      confidence: 'input',
	      topic: 'input',
	      messageTemplate: 'input',
	      sendMode: 'dropdown'
	    },
	    'visionProcessor': {
	      title: 'input',
	      setupId: 'dropdown',
	      dataFlowId: 'dropdown',
	      autoStart: 'dropdown',
	      debugView: 'dropdown',
	      topic: 'input',
	      messageTemplate: 'input',
	      sendMode: 'dropdown'
	    },
	  }
	  return _dict[plugin][key]
	}
	static visionSetupOptions (selected){
	  let options = vision.getSetups().map((setup) => {
	    return {
	      value:setup.id,
	      label:setup.name
	    }
	  })

	  if (options.length === 0)
	    options.push({value:'current', label:dashboardActionMsg('DashboardActionCurrentVisionSetup', 'Current vision setup')})

	  if (selected && !options.some((option) => option.value == selected)) {
	    options.push({
	      value:selected,
	      label:dashboardActionMsg('DashboardActionSavedVisionSetup', 'Saved vision setup (not loaded)')
	    })
	  }

	  return options
	}
	static mlWorkspaceOptions (selected){
	  let options = [{value:'', label:dashboardActionMsg('DashboardActionChooseModel', 'Choose model')}]
	  Object.keys(ml.tree || {}).forEach((workspaceId) => {
	    let workspace = ml.tree[workspaceId]
	    let suffix = workspace.kind ? ` (${workspace.kind})` : ''
	    options.push({
	      value: workspaceId,
	      label: `${workspace.name || dashboardActionMsg('MLModelFallback', 'ML model')}${suffix}`
	    })
	  })

	  if (selected && !options.some((option) => option.value == selected)) {
	    options.push({
	      value:selected,
	      label:dashboardActionMsg('DashboardActionSavedModel', 'Saved model (not loaded)')
	    })
	  }

	  return options
	}
	static deviceOptions (selected){
	  let options = [
	    {value:'active', label:dashboardActionMsg('DashboardActionActiveDevice', 'Active device')},
	    {value:'all', label:dashboardActionMsg('DashboardActionAllConnectedDevices', 'All connected devices')}
	  ]
	  let devices = window.bipes && bipes.page && bipes.page.device && bipes.page.device.devices ?
	    bipes.page.device.devices : []
	  let known = ['active', 'all']

	  devices.forEach((device) => {
	    if (!channel.hasConnection(device.uid))
	      return

	    known.push(device.uid)
	    options.push({
	      value: device.uid,
	      label: formatDeviceOptionLabel(device, 'Device')
	    })
	  })

	  Object.keys(channel.connections || {}).forEach((uid) => {
	    if (known.includes(uid))
	      return

	    options.push({
	      value: uid,
	      label: dashboardActionMsg('DashboardActionConnectedDevice', 'Connected device {0}', options.length - 1)
	    })
	  })

	  return options
	}
	static isGuestMode (){
	  return !document.getElementById('user-info')
	}
	static dataSourceOptions (){
	  return Actions.isGuestMode() ? ['Console'] : ['Console', 'EasyMQTT']
	}
	static dataTargetOptions (){
	  return Actions.isGuestMode() ? ['Console'] : ['EasyMQTT', 'Console']
	}
	static consoleFirstTargetOptions (){
	  return Actions.isGuestMode() ? ['Console'] : ['Console', 'EasyMQTT']
	}
	static sanitizeGuestSetup (data){
	  if (!Actions.isGuestMode())
	    return

	  if (data.setup.source === 'EasyMQTT')
	    data.setup.source = 'Console'
	  if (data.setup.target === 'EasyMQTT')
	    data.setup.target = 'Console'
	}
	static normalizeSetup (data){
	  let defu = Actions.defaults(data.type)
	  let setup = data.setup || {}
	  let normalized = {}

	  Object.keys(defu).forEach((key) => {
	    normalized[key] = Object.prototype.hasOwnProperty.call(setup, key) ?
	      setup[key] : defu[key]
	  })

	  data.setup = normalized
	  Actions.applyDataFlowSetup(data)
	  if (data.setup.hasOwnProperty('targetDevice') && !isLiveSelectableDevice(data.setup.targetDevice, 'device'))
	    data.setup.targetDevice = defu.targetDevice || 'active'
	  if (data.setup.hasOwnProperty('sourceDevice') && !isLiveSelectableDevice(data.setup.sourceDevice, 'any'))
	    data.setup.sourceDevice = defu.sourceDevice || ''
	  Actions.sanitizeGuestSetup(data)
	}
	static applyDataFlowSetup (data){
	  if (!data || (data.type != 'mlClassifier' && data.type != 'visionProcessor'))
	    return

	  let flow = data.setup.dataFlowId ? dataflow.get(data.setup.dataFlowId) : null
	  if (!flow)
	    return
	  let input = dataflow.flowInput(flow)
	  if (input.sourceType == 'bipes')
	    return

	  if (input.sourceType == 'webcam') {
	    data.setup.source = 'Webcam'
	  } else if (input.sourceType == 'device') {
	    if (input.transport == 'websocket') {
	      data.setup.source = 'Image URL'
	      data.setup.imageUrl = input.url || data.setup.imageUrl || ''
	    } else {
	      data.setup.source = 'Source device'
	      data.setup.sourceDevice = input.deviceUid || data.setup.sourceDevice || ''
	    }
	    data.setup.triggerMode = input.mode == 'stream' ? 'interval' : 'newImage'
	    data.setup.streamFps = input.fps || data.setup.streamFps || 4
	  }
	}
	static defaults (plugin){
	  switch (plugin){
	    case 'stream':
	      return {
	        source:'DASH',
	        manifest: 'https://livesim.dashif.org/livesim/chunkdur_1/ato_7/testpic4_8s/Manifest300.mpd'
	      }
	      break
	    case 'chart':
	      return {
	        dataFlowId: dataflow.selectedId(),
          source: Actions.isGuestMode() ? 'Console' : 'EasyMQTT',
          title: '',
          topic:'data',
          chartType: 'line',
          labels: 'Variable 1, Variable 2',
          limitPoints: 100,
          xLabel: '',
          yLabel: '',
          timeseries: false
        }
	      break
	    case 'switch':
	      return {
	        dataFlowId: Actions.outputDataFlowId(),
	        target: Actions.isGuestMode() ? 'Console' : 'EasyMQTT',
	        targetDevice: 'active',
	        title: dashboardActionMsg('DashboardDefaultClick', 'Click'),
	        subtitle: dashboardActionMsg('DashboardDefaultMe', 'Me'),
	        topic: 'button',
	        messageOn: 'turn_on',
	        messageOff: 'turn_off',
	        }
	      break
	    case 'threeStateSwitch':
	      return {
	        dataFlowId: Actions.outputDataFlowId(),
	        target: Actions.isGuestMode() ? 'Console' : 'EasyMQTT',
	        targetDevice: 'active',
	        title: dashboardActionMsg('DashboardDefaultMode', 'Mode'),
	        subtitle: dashboardActionMsg('DashboardDefaultChoose', 'Choose'),
	        topic: 'mode',
	        label1: dashboardActionMsg('DashboardActionOff', 'Off'),
	        message1: 'off',
	        label2: dashboardActionMsg('DashboardDefaultAuto', 'Auto'),
	        message2: 'auto',
	        label3: dashboardActionMsg('DashboardActionOn', 'On'),
	        message3: 'on',
	        defaultState: 0,
	        }
	      break
	    case 'button':
	      return {
	        dataFlowId: Actions.outputDataFlowId(),
	        target: Actions.isGuestMode() ? 'Console' : 'EasyMQTT',
	        targetDevice: 'active',
	        title: dashboardActionMsg('DashboardDefaultPush', 'Push'),
	        subtitle: dashboardActionMsg('DashboardDefaultMe', 'Me'),
	        topic: 'button',
	        message: 'pressed',
	        }
	      break
	    case 'range':
	      return {
	        dataFlowId: Actions.outputDataFlowId(),
	        target: Actions.isGuestMode() ? 'Console' : 'EasyMQTT',
	        targetDevice: 'active',
	        title: dashboardActionMsg('DashboardDefaultRange', 'Range'),
	        subtitle: dashboardActionMsg('DashboardDefaultDescription', 'Description'),
	        topic: 'range',
	        minValue: 0,
	        maxValue: 100,
	        step: 1
	        }
	      break
	    case 'gauge':
	      return {
          dataFlowId: dataflow.selectedId(),
          source: Actions.isGuestMode() ? 'Console' : 'EasyMQTT',
	        title: dashboardActionMsg('DashboardDefaultGauge', 'Gauge'),
	        subtitle: dashboardActionMsg('DashboardDefaultUnit', 'Unit'),
	        topic: 'gauge',
	        minValue: 0,
	        maxValue: 100
	        }
	      break
	    case 'coordinate':
	      return {
          dataFlowId: Actions.outputDataFlowId(),
          target: 'Console',
	        targetDevice: 'active',
	        title: dashboardActionMsg('DashboardDefaultCoordinate', 'Coordinate'),
	        topic: 'move',
	        size: 'large',
	        reach: 0,
	        minX: -100,
	        maxX: 100,
	        minY: -100,
	        maxY: 100
	        }
	      break
	    case 'drawing':
	      return {
          dataFlowId: Actions.outputDataFlowId(),
          target: 'Console',
	        targetDevice: 'active',
	        title: dashboardActionMsg('DashboardDefaultDrawing', 'Drawing'),
	        filename: 'drawing.gcode',
	        topic: 'drawing',
	        startMessage: 'start',
	        homeMessage: 'home',
	        size: 'large',
	        reach: 0,
	        minX: -100,
	        maxX: 100,
	        minY: -100,
	        maxY: 100
	        }
	      break
	    case 'mlClassifier':
	      return {
	        target: 'Console',
	        title: dashboardActionMsg('MLClassifierTitle', 'ML Classifier'),
	        workspaceId: ml.selectedModelId || '',
	        dataFlowId: dataflow.selectedId(),
	        source: 'Webcam',
	        sourceDevice: '',
	        triggerMode: 'interval',
	        intervalMs: 1000,
	        streamFps: 4,
	        imageUrl: '',
	        confidence: 0.65,
	        topic: 'ml',
	        messageTemplate: '{label}',
	        sendMode: 'changed'
	        }
	      break
	    case 'visionProcessor':
	      return {
	        target: 'Console',
	        title: dashboardActionMsg('VisionProcessorTitle', 'Vision Processor'),
	        setupId: 'current',
	        dataFlowId: dataflow.selectedId(),
	        source: 'Image URL',
	        sourceDevice: '',
	        triggerMode: 'newImage',
	        intervalMs: 1000,
	        streamFps: 4,
	        imageUrl: '',
	        inputSources: '{}',
	        autoStart: 'true',
	        debugView: 'true',
	        topic: 'vision',
	        messageTemplate: '{state}',
	        sendMode: 'changed'
	        }
	      break
	  }
	}

	static dict (plugin, key){
	  let _dict = {
	    'chart': {
	      dataFlowId: [dashboardActionMsg('DataFlowUse', 'Data flow'), Actions.dataFlowOptions],
	      topic: dashboardActionMsg('DashboardActionTopic', 'Topic'),
	      chartType: [dashboardActionMsg('DashboardActionChartType', 'Chart type'), ['line','scatter','bar','pie','radar']],
	      title: dashboardActionMsg('DashboardActionTitle', 'Title'),
	      source: [dashboardActionMsg('DashboardActionCommunicationMethod', 'Communication method'), Actions.dataSourceOptions],
	      labels: dashboardActionMsg('DashboardActionLabels', 'Labels'),
	      timeseries: dashboardActionMsg('DashboardActionUnixTimestamp', 'Is Unix timestamp'),
	      limitPoints: dashboardActionMsg('DashboardActionLimitPoints', 'Limit to last datapoints'),
	      xLabel: dashboardActionMsg('DashboardActionXAxisLabel', 'x-axis label'),
	      yLabel: dashboardActionMsg('DashboardActionYAxisLabel', 'y-axis label')
	    },
	    'stream': {
	      source: [dashboardActionMsg('DashboardActionStandard', 'Standard'), ["MJPEG","DASH"]],
	      manifest: dashboardActionMsg('DashboardActionManifestAddress', 'Manifest address')
	    },
	    'switch': {
	      dataFlowId: [dashboardActionMsg('DataFlowUse', 'Data flow'), Actions.outputDataFlowOptions],
	      target: [dashboardActionMsg('DashboardActionCommunicationMethod', 'Communication method'), Actions.dataTargetOptions],
	      targetDevice: [dashboardActionMsg('DashboardActionTargetDevice', 'Target device'), Actions.deviceOptions],
	      title: dashboardActionMsg('DashboardActionTitle', 'Title'),
	      subtitle: dashboardActionMsg('DashboardActionSubtitle', 'Subtitle'),
	      topic: dashboardActionMsg('DashboardActionTopic', 'Topic'),
	      messageOn: dashboardActionMsg('DashboardActionSwitchOnMessage', 'Switch on message'),
	      messageOff: dashboardActionMsg('DashboardActionSwitchOffMessage', 'Switch off message')
	    },
	    'threeStateSwitch': {
	      dataFlowId: [dashboardActionMsg('DataFlowUse', 'Data flow'), Actions.outputDataFlowOptions],
	      target: [dashboardActionMsg('DashboardActionCommunicationMethod', 'Communication method'), Actions.dataTargetOptions],
	      targetDevice: [dashboardActionMsg('DashboardActionTargetDevice', 'Target device'), Actions.deviceOptions],
	      title: dashboardActionMsg('DashboardActionTitle', 'Title'),
	      subtitle: dashboardActionMsg('DashboardActionSubtitle', 'Subtitle'),
	      topic: dashboardActionMsg('DashboardActionTopic', 'Topic'),
	      label1: dashboardActionMsg('DashboardActionStateLabel', 'State 1 label'),
	      message1: dashboardActionMsg('DashboardActionStateMessage', 'State 1 message'),
	      label2: dashboardActionMsg('DashboardActionStateLabel', 'State 2 label'),
	      message2: dashboardActionMsg('DashboardActionStateMessage', 'State 2 message'),
	      label3: dashboardActionMsg('DashboardActionStateLabel', 'State 3 label'),
	      message3: dashboardActionMsg('DashboardActionStateMessage', 'State 3 message'),
	      defaultState: dashboardActionMsg('DashboardActionDefaultState', 'Default state (0-based index)')
	    },
	    'button': {
	      dataFlowId: [dashboardActionMsg('DataFlowUse', 'Data flow'), Actions.outputDataFlowOptions],
	      target: [dashboardActionMsg('DashboardActionCommunicationMethod', 'Communication method'), Actions.dataTargetOptions],
	      targetDevice: [dashboardActionMsg('DashboardActionTargetDevice', 'Target device'), Actions.deviceOptions],
	      title: dashboardActionMsg('DashboardActionTitle', 'Title'),
	      subtitle: dashboardActionMsg('DashboardActionSubtitle', 'Subtitle'),
	      topic: dashboardActionMsg('DashboardActionTopic', 'Topic'),
	      message: dashboardActionMsg('DashboardActionMessage', 'Message'),
	    },
	    'range': {
	      dataFlowId: [dashboardActionMsg('DataFlowUse', 'Data flow'), Actions.outputDataFlowOptions],
	      target: [dashboardActionMsg('DashboardActionCommunicationMethod', 'Communication method'), Actions.dataTargetOptions],
	      targetDevice: [dashboardActionMsg('DashboardActionTargetDevice', 'Target device'), Actions.deviceOptions],
	      title: dashboardActionMsg('DashboardActionTitle', 'Title'),
	      subtitle: dashboardActionMsg('DashboardActionSubtitle', 'Subtitle'),
	      topic: dashboardActionMsg('DashboardActionTopic', 'Topic'),
	      minValue: dashboardActionMsg('DashboardActionLowerBound', 'Lower bound'),
	      maxValue: dashboardActionMsg('DashboardActionUpperBound', 'Upper bound'),
	      step: dashboardActionMsg('DashboardActionStep', 'Step')
	    },
	    'gauge': {
	      dataFlowId: [dashboardActionMsg('DataFlowUse', 'Data flow'), Actions.dataFlowOptions],
	      source: [dashboardActionMsg('DashboardActionCommunicationMethod', 'Communication method'), Actions.dataSourceOptions],
	      title: dashboardActionMsg('DashboardActionTitle', 'Title'),
	      subtitle: dashboardActionMsg('DashboardActionSubtitle', 'Subtitle'),
	      topic: dashboardActionMsg('DashboardActionTopic', 'Topic'),
	      minValue: dashboardActionMsg('DashboardActionLowerBound', 'Lower bound'),
	      maxValue: dashboardActionMsg('DashboardActionUpperBound', 'Upper bound')
	    },
	    'coordinate': {
	      dataFlowId: [dashboardActionMsg('DataFlowUse', 'Data flow'), Actions.outputDataFlowOptions],
	      target: [dashboardActionMsg('DashboardActionCommunicationMethod', 'Communication method'), Actions.consoleFirstTargetOptions],
	      targetDevice: [dashboardActionMsg('DashboardActionTargetDevice', 'Target device'), Actions.deviceOptions],
	      title: dashboardActionMsg('DashboardActionTitle', 'Title'),
	      topic: dashboardActionMsg('DashboardActionTopic', 'Topic'),
	      size: [dashboardActionMsg('DashboardActionSize', 'Size'), ['small', 'medium', 'large']],
	      reach: dashboardActionMsg('DashboardActionReachRadius', 'Reach radius (0=off)'),
	      minX: 'Min X',
	      maxX: 'Max X',
	      minY: 'Min Y',
	      maxY: 'Max Y'
	    },
	    'drawing': {
	      dataFlowId: [dashboardActionMsg('DataFlowUse', 'Data flow'), Actions.outputDataFlowOptions],
	      target: [dashboardActionMsg('DashboardActionCommunicationMethod', 'Communication method'), Actions.consoleFirstTargetOptions],
	      targetDevice: [dashboardActionMsg('DashboardActionTargetDevice', 'Target device'), Actions.deviceOptions],
	      title: dashboardActionMsg('DashboardActionTitle', 'Title'),
	      filename: dashboardActionMsg('DashboardActionGcodeFilename', 'G-code filename'),
	      topic: dashboardActionMsg('DashboardActionTopic', 'Topic'),
	      startMessage: dashboardActionMsg('DashboardActionStartMessage', 'Start message'),
	      homeMessage: dashboardActionMsg('DashboardActionHomeMessage', 'Home message'),
	      size: [dashboardActionMsg('DashboardActionSize', 'Size'), ['small', 'medium', 'large']],
	      reach: dashboardActionMsg('DashboardActionReachRadius', 'Reach radius (0=off)'),
	      minX: 'Min X',
	      maxX: 'Max X',
	      minY: 'Min Y',
	      maxY: 'Max Y'
	    },
	    'mlClassifier': {
	      title: dashboardActionMsg('DashboardActionTitle', 'Title'),
	      workspaceId: [dashboardActionMsg('DashboardActionMLModel', 'ML model'), Actions.mlWorkspaceOptions],
	      dataFlowId: [dashboardActionMsg('DataFlowUse', 'Data flow'), Actions.dataFlowOptions],
	      source: [dashboardActionMsg('DashboardActionImageSource', 'Image source'), Actions.imageSourceOptions],
	      sourceDevice: [dashboardActionMsg('DashboardActionSourceDevice', 'Source device'), Actions.sourceDeviceOptions],
	      imageUrl: 'Image URL',
	      inputSources: dashboardActionMsg('DashboardActionVisionInputSources', 'Input source routing JSON'),
	      intervalMs: dashboardActionMsg('DashboardActionPredictionInterval', 'Prediction interval (ms)'),
	      streamFps: dashboardActionMsg('DashboardActionStreamFps', 'Streaming FPS'),
	      triggerMode: [dashboardActionMsg('DashboardActionInputTrigger', 'Input trigger'), [
	        {value:'interval', label:dashboardActionMsg('DashboardActionStreaming', 'Streaming')},
	        {value:'newImage', label:dashboardActionMsg('DashboardActionRequest', 'Request')}
	      ]],
	      confidence: dashboardActionMsg('DashboardActionConfidenceThreshold', 'Confidence threshold (0-1)'),
	      target: [dashboardActionMsg('DashboardActionCommunicationMethod', 'Communication method'), Actions.consoleFirstTargetOptions],
	      topic: dashboardActionMsg('DashboardActionCommandTopic', 'Command/topic'),
	      messageTemplate: dashboardActionMsg('DashboardActionMessageTemplate', 'Message template'),
	      sendMode: [dashboardActionMsg('DashboardActionSendMode', 'Send mode'), [
	        {value:'changed', label:dashboardActionMsg('DashboardActionWhenLabelChanges', 'When label changes')},
	        {value:'everyPrediction', label:dashboardActionMsg('DashboardActionEveryPrediction', 'Every prediction')},
	        {value:'manual', label:dashboardActionMsg('DashboardActionManualOnly', 'Manual only')}
	      ]]
	    },
	    'visionProcessor': {
	      title: dashboardActionMsg('DashboardActionTitle', 'Title'),
	      setupId: ["Vision setup", Actions.visionSetupOptions],
	      dataFlowId: [dashboardActionMsg('DataFlowUse', 'Data flow'), Actions.dataFlowOptions],
	      source: [dashboardActionMsg('DashboardActionImageSource', 'Image source'), Actions.imageSourceOptions],
	      sourceDevice: [dashboardActionMsg('DashboardActionSourceDevice', 'Source device'), Actions.sourceDeviceOptions],
	      imageUrl: 'Image URL',
	      intervalMs: dashboardActionMsg('DashboardActionPredictionInterval', 'Prediction interval (ms)'),
	      streamFps: dashboardActionMsg('DashboardActionStreamFps', 'Streaming FPS'),
	      triggerMode: [dashboardActionMsg('DashboardActionInputTrigger', 'Input trigger'), [
	        {value:'interval', label:dashboardActionMsg('DashboardActionStreaming', 'Streaming')},
	        {value:'newImage', label:dashboardActionMsg('DashboardActionRequest', 'Request')}
	      ]],
	      autoStart: [dashboardActionMsg('DashboardActionAutoStart', 'Auto start'), [
	        {value:'true', label:dashboardActionMsg('DashboardActionOn', 'On')},
	        {value:'false', label:dashboardActionMsg('DashboardActionOff', 'Off')}
	      ]],
	      debugView: [dashboardActionMsg('DashboardActionDebugView', 'Debug view'), [
	        {value:'true', label:dashboardActionMsg('DashboardActionShow', 'Show')},
	        {value:'false', label:dashboardActionMsg('DashboardActionHide', 'Hide')}
	      ]],
	      target: [dashboardActionMsg('DashboardActionCommunicationMethod', 'Communication method'), Actions.consoleFirstTargetOptions],
	      topic: dashboardActionMsg('DashboardActionCommandTopic', 'Command/topic'),
	      messageTemplate: dashboardActionMsg('DashboardActionMessageTemplate', 'Message template'),
	      sendMode: [dashboardActionMsg('DashboardActionSendMode', 'Send mode'), [
	        {value:'changed', label:dashboardActionMsg('DashboardActionWhenDetectionChanges', 'When detection changes')},
	        {value:'everyPrediction', label:dashboardActionMsg('DashboardActionEveryResult', 'Every result')},
	        {value:'manual', label:dashboardActionMsg('DashboardActionManualOnly', 'Manual only')}
	      ]]
	    },
	  }
	  return _dict[plugin][key]
	}
}
class Action {
	constructor (action, data, key, obj){
	  this.plugin = data.type
	  this.key = key
	  this.sid = data.sid
	  this.dom = data.target
	  this.hidden = false

		let $ = this.$ = {}
		let dataFlowOwnedKeys = {
		  chart:['source'],
		  switch:['target', 'targetDevice'],
		  threeStateSwitch:['target', 'targetDevice'],
		  button:['target', 'targetDevice'],
		  range:['target', 'targetDevice'],
		  gauge:['source'],
		  coordinate:['target', 'targetDevice'],
		  drawing:['target', 'targetDevice'],
		  mlClassifier:['target', 'targetDevice', 'source', 'sourceDevice', 'imageUrl', 'inputSources', 'intervalMs', 'streamFps', 'triggerMode'],
		  visionProcessor:['target', 'targetDevice', 'source', 'sourceDevice', 'imageUrl', 'inputSources', 'intervalMs', 'streamFps', 'triggerMode', 'executionMode']
		}
		if ((dataFlowOwnedKeys[data.type] || []).includes(key)) {
		  this.hidden = true
		  return
		}
		if (key.endsWith('DeviceRef')) {
		  this.hidden = true
		  return
		}
		if (
		  data.setup.dataFlowId &&
		  (data.type == 'mlClassifier' || data.type == 'visionProcessor') &&
		  ['source', 'sourceDevice', 'imageUrl', 'inputSources', 'triggerMode', 'intervalMs', 'streamFps'].includes(key)
		) {
		  this.hidden = true
		  return
		}

		if (
		  key == 'imageUrl' &&
		  (
		    (data.type == 'mlClassifier' || data.type == 'visionProcessor') &&
		    data.setup.source != 'Image URL'
		  )
		) {
		  this.hidden = true
		  return
		}

		if (
		  key == 'sourceDevice' &&
		  (
		    (data.type == 'mlClassifier' || data.type == 'visionProcessor') &&
		    data.setup.source != 'Source device'
		  )
		) {
		  this.hidden = true
		  return
		}

		if (
		  key == 'intervalMs' &&
		  (
		    (data.type == 'mlClassifier' || data.type == 'visionProcessor') &&
		    (
		      data.setup.triggerMode != 'interval' ||
		      data.setup.source == 'Source device'
		    )
		  )
		) {
		  this.hidden = true
		  return
		}

		if (
		  key == 'streamFps' &&
		  (
		    (data.type == 'mlClassifier' || data.type == 'visionProcessor') &&
		    (
		      data.setup.triggerMode != 'interval' ||
		      data.setup.source != 'Source device'
		    )
		  )
		) {
		  this.hidden = true
		  return
		}

		switch (Actions._getType(data.type, key)) {
			case 'button':
				$.action = new DOM('div', {className:'button'})
				$.button = new DOM('button', {innerText:Actions.dict(this.plugin,key), className:'noicon'})
					.onclick(this, this.do, [action.request])
				$.action.append($.button)
				break
			case 'input':
				$.action = new DOM('div', {className:'input'})
				$.span = new DOM('span', {innerText:Actions.dict(this.plugin,key)})
				$.input = new DOM('input', {value:action})
				  .onchange(this, this.input, [obj, data])
				$.action.append([$.span, $.input])
				break
			case 'switch':
				$.action = new DOM('div', {
				  className:action ? 'switch on' : 'switch'
				})
				$.button = new DOM('button', {
				  innerText:Actions.dict(this.plugin,key),
				  className:'noicon'
				})
					.onclick(this, this.switch, [obj, data])
				$.action.append($.button)
				break
			case 'dropdown':
			  let source = Actions.dict(this.plugin,key),
			    options = typeof source[1] == 'function' ? source[1](action) : source[1],
			    index = 0;
			  for (let i = 0; i < options.length; i++){
			    let optionValue = typeof options[i] == 'object' ? options[i].value : options[i]
			    if (optionValue == action) {
			      index = i
			      break
			    }
			  }
				$.action = new DOM('div', {className:'dropdown'})
				$.span = new DOM('span', {innerText:source[0]})

				$.dropdown = new DOM('select')
				  .onchange(this, this.dropdown, [obj, data])
				options.forEach((item) => {
		      let optionValue = typeof item == 'object' ? item.value : item,
		        optionLabel = typeof item == 'object' ? item.label : item
		      $.dropdown.append(new DOM('option', {value:optionValue, innerText:optionLabel}))
        })
				$.action.append([$.span, $.dropdown])
				$.dropdown.$.selectedIndex = index
				break
		}
	}
  switch (obj, data) {
      data.setup.timeseries = !data.setup.timeseries
			this.$.action.$.className = data.setup.timeseries ? 'switch on' : 'switch'

			switch(this.plugin){
			  case 'chart':
			    switch (this.key){
			      case 'timeseries':
			        bipes.page.dashboard.commit()
          		Charts.regen(obj.charts, data)
          		break
          }
      }
  }
	input (obj, data) {
			let str = String(this.$.input.$.value)
			switch(this.plugin){
			  case 'chart':
			    switch (this.key){
			      case 'topic':
			      case 'title':
			      case 'labels':
			      case 'xLabel':
			      case 'yLabel':
			      case 'limitPoints':
              data.setup[this.key] = str
          		Charts.regen(obj.charts, data)
              bipes.page.dashboard.commit()
			        break
			    break
			  }
			  case 'stream':
			    switch (this.key){
			      case 'manifest':
              data.setup.manifest = str
          		Streams.manifest(obj, data)
              bipes.page.dashboard.commit()
              break
		    }
	      case 'switch':
			    switch (this.key){
			      case 'title':
			      case 'subtitle':
			      case 'topic':
			      case 'messageOn':
			      case 'messageOff':
              data.setup[this.key] = str
          		Switches.regen(obj, data)
              bipes.page.dashboard.commit()
			        break
			    break
			  }
	      case 'threeStateSwitch':
			    switch (this.key){
			      case 'title':
			      case 'subtitle':
			      case 'topic':
			      case 'label1': case 'message1':
			      case 'label2': case 'message2':
			      case 'label3': case 'message3':
			      case 'defaultState':
              data.setup[this.key] = str
              ThreeStateSwitches.regen(obj, data)
              bipes.page.dashboard.commit()
			        break
			    break
			  }
	      case 'button':
			    switch (this.key){
			      case 'title':
			      case 'subtitle':
			      case 'topic':
			      case 'message':
              data.setup[this.key] = str
              Buttons.regen(obj, data)
              bipes.page.dashboard.commit()
			        break
			    break
			  }
	      case 'range':
			    switch (this.key){
			      case 'title':
			      case 'subtitle':
			      case 'topic':
			      case 'minValue':
			      case 'maxValue':
			      case 'step':
              data.setup[this.key] = str
          		Ranges.regen(obj, data)
              bipes.page.dashboard.commit()
			        break
			    break
			  }
	      case 'gauge':
			    switch (this.key){
			      case 'title':
			      case 'subtitle':
			      case 'topic':
			      case 'source':
			      case 'minValue':
			      case 'maxValue':
              data.setup[this.key] = str
          		Gauges.regen(obj, data)
              bipes.page.dashboard.commit()
			        break
			    break
			  }
	      case 'coordinate':
			    switch (this.key){
			      case 'title':
			      case 'topic':
			      case 'reach':
			      case 'minX':
			      case 'maxX':
			      case 'minY':
			      case 'maxY':
              data.setup[this.key] = str
          		Coordinates.regen(obj, data)
              bipes.page.dashboard.commit()
			        break
			    break
			  }
	      case 'drawing':
			    switch (this.key){
			      case 'title':
			      case 'filename':
			      case 'topic':
			      case 'startMessage':
			      case 'homeMessage':
			      case 'reach':
			      case 'minX':
			      case 'maxX':
			      case 'minY':
			      case 'maxY':
              data.setup[this.key] = str
          		Drawings.regen(obj, data)
              bipes.page.dashboard.commit()
			        break
			    break
			  }
		  case 'mlClassifier':
			    switch (this.key){
			      case 'title':
			      case 'sourceDevice':
			      case 'imageUrl':
			      case 'intervalMs':
			      case 'streamFps':
			      case 'confidence':
			      case 'topic':
			      case 'messageTemplate':
              data.setup[this.key] = str
              MLClassifiers.regen(obj, data)
              bipes.page.dashboard.commit()
			        break
			    break
			  }
		  case 'visionProcessor':
			    switch (this.key){
			      case 'title':
			      case 'sourceDevice':
			      case 'imageUrl':
			      case 'inputSources':
			      case 'intervalMs':
			      case 'streamFps':
			      case 'topic':
			      case 'messageTemplate':
              data.setup[this.key] = str
              VisionProcessors.regen(obj, data)
              bipes.page.dashboard.commit()
			        break
			    break
			  }
			}
	}
	dropdown (obj, data) {
		let str = String(this.$.dropdown.$.value)
		switch(this.plugin){
		  case 'chart':
		    switch (this.key){
		      case 'dataFlowId':
            data.setup.dataFlowId = str
            Charts.regen(obj.charts, data)
            bipes.page.dashboard.commit()
            break
		      case 'source':
            data.setup.source = str,
        		Charts.regen(obj.charts, data)
            bipes.page.dashboard.commit()
        		break
		      case 'chartType':
            data.setup.chartType = str
        		Charts.regen(obj.charts, data)
            bipes.page.dashboard.commit()
		        break
   		}
		  case 'switch':
		    switch (this.key){
		      case 'dataFlowId':
		      case 'target':
		      case 'targetDevice':
            data.setup[this.key] = str,
        		Switches.regen(obj, data),
            bipes.page.dashboard.commit()
        		break
   		}
		  case 'threeStateSwitch':
		    switch (this.key){
		      case 'dataFlowId':
		      case 'target':
		      case 'targetDevice':
            data.setup[this.key] = str
            ThreeStateSwitches.regen(obj, data)
            bipes.page.dashboard.commit()
            break
        }
		  case 'button':
		    switch (this.key){
		      case 'dataFlowId':
		      case 'target':
		      case 'targetDevice':
            data.setup[this.key] = str,
            Buttons.regen(obj, data),
            bipes.page.dashboard.commit()
            break
        }
   		case 'stream':
   		  switch (this.key){
   		    case 'source':
            data.setup.source = str
            Streams.regen(obj, data)
            bipes.page.dashboard.commit()
            break
   		}
		  case 'range':
		    switch (this.key){
		      case 'dataFlowId':
		      case 'target':
		      case 'targetDevice':
            data.setup[this.key] = str,
        		Ranges.regen(obj, data),
            bipes.page.dashboard.commit()
        		break
   		}
		  case 'gauge':
		    switch (this.key){
		      case 'dataFlowId':
            data.setup.dataFlowId = str
            Gauges.regen(obj, data)
            bipes.page.dashboard.commit()
            break
		      case 'source':
            data.setup.source = str,
        		Gauges.regen(obj, data),
            bipes.page.dashboard.commit()
        		break
   		}
		  case 'coordinate':
		    switch (this.key){
		      case 'dataFlowId':
		      case 'target':
		      case 'targetDevice':
            data.setup[this.key] = str
        		Coordinates.regen(obj, data)
            bipes.page.dashboard.commit()
        		break
		      case 'size':
            data.setup.size = str
            Coordinates.resize(obj, data)
            bipes.page.dashboard.commit()
        		break
   		}
		  case 'drawing':
		    switch (this.key){
		      case 'dataFlowId':
		      case 'target':
		      case 'targetDevice':
            data.setup[this.key] = str
        		Drawings.regen(obj, data)
            bipes.page.dashboard.commit()
        		break
		      case 'size':
            data.setup.size = str
            Drawings.resize(obj, data)
            bipes.page.dashboard.commit()
        		break
   		}
		  case 'mlClassifier':
		    switch (this.key){
		      case 'dataFlowId':
		      case 'workspaceId':
		      case 'source':
		      case 'sourceDevice':
		      case 'triggerMode':
		      case 'target':
		      case 'sendMode':
	            data.setup[this.key] = str
	            MLClassifiers.regen(obj, data)
	            bipes.page.dashboard.commit()
	            if (this.key == 'source' || this.key == 'triggerMode')
	              obj.actions.show(data, obj)
	            break
	        }
		  case 'visionProcessor':
		    switch (this.key){
		      case 'dataFlowId':
		      case 'setupId':
		      case 'source':
		      case 'sourceDevice':
		      case 'triggerMode':
		      case 'autoStart':
		      case 'debugView':
		      case 'target':
		      case 'sendMode':
	            data.setup[this.key] = str
	            VisionProcessors.regen(obj, data)
	            bipes.page.dashboard.commit()
	            if (this.key == 'source' || this.key == 'triggerMode')
	              obj.actions.show(data, obj)
	            break
	        }
    }
  }

	switchState (request) {
		let switch_ = this.currentValue == 1 ? 0 : 1

	}
}
