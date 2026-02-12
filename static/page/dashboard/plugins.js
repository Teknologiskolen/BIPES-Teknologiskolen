"use strict";

import {DOM} from '../../base/dom.js'
import {Tool} from '../../base/tool.js'
import {channel} from '../../base/channel.js'
import {command} from '../../base/command.js'

import {dataStorage} from './datastorage.js'
import {databaseMQTT} from './easymqtt.js'
import {easyMQTT} from './easymqtt.js'

export {Charts, Streams, Switches, Ranges, Gauges, Coordinates, Drawings}

/** Handle all plugins types */
export const plugins = {
  types:['charts', 'switches', 'ranges', 'gauges', 'coordinates', 'drawings'],
  /** Init plugins */
  init: () => {
  	// Setup chart.js defaults
	  if (Tool.fromUrl('theme') === 'dark'){
      Chart.defaults.color = '#eee'
      Chart.defaults.borderColor = 'rgba(255,255,255,0.1)'
    } else {
      Chart.defaults.color = '#222'
    }
  },
  /**
	 * Deinit plugins.
	 */
	deinit: (grid) => {
		plugins.types.forEach(type => {
		  grid[type].forEach((item) => {
		    item.destroy()
		  })
		  grid[type] = []
		})
	},
  /**
	 * Remove a plugin.
	 * @param {Object} grid - Dashboard grid object.
	 * @param {Object} data - Plugin object.
	 */
  remove: (grid, data) => {
		switch (data.type) {
		  case 'plugin':
		    grid.players.forEach((player, index) => {
			    if (player.sid == data.sid) {
				      if (player.source = 'DASH')
				        player.destroy()
			      grid.players.splice(index,1)
			    }
		    })
		    break
		  case 'chart':
		    grid.charts.forEach((chart, index) => {
		      if (chart.sid == data.sid){
		        chart.destroy()
		        grid.charts.splice(index,1)
		      }
		    })
		    break
		}
  },
  /**
	 * Include a plugin.
	 * @param {Object} grid - Dashboard grid object.
	 * @param {Object} data - Plugin object.
	 * @param {Object} _$ - Object of DOM elements: grab, remove, and silk.
	 */
  include: (grid, data, _$) => {
    // ::TODO:: Remove these patches caused by renames
    if (data.setup.source == 'localStorage')
     data.setup.source = 'Console'
    else if (data.setup.source == 'easyMQTT')
     data.setup.source = 'EasyMQTT'

    switch (data.type) {
      case 'chart':
        Charts.include(grid, data, _$)
        break
      case 'switch':
        Switches.include(grid, data, _$)
        break
      case 'range':
        Ranges.include(grid, data, _$)
        break
      case 'gauge':
        Gauges.include(grid, data, _$)
        break
      case 'coordinate':
        Coordinates.include(grid, data, _$)
        break
      case 'drawing':
        Drawings.include(grid, data, _$)
        break
    }
  },
  /**
	 * Regenerate a plugin.
	 * @param {Object} grid - Dashboard grid object.
	 * @param {Object} data - Plugin object.
	 */
  regen: (obj, data) => {
    switch (data.type) {
      case 'chart':
        Charts.regen(obj, data)
        break
    }
  }
}

/** Chart plugin, powered by chart.js */
class Charts {
  constructor (){}
  static chart (data, dom) {
    let data2
    switch (data.setup.source) {
      case 'Console':
		    data2 = dataStorage.chartData(data.setup.topic, data)
		    break
		  case 'EasyMQTT':
		    // Include dummy if not exist
		    if (!databaseMQTT._inited)
		      return {
		        sid:data.sid,
            topic:data.setup.topic,
            source:data.setup.source,
            destroy:()=>{}
          }
        data2 = databaseMQTT.chartData(data.setup.topic, data)
        break
	    }

    let options = {
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                      position: 'top'
                    }
                  },
                scales: {},
                animation: {
                  duration: 0
                },
                resizeDelay: 125
              }

    if (data.setup.title != '')
      options.plugins.title = {display: true, text: data.setup.title, font: {size: 14}}

    if (data.setup.timeseries)
      options.scales.xAxes = {type: 'time', distribution: 'linear'}

    if (data.setup.xLabel != '')
      options.scales.x = {display: true, title:{display: true, text: data.setup.xLabel}}
    if (data.setup.yLabel != '')
      options.scales.y = {beginAtZero: true, display: true, title:{display: true, text: data.setup.yLabel}}
    else
      options.scales.y = {beginAtZero: true}

    let _chart = new Chart(dom.$, {
            type: data.setup.chartType,
            data: data2,
            options: options,
      })
    _chart.sid = data.sid
    _chart.topic = data.setup.topic
    _chart.source = data.setup.source
    let limitPoints = parseInt(data.setup.limitPoints)
    if (!isNaN(limitPoints))
        _chart.limitPoints = limitPoints

    return _chart
  }
  /**
	 * Regenerate a chart plugin.
	 * @param {Object} grid - Dashboard grid object.
	 * @param {Object} data - Plugin object.
	 */
  static regen (obj, data) {
    for (const index in obj) {
      if (obj[index].sid == data.sid) {
        obj[index].destroy()
        obj[index] = Charts.chart(data, data.target)
      }
    }
  }
  /**
	 * Include a chart plugin.
	 * @param {Object} grid - Dashboard grid object.
	 * @param {Object} data - Plugin object.
	 * @param {Object} _$ - Object of DOM elements: grab, remove, and silk.
	 */
  static include(grid, data, _$){
    data.target = new DOM('canvas', {className:'chart'})
    let content1 = new DOM('div')
	    .append([
	      _$.silk,
	      _$.grab,
		    _$.remove,
		    data.target,
	    ])
	  let container1 = new DOM('div', {sid:data.sid, className:'chart broad'})
	    .append(content1)

    grid.muuri.add(container1.$)

    grid.charts.push(Charts.chart(data, data.target))

    _$.silk.onevent('contextmenu', grid, (ev) => {
      ev.preventDefault()
      DOM.switchState(grid.parent.$.dashboard)
    })
    _$.grab.onclick(grid, grid.edit, [data, container1])
  }
}


