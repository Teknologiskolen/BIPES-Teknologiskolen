import {Tool} from '../../base/tool.js'

import {storage} from '../../base/storage.js'
import {navigation} from '../../base/navigation.js'

export let easyMQTT = {
  session: storage.has('mqtt_session') ?
           storage.fetch('mqtt_session') : storage.set('mqtt_session', Tool.SID())
}
/**
 * Handle MQTT database requests, return JSON on success and true on error.
 */
class MQTTDatabase {
  constructor (){
    this.guestMode = !document.getElementById('user-info')
    this._data = []
    this._keys = []
    this._coorLength = {}
    this._latestGauge = {}
    this.ref   // Reference the grid object
    this._inited = false
    // Handle topics
    this.topics = {
      session:false,
      fetching:false,
      latest:{}
    }
    this.isConnected = false // If the MQTT broker is connected
    this.pollInterval = undefined

    if (!this.guestMode && !navigation.isLocal){
      this.do('public_conf')
        .then(obj => {
          if (obj.easyMQTT.password === false && obj.easyMQTT.serverBridge !== true)
            return
          for (const key in obj.easyMQTT){
            easyMQTT[key] = obj.easyMQTT[key]
          }
          if (easyMQTT.session)
            storage.set('mqtt_session', easyMQTT.session)

          if (easyMQTT.serverBridge === true) {
            this.onConnect()
            return
          }

          // WebSocket connection (path is /wss when behind HTTPS proxy)
          this.client = new Paho.MQTT.Client(
            easyMQTT.host,
            easyMQTT.ws_port,
            easyMQTT.path || '',
            `bipes${new Date()}`)
          this.client.onConnectionLost = () => {this.onConnectionLost()}
          this.client.onMessageArrived = (message) => {this.onMessageArrived(message)}
          this.client.connect({
            useSSL:easyMQTT.ssl,
            userName : "bipes",
            password : easyMQTT.password,
            onSuccess:() => {this.onConnect()}
          })
      })
    }
  }
  /** Init databaseMQTT referencing the grid object */
  init (ref){
    this.ref = ref
    Object.keys(this._latestGauge).forEach((topic) => {
      this.gaugesPush(topic, this._latestGauge[topic])
    })

    if (!this.guestMode && !this._inited && !navigation.isLocal){
      this.do(`${easyMQTT.session}/ls`)
        .then(obj => {
          if (obj.hasOwnProperty(easyMQTT.session)){
            if(obj[easyMQTT.session].length === 0){
              this.regenCharts()
              return
            }
            this.topics.fetching = []  // watch fetch resolve
            obj[easyMQTT.session].forEach(topic => {
              this.topics.fetching.push(topic.topic)

              this.do(`${easyMQTT.session}/${topic.topic.replaceAll('/','$')}/grep`)
                .then(obj => {
                  if (obj.hasOwnProperty(easyMQTT.session))
                    this._data[topic.topic] = []
                    this._keys.push(topic.topic)
                    obj[easyMQTT.session].reverse().forEach(data => {
                      this.write(topic.topic, data.data)
                    })

                    this.topics.fetching.splice(this.topics.fetching.indexOf(topic.topic), 1)
                    if (this.topics.fetching.length === 0){
                      this.regenCharts()
                    }
                })
            })
          }
      })
      this._inited = true
    }
  }
  /** Deinit databaseMQTT visual, dereference the grid object */
  deinit (){
    this.ref = undefined
    this.stopPolling()
  }
  /** Reinit everything, called after the user changed the session. */
  reinit (){
    this._data = []
    this._keys = []
    this._coorLength = {}
    this._inited = false
    this.topics.fetching = false
    this.topics.latest = {}
    //this.topics.toSubscribe = []

    this.unsubscribe()
    this.subscribe()
    this.init(this.ref)
  }
  /** Safely redraw EasyMQTT charts when the dashboard is still mounted. */
  regenCharts (){
    if (this.ref !== undefined)
      this.ref.regenCharts('EasyMQTT')
  }
  /** Safely push a gauge value when the dashboard is still mounted. */
  gaugesPush (topic, data){
    if (this.ref !== undefined)
      this.ref.gaugesPush(topic, data, 'EasyMQTT')
  }
  async do (url, body = {}){
    const response = await fetch(`${window.location.origin}/mqtt/${url}`, {
      method:'Post',
      headers:{
        'Content-Type':'application/json'
      },
      body:JSON.stringify(body)
    })

    if (!response.ok)
      throw new Error(response.status)

    return await response.json ()
  }
  async publish (topic, message){
    if (!this.isConnected)
      return false

    const safeTopic = String(topic).replaceAll('/','$')
    const response = await fetch(`${window.location.origin}/mqtt/${easyMQTT.session}/${safeTopic}/pub`, {
      method:'Post',
      headers:{
        'Content-Type':'application/json'
      },
      body:JSON.stringify({payload:String(message)})
    })

    if (!response.ok)
      throw new Error(response.status)

    return true
  }
  /**
   * Checks the income MQTT topic for comma divided data (chart) or single number value (gauge).
   * @param {boolean} push - True to push data to current plugins on grid.
   */
  async write (topic, chunk, push){
    let coordinates = chunk.split(',').map((item)=>item = parseFloat(item))
    if (coordinates.every((item) => !isNaN(item)) && coordinates.length > 1){
      this.push(topic, coordinates, push, 'chart')
      return
    }

    let value = parseFloat(chunk)
    if (!isNaN(chunk))
      this.push(topic, value, push, 'gauge')
  }
  /**
   * Push identified topic and data to memory.
   * @param {string} topic - Identified topic.
   * @param {Number|Number[]} data - Identified data.
   * @param {boolean} push - True to push data to current plugins on grid.
   * @param {string|string[]} plugin - Type of plugin to push the data to.
   */
  push (topic, data, push, plugin){
    if (plugin == 'gauge' && push === true){
      this._latestGauge[topic] = data
      this.gaugesPush(topic, data)
      return
    }

    if (!(data instanceof Array))
      return

    if (!this._data.hasOwnProperty(topic)){
      this._keys.push(topic)
      this._data[topic] = []
      this._coorLength[topic] = 0
    }

    this._data[topic].push(data)
    // Push to charts
    if (this.ref !== undefined && push === true){
      this.ref.chartsPush(topic, this._data[topic], data, 'EasyMQTT')
    }
  }
  /**
   * Remove topic from memory
   * @param {string} uid - Topic's uid.
   */
  remove (uid) {
		this._keys.forEach((topic, index) => {
		  if (topic == uid)
			  this._keys.splice(index,1)
		})
		delete this._data[uid]
  }
  chartData (topic, opt) {
    let data
    if (this._keys.includes(topic))
      data = this._data[topic]
    else
      data = []

    const map1 = data.map(c => c.length)
    const max1 = Math.max(...map1)
    this._coorLength[topic] = max1
    let mat = data.map(function(arr) {
      return arr.slice();
    })

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
  /** Triggered when MQTT connection is established */
  onConnect (){
    bipes.page.dashboard.storagemanager.onConnect()
    this.isConnected = true
    this.subscribe()
    this.startPolling()
  }
  /** Triggered when MQTT connection lost */
  onConnectionLost (){
    bipes.page.dashboard.storagemanager.onConnectionLost()
    this.isConnected = false
    this.topics.subscribed = []
    this.stopPolling()

  }
  /** Triggered when MQTT message received */
  onMessageArrived (message){
    let destination = Array(...message.destinationName.split('/'))
    let payload = String(message.payloadString)
    let session = destination.shift()
    this.write(destination.join('/'), payload, true)
  }
  /** Subscribe to topics listed */
  subscribe (){
    if (easyMQTT.serverBridge === true) {
      this.topics.session = easyMQTT.session
      return
    }

    if (!this.client)
      return

    // Subscribe to all topics
    this.client.subscribe(`${easyMQTT.session}/#`)
    // Cache current session
    this.topics.session = easyMQTT.session
  }
  /** Unsubscribe to all subscribed topics */
  unsubscribe (){
    if (!this.client || !this.topics.session) {
      this.topics.session = false
      return
    }

    this.client.unsubscribe(`${this.topics.session}/#`)
    this.topics.session = false
  }
  startPolling (){
    if (easyMQTT.serverBridge !== true || this.pollInterval !== undefined)
      return

    this.poll()
    this.pollInterval = setInterval(() => this.poll(), 1000)
  }
  stopPolling (){
    if (this.pollInterval === undefined)
      return

    clearInterval(this.pollInterval)
    this.pollInterval = undefined
  }
  async poll (){
    if (easyMQTT.serverBridge !== true || !this.isConnected)
      return

    try {
      const obj = await this.do(`${easyMQTT.session}/ls`)
      if (!obj.hasOwnProperty(easyMQTT.session))
        return

      for (const topic of obj[easyMQTT.session]) {
        const topicName = topic.topic
        const safeTopic = topicName.replaceAll('/','$')
        const latest = await this.do(`${easyMQTT.session}/${safeTopic}/latest`, {limit:20})

        if (!latest.hasOwnProperty(easyMQTT.session))
          return

        latest[easyMQTT.session].reverse().forEach((row) => {
          const timestamp = parseFloat(row.lastEdited)
          if (this.topics.latest[topicName] !== undefined &&
              timestamp <= this.topics.latest[topicName])
            return

          this.topics.latest[topicName] = timestamp
          this.write(topicName, row.data, true)
        })
      }
    } catch (error) {
      console.warn('EasyMQTT polling failed', error)
    }
  }
}

export let databaseMQTT = new MQTTDatabase()
