"use strict";

import {storage} from '../../base/storage.js'
import {Tool} from '../../base/tool.js'

import {DOM, Animate} from '../../base/dom.js'

/** Store incoming data in localStorage */
class DataStorage {
  constructor (){
    this._data = []
    this._keys = []
    this._coorLength = {}
    this.buffer = ''        // Incoming lines
    this.ref   // Reference the grid object
  }
  /** Init datastorage referencing the grid object */
  init (ref){
    this.ref = ref
  }
  /** Deinit datastorage visual, dereference the grid object */
  deinit (){
    this.ref = undefined
  }
  /**
   * Checks the income data for useful chuncks, like ``$BIPES-DATA:`` for plotting
   * comma divided data (chart) or single number value (gauge).
   * @param {string} chunck - Incoming line.
   */
  write (chunk){
    this.buffer += chunk
    let re = /\r\n(?:>>> )?\$(.*):(.*)\r\n/
    let match_

    if (re.test(this.buffer)) {
      match_ = this.buffer.match(re)
      if (match_.length == 3) {
        let coordinates = match_[2].split(',').map((item)=>item = parseFloat(item))
        if (coordinates.every((item) => !isNaN(item)) && coordinates.length > 1){
          this.push(match_[1],coordinates, 'chart')
        } else {
          let value = parseFloat(match_[2])
          if (!isNaN(match_[2]))
            this.push(match_[1], value, 'gauge')
        }
      }
    }
    this.buffer = this.buffer.replace(re, '\r\n') //purge received string out

    // Runtime telemetry "T,name=value" lines from bipes_runtime — the SAME message
    // protocol over serial UART and Bluetooth. Parse complete lines (followed by a
    // newline) into gauge/chart pushes, like the legacy "$TOPIC:DATA" format above.
    // Tolerate any run of CR/LF after the value — the device sends "\r\n" but the
    // serial layer can add another CR, so lines arrive as "T,alive=0\r\r\n".
    let tre = /(?:^|[\r\n])T,([^=\r\n]+)=([^\r\n]*)(?=[\r\n])/g, tm
    while ((tm = tre.exec(this.buffer)) !== null) {
      let topic = tm[1].trim(), raw = tm[2].trim()
      let coordinates = raw.split(',').map((item) => parseFloat(item))
      if (coordinates.length > 1 && coordinates.every((item) => !isNaN(item)))
        this.push(topic, coordinates, 'chart')
      else {
        let value = parseFloat(raw)
        if (!isNaN(value))
          this.push(topic, value, 'gauge')
      }
    }
    // Drop the complete T, lines we consumed; leave any trailing partial line.
    this.buffer = this.buffer.replace(/(?:^|[\r\n])T,[^\r\n]*[\r\n]+/g, '\n')
  }
  /**
   * Push identified topic and data to localStorage AND the live widgets.
   *
   * Every reading — scalar (gauge) or multi-value (chart) — is persisted as a
   * timestamped row ``[epochMs, ...values]`` keyed by topic, so the Console
   * (localStorage) export is a real time-series usable for statistics. Gauges read
   * the scalar value; charts read the full row (column 0 = time on the x-axis).
   * @param {string} topic - Identified topic.
   * @param {Number|Number[]} data - Identified data.
   * @param {string} plugin - Hint of the originating widget type ('gauge'/'chart').
   */
  push (topic, data, plugin){
    let isArray = data != undefined && data.constructor.name === 'Array'
    let values = isArray ? data : [data]
    let row = [Date.now(), ...values]

    // Persist the timestamped row for EVERY topic (scalars included).
    if (!this._keys.includes(topic)){
      this._keys.push(topic)
      this._data[topic] = []
    }
    this._data[topic].push(row)
    storage.set(`datastorage:${topic}`, JSON.stringify(this._data[topic]))

    if (this.ref === undefined)
      return

    // Live widgets: a gauge takes the scalar value, a chart takes the [time, ...]
    // row. Both filter by matching topic, so calling each is harmless for the other.
    this.ref.gaugesPush(topic, data, 'Console')

    let refresh = this._data[topic].length == 5 ? true : false
    if (parseInt(this._coorLength[topic]) < parseInt(row.length) || this._coorLength[topic] === -Infinity) {
      this._coorLength[topic] = row.length
      refresh = true
    }
    this.ref.chartsPush(topic, row, refresh, 'Console')
  }
  /**
   * Remove topic from localStorage
   * @param {string} uid - Topic's uid.
   */
  remove (uid){
		this._keys.forEach((topic, index) => {
		  if (topic == uid)
			  this._keys.splice(index,1)
		})
		delete this._data[uid]
  }
  chartData (topic, opt){
    if (!this._keys.includes(topic)){
      this._keys.push (topic)
      if (storage.has(`datastorage:${topic}`)) {
        this._data[topic] = JSON.parse(storage.fetch(`datastorage:${topic}`))
        const map1 = this._data[topic].map(c => c.length)
        const max1 = Math.max(...map1)
        this._coorLength[topic] = max1
     } else {
        this._data[topic] = []
        this._coorLength[topic] = 0
        storage.set(`datastorage:${topic}`, JSON.stringify(this._data[topic]))
      }
    }
    let mat = this._data[topic].map(function(arr){
      return arr.slice();
    });

	  let limitPoints = parseInt(opt.setup.limitPoints)
    if (!isNaN(limitPoints))
      mat = mat.slice(-limitPoints)

    Tool.transpose(mat)

    let labels = opt.setup.labels.split(',').map((i)=>i.trim())
    labels = labels.length == 1 && labels[0] == '' ? [] : labels

    let datasets = [];


    for (let i = 1; i < mat.length; i++){
      let bd = i < 7 ? Tool.colors(i - 1) : Tool.randomColor()

      datasets.push ({
        label: i - 1 < labels.length  ? labels [i - 1]: `Data ${i}`,
        data: mat[i],
        backgroundColor:bd[1],
        borderColor:bd[0],
        borderWidth:1
      })
    }
    return  {
            labels: mat[0],
            datasets:datasets
      }
  }
}

export let dataStorage = new DataStorage()