class Streams {
  constructor (){}
  static stream (sid, dom) {
    switch (data.setup.source) {
      case 'DASH':
        let _stream1 = dashjs.MediaPlayer().create()
        _stream1.sid = sid
        _stream1.source = 'DASH'
        _stream1.updateSettings({ 'streaming': { 'lowLatencyEnabled': true } })

        _stream1.initialize(dom, data.setup.manifest, true)
        Streams.dashApplyParamenters(_stream1)
        return _stream1
        break
      case 'MJPEG':
        let _stream2 = {
          sid: sid,
          source: "MJPEG",
          attachSource: (src) => {
            dom.src = src
          }
        }
        _stream2.attachSource (data.setup.manifest)
        return _stream2
        break
    }

  }
  static regen (obj, setup, sid, dom) {
    for (const index in obj.players) {
      if (obj.players[index].sid == sid) {
        if (obj.players[index].source == "DASH")
          obj.players[index].destroy()
        obj.players[index] = Streams.stream(sid, dom)
      }
    }
  }
  static manifest (obj, setup, sid) {
    for (const index in obj.players) {
      if (obj.players[index].sid == sid) {
        switch (obj.players[index].source) {
          case "DASH":
          case "MJPEG":
            obj.players[index].attachSource(setup.manifest)
            obj.players[index].sid = sid
            break
        }
      }
    }
  }
  	/*REVIEW*/
	static dashApplyParamenters (player){
        let targetLatency = parseFloat(10, 10);
        let minDrift = parseFloat(0.05, 10);
        let catchupPlaybackRate = parseFloat(0.05, 10);
        let liveCatchupLatencyThreshold = parseFloat(60, 10);

		player.updateSettings({
            streaming: {
                delay: {
                    liveDelay: targetLatency
                },
                liveCatchup: {
                    minDrift: minDrift,
                    playbackRate: catchupPlaybackRate,
                    latencyThreshold: liveCatchupLatencyThreshold,
                }
            }
        });
	}
	/*ENDREVIEW*/
}

class Switches {
  constructor (data, dom){
    this.sid = data.sid
    this.dom = dom
    this.target = data.setup.target
    this.topic = data.setup.topic
    this.messageOn = data.setup.messageOn
    this.messageOff = data.setup.messageOff
    this.state = false
  }
  destroy () {
    this.target = undefined
    this.topic = ''
    this.messageOn = ''
    this.messageOff = ''
    this.state = false
    this.dom.removeChilds()

    delete this
  }
  command () {
    if (this.target == 'EasyMQTT'){
      if (!this.state)
        databaseMQTT.client.send(`${easyMQTT.session}/${this.topic}`, this.messageOn, 0, false),
        this.dom.$.classList.add('on')
      else
        databaseMQTT.client.send(`${easyMQTT.session}/${this.topic}`, this.messageOff, 0, false),
        this.dom.$.classList.remove('on')
      this.state = !this.state
    } else if  (this.target == 'Console'){
      if (!this.state)
        command.dispatch(channel, 'push', [
          `${this.topic}(${this.messageOn})\r`,
          channel.targetDevice, [], command.tabUID
        ]),
        this.dom.$.classList.add('on')
      else
        command.dispatch(channel, 'push', [
          `${this.topic}(${this.messageOff})\r`,
          channel.targetDevice, [], command.tabUID
        ]),
        this.dom.$.classList.remove('on')
      this.state = !this.state
    }
  }
  static switch (data, dom) {
    let _Switches = new Switches (data, dom)
    let title = new DOM('h2', {innerText: data.setup.title}),
     subtitle = new DOM('h3', {innerText: data.setup.subtitle})
   dom.onclick(_Switches, _Switches.command)

    dom.append ([
      title,
      subtitle
      ])
    return _Switches
  }
  static regen (obj, data) {
    for (const index in obj.switches) {
      if (obj.switches[index].sid == data.sid) {
        obj.switches[index].destroy ()
        obj.switches[index] = Switches.switch(data, data.target)
      }
    }
  }
  /**
	 * Include a switch plugin.
	 * @param {Object} grid - Dashboard grid object.
	 * @param {Object} data - Plugin object.
	 * @param {Object} _$ - Object of DOM elements: grab, remove, and silk.
	 */
  static include (grid, data, _$){
    data.target = new DOM('button', {className:'press'})
    let content3 = new DOM('div')
      .append([
        //_$.silk,
        _$.grab,
	      _$.remove,
	      data.target,
      ])
    let container3 = new DOM('div', {sid:data.sid, className:'switch tiny'})
      .append(content3)

    grid.muuri.add(container3.$)
    grid.switches.push(Switches.switch(data, data.target))

    data.target.onevent('contextmenu', grid, (ev) => {
      ev.preventDefault()
      DOM.switchState(grid.parent.$.dashboard)
    })
    _$.grab.onclick(grid, grid.edit, [data, container3])
  }
}

class Ranges {
  constructor (data, dom){
    this.sid = data.sid
    this.dom = dom
    this.target = data.setup.target
    this.topic = data.setup.topic
    this.minValue = Number(data.setup.minValue)
    this.maxValue = Number(data.setup.maxValue)
    this.step = Number(data.setup.step)

    this.precision = String(data.setup.step).includes('.') ?
                     data.setup.step.split('.')[1].length : 0
  }
  destroy (){
    this.target = undefined
    this.topic = ''
    this.minValue = undefined
    this.maxValue = undefined
    this.step = undefined
    this.input = undefined
    this.dom.removeChilds()

    delete this
  }
  /**
	 * Set range by sending a MQTT message.
	 * @param {string|Object} _set - "lower" to subtract, "raise" to add and
	 *                                 DOM to set current node value.
	 */
  command (_set){
    if (!['EasyMQTT', 'Console'].includes(this.target))
      return

    let value = this.input.value
    if (_set == 'lower')
      value = Number(this.input.value ) - this.step
    else if (_set == 'raise')
      value = Number(this.input.value) + this.step
    else if (_set instanceof HTMLInputElement)
      value = Number(this.input.value)

    value = value < this.minValue ? this.minValue : value
    value = value > this.maxValue ? this.maxValue : value

    // Round value
    value = Tool.round(value, this.precision)

    this.input.value = value

    if (this.target == 'EasyMQTT'){
      databaseMQTT.client.send(`${easyMQTT.session}/${this.topic}`, String(value), 0, false)
    } else if (this.target == 'Console'){
      command.dispatch(channel, 'push', [
        `${this.topic}(${value})\r`,
        channel.targetDevice, [], command.tabUID
      ])
    }
  }
  static range (data, dom) {
    let _Ranges = new Ranges (data, dom)
    let title = new DOM('h2', {innerText: data.setup.title}),
     subtitle = new DOM('h3', {innerText: data.setup.subtitle})
    _Ranges.input = new DOM('input')
    _Ranges.input.value = (Number(data.setup.maxValue) + Number(data.setup.minValue))/2
    _Ranges.input.onevent('change', _Ranges, _Ranges.command, [_Ranges.input.$])

    dom.append([
        title,
      new DOM('div', {className: 'container'}).append([
        new DOM('button', {id:'lower', className:'icon'})
          .onclick(_Ranges, _Ranges.command, ['lower']),
        _Ranges.input,
        new DOM('button', {id:'raise', className:'icon'})
          .onclick(_Ranges, _Ranges.command, ['raise'])
      ]),
        subtitle
    ])

    return _Ranges
  }
  static regen (obj, data) {
    for (const index in obj.ranges) {
      if (obj.ranges[index].sid == data.sid){
        obj.ranges[index].destroy()
        obj.ranges[index] = Ranges.range(data, data.target)
      }
    }
  }
  /**
	 * Include a range plugin.
	 * @param {Object} grid - Dashboard grid object.
	 * @param {Object} data - Plugin object.
	 * @param {Object} _$ - Object of DOM elements: grab, remove, and silk.
	 */
  static include(grid, data, _$){
    data.target = new DOM('span')
    let content3 = new DOM('div')
      .append([
        //_$.silk,
        _$.grab,
	      _$.remove,
	      data.target,
      ])
    let container3 = new DOM('div', {sid:data.sid, className:'range wide'})
      .append(content3)

    grid.muuri.add(container3.$)
    grid.ranges.push(Ranges.range(data, data.target))

    data.target.onevent('contextmenu', grid, (ev) => {
      ev.preventDefault()
      DOM.switchState(grid.parent.$.dashboard)
    })
    _$.grab.onclick(grid, grid.edit, [data, container3])
  }
}


class Gauges {
  constructor (data, dom){
    this.sid = data.sid
    this.dom = dom
    this.source = data.setup.source
    this.topic = data.setup.topic
    this.minValue = Number(data.setup.minValue)
    this.maxValue = Number(data.setup.maxValue)
  }
  destroy () {
    this.source = undefined
    this.topic = ''
    this.minValue = undefined
    this.maxValue = undefined
    this.input = undefined
    this.dom.removeChilds()

    delete this
  }
  static gauge (data, dom) {
    let _Gauges = new Gauges (data, dom)
    let title = new DOM('h2', {innerText: data.setup.title}),
     subtitle = new DOM('h3', {innerText: data.setup.subtitle})

    _Gauges.field = new DOM('div', {className:'value'})
    _Gauges.percentage = new DOM('div', {className:'percentage'})

    dom.append ([
      _Gauges.percentage,
      new DOM('div', {className:'container'}).append([
          title,
          _Gauges.field,
          subtitle
        ])
      ])
    return _Gauges
  }
  static regen (obj, data) {
    for (const index in obj.gauges) {
      if (obj.gauges[index].sid == data.sid) {
        obj.gauges[index].destroy ()
        obj.gauges[index] = Gauges.gauge(data, data.source)
      }
    }
  }
  /**
	 * Include a gauge plugin.
	 * @param {Object} grid - Dashboard grid object.
	 * @param {Object} data - Plugin object.
	 * @param {Object} _$ - Object of DOM elements: grab, remove, and silk.
	 */
  static include(grid, data, _$){
    data.source = new DOM('span')
    let content3 = new DOM('div')
      .append([
        //_$.silk,
        _$.grab,
	      _$.remove,
	      data.source,
      ])
    let container3 = new DOM('div', {sid:data.sid, className:'gauge tiny'})
      .append(content3)

    grid.muuri.add(container3.$)
    grid.gauges.push(Gauges.gauge(data, data.source))

    data.source.onevent('contextmenu', grid, (ev) => {
      ev.preventDefault()
      DOM.switchState(grid.parent.$.dashboard)
    })
    _$.grab.onclick(grid, grid.edit, [data, container3])
  }
  /**
	 * Update gauge value.
	 * @param {Object} data - New value.
	 */
  update (data){
    this.field.innerText = data
    let percentage = (parseFloat(data) - this.minValue) / (this.maxValue - this.minValue) * 100

    percentage = percentage > 100 ? 100 : percentage
    percentage = percentage < 0 ? 0 : percentage

    this.percentage.style.marginTop = `${100 - percentage}%`
    this.percentage.style.height = `${percentage}%`
  }
}

class Coordinates {
  constructor (data, dom){
    this.sid = data.sid
    this.dom = dom
    this.target = data.setup.target
    this.topic = data.setup.topic
    this.reach = Number(data.setup.reach) || 0
    this.minX = Number(data.setup.minX)
    this.maxX = Number(data.setup.maxX)
    this.minY = Number(data.setup.minY)
    this.maxY = Number(data.setup.maxY)
    this.currentX = 0
    this.currentY = 0
  }
  destroy () {
    this.target = undefined
    this.topic = ''
    this.canvas = undefined
    this.dom.removeChilds()
    delete this
  }
  /**
   * Send coordinate command
   */
  sendCommand (x, y) {
    if (this.target == 'EasyMQTT'){
      databaseMQTT.client.send(`${easyMQTT.session}/${this.topic}`, `${x},${y}`, 0, false)
    } else if (this.target == 'Console'){
      command.dispatch(channel, 'push', [
        `${this.topic}(${x}, ${y})\r`,
        channel.targetDevice, [], command.tabUID
      ])
    }
  }
  /**
   * Convert canvas coordinates to grid coordinates
   */
  canvasToGrid (canvasX, canvasY, width, height) {
    const padding = 20
    const gridWidth = width - 2 * padding
    const gridHeight = height - 2 * padding

    // Convert canvas position to normalized 0-1
    const normX = (canvasX - padding) / gridWidth
    const normY = (canvasY - padding) / gridHeight

    // Convert to grid coordinates (Y is inverted)
    const x = Math.round(this.minX + normX * (this.maxX - this.minX))
    const y = Math.round(this.maxY - normY * (this.maxY - this.minY))

    // Clamp to bounds
    return {
      x: Math.max(this.minX, Math.min(this.maxX, x)),
      y: Math.max(this.minY, Math.min(this.maxY, y))
    }
  }
  /**
   * Convert grid coordinates to canvas coordinates
   */
  gridToCanvas (gridX, gridY, width, height) {
    const padding = 20
    const gridWidth = width - 2 * padding
    const gridHeight = height - 2 * padding

    const normX = (gridX - this.minX) / (this.maxX - this.minX)
    const normY = (this.maxY - gridY) / (this.maxY - this.minY)

    return {
      x: padding + normX * gridWidth,
      y: padding + normY * gridHeight
    }
  }
  /**
   * Draw the coordinate grid
   */
  draw () {
    const canvas = this.canvas.$
    const ctx = canvas.getContext('2d')
    const width = canvas.width
    const height = canvas.height
    const padding = 20

    // Clear canvas
    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(0, 0, width, height)

    // Draw grid
    ctx.strokeStyle = '#333'
    ctx.lineWidth = 1

    const gridWidth = width - 2 * padding
    const gridHeight = height - 2 * padding
    const stepsX = 10
    const stepsY = 10

    // Vertical lines
    for (let i = 0; i <= stepsX; i++) {
      const x = padding + (i / stepsX) * gridWidth
      ctx.beginPath()
      ctx.moveTo(x, padding)
      ctx.lineTo(x, height - padding)
      ctx.stroke()
    }

    // Horizontal lines
    for (let i = 0; i <= stepsY; i++) {
      const y = padding + (i / stepsY) * gridHeight
      ctx.beginPath()
      ctx.moveTo(padding, y)
      ctx.lineTo(width - padding, y)
      ctx.stroke()
    }

    // Draw axes (at 0,0 if visible)
    ctx.strokeStyle = '#666'
    ctx.lineWidth = 2

    // X axis (y=0)
    if (this.minY <= 0 && this.maxY >= 0) {
      const axisY = this.gridToCanvas(0, 0, width, height).y
      ctx.beginPath()
      ctx.moveTo(padding, axisY)
      ctx.lineTo(width - padding, axisY)
      ctx.stroke()
    }

    // Y axis (x=0)
    if (this.minX <= 0 && this.maxX >= 0) {
      const axisX = this.gridToCanvas(0, 0, width, height).x
      ctx.beginPath()
      ctx.moveTo(axisX, padding)
      ctx.lineTo(axisX, height - padding)
      ctx.stroke()
    }

    // Draw reach circle if enabled
    if (this.reach > 0) {
      const center = this.gridToCanvas(0, 0, width, height)
      // Calculate radius in canvas pixels
      const edgePoint = this.gridToCanvas(this.reach, 0, width, height)
      const radiusPx = Math.abs(edgePoint.x - center.x)

      ctx.strokeStyle = 'rgba(255, 107, 107, 0.5)'
      ctx.lineWidth = 2
      ctx.setLineDash([5, 5])
      ctx.beginPath()
      ctx.arc(center.x, center.y, radiusPx, 0, Math.PI * 2)
      ctx.stroke()
      ctx.setLineDash([])

      // Fill area outside reach with semi-transparent overlay
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
      ctx.beginPath()
      ctx.rect(padding, padding, gridWidth, gridHeight)
      ctx.arc(center.x, center.y, radiusPx, 0, Math.PI * 2, true)
      ctx.fill()
    }

    // Draw current point
    const pos = this.gridToCanvas(this.currentX, this.currentY, width, height)
    ctx.fillStyle = '#ff6b6b'
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, 8, 0, Math.PI * 2)
    ctx.fill()

    // Draw coordinate label
    ctx.fillStyle = '#fff'
    ctx.font = '12px monospace'
    ctx.textAlign = 'center'
    ctx.fillText(`(${this.currentX}, ${this.currentY})`, width / 2, height - 5)

    // Draw axis labels
    ctx.fillStyle = '#888'
    ctx.font = '10px monospace'
    ctx.textAlign = 'left'
    ctx.fillText(`${this.minX}`, padding, height - padding + 12)
    ctx.textAlign = 'right'
    ctx.fillText(`${this.maxX}`, width - padding, height - padding + 12)
    ctx.textAlign = 'left'
    ctx.fillText(`${this.maxY}`, 2, padding + 10)
    ctx.fillText(`${this.minY}`, 2, height - padding)
  }
  /**
   * Handle pointer events
   */
  handlePointer (e, send = false) {
    const canvas = this.canvas.$
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    const canvasX = (e.clientX - rect.left) * scaleX
    const canvasY = (e.clientY - rect.top) * scaleY

    const coords = this.canvasToGrid(canvasX, canvasY, canvas.width, canvas.height)
    let x = coords.x
    let y = coords.y

    // Constrain to reach circle if enabled
    if (this.reach > 0) {
      const distance = Math.sqrt(x * x + y * y)
      if (distance > this.reach) {
        // Constrain to edge of reach circle
        const angle = Math.atan2(y, x)
        x = Math.round(this.reach * Math.cos(angle))
        y = Math.round(this.reach * Math.sin(angle))
      }
    }

    this.currentX = x
    this.currentY = y

    this.draw()

    if (send) {
      this.sendCommand(this.currentX, this.currentY)
    }
  }
  static coordinate (data, dom) {
    let _Coordinates = new Coordinates(data, dom)
    let title = new DOM('h2', {innerText: data.setup.title})

    _Coordinates.canvas = new DOM('canvas')

    // Click only - no drag behavior
    _Coordinates.canvas.$.addEventListener('click', (e) => {
      _Coordinates.handlePointer(e, true)
    })

    // Touch tap support
    _Coordinates.canvas.$.addEventListener('touchstart', (e) => {
      e.preventDefault()
      if (e.touches.length > 0) {
        _Coordinates.handlePointer(e.touches[0], true)
      }
    })

    dom.append([
      title,
      _Coordinates.canvas
    ])

    // Resize canvas to fit container and draw
    _Coordinates.resize = () => {
      // Get the muuri-item container (parent of parent of span)
      const muuriItem = dom.$.closest('.muuri-item')
      if (!muuriItem) return

      const titleHeight = title.$.offsetHeight || 16
      const padding = 24  // Account for padding and margins
      const availableWidth = muuriItem.clientWidth - padding
      const availableHeight = muuriItem.clientHeight - titleHeight - padding
      const size = Math.max(60, Math.min(availableWidth, availableHeight))
      _Coordinates.canvas.$.width = size
      _Coordinates.canvas.$.height = size
      _Coordinates.draw()
    }

    // Initial resize after DOM is ready
    setTimeout(() => _Coordinates.resize(), 100)

    // Resize on window resize
    window.addEventListener('resize', () => _Coordinates.resize())

    return _Coordinates
  }
  static regen (obj, data) {
    for (const index in obj.coordinates) {
      if (obj.coordinates[index].sid == data.sid) {
        obj.coordinates[index].destroy()
        obj.coordinates[index] = Coordinates.coordinate(data, data.target)
      }
    }
  }
  /**
   * Resize the coordinate container.
   * @param {Object} obj - Grid object.
   * @param {Object} data - Plugin object.
   */
  static resize (obj, data) {
    const sizeMap = {
      'small': { class: 'coord-small', px: 150 },
      'medium': { class: 'coord-medium', px: 250 },
      'large': { class: 'coord-large', px: 400 }
    }
    const size = sizeMap[data.setup.size] || sizeMap['large']
    const container = document.querySelector(`[data-sid="${data.sid}"]`)
    if (container) {
      // Remove old size classes
      container.classList.remove('coord-small', 'coord-medium', 'coord-large')
      container.classList.add(size.class)
      // Override muuri's inline styles
      container.style.width = `${size.px}px`
      container.style.height = `${size.px}px`
      // Trigger muuri layout refresh
      bipes.page.dashboard.grid.muuri.refreshItems().layout()
      // Resize the canvas after layout settles
      for (const coord of obj.coordinates) {
        if (coord.sid == data.sid && coord.resize) {
          setTimeout(() => coord.resize(), 200)
        }
      }
    }
  }
  /**
   * Include a coordinate plugin.
   * @param {Object} grid - Dashboard grid object.
   * @param {Object} data - Plugin object.
   * @param {Object} _$ - Object of DOM elements: grab, remove, and silk.
   */
  static include (grid, data, _$){
    // Map size names to CSS classes and pixel sizes
    const sizeMap = {
      'small': { class: 'coord-small', px: 150 },
      'medium': { class: 'coord-medium', px: 250 },
      'large': { class: 'coord-large', px: 400 }
    }
    const size = sizeMap[data.setup.size] || sizeMap['large']

    data.target = new DOM('span')
    let content = new DOM('div')
      .append([
        _$.grab,
        _$.remove,
        data.target,
      ])
    let container = new DOM('div', {sid:data.sid, className:`coordinate ${size.class}`})
      .append(content)

    // Set inline styles to override muuri defaults
    container.$.style.width = `${size.px}px`
    container.$.style.height = `${size.px}px`

    grid.muuri.add(container.$)
    grid.coordinates.push(Coordinates.coordinate(data, data.target))

    data.target.onevent('contextmenu', grid, (ev) => {
      ev.preventDefault()
      DOM.switchState(grid.parent.$.dashboard)
    })
    _$.grab.onclick(grid, grid.edit, [data, container])
  }
}

/**
 * Drawings class - Multi-point drawing/path widget with G-code export
 */
class Drawings {
  constructor (data, dom){
    this.sid = data.sid
    this.dom = dom
    this.target = data.setup.target
    this.filename = data.setup.filename || 'drawing.gcode'
    this.startCommand = data.setup.startCommand || "run_gcode('{filename}')"
    this.homeCommand = data.setup.homeCommand || 'home()'
    this.reach = Number(data.setup.reach) || 0
    this.minX = Number(data.setup.minX)
    this.maxX = Number(data.setup.maxX)
    this.minY = Number(data.setup.minY)
    this.maxY = Number(data.setup.maxY)
    this.points = []  // Array of {x, y} points
    this.loopClosed = false  // Whether the path forms a closed loop
  }
  destroy () {
    this.target = undefined
    this.canvas = undefined
    this.points = []
    this.dom.removeChilds()
    delete this
  }
  /**
   * Convert canvas coordinates to grid coordinates
   */
  canvasToGrid (canvasX, canvasY, width, height) {
    const padding = 30
    const gridWidth = width - 2 * padding
    const gridHeight = height - 2 * padding

    const normX = (canvasX - padding) / gridWidth
    const normY = (canvasY - padding) / gridHeight

    const x = Math.round(this.minX + normX * (this.maxX - this.minX))
    const y = Math.round(this.maxY - normY * (this.maxY - this.minY))

    return {
      x: Math.max(this.minX, Math.min(this.maxX, x)),
      y: Math.max(this.minY, Math.min(this.maxY, y))
    }
  }
  /**
   * Convert grid coordinates to canvas coordinates
   */
  gridToCanvas (gridX, gridY, width, height) {
    const padding = 30
    const gridWidth = width - 2 * padding
    const gridHeight = height - 2 * padding

    const normX = (gridX - this.minX) / (this.maxX - this.minX)
    const normY = (this.maxY - gridY) / (this.maxY - this.minY)

    return {
      x: padding + normX * gridWidth,
      y: padding + normY * gridHeight
    }
  }
  /**
   * Draw the coordinate grid and points
   */
  draw () {
    const canvas = this.canvas.$
    const ctx = canvas.getContext('2d')
    const width = canvas.width
    const height = canvas.height
    const padding = 30

    // Clear canvas
    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(0, 0, width, height)

    // Draw grid
    ctx.strokeStyle = '#333'
    ctx.lineWidth = 1

    const gridWidth = width - 2 * padding
    const gridHeight = height - 2 * padding
    const stepsX = 10
    const stepsY = 10

    // Vertical lines
    for (let i = 0; i <= stepsX; i++) {
      const x = padding + (i / stepsX) * gridWidth
      ctx.beginPath()
      ctx.moveTo(x, padding)
      ctx.lineTo(x, height - padding)
      ctx.stroke()
    }

    // Horizontal lines
    for (let i = 0; i <= stepsY; i++) {
      const y = padding + (i / stepsY) * gridHeight
      ctx.beginPath()
      ctx.moveTo(padding, y)
      ctx.lineTo(width - padding, y)
      ctx.stroke()
    }

    // Draw axes
    ctx.strokeStyle = '#666'
    ctx.lineWidth = 2

    if (this.minY <= 0 && this.maxY >= 0) {
      const axisY = this.gridToCanvas(0, 0, width, height).y
      ctx.beginPath()
      ctx.moveTo(padding, axisY)
      ctx.lineTo(width - padding, axisY)
      ctx.stroke()
    }

    if (this.minX <= 0 && this.maxX >= 0) {
      const axisX = this.gridToCanvas(0, 0, width, height).x
      ctx.beginPath()
      ctx.moveTo(axisX, padding)
      ctx.lineTo(axisX, height - padding)
      ctx.stroke()
    }

    // Draw reach circle if enabled
    if (this.reach > 0) {
      const center = this.gridToCanvas(0, 0, width, height)
      const edgePoint = this.gridToCanvas(this.reach, 0, width, height)
      const radiusPx = Math.abs(edgePoint.x - center.x)

      ctx.strokeStyle = 'rgba(255, 107, 107, 0.5)'
      ctx.lineWidth = 2
      ctx.setLineDash([5, 5])
      ctx.beginPath()
      ctx.arc(center.x, center.y, radiusPx, 0, Math.PI * 2)
      ctx.stroke()
      ctx.setLineDash([])

      // Fill area outside reach with semi-transparent overlay
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
      ctx.beginPath()
      ctx.rect(padding, padding, gridWidth, gridHeight)
      ctx.arc(center.x, center.y, radiusPx, 0, Math.PI * 2, true)
      ctx.fill()
    }

    // Draw path lines connecting points
    if (this.points.length > 1) {
      ctx.strokeStyle = '#4ecdc4'
      ctx.lineWidth = 2
      ctx.beginPath()
      const firstPos = this.gridToCanvas(this.points[0].x, this.points[0].y, width, height)
      ctx.moveTo(firstPos.x, firstPos.y)
      for (let i = 1; i < this.points.length; i++) {
        const pos = this.gridToCanvas(this.points[i].x, this.points[i].y, width, height)
        ctx.lineTo(pos.x, pos.y)
      }
      // Draw closing line if loop is closed
      if (this.loopClosed) {
        ctx.lineTo(firstPos.x, firstPos.y)
      }
      ctx.stroke()
    }

    // Draw numbered points
    for (let i = 0; i < this.points.length; i++) {
      const point = this.points[i]
      const pos = this.gridToCanvas(point.x, point.y, width, height)

      // Draw point circle
      ctx.fillStyle = '#ff6b6b'
      ctx.beginPath()
      ctx.arc(pos.x, pos.y, 10, 0, Math.PI * 2)
      ctx.fill()

      // Draw point number
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 10px monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(`${i + 1}`, pos.x, pos.y)
    }

    // Draw axis labels
    ctx.fillStyle = '#888'
    ctx.font = '9px monospace'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillText(`${this.minX}`, padding, height - padding + 3)
    ctx.textAlign = 'right'
    ctx.fillText(`${this.maxX}`, width - padding, height - padding + 3)
    ctx.textAlign = 'left'
    ctx.textBaseline = 'bottom'
    ctx.fillText(`${this.maxY}`, 2, padding)
    ctx.textBaseline = 'top'
    ctx.fillText(`${this.minY}`, 2, height - padding)

    // Draw point count and loop status
    ctx.fillStyle = '#fff'
    ctx.font = '10px monospace'
    ctx.textAlign = 'center'
    const status = this.loopClosed ? `Points: ${this.points.length} (Loop closed)` : `Points: ${this.points.length}`
    ctx.fillText(status, width / 2, height - 8)
  }
  /**
   * Constrain coordinates to reach circle
   */
  constrainToReach (x, y) {
    if (this.reach > 0) {
      const distance = Math.sqrt(x * x + y * y)
      if (distance > this.reach) {
        const angle = Math.atan2(y, x)
        x = Math.round(this.reach * Math.cos(angle))
        y = Math.round(this.reach * Math.sin(angle))
      }
    }
    return { x, y }
  }
  /**
   * Get canvas coordinates from mouse event
   */
  getCanvasCoords (e) {
    const canvas = this.canvas.$
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    return {
      canvasX: (e.clientX - rect.left) * scaleX,
      canvasY: (e.clientY - rect.top) * scaleY
    }
  }
  /**
   * Find nearest point index within threshold (canvas pixels)
   */
  findNearestPoint (canvasX, canvasY, threshold) {
    const canvas = this.canvas.$
    let nearestIdx = -1
    let nearestDist = Infinity
    for (let i = 0; i < this.points.length; i++) {
      const pos = this.gridToCanvas(this.points[i].x, this.points[i].y, canvas.width, canvas.height)
      const dist = Math.sqrt((pos.x - canvasX) ** 2 + (pos.y - canvasY) ** 2)
      if (dist < nearestDist) {
        nearestDist = dist
        nearestIdx = i
      }
    }
    return nearestDist < threshold ? nearestIdx : -1
  }
  /**
   * Handle mousedown - start drag or prepare for click
   */
  handleMouseDown (e) {
    if (e.button !== 0) return  // Left button only
    const { canvasX, canvasY } = this.getCanvasCoords(e)
    const idx = this.findNearestPoint(canvasX, canvasY, 20)

    if (idx >= 0) {
      // Start dragging existing point
      this.dragIndex = idx
      this.didDrag = false
    } else {
      this.dragIndex = -1
      this.didDrag = false
    }
  }
  /**
   * Handle mousemove - drag point if active
   */
  handleMouseMove (e) {
    if (this.dragIndex < 0) return

    this.didDrag = true
    const { canvasX, canvasY } = this.getCanvasCoords(e)
    const canvas = this.canvas.$
    const coords = this.canvasToGrid(canvasX, canvasY, canvas.width, canvas.height)
    const constrained = this.constrainToReach(coords.x, coords.y)

    this.points[this.dragIndex].x = constrained.x
    this.points[this.dragIndex].y = constrained.y
    this.draw()
  }
  /**
   * Handle mouseup - finish drag or add new point
   */
  handleMouseUp (e) {
    if (e.button !== 0) return

    if (this.didDrag) {
      // Was dragging, just stop
      this.dragIndex = -1
      this.didDrag = false
      return
    }

    // Was not dragging an existing point - treat as click to add
    this.dragIndex = -1
    if (this.loopClosed) return

    const { canvasX, canvasY } = this.getCanvasCoords(e)
    const canvas = this.canvas.$
    const coords = this.canvasToGrid(canvasX, canvasY, canvas.width, canvas.height)
    const constrained = this.constrainToReach(coords.x, coords.y)
    let x = constrained.x
    let y = constrained.y

    // Check if clicking near first point to close loop (need > 2 points)
    if (this.points.length > 2) {
      const firstPoint = this.points[0]
      const distToFirst = Math.sqrt((x - firstPoint.x) ** 2 + (y - firstPoint.y) ** 2)
      const threshold = Math.max(10, (this.maxX - this.minX) * 0.1)
      if (distToFirst < threshold) {
        this.loopClosed = true
        this.draw()
        return
      }
    }

    // Don't add if we clicked on an existing point
    if (this.findNearestPoint(canvasX, canvasY, 20) >= 0) return

    this.points.push({ x, y })
    this.draw()
  }
  /**
   * Handle right click - delete nearest point
   */
  handleRightClick (e) {
    e.preventDefault()
    if (this.points.length === 0) return

    const canvas = this.canvas.$
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    const canvasX = (e.clientX - rect.left) * scaleX
    const canvasY = (e.clientY - rect.top) * scaleY

    // Find nearest point
    let nearestIdx = 0
    let nearestDist = Infinity
    for (let i = 0; i < this.points.length; i++) {
      const pos = this.gridToCanvas(this.points[i].x, this.points[i].y, canvas.width, canvas.height)
      const dist = Math.sqrt((pos.x - canvasX) ** 2 + (pos.y - canvasY) ** 2)
      if (dist < nearestDist) {
        nearestDist = dist
        nearestIdx = i
      }
    }

    // Only delete if click is close to a point (within 20px)
    if (nearestDist < 20) {
      this.points.splice(nearestIdx, 1)
      this.draw()
    }
  }
  /**
   * Clear all points
   */
  clear () {
    this.points = []
    this.loopClosed = false
    this.draw()
  }
  /**
   * Undo last point or reopen loop
   */
  undo () {
    if (this.loopClosed) {
      this.loopClosed = false
      this.draw()
    } else if (this.points.length > 0) {
      this.points.pop()
      this.draw()
    }
  }
  /**
   * Generate G-code from points
   */
  generateGcode () {
    let gcode = '; G-code generated by BIPES Drawing\n'
    gcode += '; Points: ' + this.points.length + '\n'
    gcode += this.loopClosed ? '; Loop: closed\n' : '; Loop: open\n'
    gcode += 'G90 ; Absolute positioning\n'
    gcode += 'G21 ; Millimeters\n'
    gcode += 'G0 Z5 ; Pen up\n'

    if (this.points.length > 0) {
      // Move to first point
      gcode += `G0 X${this.points[0].x} Y${this.points[0].y} ; Move to start\n`
      gcode += 'G1 Z0 ; Pen down\n'

      // Draw path through all points
      for (let i = 1; i < this.points.length; i++) {
        gcode += `G1 X${this.points[i].x} Y${this.points[i].y}\n`
      }

      // Close the loop by returning to start position
      if (this.loopClosed) {
        gcode += `G1 X${this.points[0].x} Y${this.points[0].y} ; Close loop\n`
      }

      gcode += 'G0 Z5 ; Pen up\n'
    }

    gcode += 'G0 X0 Y0 ; Return to origin\n'
    return gcode
  }
  /**
   * Upload G-code to Pico as file
   */
  upload () {
    if (this.points.length === 0) {
      console.log('No points to upload')
      return
    }

    const gcode = this.generateGcode()
    const filename = this.filename

    // Use the BIPES file write mechanism
    // This sends the file content to the Pico
    if (this.target === 'Console') {
      // Write file to Pico using raw REPL
      const lines = gcode.split('\n')
      const escaped = gcode.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')

      command.dispatch(channel, 'push', [
        `f = open('${filename}', 'w')\r`,
        channel.targetDevice, [], command.tabUID
      ])

      setTimeout(() => {
        command.dispatch(channel, 'push', [
          `f.write('${escaped}')\r`,
          channel.targetDevice, [], command.tabUID
        ])
      }, 200)

      setTimeout(() => {
        command.dispatch(channel, 'push', [
          `f.close()\r`,
          channel.targetDevice, [], command.tabUID
        ])
        console.log(`Uploaded ${filename} with ${this.points.length} points`)
      }, 400)
    }
  }
  /**
   * Send start command to Pico
   */
  start () {
    if (this.target === 'Console') {
      // Replace {filename} placeholder with actual filename
      const cmd = this.startCommand.replace('{filename}', this.filename)
      command.dispatch(channel, 'push', [
        `${cmd}\r`,
        channel.targetDevice, [], command.tabUID
      ])
    }
  }
  /**
   * Send homing command to Pico
   */
  home () {
    if (this.target === 'Console') {
      command.dispatch(channel, 'push', [
        `${this.homeCommand}\r`,
        channel.targetDevice, [], command.tabUID
      ])
    }
  }
  static drawing (data, dom) {
    let _Drawings = new Drawings(data, dom)
    let title = new DOM('h2', {innerText: data.setup.title})

    _Drawings.canvas = new DOM('canvas')

    // Mouse events for click-to-add and drag-to-move
    _Drawings.dragIndex = -1
    _Drawings.didDrag = false
    _Drawings.canvas.$.addEventListener('mousedown', (e) => {
      _Drawings.handleMouseDown(e)
    })
    _Drawings.canvas.$.addEventListener('mousemove', (e) => {
      _Drawings.handleMouseMove(e)
    })
    _Drawings.canvas.$.addEventListener('mouseup', (e) => {
      _Drawings.handleMouseUp(e)
    })

    // Right click to delete point
    _Drawings.canvas.$.addEventListener('contextmenu', (e) => {
      _Drawings.handleRightClick(e)
    })

    // Button container
    let buttons = new DOM('div', {className: 'drawing-buttons'})

    let clearBtn = new DOM('button', {innerText: 'Clear', className: 'noicon'})
    clearBtn.$.addEventListener('click', () => _Drawings.clear())

    let undoBtn = new DOM('button', {innerText: 'Undo', className: 'noicon'})
    undoBtn.$.addEventListener('click', () => _Drawings.undo())

    let uploadBtn = new DOM('button', {innerText: 'Upload', className: 'noicon'})
    uploadBtn.$.addEventListener('click', () => _Drawings.upload())

    let startBtn = new DOM('button', {innerText: 'Start', className: 'noicon'})
    startBtn.$.addEventListener('click', () => _Drawings.start())

    let homeBtn = new DOM('button', {innerHTML: '&#127968;', className: 'noicon', title: 'Home'})
    homeBtn.$.addEventListener('click', () => _Drawings.home())

    buttons.append([clearBtn, undoBtn, uploadBtn, startBtn, homeBtn])

    dom.append([
      title,
      _Drawings.canvas,
      buttons
    ])

    // Resize canvas to fit container
    _Drawings.resize = () => {
      const muuriItem = dom.$.closest('.muuri-item')
      if (!muuriItem) return

      const titleHeight = title.$.offsetHeight || 16
      const buttonsHeight = buttons.$.offsetHeight || 30
      const padding = 30
      const availableWidth = muuriItem.clientWidth - padding
      const availableHeight = muuriItem.clientHeight - titleHeight - buttonsHeight - padding
      const size = Math.max(80, Math.min(availableWidth, availableHeight))
      _Drawings.canvas.$.width = size
      _Drawings.canvas.$.height = size
      _Drawings.draw()
    }

    setTimeout(() => _Drawings.resize(), 100)
    window.addEventListener('resize', () => _Drawings.resize())

    return _Drawings
  }
  static regen (obj, data) {
    for (const index in obj.drawings) {
      if (obj.drawings[index].sid == data.sid) {
        const points = obj.drawings[index].points  // Preserve points
        obj.drawings[index].destroy()
        obj.drawings[index] = Drawings.drawing(data, data.target)
        obj.drawings[index].points = points  // Restore points
        obj.drawings[index].draw()
      }
    }
  }
  static resize (obj, data) {
    const sizeMap = {
      'small': { class: 'drawing-small', px: 200 },
      'medium': { class: 'drawing-medium', px: 300 },
      'large': { class: 'drawing-large', px: 450 }
    }
    const size = sizeMap[data.setup.size] || sizeMap['large']
    const container = document.querySelector(`[data-sid="${data.sid}"]`)
    if (container) {
      container.classList.remove('drawing-small', 'drawing-medium', 'drawing-large')
      container.classList.add(size.class)
      container.style.width = `${size.px}px`
      container.style.height = `${size.px}px`
      bipes.page.dashboard.grid.muuri.refreshItems().layout()
      for (const drawing of obj.drawings) {
        if (drawing.sid == data.sid && drawing.resize) {
          setTimeout(() => drawing.resize(), 200)
        }
      }
    }
  }
  static include (grid, data, _$){
    const sizeMap = {
      'small': { class: 'drawing-small', px: 200 },
      'medium': { class: 'drawing-medium', px: 300 },
      'large': { class: 'drawing-large', px: 450 }
    }
    const size = sizeMap[data.setup.size] || sizeMap['large']

    data.target = new DOM('span')
    let content = new DOM('div')
      .append([
        _$.grab,
        _$.remove,
        data.target,
      ])
    let container = new DOM('div', {sid:data.sid, className:`drawing ${size.class}`})
      .append(content)

    container.$.style.width = `${size.px}px`
    container.$.style.height = `${size.px}px`

    grid.muuri.add(container.$)
    grid.drawings.push(Drawings.drawing(data, data.target))

    _$.grab.onclick(grid, grid.edit, [data, container])
  }
}

class Get {
  constructor (){}

  static request(request_, callback, json){
		let request = new Request (request_)

    if (json) {
		  fetch(request)
			  .then(response => response.json())
			  .then(data => {
				  if (!data.hasOwnProperty('response'))
					  return
				  if (typeof callback != 'undefined' && data.response != -1)
					  callback(data.response)
			  })
			  .catch(
			    console.error
			  )
		} else {
				fetch(request)
			  .then(callback())
			  .catch(
			    console.error
			  )
		}
	}
}
