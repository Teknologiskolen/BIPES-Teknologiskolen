"use strict";

import {DOM} from '../../base/dom.js'
import {Tool} from '../../base/tool.js'
import {channel} from '../../base/channel.js'
import {command} from '../../base/command.js'
import {dataflow} from '../../base/dataflow.js'

import {dataStorage} from './datastorage.js'
import {databaseMQTT} from './easymqtt.js'
import {easyMQTT} from './easymqtt.js'
import {ml} from '../ml/main.js'
import {vision} from '../vision/main.js'

export {Charts, Streams, Switches, ThreeStateSwitches, Ranges, Gauges, Coordinates, Drawings, MLClassifiers, VisionProcessors}

function dashboardMsg(key, fallback, ...args) {
  let text = (window.Msg && Msg[key]) || fallback
  args.forEach((arg, index) => {
    text = text.replace(`{${index}}`, arg)
  })
  return text
}

const IMAGE_SOURCE_DEVICE_KIND = 'image-source'
const SERIAL_CAMERA_SOURCE = 'Source device'
const SERIAL_CAMERA_BAUD_RATE = 115200
const SERIAL_CAMERA_MIN_CAPTURE_INTERVAL_MS = 3000

function isSerialCameraSource(source) {
  return source == 'Serial Camera' || source == 'Source device'
}

function normalizeImageTriggerLine (line) {
  if (!line)
    return ''

  let normalized = line.trim()
  if (normalized.startsWith('>>> '))
    normalized = normalized.substr(4).trim()
  return normalized
}

function isImageTriggerLine (line, notifyMessage = '') {
  let normalized = normalizeImageTriggerLine(line)
  if (notifyMessage && normalized.includes(notifyMessage))
    return true

  return normalized == 'CAPTURE' ||
    normalized.includes('BIPES_CAMERA_TRIGGER') ||
    normalized.includes('BIPES_CAMERA_CAPTURE') ||
    normalized.includes('$BIPES-CAMERA:') ||
    normalized.includes('$BIPES_CAMERA:')
}

function sourceStreamCommandFromLine (line) {
  let normalized = normalizeImageTriggerLine(line)
  if (!normalized)
    return ''

  let match = normalized.match(/^STREAM\s+(\d+(?:\.\d+)?)$/i)
  if (!match)
    return ''

  return `STREAM ${match[1]}`
}

function streamFpsValue (value) {
  let fps = Number(value)
  if (!Number.isFinite(fps) || fps <= 0)
    return 4
  return Math.min(60, fps)
}

function isSourceStreamingMode (source, triggerMode) {
  return isSerialCameraSource(source) && triggerMode == 'interval'
}

function sourceFeedSubscriptionMode (source, triggerMode) {
  return isSourceStreamingMode(source, triggerMode) ? 'streaming' : triggerMode
}

function serialSourceWaitingStatus (feed, triggerMode) {
  if (feed && feed.awaitingFrame)
    return dashboardMsg('WidgetWaitingSourceImage', 'Waiting for an image from the source device...')

  if (triggerMode == 'interval')
    return dashboardMsg('WidgetWaitingSourceStream', 'Waiting for streamed images from the source device...')

  if (triggerMode == 'newImage')
    return dashboardMsg('WidgetWaitingImageRequest', 'Waiting for an image request from the target device...')

  return dashboardMsg('WidgetWaitingNewImage', 'Waiting for a new image...')
}

function parseFrameHeaderMetadata (text) {
  let metadata = {}
  if (!text)
    return metadata

  text.trim().split(/\s+/).forEach((part) => {
    let index = part.indexOf('=')
    if (index <= 0)
      return
    let key = part.slice(0, index).trim()
    let value = part.slice(index + 1).trim()
    if (!key)
      return
    metadata[key] = decodeURIComponent(value)
  })

  return metadata
}

function frameVisionInput (frame) {
  if (!frame)
    return ''
  if (frame.visionInput)
    return frame.visionInput
  let metadata = frame.metadata || {}
  return metadata.vision || metadata.visionInput || metadata.input || ''
}

function frameHeaderSummary (frame) {
  if (!frame)
    return ''

  let parts = []
  if (frame.dataType)
    parts.push(`data=${frame.dataType}`)
  if (frame.contentType)
    parts.push(`content=${frame.contentType}`)
  if (frame.width && frame.height)
    parts.push(`${frame.width}x${frame.height}`)
  if (frameVisionInput(frame))
    parts.push(`vision=${frameVisionInput(frame)}`)
  if (frame.label)
    parts.push(`label=${frame.label}`)

  return parts.join(' · ')
}

class DashboardSerialCamera {
  constructor () {
    this.port = undefined
    this.reader = undefined
    this.writer = undefined
    this.pending = []
    this.encoder = new TextEncoder()
    this.decoder = new TextDecoder()
    this.capturePromise = undefined
    this.lastCaptureStartedAt = 0
  }

  sleep (ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  isDeviceLostError (error) {
    let text = String((error && error.message) || error || '')
    return text.includes('The device has been lost') ||
      text.includes('device has been lost') ||
      text.includes('Failed to read from the serial port') ||
      text.includes('Failed to open serial port')
  }

  isDiagnosticLine (line) {
    return !!line && (
      line.startsWith('DBG ') ||
      line.startsWith('RX ') ||
      line.startsWith('ACK ') ||
      line.startsWith('ERR ') ||
      line.startsWith('READY ') ||
      line.startsWith('I (') ||
      line.startsWith('W (') ||
      line.startsWith('E (') ||
      line.startsWith('rst:') ||
      line.startsWith('load:') ||
      line.startsWith('entry ') ||
      line.startsWith('ets ') ||
      line.startsWith('configsip:') ||
      line.startsWith('clk_drv:') ||
      line.startsWith('mode:DIO') ||
      line.includes('Backtrace:')
    )
  }

  isFrameHeaderLine (line) {
    return /^GRAY8\s+\S+\s+\d+\s+\d+\s+\d+(?:\s+.*)?$/.test(line) ||
      /^RAW565\s+\S+\s+\d+\s+\d+\s+\d+(?:\s+.*)?$/.test(line) ||
      /^JPEG\s+\S+\s+\d+\s+\d+\s+\d+(?:\s+.*)?$/.test(line) ||
      line.startsWith('BIPES_CAMERA_FRAME')
  }

  isProbablyBinaryLine (line) {
    if (!line)
      return false

    let bad = 0
    for (let i = 0; i < line.length; i++) {
      let code = line.charCodeAt(i)

      if (code === 65533) {
        bad++
        continue
      }

      if (code < 32 && code !== 9) {
        bad++
        continue
      }
    }

    return bad > Math.max(4, Math.floor(line.length * 0.08))
  }

  shouldLogSerialWaitLine (line) {
    return !!line && (
      this.isDiagnosticLine(line) ||
      this.isFrameHeaderLine(line) ||
      line.startsWith('END ')
    )
  }

  async connect () {
    if (!('serial' in navigator))
      throw new Error(dashboardMsg('WidgetSerialCameraUnsupported', 'Web Serial is not supported in this browser. Use Chrome or Edge over HTTPS.'))

    if (this.port && this.reader && this.writer)
      return

    this.port = await navigator.serial.requestPort()
    await this.port.open({
      baudRate: SERIAL_CAMERA_BAUD_RATE,
      bufferSize: 65536
    })

    this.reader = this.port.readable.getReader()
    this.writer = this.port.writable.getWriter()
    this.pending = []

    await this.sleep(1200)
    await this.drainInput(120, 1500)
  }

  async disconnect () {
    if (this.reader) {
      try { await this.reader.cancel() } catch (error) {}
      try { this.reader.releaseLock() } catch (error) {}
      this.reader = undefined
    }

    if (this.writer) {
      try { this.writer.releaseLock() } catch (error) {}
      this.writer = undefined
    }

    if (this.port) {
      try { await this.port.close() } catch (error) {}
      this.port = undefined
    }

    this.pending = []
  }

  async writeLine (line) {
    if (!this.writer)
      throw new Error(dashboardMsg('WidgetSerialCameraDisconnected', 'Serial camera disconnected.'))

    try {
      await this.writer.write(this.encoder.encode(`${line}\n`))
      console.info('Serial camera command written:', line)
    } catch (error) {
      await this.disconnect()
      throw error
    }
  }

  async readChunk (timeoutMs, disconnectOnTimeout = true) {
    let timeout

    try {
      return await Promise.race([
        this.reader.read(),
        new Promise((resolve, reject) => {
          timeout = setTimeout(() => {
            reject(new Error(dashboardMsg('WidgetSerialCameraTimeout', 'Timed out waiting for image data.')))
          }, timeoutMs)
        })
      ])
    } catch (error) {
      if (disconnectOnTimeout || this.isDeviceLostError(error))
        await this.disconnect()
      throw error
    } finally {
      if (timeout)
        clearTimeout(timeout)
    }
  }

  async readByte (timeoutMs = 10000, disconnectOnTimeout = true) {
    while (this.pending.length === 0) {
      let result = await this.readChunk(timeoutMs, disconnectOnTimeout)

      if (result.done)
        throw new Error(dashboardMsg('WidgetSerialCameraDisconnected', 'Serial camera disconnected.'))

      if (result.value)
        this.pending.push(...result.value)
    }

    return this.pending.shift()
  }

  async readLine (timeoutMs = 10000, maxBytes = 2048, disconnectOnTimeout = true) {
    let bytes = []
    let truncated = false

    while (true) {
      let byte = await this.readByte(timeoutMs, disconnectOnTimeout)

      if (byte === 10)
        break

      if (byte !== 13) {
        if (bytes.length < maxBytes)
          bytes.push(byte)
        else
          truncated = true
      }
    }

    let line = this.decoder.decode(new Uint8Array(bytes)).trim()

    if (truncated)
      console.warn('Serial camera line truncated:', line)

    return line
  }

  async drainInput (idleMs = 120, maxMs = 3000) {
    this.pending = []
    let deadline = Date.now() + maxMs
    let drained = 0

    while (Date.now() < deadline) {
      try {
        let result = await this.readChunk(idleMs, false)
        if (result.done)
          break
        if (result.value)
          drained += result.value.length
      } catch (error) {
        break
      }
    }

    if (drained > 0)
      console.info('Serial camera drained stale bytes:', drained)
  }

  async readCaptureHeader (requestId, timeoutMs = 15000, onProgress = undefined) {
    let deadline = Date.now() + timeoutMs
    let searchedLines = 0

    while (Date.now() < deadline) {
      let remainingMs = deadline - Date.now()
      if (remainingMs <= 0)
        break

      let line = await this.readLine(remainingMs, 2048, false)
      if (!line)
        continue

      searchedLines++

      if (this.shouldLogSerialWaitLine(line))
        console.info('Serial camera wait line:', line)

      if (onProgress && searchedLines % 10 === 0)
          onProgress(dashboardMsg('WidgetSerialCameraSearching', 'Searching camera source stream...'))

      if (this.isProbablyBinaryLine(line))
        continue

      if (line.startsWith(`ERR ${requestId} `))
        return { type: 'error', line }

      if (line.startsWith('ERR unknown_command'))
        continue

      if (line.startsWith('ACK BIPES_CAPTURE'))
        continue

      if (line.startsWith('RX ['))
        continue

      if (line.startsWith('BIPES_CAMERA_FRAME'))
        continue

      let grayMatch = line.match(/^GRAY8\s+(\S+)\s+(\d+)\s+(\d+)\s+(\d+)(?:\s+(.*))?$/)
      if (grayMatch) {
        let metadata = parseFrameHeaderMetadata(grayMatch[5] || '')
        return {
          type: 'gray8',
          requestId: grayMatch[1],
          width: Number(grayMatch[2]),
          height: Number(grayMatch[3]),
          length: Number(grayMatch[4]),
          metadata: metadata,
          dataType: metadata.data || metadata.kind || 'image',
          contentType: metadata.contentType || metadata.mime || '',
          visionInput: metadata.vision || metadata.visionInput || metadata.input || '',
          label: metadata.label || metadata.name || ''
        }
      }

      let rawMatch = line.match(/^RAW565\s+(\S+)\s+(\d+)\s+(\d+)\s+(\d+)(?:\s+(.*))?$/)
      if (rawMatch) {
        let metadata = parseFrameHeaderMetadata(rawMatch[5] || '')
        return {
          type: 'raw565',
          requestId: rawMatch[1],
          width: Number(rawMatch[2]),
          height: Number(rawMatch[3]),
          length: Number(rawMatch[4]),
          metadata: metadata,
          dataType: metadata.data || metadata.kind || 'image',
          contentType: metadata.contentType || metadata.mime || '',
          visionInput: metadata.vision || metadata.visionInput || metadata.input || '',
          label: metadata.label || metadata.name || ''
        }
      }

      let jpegMatch = line.match(/^JPEG\s+(\S+)\s+(\d+)\s+(\d+)\s+(\d+)(?:\s+(.*))?$/)
      if (jpegMatch) {
        let metadata = parseFrameHeaderMetadata(jpegMatch[5] || '')
        return {
          type: 'jpeg',
          requestId: jpegMatch[1],
          width: Number(jpegMatch[2]),
          height: Number(jpegMatch[3]),
          length: Number(jpegMatch[4]),
          metadata: metadata,
          dataType: metadata.data || metadata.kind || 'image',
          contentType: metadata.contentType || metadata.mime || '',
          visionInput: metadata.vision || metadata.visionInput || metadata.input || '',
          label: metadata.label || metadata.name || ''
        }
      }
    }

    throw new Error(dashboardMsg('WidgetSerialCameraTimeout', 'Timed out waiting for image data.'))
  }

  async readBytes (length, timeoutMs = 15000) {
    let output = new Uint8Array(length)
    let offset = 0
    let deadline = Date.now() + timeoutMs

    while (offset < length) {
      if (this.pending.length > 0) {
        let take = Math.min(this.pending.length, length - offset)
        output.set(this.pending.splice(0, take), offset)
        offset += take
        continue
      }

      let remainingMs = deadline - Date.now()
      if (remainingMs <= 0) {
        throw new Error(dashboardMsg(
          'WidgetSerialCameraByteTimeout',
          'Timed out reading camera source image bytes ({0}/{1}).',
          String(offset),
          String(length)
        ))
      }

      let result = await this.readChunk(remainingMs, false)

      if (result.done)
        throw new Error(dashboardMsg('WidgetSerialCameraDisconnected', 'Serial camera disconnected.'))

      if (!result.value || result.value.length === 0)
        continue

      let take = Math.min(result.value.length, length - offset)
      output.set(result.value.slice(0, take), offset)
      offset += take

      if (take < result.value.length)
        this.pending.push(...result.value.slice(take))
    }

    return output
  }

  async consumeEndMarker (requestId, timeoutMs = 2500) {
    let deadline = Date.now() + timeoutMs
    let lineBytes = []

    while (Date.now() < deadline) {
      let remainingMs = deadline - Date.now()
      if (remainingMs <= 0)
        break

      let byte
      try {
        byte = await this.readByte(remainingMs, false)
      } catch (error) {
        return false
      }

      if (byte === 10) {
        let line = this.decoder.decode(new Uint8Array(lineBytes)).trim()
        lineBytes = []

        if (!line)
          continue

        if (this.shouldLogSerialWaitLine(line))
          console.info('Serial camera wait line:', line)

        if (line === `END ${requestId}`)
          return true

        continue
      }

      if (byte !== 13) {
        if (lineBytes.length < 512)
          lineBytes.push(byte)
      }
    }

    return false
  }

  gray8ToImageData (bytes, width, height) {
    let imageData = new ImageData(width, height)
    let output = imageData.data
    let pixels = Math.min(width * height, bytes.length)

    for (let pixel = 0; pixel < pixels; pixel++) {
      let value = bytes[pixel]
      let targetIndex = pixel * 4

      output[targetIndex] = value
      output[targetIndex + 1] = value
      output[targetIndex + 2] = value
      output[targetIndex + 3] = 255
    }

    return imageData
  }

  async gray8ToBlob (bytes, width, height) {
    let canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    let context = canvas.getContext('2d', { willReadFrequently: true })
    context.putImageData(this.gray8ToImageData(bytes, width, height), 0, 0)

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob)
          resolve(blob)
        else
          reject(new Error(dashboardMsg('WidgetSerialCameraBadFrame', 'Serial camera sent an invalid image frame.')))
      }, 'image/png')
    })
  }

  raw565ToImageData (bytes, width, height, options = {}) {
    let {
      swapBytes = false,
      swapRB = false
    } = options

    let imageData = new ImageData(width, height)
    let output = imageData.data
    let pixels = Math.min(width * height, Math.floor(bytes.length / 2))

    for (let pixel = 0; pixel < pixels; pixel++) {
      let sourceIndex = pixel * 2
      let targetIndex = pixel * 4

      let b0 = bytes[sourceIndex]
      let b1 = bytes[sourceIndex + 1]

      let value = swapBytes
        ? ((b0 << 8) | b1)
        : (b0 | (b1 << 8))

      let r = ((value >> 11) & 0x1f) * 255 / 31
      let g = ((value >> 5) & 0x3f) * 255 / 63
      let b = (value & 0x1f) * 255 / 31

      if (swapRB) {
        let t = r
        r = b
        b = t
      }

      output[targetIndex] = Math.round(r)
      output[targetIndex + 1] = Math.round(g)
      output[targetIndex + 2] = Math.round(b)
      output[targetIndex + 3] = 255
    }

    return imageData
  }

  async raw565ToBlob (bytes, width, height, options = {}) {
    let canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    let context = canvas.getContext('2d', { willReadFrequently: true })
    context.putImageData(this.raw565ToImageData(bytes, width, height, options), 0, 0)

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob)
          resolve(blob)
        else
          reject(new Error(dashboardMsg('WidgetSerialCameraBadFrame', 'Serial camera sent an invalid image frame.')))
      }, 'image/png')
    })
  }

  async capture (onProgress = undefined) {
    if (this.capturePromise)
      return this.capturePromise

    this.capturePromise = this.captureInternal(onProgress)

    try {
      return await this.capturePromise
    } finally {
      this.capturePromise = undefined
    }
  }

  async captureInternal (onProgress = undefined) {
    try {
      await this.connect()

      let requestId = '0'
      let waitMs = SERIAL_CAMERA_MIN_CAPTURE_INTERVAL_MS - (Date.now() - this.lastCaptureStartedAt)

      if (waitMs > 0) {
        if (onProgress)
          onProgress(dashboardMsg('WidgetSerialCameraWaitingInterval', 'Waiting for next camera source capture...'))
        await this.sleep(waitMs)
      }

      await this.drainInput(180, 2500)

      if (onProgress)
        onProgress(dashboardMsg('WidgetSerialCameraRequesting', 'Requesting image from camera source...'))

      console.info('Serial camera capture request: BIPES_CAPTURE')
      this.lastCaptureStartedAt = Date.now()
      await this.writeLine('BIPES_CAPTURE')

      if (onProgress)
        onProgress(dashboardMsg('WidgetSerialCameraWaitingHeader', 'Waiting for camera source frame header...'))

      let header = await this.readCaptureHeader(requestId, 15000, onProgress)

      if (header.type === 'error')
        throw new Error(header.line)

      if (!['gray8', 'raw565', 'jpeg'].includes(header.type))
        throw new Error(dashboardMsg('WidgetSerialCameraBadFrame', 'Serial camera sent an invalid image frame.'))

      let responseRequestId = header.requestId
      let width = header.width
      let height = header.height
      let length = header.length

      if (!Number.isFinite(length) || length <= 0)
        throw new Error(dashboardMsg('WidgetSerialCameraBadFrame', 'Serial camera sent an invalid image frame.'))

      if (onProgress)
        onProgress(dashboardMsg('WidgetSerialCameraReadingBytes', 'Reading camera source image... ({0} bytes)', length))

      let bytes = await this.readBytes(length, 15000)
      console.info('Serial camera image bytes read:', bytes.length, 'expected:', length)

      if (onProgress)
        onProgress(dashboardMsg('WidgetSerialCameraWaitingEnd', 'Finishing camera source image transfer...'))

      let ended = await this.consumeEndMarker(responseRequestId, 2500)
      if (!ended)
        console.warn('Serial camera END marker not received for request:', responseRequestId)

      let blob
      if (header.type === 'gray8')
        blob = await this.gray8ToBlob(bytes, width, height)
      else if (header.type === 'raw565')
        blob = await this.raw565ToBlob(bytes, width, height, { swapBytes: false, swapRB: false })
      else
        blob = new Blob([bytes], { type: 'image/jpeg' })

      console.info('Serial camera image captured:', {
        requestId: responseRequestId,
        length,
        width,
        height,
        type: header.type
      })

      return {
        blob,
        signature: `${responseRequestId}:${length}:${Date.now()}`,
        changed: true,
        byteLength: length,
        width,
        height,
        header,
        metadata: header.metadata || {},
        dataType: header.dataType,
        contentType: header.contentType,
        visionInput: header.visionInput,
        label: header.label
      }
    } catch (error) {
      if (this.isDeviceLostError(error))
        await this.disconnect()
      throw error
    }
  }
}
class SharedImageSourceFeed {
  constructor (camera, onFrame = undefined) {
    this.camera = camera
    this.onFrame = onFrame
    this.latestFrame = null
    this.capturePromise = null
    this.timer = null
    this.listeners = new Map()
    this.intervalMs = SERIAL_CAMERA_MIN_CAPTURE_INTERVAL_MS
    this.triggerBuffer = ''
    this.lastTriggerAt = 0
  }

  triggerFromChunk (chunk) {
    if (!chunk || !this.hasTriggerListeners())
      return

    this.triggerBuffer = `${this.triggerBuffer}${chunk}`.slice(-4096)
    let lines = this.triggerBuffer.split(/\r?\n/)
    this.triggerBuffer = lines.pop() || ''

    for (let line of lines) {
      line = line.trim()
      if (!this.isTriggerLine(line))
        continue

      if (this.capturePromise) {
        console.info('Serial camera active-device trigger ignored while capture is running:', line)
        return
      }

      let now = Date.now()
      let intervalMs = this.triggerIntervalMs()
      if (now - this.lastTriggerAt < intervalMs) {
        console.info('Serial camera active-device trigger ignored during cooldown:', line)
        return
      }

      this.lastTriggerAt = now
      console.info('Serial camera active-device trigger:', line)
      this.safeTick()
      return
    }
  }

  subscribe (callback, options = {}) {
    this.listeners.set(callback, {
      mode: options.mode || 'interval',
      intervalMs: Math.max(
        SERIAL_CAMERA_MIN_CAPTURE_INTERVAL_MS,
        Number(options.intervalMs) || SERIAL_CAMERA_MIN_CAPTURE_INTERVAL_MS
      )
    })

    this.syncTimer()

    if (this.latestFrame) {
      try {
        callback(this.latestFrame)
      } catch (error) {
        console.error(error)
      }
    }

    return () => {
      this.listeners.delete(callback)
      this.syncTimer()
    }
  }

  hasListeners () {
    return this.listeners.size > 0
  }

  hasIntervalListeners () {
    for (let listener of this.listeners.values()) {
      if (listener.mode === 'interval')
        return true
    }
    return false
  }

  hasTriggerListeners () {
    for (let listener of this.listeners.values()) {
      if (listener.mode === 'newImage')
        return true
    }
    return false
  }

  triggerIntervalMs () {
    let intervalMs = null

    for (let listener of this.listeners.values()) {
      if (listener.mode !== 'newImage')
        continue

      intervalMs = intervalMs === null
        ? listener.intervalMs
        : Math.min(intervalMs, listener.intervalMs)
    }

    return intervalMs || SERIAL_CAMERA_MIN_CAPTURE_INTERVAL_MS
  }

  isTriggerLine (line) {
    return line === 'CAPTURE' ||
      line.includes('BIPES_CAMERA_TRIGGER') ||
      line.includes('BIPES_CAMERA_CAPTURE') ||
      line.includes('$BIPES-CAMERA:') ||
      line.includes('$BIPES_CAMERA:')
  }

  pollingIntervalMs () {
    let intervalMs = null

    for (let listener of this.listeners.values()) {
      if (listener.mode !== 'interval')
        continue

      intervalMs = intervalMs === null
        ? listener.intervalMs
        : Math.min(intervalMs, listener.intervalMs)
    }

    return intervalMs || SERIAL_CAMERA_MIN_CAPTURE_INTERVAL_MS
  }

  syncTimer () {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }

    if (!this.hasIntervalListeners())
      return

    this.intervalMs = this.pollingIntervalMs()
    console.info('Serial camera shared polling interval:', this.intervalMs)

    this.timer = setInterval(() => {
      this.safeTick()
    }, this.intervalMs)
  }

  start () {
    this.syncTimer()
  }

  stop () {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  async getFrame (onProgress = undefined) {
    if (this.capturePromise)
      return this.capturePromise

    this.capturePromise = (async () => {
      try {
        let frame = await this.camera.capture(onProgress)
        this.latestFrame = frame
        if (typeof this.onFrame == 'function')
          this.onFrame(frame)

        for (let [callback] of this.listeners) {
          try {
            callback(frame)
          } catch (error) {
            console.error(error)
          }
        }

        return frame
      } finally {
        this.capturePromise = null
      }
    })()

    return this.capturePromise
  }

  async tick (onProgress = undefined) {
    if (!this.hasListeners())
      return this.latestFrame

    return this.getFrame(onProgress)
  }

  safeTick () {
    this.tick().catch((error) => {
      console.error(error)
    })
  }

  getLatestFrame () {
    return this.latestFrame
  }
}

class DashboardImageSourceRegistry {
  constructor () {
    this.devices = new Map()
    this.listeners = new Set()
  }

  snapshot (device) {
    let latestFrame = device.feed && typeof device.feed.getLatestFrame == 'function'
      ? device.feed.getLatestFrame()
      : null
    return {
      uid: device.uid,
      nodename: device.nodename,
      version: device.version,
      protocol: device.protocol,
      kind: device.kind,
      source: device.source,
      latestFrame: latestFrame ? {
        width: latestFrame.width,
        height: latestFrame.height,
        byteLength: latestFrame.byteLength,
        dataType: latestFrame.dataType,
        contentType: latestFrame.contentType,
        visionInput: frameVisionInput(latestFrame),
        label: latestFrame.label,
        metadata: latestFrame.metadata || {},
        summary: frameHeaderSummary(latestFrame)
      } : null
    }
  }

  list () {
    return Array.from(this.devices.values()).map((device) => this.snapshot(device))
  }

  subscribe (callback) {
    this.listeners.add(callback)

    try {
      callback(this.list())
    } catch (error) {
      console.error(error)
    }

    return () => {
      this.listeners.delete(callback)
    }
  }

  notify () {
    let devices = this.list()
    for (let callback of this.listeners) {
      try {
        callback(devices)
      } catch (error) {
        console.error(error)
      }
    }
  }

  get (uid) {
    return this.devices.get(uid)
  }

  resolve (uid) {
    if (uid && this.devices.has(uid))
      return this.devices.get(uid)

    if (this.devices.size === 1)
      return this.devices.values().next().value

    return undefined
  }

  async connectSerialCamera () {
    let camera = new DashboardSerialCamera()
    await camera.connect()

    let uid = Tool.UID()
    let device = {
      uid,
      nodename: 'Camera source',
      version: '-',
      protocol: 'WebSerial camera source',
      kind: IMAGE_SOURCE_DEVICE_KIND,
      source: SERIAL_CAMERA_SOURCE,
      camera,
      feed: new SharedImageSourceFeed(camera, () => this.notify())
    }

    this.devices.set(uid, device)
    this.notify()
    return this.snapshot(device)
  }

  async disconnect (uid) {
    let device = this.devices.get(uid)
    if (!device)
      return false

    device.feed.stop()
    await device.camera.disconnect()
    this.devices.delete(uid)
    this.notify()
    return true
  }

  triggerFromChunk (chunk) {
    for (let device of this.devices.values()) {
      device.feed.triggerFromChunk(chunk)
    }
  }
}

const imageSourceRegistry = new DashboardImageSourceRegistry()

export function listImageSourceDevices () {
  return imageSourceRegistry.list()
}

export function subscribeImageSourceDevices (callback) {
  return imageSourceRegistry.subscribe(callback)
}

export async function connectImageSourceDevice () {
  return imageSourceRegistry.connectSerialCamera()
}

export async function disconnectImageSourceDevice (uid) {
  return imageSourceRegistry.disconnect(uid)
}

export function listSerialCameraDevices () {
  return listImageSourceDevices()
}

export function subscribeSerialCameraDevices (callback) {
  return subscribeImageSourceDevices(callback)
}

export async function connectSerialCameraDevice () {
  return connectImageSourceDevice()
}

export async function disconnectSerialCameraDevice (uid) {
  return disconnectImageSourceDevice(uid)
}

function resolveImageSourceDevice (uid) {
  return imageSourceRegistry.resolve(uid)
}

function normalizeStoredDeviceRef (ref) {
  if (!ref || typeof ref != 'object')
    return null

  return {
    uid: ref.uid || '',
    kind: ref.kind || 'device',
    protocol: ref.protocol || '',
    nodename: ref.nodename || '',
    version: ref.version || '',
    source: ref.source || ''
  }
}

function liveConnectedDevices (kind = 'any') {
  let devices = []
  let known = new Set()
  let pageDevices = window.bipes && bipes.page && bipes.page.device && Array.isArray(bipes.page.device.devices) ?
    bipes.page.device.devices : []

  if (kind == 'any' || kind == 'device' || kind == IMAGE_SOURCE_DEVICE_KIND) {
    pageDevices.forEach((device) => {
      if (!device || !device.uid || !channel.hasConnection(device.uid))
        return

      known.add(device.uid)
      devices.push({
        uid: device.uid,
        kind: kind == IMAGE_SOURCE_DEVICE_KIND ? IMAGE_SOURCE_DEVICE_KIND : 'device',
        protocol: device.protocol || '',
        nodename: device.nodename || '',
        version: device.version || ''
      })
    })

    Object.keys(channel.connections || {}).forEach((uid) => {
      if (known.has(uid))
        return

      devices.push({
        uid,
        kind: kind == IMAGE_SOURCE_DEVICE_KIND ? IMAGE_SOURCE_DEVICE_KIND : 'device',
        protocol: '',
        nodename: '',
        version: ''
      })
    })
  }

  if (kind == 'any' || kind == IMAGE_SOURCE_DEVICE_KIND) {
    listImageSourceDevices().forEach((device) => {
      if (!device || !device.uid)
        return

      devices.push({
        uid: device.uid,
        kind: device.kind || IMAGE_SOURCE_DEVICE_KIND,
        protocol: device.protocol || '',
        nodename: device.nodename || '',
        version: device.version || '',
        source: device.source || ''
      })
    })
  }

  return devices
}

function uniqueMatch (devices, predicate) {
  let matches = devices.filter(predicate)
  return matches.length === 1 ? matches[0] : undefined
}

export function describeConnectedDeviceSelection (uid) {
  if (!uid || uid == 'active' || uid == 'all')
    return null

  let match = liveConnectedDevices('any').find((device) => device.uid == uid)
  if (!match)
    return null

  return {
    uid: match.uid,
    kind: match.kind || 'device',
    protocol: match.protocol || '',
    nodename: match.nodename || '',
    version: match.version || '',
    source: match.source || ''
  }
}

export function resolveStoredConnectedDeviceUid (value, ref, options = {}) {
  let fallback = options.hasOwnProperty('fallback') ? options.fallback : value
  let kind = options.kind || 'any'
  let stored = normalizeStoredDeviceRef(ref)

  if (value == 'active' || value == 'all' || value == '')
    return value

  let devices = liveConnectedDevices(kind)

  if (value && devices.some((device) => device.uid == value))
    return value

  if (!stored) {
    if (devices.length == 1 && options.allowSingleFallback !== false)
      return devices[0].uid
    return fallback
  }

  if (stored.uid) {
    let match = devices.find((device) => device.uid == stored.uid)
    if (match)
      return match.uid
  }

  let exact = uniqueMatch(devices, (device) =>
    (!stored.kind || kind == 'any' || device.kind == kind) &&
    stored.nodename &&
    stored.protocol &&
    stored.version &&
    device.nodename == stored.nodename &&
    device.protocol == stored.protocol &&
    device.version == stored.version
  )
  if (exact)
    return exact.uid

  let byNameAndProtocol = uniqueMatch(devices, (device) =>
    (!stored.kind || kind == 'any' || device.kind == kind) &&
    stored.nodename &&
    stored.protocol &&
    device.nodename == stored.nodename &&
    device.protocol == stored.protocol
  )
  if (byNameAndProtocol)
    return byNameAndProtocol.uid

  let byName = uniqueMatch(devices, (device) =>
    (!stored.kind || kind == 'any' || device.kind == kind) &&
    stored.nodename &&
    device.nodename == stored.nodename
  )
  if (byName)
    return byName.uid

  let bySource = uniqueMatch(devices, (device) =>
    (!stored.kind || kind == 'any' || device.kind == kind) &&
    stored.source &&
    device.source == stored.source
  )
  if (bySource)
    return bySource.uid

  let filtered = devices.filter((device) => kind == 'any' || device.kind == kind)
  if (stored.protocol) {
    let byProtocol = uniqueMatch(filtered, (device) => device.protocol == stored.protocol)
    if (byProtocol)
      return byProtocol.uid
  }

  if (filtered.length == 1)
    return filtered[0].uid

  return fallback
}

function resolveImageSourceSelection (uid, ref) {
  let resolvedUid = resolveStoredConnectedDeviceUid(uid, ref, {
    kind: IMAGE_SOURCE_DEVICE_KIND,
    fallback:uid
  })

  if (resolvedUid && channel.hasConnection(resolvedUid)) {
    return {
      uid: resolvedUid,
      feed: channel.getImageFeed(resolvedUid),
      protocol: channel.connections[resolvedUid] && channel.connections[resolvedUid].currentProtocol ? channel.connections[resolvedUid].currentProtocol : '',
      nodename: '',
      version: ''
    }
  }

  return resolveImageSourceDevice(resolvedUid)
}

async function sendImageSourceCommand (cameraDevice, commandLine) {
  if (!cameraDevice)
    throw new Error(sourceDeviceSelectionError(''))

  if (cameraDevice.uid && channel.hasConnection(cameraDevice.uid)) {
    let connection = channel.connections[cameraDevice.uid]
    if (!connection || !connection.current || typeof connection.current.writeRaw != 'function')
      throw new Error(dashboardMsg('WidgetSerialCameraConnectionFailed', 'Could not connect to the selected camera source device.'))

    await connection.current.writeRaw(`${commandLine}\n`)
    return
  }

  if (cameraDevice.camera && typeof cameraDevice.camera.writeLine == 'function') {
    await cameraDevice.camera.writeLine(commandLine)
    return
  }

  if (cameraDevice.feed && cameraDevice.feed.camera && typeof cameraDevice.feed.camera.writeLine == 'function') {
    await cameraDevice.feed.camera.writeLine(commandLine)
    return
  }

  throw new Error(dashboardMsg('WidgetSerialCameraConnectionFailed', 'Could not connect to the selected camera source device.'))
}

export function triggerImageSourceFeedsFromChunk (chunk) {
  imageSourceRegistry.triggerFromChunk(chunk)
}

export function triggerSharedSerialCameraFeedFromChunk (chunk) {
  triggerImageSourceFeedsFromChunk(chunk)
}

function sendEasyMQTT(topic, message) {
  if (!databaseMQTT.isConnected) {
    console.warn('EasyMQTT is not connected; message not sent.', topic, message)
    if (window.bipes && bipes.page && bipes.page.notification)
      bipes.page.notification.send('EasyMQTT is not connected.')
    return false
  }

  if (easyMQTT.serverBridge === true) {
    databaseMQTT.publish(topic, message)
      .catch((error) => {
        console.warn('EasyMQTT publish failed.', topic, message, error)
        if (window.bipes && bipes.page && bipes.page.notification)
          bipes.page.notification.send('EasyMQTT publish failed.')
      })
    return true
  }

  if (!databaseMQTT.client) {
    console.warn('EasyMQTT is not connected; message not sent.', topic, message)
    return false
  }

  databaseMQTT.client.send(`${easyMQTT.session}/${topic}`, String(message), 0, false)
  return true
}

function sourceDeviceSelectionError (selectedUid) {
  if (selectedUid && channel.hasConnection(selectedUid))
    return dashboardMsg('WidgetSourceDeviceNoImagesYet', 'The selected source device is connected, but it is not sending images yet.')

  return dashboardMsg('WidgetSerialCameraSelectConnectedDevice', 'Connect a compatible camera source device on the Device page and select it in the widget settings.')
}

function connectionMatchesDataFlowTransport (uid, transport = 'auto') {
  if (!transport || transport == 'auto')
    return true

  let connection = channel.connections && channel.connections[uid] ? channel.connections[uid] : null
  let protocol = connection && connection.currentProtocol ? String(connection.currentProtocol).toLowerCase() : ''
  return protocol == transport
}

function consoleTargetDevices(targetDevice, targetDeviceRef = null, transport = 'auto') {
  targetDevice = targetDevice || 'active'

  if (targetDevice == 'all')
    return Object.keys(channel.connections || {})
      .filter((uid) => connectionMatchesDataFlowTransport(uid, transport))

  if (targetDevice == 'active')
    return channel.targetDevice == undefined || !connectionMatchesDataFlowTransport(channel.targetDevice, transport) ? [] : [channel.targetDevice]

  let resolvedTarget = resolveStoredConnectedDeviceUid(targetDevice, targetDeviceRef, {
    kind:'device',
    fallback:targetDevice
  })

  return channel.hasConnection(resolvedTarget) && connectionMatchesDataFlowTransport(resolvedTarget, transport) ? [resolvedTarget] : []
}

function sendConsoleCommand(targetDevice, code, options = {}) {
  let targets = consoleTargetDevices(targetDevice, options.deviceRef || null, options.transport || 'auto')

  if (targets.length === 0) {
    if (!options.quiet)
      bipes.page.notification.send(Msg["NotConnectedWarning"])
    return false
  }

  targets.forEach((deviceUID) => {
    if (options.nonInterrupting) {
      command.dispatch(channel, 'livePush', [
        code,
        deviceUID
      ])
    } else {
      command.dispatch(channel, 'push', [
        code,
        deviceUID, [], command.tabUID
      ])
    }
  })

  return true
}

function dataFlowFormattedOutput (setup, topic, value, fields = {}) {
  let flow = setup && setup.dataFlowId ? dataflow.get(setup.dataFlowId) : null
  let output = flow ? dataflow.flowOutput(flow) : {}
  let format = output.format || 'raw-binary'
  let transport = dataFlowEffectiveTransport(output, setup || {})
  let textValue = String(value)
  let payload

  if (format == 'json') {
    payload = JSON.stringify({
      topic,
      value,
      ...fields
    })
    return {
      mqttTopic:topic,
      mqttMessage:dataFlowWrapPayload(payload, output),
      ...dataFlowDeviceMessage(topic, payload, output, transport, format)
    }
  }

  if (format == 'csv') {
    payload = [topic, value, ...Object.values(fields)].map(dataFlowCsvValue).join(',')
    return {
      mqttTopic:topic,
      mqttMessage:dataFlowWrapPayload(payload, output),
      ...dataFlowDeviceMessage(topic, payload, output, transport, format)
    }
  }

  if (format == 'avro' || format == 'parquet') {
    payload = JSON.stringify({
      format,
      topic,
      value,
      ...fields
    })
    return {
      mqttTopic:topic,
      mqttMessage:dataFlowWrapPayload(payload, output),
      ...dataFlowDeviceMessage(topic, payload, output, transport, format)
    }
  }

  if (format == 'command') {
    let template = output.commandTemplate || `${topic}({value})`
    let commandText = String(template)
      .replace(/\{topic\}/g, topic)
      .replace(/\{message\}/g, textValue)
      .replace(/\{value\}/g, textValue)
    return {
      mqttTopic:topic,
      mqttMessage:commandText,
      ...dataFlowDeviceMessage(topic, commandText, output, transport, format)
    }
  }

  payload = textValue
  return {
    mqttTopic:topic,
    mqttMessage:dataFlowWrapPayload(payload, output),
    ...dataFlowDeviceMessage(topic, payload, output, transport, format)
  }
}

function dataFlowWrapPayload (payload, output = {}) {
  return `${output.header || ''}${payload}${output.footer || ''}`
}

function dataFlowEffectiveTransport (output = {}, setup = {}) {
  let transport = output.transport || 'auto'
  if (transport != 'auto')
    return transport

  let targetDevice = output.targetDevice || setup.targetDevice || 'active'
  let resolvedTarget = ''

  if (targetDevice == 'all')
    return 'auto'
  if (targetDevice == 'active')
    resolvedTarget = channel.targetDevice
  else
    resolvedTarget = resolveStoredConnectedDeviceUid(targetDevice, setup.targetDeviceRef || null, {
      kind:'device',
      fallback:targetDevice
    })

  let connection = resolvedTarget && channel.connections ? channel.connections[resolvedTarget] : null
  return connection && connection.currentProtocol ? String(connection.currentProtocol).toLowerCase() : 'auto'
}

function dataFlowResolvedEnvelope (output = {}, transport = 'auto') {
  let envelope = output.envelope || 'auto'
  if (envelope != 'auto')
    return envelope

  if (transport == 'webbluetooth')
    return 'topic-message-packet'

  return 'function-call'
}

function dataFlowDeviceMessage (topic, payload, output = {}, transport = 'auto', format = 'raw-binary') {
  if (format == 'command') {
    let code = dataFlowWrapPayload(payload, output)
    code = /[\r\n]$/.test(code) ? code : `${code}\r`
    return {
      consoleCode:code,
      deviceCode:code,
      deviceRaw:false
    }
  }

  let envelope = dataFlowResolvedEnvelope(output, transport)
  let code
  let raw = false

  if (envelope == 'raw') {
    code = dataFlowWrapPayload(payload, output)
    raw = true
  } else if (envelope == 'topic-message-packet') {
    code = dataFlowWrapPayload(JSON.stringify({
      topic,
      message:payload
    }), output)
    raw = true
  } else {
    code = dataFlowFunctionCall(topic, payload, output)
  }

  return {
    consoleCode:code,
    deviceCode:code,
    deviceRaw:raw
  }
}

function dataFlowFunctionCall (topic, payload, output = {}) {
  let code = dataFlowWrapPayload(`${topic}(${dataFlowPythonString(payload)})`, output)
  return /[\r\n]$/.test(code) ? code : `${code}\r`
}

function dataFlowPythonString (value) {
  return JSON.stringify(String(value == null ? '' : value))
}

function dataFlowCsvValue (value) {
  let text = String(value == null ? '' : value)
  if (/[",\n\r]/.test(text))
    return `"${text.replace(/"/g, '""')}"`
  return text
}

function dataFlowProcessedOutput (setup) {
  let flow = setup && setup.dataFlowId ? dataflow.get(setup.dataFlowId) : null
  if (!flow || !dataflow.flowHasProcessor(flow))
    return null
  return dataflow.flowOutput(flow)
}

function dataFlowInputNotifyMessage (setup) {
  let flow = setup && setup.dataFlowId ? dataflow.get(setup.dataFlowId) : null
  if (!flow)
    return ''
  let input = dataflow.flowInput(flow)
  if (input.sourceType != 'device' || input.mode != 'notify')
    return ''
  return input.notifyMessage || ''
}

function dataFlowRulePass (output = {}, fields = {}) {
  let metric = output.ruleMetric || 'confidence'
  let operator = output.ruleOperator || '>='
  let expectedText = String(output.ruleValue == null ? '' : output.ruleValue)
  let actual = fields[metric]

  let actualNumber = Number(actual)
  let expectedNumber = Number(expectedText)
  if (Number.isFinite(actualNumber) && Number.isFinite(expectedNumber)) {
    if (operator == '>')
      return actualNumber > expectedNumber
    if (operator == '<=')
      return actualNumber <= expectedNumber
    if (operator == '<')
      return actualNumber < expectedNumber
    if (operator == '==')
      return actualNumber == expectedNumber
    if (operator == '!=')
      return actualNumber != expectedNumber
    return actualNumber >= expectedNumber
  }

  let actualText = String(actual == null ? '' : actual)
  if (operator == '!=')
    return actualText != expectedText
  if (operator == '==')
    return actualText == expectedText
  return false
}

function dataFlowTarget (setup, fallbackTarget) {
  let flow = setup && setup.dataFlowId ? dataflow.get(setup.dataFlowId) : null
  if (flow) {
    let destination = dataflow.flowOutput(flow).destination
    if (destination == 'device')
      return 'Console'
    if (destination == 'mqtt')
      return 'EasyMQTT'
    if (destination == 'none')
      return 'none'
  }
  return fallbackTarget || 'Console'
}

function sendWidgetOutput (setup, topic, value, options = {}) {
  let output = dataFlowFormattedOutput(setup, topic, value, options.fields || {})
  let target = dataFlowTarget(setup, setup.target)
  let flow = setup && setup.dataFlowId ? dataflow.get(setup.dataFlowId) : null
  let flowOut = flow ? dataflow.flowOutput(flow) : {}

  if (target == 'none')
    return false

  if (target == 'EasyMQTT')
    return sendEasyMQTT(output.mqttTopic, output.mqttMessage)

  return sendConsoleCommand(flowOut.targetDevice || setup.targetDevice || 'active', output.deviceCode || output.consoleCode, {
    deviceRef:setup.targetDeviceRef || null,
    transport:flowOut.transport || 'auto',
    quiet:options.quiet,
    nonInterrupting:output.deviceRaw || options.nonInterrupting
  })
}

function isCameraPermissionError(error) {
  if (!error)
    return false

  let name = String(error.name || '')
  let message = String(error.message || error)
  return name == 'NotAllowedError' ||
    message.includes('Permission denied') ||
    message.includes('Permission dismissed')
}

async function imageBlobSignature(blob, response) {
  let etag = response.headers.get('etag')
  let lastModified = response.headers.get('last-modified')

  if (etag || lastModified)
    return `headers:${etag || ''}:${lastModified || ''}:${blob.size}`

  if (window.crypto && window.crypto.subtle) {
    let buffer = await blob.arrayBuffer()
    let digest = await window.crypto.subtle.digest('SHA-256', buffer)
    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('')
  }

  return `blob:${blob.type}:${blob.size}`
}

async function fetchImageEvent(imageUrl, previousSignature) {
  let separator = imageUrl.includes('?') ? '&' : '?'
  let response = await fetch(`${imageUrl}${separator}_=${Date.now()}`, {cache:'no-store'})
  if (!response.ok)
    throw new Error(`Image request failed: ${response.status}`)

  let blob = await response.blob()
  let signature = await imageBlobSignature(blob, response)
  return {
    blob:blob,
    signature:signature,
    changed:signature !== previousSignature
  }
}

/** Handle all plugins types */
export const plugins = {
  types:['charts', 'switches', 'threeStateSwitches', 'buttons', 'ranges', 'gauges', 'coordinates', 'drawings', 'mlClassifiers', 'visionProcessors'],
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
      case 'threeStateSwitch':
        ThreeStateSwitches.include(grid, data, _$)
        break
      case 'button':
        Buttons.include(grid, data, _$)
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
      case 'mlClassifier':
        MLClassifiers.include(grid, data, _$)
        break
      case 'visionProcessor':
        VisionProcessors.include(grid, data, _$)
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
      case 'mlClassifier':
        MLClassifiers.regen(obj, data)
        break
      case 'visionProcessor':
        VisionProcessors.regen(obj, data)
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
    this.setup = data.setup
    this.target = data.setup.target
    this.targetDevice = data.setup.targetDevice || 'active'
    this.targetDeviceRef = data.setup.targetDeviceRef || null
    this.topic = data.setup.topic
    this.messageOn = data.setup.messageOn
    this.messageOff = data.setup.messageOff
    this.state = false
  }
  destroy () {
    this.target = undefined
    this.targetDevice = 'active'
    this.topic = ''
    this.messageOn = ''
    this.messageOff = ''
    this.state = false
    this.dom.removeChilds()

    delete this
  }
  command () {
    if (this.target == 'EasyMQTT'){
      if (!this.state) {
        if (!sendWidgetOutput(this.setup, this.topic, this.messageOn))
          return
        this.dom.$.classList.add('on')
      } else {
        if (!sendWidgetOutput(this.setup, this.topic, this.messageOff))
          return
        this.dom.$.classList.remove('on')
      }
      this.state = !this.state
    } else if  (this.target == 'Console'){
      if (!this.state) {
        if (!sendWidgetOutput(this.setup, this.topic, this.messageOn))
          return
        this.dom.$.classList.add('on')
      } else {
        if (!sendWidgetOutput(this.setup, this.topic, this.messageOff))
          return
        this.dom.$.classList.remove('on')
      }
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

class ThreeStateSwitches {
  constructor (data, dom){
    // Migrate old labelOne/Two/Three format to label1/2/3
    let s = data.setup
    if (s.labelOne !== undefined) {
      s.label1 = s.labelOne;   s.message1 = s.messageOne
      s.label2 = s.labelTwo;   s.message2 = s.messageTwo
      s.label3 = s.labelThree; s.message3 = s.messageThree
      delete s.labelOne; delete s.labelTwo; delete s.labelThree
      delete s.messageOne; delete s.messageTwo; delete s.messageThree
    }

    this.sid = data.sid
    this.dom = dom
    this.setup = s
    this.target = s.target
    this.targetDevice = s.targetDevice || 'active'
    this.targetDeviceRef = s.targetDeviceRef || null
    this.topic = s.topic
    this.numStates = 3
    this.labels = []
    this.messages = []
    for (let i = 1; i <= this.numStates; i++) {
      this.labels.push(String(s[`label${i}`] || `State ${i}`))
      this.messages.push(String(s[`message${i}`] || String(i - 1)))
    }
    this.state = this._clampState(s.defaultState)
    this.buttons = []
  }
  destroy () {
    this.target = undefined
    this.targetDevice = 'active'
    this.topic = ''
    this.labels = []
    this.messages = []
    this.state = 0
    this.buttons = []
    this.dom.removeChilds()

    delete this
  }
  _clampState (state) {
    state = Number(state)
    if (!Number.isInteger(state))
      return 0
    return Math.min(this.numStates - 1, Math.max(0, state))
  }
  _setState (state) {
    this.state = this._clampState(state)
    this.buttons.forEach((button, index) => {
      button.$.classList.toggle('on', index === this.state)
    })
  }
  _send (message) {
    return sendWidgetOutput(this.setup, this.topic, message)
  }
  command (state) {
    state = this._clampState(state)
    if (!this._send(this.messages[state]))
      return
    this._setState(state)
  }
  static threeStateSwitch (data, dom) {
    let _ThreeStateSwitches = new ThreeStateSwitches(data, dom)
    let title = new DOM('h2', {innerText: data.setup.title}),
      subtitle = new DOM('h3', {innerText: data.setup.subtitle}),
      buttons = new DOM('span', {className:'choices'})

    _ThreeStateSwitches.labels.forEach((label, index) => {
      let button = new DOM('button', {
        type:'button',
        innerText: label
      }).onclick(_ThreeStateSwitches, _ThreeStateSwitches.command, [index])

      _ThreeStateSwitches.buttons.push(button)
      buttons.append(button)
    })

    dom.append([
      title,
      subtitle,
      buttons
    ])
    _ThreeStateSwitches._setState(_ThreeStateSwitches.state)

    return _ThreeStateSwitches
  }
  static regen (obj, data) {
    for (const index in obj.threeStateSwitches) {
      if (obj.threeStateSwitches[index].sid == data.sid) {
        obj.threeStateSwitches[index].destroy()
        obj.threeStateSwitches[index] = ThreeStateSwitches.threeStateSwitch(data, data.target)
      }
    }
  }
  static include (grid, data, _$){
    data.target = new DOM('span', {className:'press'})
    let content3 = new DOM('div')
      .append([
        _$.grab,
        _$.remove,
        data.target,
      ])
    let container3 = new DOM('div', {sid:data.sid, className:'three-state-switch tiny'})
      .append(content3)

    grid.muuri.add(container3.$)
    grid.threeStateSwitches.push(ThreeStateSwitches.threeStateSwitch(data, data.target))

    data.target.onevent('contextmenu', grid, (ev) => {
      ev.preventDefault()
      DOM.switchState(grid.parent.$.dashboard)
    })
    _$.grab.onclick(grid, grid.edit, [data, container3])
  }
}

export class Buttons {
  constructor (data, dom){
    this.sid = data.sid
    this.dom = dom
    this.setup = data.setup
    this.target = data.setup.target
    this.targetDevice = data.setup.targetDevice || 'active'
    this.targetDeviceRef = data.setup.targetDeviceRef || null
    this.topic = data.setup.topic
    this.message = data.setup.message
  }
  destroy () {
    this.target = undefined
    this.targetDevice = 'active'
    this.topic = ''
    this.message = ''
    this.dom.removeChilds()

    delete this
  }
  command () {
    if (!sendWidgetOutput(this.setup, this.topic, this.message))
      return
    this.dom.$.classList.add('on')
    setTimeout(() => this.dom.$.classList.remove('on'), 200)
  }
  static button (data, dom) {
    let _Buttons = new Buttons (data, dom)
    let title = new DOM('h2', {innerText: data.setup.title}),
     subtitle = new DOM('h3', {innerText: data.setup.subtitle})
   dom.onclick(_Buttons, _Buttons.command)

    dom.append ([
      title,
      subtitle
      ])
    return _Buttons
  }
  static regen (obj, data) {
    for (const index in obj.buttons) {
      if (obj.buttons[index].sid == data.sid) {
        obj.buttons[index].destroy ()
        obj.buttons[index] = Buttons.button(data, data.target)
      }
    }
  }
  static include (grid, data, _$){
    data.target = new DOM('button', {className:'press'})
    let content3 = new DOM('div')
      .append([
        _$.grab,
	      _$.remove,
	      data.target,
      ])
    let container3 = new DOM('div', {sid:data.sid, className:'button tiny'})
      .append(content3)

    grid.muuri.add(container3.$)
    grid.buttons.push(Buttons.button(data, data.target))

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
    this.setup = data.setup
    this.target = data.setup.target
    this.targetDevice = data.setup.targetDevice || 'active'
    this.targetDeviceRef = data.setup.targetDeviceRef || null
    this.topic = data.setup.topic
    this.minValue = Number(data.setup.minValue)
    this.maxValue = Number(data.setup.maxValue)
    this.step = Number(data.setup.step)

    this.precision = String(data.setup.step).includes('.') ?
                     data.setup.step.split('.')[1].length : 0
  }
  destroy (){
    this.target = undefined
    this.targetDevice = 'active'
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

    sendWidgetOutput(this.setup, this.topic, value)
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
    this.setup = data.setup
    this.target = data.setup.target
    this.targetDevice = data.setup.targetDevice || 'active'
    this.targetDeviceRef = data.setup.targetDeviceRef || null
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
    this.targetDevice = 'active'
    this.topic = ''
    this.canvas = undefined
    this.dom.removeChilds()
    delete this
  }
  /**
   * Send coordinate command
   */
  sendCommand (x, y) {
    sendWidgetOutput(this.setup, this.topic, `${x},${y}`, {fields:{x, y}})
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
      const content = dom.$
      if (!content)
        return

      const style = window.getComputedStyle(content)
      const paddingX = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight)
      const paddingY = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom)
      const titleHeight = title.$.offsetHeight || 16
      const gap = 8
      const availableWidth = content.clientWidth - paddingX
      const availableHeight = content.clientHeight - paddingY - titleHeight - gap
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
    this.setup = data.setup
    this.target = data.setup.target
    this.targetDevice = data.setup.targetDevice || 'active'
    this.targetDeviceRef = data.setup.targetDeviceRef || null
    this.filename = data.setup.filename || 'drawing.gcode'
    this.topic = data.setup.topic || ''
    this.startMessage = data.setup.startMessage || 'start'
    this.homeMessage = data.setup.homeMessage || 'home'
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
    this.targetDevice = 'active'
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
    }
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
      const targets = consoleTargetDevices(this.targetDevice, this.targetDeviceRef)

      if (targets.length === 0) {
        bipes.page.notification.send(Msg["NotConnectedWarning"])
        return
      }

      targets.forEach((deviceUID) => {
        command.dispatch(channel, 'push', [
          `f = open('${filename}', 'w')\r`,
          deviceUID, [], command.tabUID
        ])

        setTimeout(() => {
          command.dispatch(channel, 'push', [
            `f.write('${escaped}')\r`,
            deviceUID, [], command.tabUID
          ])
        }, 200)

        setTimeout(() => {
          command.dispatch(channel, 'push', [
            `f.close()\r`,
            deviceUID, [], command.tabUID
          ])
          console.log(`Uploaded ${filename} with ${this.points.length} points`)
        }, 400)

        setTimeout(() => {
          command.dispatch(channel, 'rawPush', [
            '\x04',
            deviceUID, [], command.tabUID
          ])
        }, 600)
      })
    }
  }
  /**
   * Send start command to Pico
   */
  start () {
    sendWidgetOutput(this.setup, this.topic, this.startMessage)
  }
  /**
   * Send homing command to Pico
   */
  home () {
    sendWidgetOutput(this.setup, this.topic, this.homeMessage)
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

    let clearBtn = new DOM('button', {innerText: dashboardMsg('WidgetClear', 'Clear'), className: 'noicon'})
    clearBtn.$.addEventListener('click', () => _Drawings.clear())

    let undoBtn = new DOM('button', {innerText: dashboardMsg('WidgetUndo', 'Undo'), className: 'noicon'})
    undoBtn.$.addEventListener('click', () => _Drawings.undo())

    let uploadBtn = new DOM('button', {innerText: dashboardMsg('WidgetUpload', 'Upload'), className: 'noicon'})
    uploadBtn.$.addEventListener('click', () => _Drawings.upload())

    let startBtn = new DOM('button', {innerText: dashboardMsg('WidgetStart', 'Start'), className: 'noicon'})
    startBtn.$.addEventListener('click', () => _Drawings.start())

    let homeBtn = new DOM('button', {innerHTML: '&#127968;', className: 'noicon', title: dashboardMsg('WidgetHome', 'Home')})
    homeBtn.$.addEventListener('click', () => _Drawings.home())

    buttons.append([clearBtn, undoBtn, uploadBtn, startBtn, homeBtn])

    dom.append([
      title,
      _Drawings.canvas,
      buttons
    ])

    // Resize canvas to fit container
    _Drawings.resize = () => {
      const content = dom.$
      if (!content)
        return

      const style = window.getComputedStyle(content)
      const paddingX = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight)
      const paddingY = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom)
      const titleHeight = title.$.offsetHeight || 16
      const buttonsHeight = buttons.$.offsetHeight || 30
      const gap = 12
      const availableWidth = content.clientWidth - paddingX
      const availableHeight = content.clientHeight - paddingY - titleHeight - buttonsHeight - gap
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

class MLClassifiers {
  constructor (data, dom){
    this.sid = data.sid
    this.dom = dom
    this.setup = data.setup
    this.workspaceId = data.setup.workspaceId || ''
    this.source = data.setup.source || 'Webcam'
    this.sourceDevice = data.setup.sourceDevice || ''
    this.sourceDeviceRef = data.setup.sourceDeviceRef || null
    this.imageUrl = data.setup.imageUrl || ''
    this.inputSources = data.setup.inputSources || '{}'
    this.intervalMs = Math.max(200, Number(data.setup.intervalMs) || 1000)
    this.streamFps = streamFpsValue(data.setup.streamFps)
    this.triggerMode = data.setup.triggerMode || 'interval'
    this.confidence = Math.max(0, Math.min(1, Number(data.setup.confidence) || 0.65))
    this.target = data.setup.target || 'Console'
    this.targetDevice = data.setup.targetDevice || 'active'
    this.targetDeviceRef = data.setup.targetDeviceRef || null
    this.topic = data.setup.topic || 'ml'
    this.messageTemplate = data.setup.messageTemplate || '{label}'
    this.sendMode = data.setup.sendMode || 'changed'
    this.running = false
    this.busy = false
    this.timer = undefined
    this.stream = undefined
    this.lastPrediction = null
    this.lastSentLabel = undefined
    this.lastImageSignature = undefined
    this.inputImageSignatures = {}
    this.objectUrl = undefined
    this.serialFeedUnsubscribe = undefined
    this.serialCameraDevice = undefined
    this.targetTriggerUnsubscribe = undefined
    this.targetTriggerBuffer = ''
  }
  destroy () {
    this.stop()
    this.revokeObjectUrl()
    this.dom.removeChilds()
    delete this
  }
  workspace () {
    return this.workspaceId ? ml.tree[this.workspaceId] || null : null
  }
  runtime () {
    return this.workspaceId ? ml.getWorkspaceSession(this.workspaceId) : null
  }
  trainedModel () {
    let runtime = this.runtime()
    return runtime ? runtime.trainedModel : null
  }
  setStatus (text) {
    if (this.status)
      this.status.innerText = text
  }
  setPreviewRatio (width, height) {
    if (!this.previewFrame || !width || !height)
      return
    this.previewFrame.$.style.setProperty('--dashboard-media-ratio', `${width} / ${height}`)
  }
  setPrediction (prediction) {
    this.lastPrediction = prediction
    if (!this.prediction)
      return

    if (!prediction) {
      this.prediction.innerText = dashboardMsg('MLNoPredictionYet', 'No prediction yet')
      this.prediction.$.classList.remove('ready')
      return
    }

    let confidence = Math.round(prediction.confidence * 100)
    this.prediction.innerText = `${prediction.label} (${confidence}%)`
    this.prediction.$.classList.toggle('ready', prediction.confidence >= this.confidence)
  }
  revokeObjectUrl () {
    if (!this.objectUrl)
      return
    URL.revokeObjectURL(this.objectUrl)
    this.objectUrl = undefined
  }
  validate () {
    let workspace = this.workspace()
    if (!workspace)
      return dashboardMsg('MLChooseModel', 'Choose ML model')
    if (workspace.kind === 'audio')
      return dashboardMsg('MLAudioWidgetUnsupported', 'Audio models are not supported in this dashboard widget yet.')
    if (!this.trainedModel())
      return dashboardMsg('MLTrainBeforeWidget', 'Train this ML model before starting the widget.')
    if (this.source == 'Image URL' && !this.imageUrl)
      return dashboardMsg('WidgetAddImageURL', 'Add an image URL in the widget settings.')
    if (isSerialCameraSource(this.source) && !('serial' in navigator))
      return dashboardMsg('WidgetSerialCameraUnsupported', 'Web Serial is not supported in this browser. Use Chrome or Edge over HTTPS.')
    return ''
  }
  selectWorkspace (workspaceId) {
    this.workspaceId = workspaceId
    this.data.setup.workspaceId = workspaceId
    this.lastPrediction = null
    this.lastSentLabel = undefined
    this.lastImageSignature = undefined
    this.setPrediction(null)
    this.stop()

    let error = this.validate()
    this.setStatus(error || dashboardMsg('MLModelReadyStatus', 'Model ready'))

    if (window.bipes && bipes.page && bipes.page.dashboard)
      bipes.page.dashboard.commit()
  }
  async start () {
    let error = this.validate()
    if (error) {
      this.setStatus(error)
      return
    }

    if (this.running)
      return

    this.running = true
    this.lastSentLabel = undefined
    this.lastImageSignature = undefined
    this.startButton.innerText = dashboardMsg('WidgetStop', 'Stop')
    this.setStatus(dashboardMsg('WidgetStarting', 'Starting...'))

    if (this.source == 'Webcam') {
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({video:true, audio:false})
        this.video.$.srcObject = this.stream
        await this.video.$.play()
        this.setPreviewRatio(this.video.$.videoWidth, this.video.$.videoHeight)
		      } catch (error) {
	        if (!isCameraPermissionError(error))
	          console.error(error)
	        this.stop()
	        this.setStatus(dashboardMsg('WidgetWebcamPermissionDenied', 'Webcam permission was denied. Allow camera access and press Start again.'))
	        return
	      }
    } else if (isSerialCameraSource(this.source)) {
      try {
        this.serialCameraDevice = resolveImageSourceSelection(this.sourceDevice, this.sourceDeviceRef)
        if (!this.serialCameraDevice)
      throw new Error(sourceDeviceSelectionError(this.sourceDevice))
        console.info('ML serial camera feed mode:', this.triggerMode, 'interval:', this.intervalMs, 'fps:', this.streamFps)
        this.serialFeedUnsubscribe = this.serialCameraDevice.feed.subscribe(() => this.tick(), {
          mode:sourceFeedSubscriptionMode(this.source, this.triggerMode),
          intervalMs:this.intervalMs
        })
        if (this.triggerMode == 'newImage')
          this.targetTriggerUnsubscribe = channel.subscribeText((chunk, uid) => this.handleTargetTriggerChunk(chunk, uid))
        if (isSourceStreamingMode(this.source, this.triggerMode))
          this.startSourceStream()
      } catch (error) {
        console.error(error)
        this.stop()
        this.setStatus(error.message || dashboardMsg('WidgetSerialCameraConnectionFailed', 'Could not connect to the selected camera source device.'))
        return
      }
    }

    this.setStatus(dashboardMsg('WidgetRunning', 'Running'))
    if (isSerialCameraSource(this.source)) {
      this.setStatus(serialSourceWaitingStatus(this.serialCameraDevice ? this.serialCameraDevice.feed : undefined, this.triggerMode))
    } else {
      this.tick()
      this.timer = setInterval(() => this.tick(), this.intervalMs)
    }
  }
  stop () {
    if (isSourceStreamingMode(this.source, this.triggerMode))
      this.stopSourceStream()

    this.running = false
    this.busy = false
    if (this.timer)
      clearInterval(this.timer)
    this.timer = undefined
    if (this.serialFeedUnsubscribe) {
      this.serialFeedUnsubscribe()
      this.serialFeedUnsubscribe = undefined
    }
    if (this.targetTriggerUnsubscribe) {
      this.targetTriggerUnsubscribe()
      this.targetTriggerUnsubscribe = undefined
    }
    this.serialCameraDevice = undefined
    this.targetTriggerBuffer = ''

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop())
      this.stream = undefined
    }

    if (this.video)
      this.video.$.srcObject = null
    if (this.startButton)
      this.startButton.innerText = dashboardMsg('WidgetStart', 'Start')
    this.setStatus(dashboardMsg('WidgetStopped', 'Stopped'))
  }
  toggle () {
    if (this.running)
      this.stop()
    else
      this.start()
  }
  targetTriggerDeviceIds () {
    return new Set(consoleTargetDevices(this.targetDevice, this.targetDeviceRef))
  }
  handleTargetTriggerChunk (chunk, uid) {
    if (!this.running || !isSerialCameraSource(this.source) || this.triggerMode != 'newImage')
      return

    let targets = this.targetTriggerDeviceIds()
    if (!uid || !targets.has(uid))
      return

    this.targetTriggerBuffer = `${this.targetTriggerBuffer}${chunk}`.slice(-4096)
    let lines = this.targetTriggerBuffer.split(/\r?\n/)
    this.targetTriggerBuffer = lines.pop() || ''

    for (let line of lines) {
      let sourceCommand = sourceStreamCommandFromLine(line)
      if (sourceCommand) {
        this.sendSourceCommand(sourceCommand)
        return
      }

      if (!isImageTriggerLine(line, dataFlowInputNotifyMessage(this.setup)))
        continue

      this.requestImageFromSource()
      return
    }
  }
  sendSourceCommand (sourceCommand) {
    let cameraDevice = this.serialCameraDevice || resolveImageSourceSelection(this.sourceDevice, this.sourceDeviceRef)
    if (!cameraDevice)
      return

    this.setStatus(dashboardMsg('WidgetForwardingSourceCommand', 'Forwarding source command: {0}', sourceCommand))
    sendImageSourceCommand(cameraDevice, sourceCommand).catch((error) => {
      console.error(error)
      if (this.running)
        this.setStatus(error.message || dashboardMsg('WidgetSerialCameraConnectionFailed', 'Could not connect to the selected camera source device.'))
    })
  }
  startSourceStream () {
    this.sendSourceCommand(`STREAM ${this.streamFps}`)
  }
  stopSourceStream () {
    let cameraDevice = this.serialCameraDevice || resolveImageSourceSelection(this.sourceDevice, this.sourceDeviceRef)
    if (!cameraDevice)
      return

    sendImageSourceCommand(cameraDevice, 'STOP_STREAM').catch((error) => {
      console.error(error)
    })
  }
  requestImageFromSource () {
    let cameraDevice = this.serialCameraDevice || resolveImageSourceSelection(this.sourceDevice, this.sourceDeviceRef)
    if (!cameraDevice || !cameraDevice.feed)
      return

    this.setStatus(dashboardMsg('WidgetRequestingSourceImage', 'Requesting an image from the source device...'))
    cameraDevice.feed.requestFrame().catch((error) => {
      console.error(error)
      if (this.running)
        this.setStatus(error.message || dashboardMsg('WidgetSerialCameraConnectionFailed', 'Could not connect to the selected camera source device.'))
    })
  }
  async tick () {
    if (!this.running || this.busy)
      return

    this.busy = true
    try {
      let prediction = await this.predict()
      if (typeof prediction == 'undefined')
        return
      this.setPrediction(prediction)
      this.maybeSend(prediction)
    } catch (error) {
      console.error(error)
      if (isSerialCameraSource(this.source))
        this.stop()
      this.setStatus(error.message || dashboardMsg('MLPredictionFailed', 'Prediction failed.'))
    } finally {
      this.busy = false
    }
  }
  async predict () {
    let workspace = this.workspace()
    let model = this.trainedModel()
    if (!workspace || !model)
      return null

    if (this.source == 'Webcam') {
      if (!this.video.$.videoWidth || this.video.$.readyState < 2)
        return null
      let vector = await ml.videoElementToVector(workspace.kind, this.video.$)
      return ml.predictVector(model, vector)
    }

    let imageEvent
    if (isSerialCameraSource(this.source)) {
      this.setStatus(dashboardMsg('WidgetSerialCameraCapturing', 'Capturing from camera source...'))
      let cameraDevice = this.serialCameraDevice || resolveImageSourceSelection(this.sourceDevice, this.sourceDeviceRef)
      if (!cameraDevice) {
        this.setStatus(sourceDeviceSelectionError(this.sourceDevice))
        return undefined
      }
      imageEvent = cameraDevice.feed.getLatestFrame()
      if (!imageEvent) {
        this.setStatus(serialSourceWaitingStatus(cameraDevice.feed, this.triggerMode))
        return undefined
      }
      if (imageEvent.signature == this.lastImageSignature) {
        this.setStatus(serialSourceWaitingStatus(cameraDevice.feed, this.triggerMode))
        return undefined
      }
    } else {
      imageEvent = await fetchImageEvent(this.imageUrl, this.lastImageSignature)
    }

    if (this.triggerMode == 'newImage' && !imageEvent.changed) {
      this.setStatus(serialSourceWaitingStatus(this.serialCameraDevice ? this.serialCameraDevice.feed : undefined, this.triggerMode))
      return undefined
    }
    this.lastImageSignature = imageEvent.signature

    this.revokeObjectUrl()
    this.objectUrl = URL.createObjectURL(imageEvent.blob)
    this.preview.$.src = this.objectUrl
    return ml.predictSample(workspace.kind, model, imageEvent.blob)
  }
  formatMessage (prediction) {
    let confidence = Math.round(prediction.confidence * 100)
    return String(this.messageTemplate)
      .replace(/\{label\}/g, prediction.label)
      .replace(/\{confidence\}/g, String(confidence))
      .replace(/\{confidenceRaw\}/g, String(prediction.confidence))
      .replace(/\{workspace\}/g, this.workspace() ? this.workspace().name : '')
  }
  sendPrediction () {
    if (!this.lastPrediction) {
      this.setStatus(dashboardMsg('MLNoPredictionToSend', 'No prediction to send yet.'))
      return false
    }

    if (this.lastPrediction.confidence < this.confidence) {
      this.setStatus(dashboardMsg('MLPredictionBelowThreshold', 'Prediction is below the confidence threshold.'))
      return false
    }

    return this.send(this.lastPrediction)
  }
  maybeSend (prediction) {
    let dataFlowOutput = dataFlowProcessedOutput(this.setup)
    if (dataFlowOutput) {
      if (!prediction || dataFlowOutput.sendPolicy == 'manual')
        return
      if (dataFlowOutput.sendPolicy == 'onChange' && prediction.label == this.lastSentLabel)
        return
      if (dataFlowOutput.sendPolicy == 'onRule' && !dataFlowRulePass(dataFlowOutput, {
        label:prediction.label,
        confidence:prediction.confidence,
        confidenceRaw:prediction.confidence,
        confidencePercent:Math.round(prediction.confidence * 100)
      }))
        return
      this.send(prediction)
      return
    }

    if (!prediction || prediction.confidence < this.confidence || this.sendMode == 'manual')
      return

    if (this.sendMode == 'changed' && prediction.label == this.lastSentLabel)
      return

    this.send(prediction)
  }
  send (prediction) {
    let message = this.formatMessage(prediction)
    let sent = sendWidgetOutput(this.setup, this.topic, message, {
      quiet:true,
      nonInterrupting:true,
      fields:{
        label:prediction.label,
        confidence:Math.round(prediction.confidence * 100),
        confidenceRaw:prediction.confidence
      }
    })

    if (sent) {
      this.lastSentLabel = prediction.label
      this.setStatus(dashboardMsg('WidgetSent', 'Sent: {0}', message))
    }

    return sent
  }
  async captureSerialPreview () {
    if (!isSerialCameraSource(this.source)) {
      this.setStatus(dashboardMsg('WidgetChooseSerialCameraSource', 'Choose Source device as the image source first.'))
      return false
    }

    try {
      let cameraDevice = resolveImageSourceSelection(this.sourceDevice, this.sourceDeviceRef)
      if (!cameraDevice) {
        this.setStatus(sourceDeviceSelectionError(this.sourceDevice))
        return false
      }
      this.setStatus(dashboardMsg('WidgetSerialCameraCapturing', 'Capturing from camera source...'))
      let imageEvent = await cameraDevice.feed.getFrame((message) => this.setStatus(message))
      this.lastImageSignature = imageEvent.signature
      this.revokeObjectUrl()
      this.objectUrl = URL.createObjectURL(imageEvent.blob)
      this.preview.$.src = this.objectUrl
      this.video.$.style.display = 'none'
      this.preview.$.style.display = ''
      this.setStatus(dashboardMsg('WidgetSerialCameraCapturedBytes', 'Captured image from camera source ({0} bytes).', imageEvent.byteLength || imageEvent.blob.size))
      return true
    } catch (error) {
      console.error(error)
      this.setStatus(error.message || dashboardMsg('WidgetSerialCameraConnectionFailed', 'Could not connect to the selected camera source device.'))
      return false
    }
  }
  static mlClassifier (data, dom) {
    let _MLClassifiers = new MLClassifiers(data, dom)
    _MLClassifiers.data = data
    let title = new DOM('h2', {innerText:data.setup.title || dashboardMsg('MLClassifierTitle', 'ML Classifier')})
    let modelSelect = new DOM('select')

    modelSelect.append(new DOM('option', {
      value:'',
      innerText:dashboardMsg('MLChooseModel', 'Choose ML model')
    }))

    Object.keys(ml.tree || {}).forEach((workspaceId) => {
      let workspace = ml.tree[workspaceId]
      let label = `${workspace.name || dashboardMsg('MLModelFallback', 'ML model')}${workspace.kind ? ' (' + workspace.kind + ')' : ''}`
      let option = new DOM('option', {
        value:workspaceId,
        innerText:label
      })
      modelSelect.append(option)
    })

    modelSelect.$.value = _MLClassifiers.workspaceId
    modelSelect.$.addEventListener('change', () => {
      _MLClassifiers.selectWorkspace(modelSelect.$.value)
    })

    _MLClassifiers.video = new DOM('video', {
      autoplay:true
    })
    _MLClassifiers.preview = new DOM('img', {
      alt:dashboardMsg('MLImageSourceAlt', 'ML image source')
    })
    _MLClassifiers.video.$.muted = true
    _MLClassifiers.video.$.playsInline = true
    _MLClassifiers.preview.$.alt = dashboardMsg('MLImageSourceAlt', 'ML image source')
    _MLClassifiers.preview.$.onload = () => {
      _MLClassifiers.setPreviewRatio(
        _MLClassifiers.preview.$.naturalWidth,
        _MLClassifiers.preview.$.naturalHeight
      )
    }
    _MLClassifiers.prediction = new DOM('h3', {innerText:dashboardMsg('MLNoPredictionYet', 'No prediction yet')})
    _MLClassifiers.status = new DOM('p', {innerText:dashboardMsg('WidgetStopped', 'Stopped')})
    _MLClassifiers.startButton = new DOM('button', {innerText:dashboardMsg('WidgetStart', 'Start'), className:'noicon'})
      .onclick(_MLClassifiers, _MLClassifiers.toggle)
    let testCameraButton = new DOM('button', {
      innerText:dashboardMsg('WidgetTestCamera', 'Test camera'),
      className:'noicon'
    }).onclick(_MLClassifiers, _MLClassifiers.captureSerialPreview)
    if (!isSerialCameraSource(_MLClassifiers.source))
      testCameraButton.$.style.display = 'none'
    let sendButton = new DOM('button', {innerText:dashboardMsg('WidgetSend', 'Send'), className:'noicon'})
      .onclick(_MLClassifiers, _MLClassifiers.sendPrediction)

    if (_MLClassifiers.source == 'Webcam')
      _MLClassifiers.preview.$.style.display = 'none'
    else
      _MLClassifiers.video.$.style.display = 'none'

    _MLClassifiers.previewFrame = new DOM('div', {className:'ml-preview'}).append([
      _MLClassifiers.video,
      _MLClassifiers.preview
    ])

    dom.append([
      title,
      modelSelect,
      _MLClassifiers.previewFrame,
      _MLClassifiers.prediction,
      _MLClassifiers.status,
      new DOM('div', {className:'ml-buttons'}).append([
        testCameraButton,
        _MLClassifiers.startButton,
        sendButton
      ])
    ])

    let error = _MLClassifiers.validate()
    if (error)
      _MLClassifiers.setStatus(error)

    return _MLClassifiers
  }
  static regen (obj, data) {
    for (const index in obj.mlClassifiers) {
      if (obj.mlClassifiers[index].sid == data.sid) {
        obj.mlClassifiers[index].destroy()
        obj.mlClassifiers[index] = MLClassifiers.mlClassifier(data, data.target)
      }
    }
  }
  static include (grid, data, _$){
    data.target = new DOM('span')
    let content = new DOM('div')
      .append([
        _$.grab,
        _$.remove,
        data.target,
      ])
    let container = new DOM('div', {sid:data.sid, className:'ml-classifier square'})
      .append(content)

    grid.muuri.add(container.$)
    grid.mlClassifiers.push(MLClassifiers.mlClassifier(data, data.target))

    data.target.onevent('contextmenu', grid, (ev) => {
      ev.preventDefault()
      DOM.switchState(grid.parent.$.dashboard)
    })
    _$.grab.onclick(grid, grid.edit, [data, container])
  }
}

class VisionProcessors {
  constructor (data, dom){
    this.sid = data.sid
    this.dom = dom
    this.data = data
    this.setup = data.setup
    this.setupId = data.setup.setupId || 'current'
    this.source = data.setup.source || 'Image URL'
    this.sourceDevice = data.setup.sourceDevice || ''
    this.sourceDeviceRef = data.setup.sourceDeviceRef || null
    this.imageUrl = data.setup.imageUrl || ''
    this.intervalMs = Math.max(200, Number(data.setup.intervalMs) || 1000)
    this.streamFps = streamFpsValue(data.setup.streamFps)
    this.triggerMode = data.setup.triggerMode || 'newImage'
    this.metric = data.setup.metric || 'whitePercent'
    this.threshold = Number(data.setup.threshold)
    if (!Number.isFinite(this.threshold))
      this.threshold = 0.02
    this.target = data.setup.target || 'Console'
    this.targetDevice = data.setup.targetDevice || 'active'
    this.targetDeviceRef = data.setup.targetDeviceRef || null
    this.topic = data.setup.topic || 'vision'
    this.messageTemplate = data.setup.messageTemplate || '{state}'
    this.sendMode = data.setup.sendMode || 'changed'
    this.autoStart = data.setup.autoStart !== 'false'
    this.debugView = data.setup.debugView !== 'false'
    this.running = false
    this.busy = false
    this.timer = undefined
    this.stream = undefined
    this.lastResult = null
    this.lastDetected = undefined
    this.lastImageSignature = undefined
    this.serialFeedUnsubscribe = undefined
    this.serialCameraDevice = undefined
    this.targetTriggerUnsubscribe = undefined
    this.targetTriggerBuffer = ''
  }
  destroy () {
    this.stop()
    this.dom.removeChilds()
    delete this
  }
  setStatus (text) {
    if (this.status)
      this.status.innerText = text
  }
  setPreviewRatio (width, height) {
    if (!this.previewFrame || !width || !height)
      return
    this.previewFrame.$.style.setProperty('--dashboard-media-ratio', `${width} / ${height}`)
  }
  resultOutput (result) {
    return result && result.output ? result.output : null
  }
  resultDetected (result) {
    let output = this.resultOutput(result)
    if (output && output.fields && typeof output.fields.detected != 'undefined')
      return Boolean(output.fields.detected)
    return result && result.metrics ? this.isDetected(result.metrics) : false
  }
  resultValue (result) {
    let output = this.resultOutput(result)
    if (output && typeof output.value != 'undefined')
      return String(output.value)
    return result && result.metrics ? this.formatNumber(this.metricValue(result.metrics)) : ''
  }
  resultSummary (result) {
    let output = this.resultOutput(result)
    if (output) {
      if (output.text)
        return output.text
      if (typeof output.value != 'undefined') {
        if (output.type)
          return `${output.type}: ${output.value}`
        return String(output.value)
      }
      if (output.type)
        return output.type
    }

    if (result && result.metrics)
      return `${this.metric}: ${this.formatNumber(this.metricValue(result.metrics))}`

    return dashboardMsg('VisionNoResultYet', 'No result yet')
  }
  setResult (result) {
    this.lastResult = result
    if (!this.result)
      return

    if (!result || (!result.metrics && !result.output)) {
      this.result.innerText = dashboardMsg('VisionNoResultYet', 'No result yet')
      this.result.$.classList.remove('ready')
      return
    }

    let detected = this.resultDetected(result)
    this.result.innerText = this.resultSummary(result)
    this.result.$.classList.toggle('ready', detected)
  }
  metricValue (metrics) {
    let value = metrics[this.metric]
    return Number.isFinite(value) ? value : 0
  }
  isDetected (metrics) {
    return this.metricValue(metrics) >= this.threshold
  }
  validate () {
    if (this.source == 'Image URL' && !this.imageUrl)
      return dashboardMsg('WidgetAddImageURL', 'Add an image URL in the widget settings.')
    let routes = this.inputSourceRoutes()
    if (routes.error)
      return routes.error
    for (let inputId of Object.keys(routes.map)) {
      let route = routes.map[inputId]
      let routeSource = route.source || this.source
      if (routeSource == 'Image URL' && !(route.imageUrl || this.imageUrl))
        return dashboardMsg('WidgetAddImageURL', 'Add an image URL in the widget settings.')
      if (isSerialCameraSource(routeSource) && !('serial' in navigator))
        return dashboardMsg('WidgetSerialCameraUnsupported', 'Web Serial is not supported in this browser. Use Chrome or Edge over HTTPS.')
    }
    if (isSerialCameraSource(this.source) && !('serial' in navigator))
      return dashboardMsg('WidgetSerialCameraUnsupported', 'Web Serial is not supported in this browser. Use Chrome or Edge over HTTPS.')
    if (!vision.getSetup(this.setupId))
      return dashboardMsg('VisionChooseSetup', 'Choose a vision setup.')
    return ''
  }
  selectSetup (setupId) {
    this.setupId = setupId
    this.data.setup.setupId = setupId
    this.lastResult = null
    this.lastDetected = undefined
    this.lastImageSignature = undefined
    this.inputImageSignatures = {}
    this.setResult(null)
    this.stop()
    let error = this.validate()
    this.setStatus(error || dashboardMsg('VisionSetupReady', 'Vision setup ready'))

    if (window.bipes && bipes.page && bipes.page.dashboard)
      bipes.page.dashboard.commit()

    if (!error && this.autoStart)
      this.start()
  }
  async start () {
    let error = this.validate()
    if (error) {
      this.setStatus(error)
      return
    }

    if (this.running)
      return

    this.running = true
    this.lastDetected = undefined
    this.lastImageSignature = undefined
    this.startButton.innerText = dashboardMsg('WidgetStop', 'Stop')
    this.setStatus(dashboardMsg('WidgetStarting', 'Starting...'))

    if (this.usesWebcamSource()) {
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({video:true, audio:false})
        this.video.$.srcObject = this.stream
        await this.video.$.play()
        this.setPreviewRatio(this.video.$.videoWidth, this.video.$.videoHeight)
      } catch (error) {
        if (!isCameraPermissionError(error))
          console.error(error)
        this.stop()
        this.setStatus(dashboardMsg('WidgetWebcamPermissionDenied', 'Webcam permission was denied. Allow camera access and press Start again.'))
        return
      }
    } else if (isSerialCameraSource(this.source)) {
      try {
        this.serialCameraDevice = resolveImageSourceSelection(this.sourceDevice, this.sourceDeviceRef)
        if (!this.serialCameraDevice)
          throw new Error(sourceDeviceSelectionError(this.sourceDevice))
        console.info('Vision serial camera feed mode:', this.triggerMode, 'interval:', this.intervalMs, 'fps:', this.streamFps)
        this.serialFeedUnsubscribe = this.serialCameraDevice.feed.subscribe(() => this.tick(), {
          mode:sourceFeedSubscriptionMode(this.source, this.triggerMode),
          intervalMs:this.intervalMs
        })
        if (this.triggerMode == 'newImage')
          this.targetTriggerUnsubscribe = channel.subscribeText((chunk, uid) => this.handleTargetTriggerChunk(chunk, uid))
        if (isSourceStreamingMode(this.source, this.triggerMode))
          this.startSourceStream()
      } catch (error) {
        console.error(error)
        this.stop()
        this.setStatus(error.message || dashboardMsg('WidgetSerialCameraConnectionFailed', 'Could not connect to the selected camera source device.'))
        return
      }
    }

    this.setStatus(dashboardMsg('WidgetRunning', 'Running'))
    if (isSerialCameraSource(this.source)) {
      this.setStatus(serialSourceWaitingStatus(this.serialCameraDevice ? this.serialCameraDevice.feed : undefined, this.triggerMode))
    } else {
      this.tick()
      this.timer = setInterval(() => this.tick(), this.intervalMs)
    }
  }
  stop () {
    if (isSourceStreamingMode(this.source, this.triggerMode))
      this.stopSourceStream()

    this.running = false
    this.busy = false
    if (this.timer)
      clearInterval(this.timer)
    this.timer = undefined
    if (this.serialFeedUnsubscribe) {
      this.serialFeedUnsubscribe()
      this.serialFeedUnsubscribe = undefined
    }
    if (this.targetTriggerUnsubscribe) {
      this.targetTriggerUnsubscribe()
      this.targetTriggerUnsubscribe = undefined
    }
    this.serialCameraDevice = undefined
    this.targetTriggerBuffer = ''

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop())
      this.stream = undefined
    }

    if (this.video)
      this.video.$.srcObject = null
    if (this.startButton)
      this.startButton.innerText = dashboardMsg('WidgetStart', 'Start')
    this.setStatus(dashboardMsg('WidgetStopped', 'Stopped'))
  }
  toggle () {
    if (this.running)
      this.stop()
    else
      this.start()
  }
  targetTriggerDeviceIds () {
    return new Set(consoleTargetDevices(this.targetDevice, this.targetDeviceRef))
  }
  handleTargetTriggerChunk (chunk, uid) {
    if (!this.running || !isSerialCameraSource(this.source) || this.triggerMode != 'newImage')
      return

    let targets = this.targetTriggerDeviceIds()
    if (!uid || !targets.has(uid))
      return

    this.targetTriggerBuffer = `${this.targetTriggerBuffer}${chunk}`.slice(-4096)
    let lines = this.targetTriggerBuffer.split(/\r?\n/)
    this.targetTriggerBuffer = lines.pop() || ''

    for (let line of lines) {
      let sourceCommand = sourceStreamCommandFromLine(line)
      if (sourceCommand) {
        this.sendSourceCommand(sourceCommand)
        return
      }

      if (!isImageTriggerLine(line, dataFlowInputNotifyMessage(this.setup)))
        continue

      this.requestImageFromSource()
      return
    }
  }
  sendSourceCommand (sourceCommand) {
    let cameraDevice = this.serialCameraDevice || resolveImageSourceSelection(this.sourceDevice, this.sourceDeviceRef)
    if (!cameraDevice)
      return

    this.setStatus(dashboardMsg('WidgetForwardingSourceCommand', 'Forwarding source command: {0}', sourceCommand))
    sendImageSourceCommand(cameraDevice, sourceCommand).catch((error) => {
      console.error(error)
      if (this.running)
        this.setStatus(error.message || dashboardMsg('WidgetSerialCameraConnectionFailed', 'Could not connect to the selected camera source device.'))
    })
  }
  startSourceStream () {
    this.sendSourceCommand(`STREAM ${this.streamFps}`)
  }
  stopSourceStream () {
    let cameraDevice = this.serialCameraDevice || resolveImageSourceSelection(this.sourceDevice, this.sourceDeviceRef)
    if (!cameraDevice)
      return

    sendImageSourceCommand(cameraDevice, 'STOP_STREAM').catch((error) => {
      console.error(error)
    })
  }
  requestImageFromSource () {
    let cameraDevice = this.serialCameraDevice || resolveImageSourceSelection(this.sourceDevice, this.sourceDeviceRef)
    if (!cameraDevice || !cameraDevice.feed)
      return

    this.setStatus(dashboardMsg('WidgetRequestingSourceImage', 'Requesting an image from the source device...'))
    cameraDevice.feed.requestFrame().catch((error) => {
      console.error(error)
      if (this.running)
        this.setStatus(error.message || dashboardMsg('WidgetSerialCameraConnectionFailed', 'Could not connect to the selected camera source device.'))
    })
  }
  async tick () {
    if (!this.running || this.busy)
      return

    this.busy = true
    try {
      let result = await this.process()
      if (typeof result == 'undefined')
        return
      this.setResult(result)
      this.maybeSend(result)
    } catch (error) {
      console.error(error)
      if (isSerialCameraSource(this.source))
        this.stop()
      this.setStatus(error.message || dashboardMsg('VisionProcessingFailed', 'Vision processing failed.'))
    } finally {
      this.busy = false
    }
  }
  async process () {
    let frame = await this.captureSourceFrame({
      source:this.source,
      sourceDevice:this.sourceDevice,
      sourceDeviceRef:this.sourceDeviceRef,
      imageUrl:this.imageUrl
    }, 'default')
    if (typeof frame == 'undefined')
      return undefined
    if (!frame || !frame.imageData)
      return null

    let inputImages = {default:frame.imageData}
    if (frameVisionInput(frame.frame))
      inputImages[frameVisionInput(frame.frame)] = frame.imageData

    let routes = this.inputSourceRoutes().map
    let inputNodes = vision.getSetupInputNodes(this.setupId)
    let routedInputCount = Object.keys(routes).length + (frameVisionInput(frame.frame) ? 1 : 0)
    for (let inputNode of inputNodes) {
      let route = routes[inputNode.id]
      if (!route)
        continue
      let routedFrame = await this.captureSourceFrame(route, inputNode.id)
      if (typeof routedFrame == 'undefined')
        return undefined
      if (routedFrame && routedFrame.imageData)
        inputImages[inputNode.id] = routedFrame.imageData
      if (routedFrame && routedFrame.imageData && frameVisionInput(routedFrame.frame))
        inputImages[frameVisionInput(routedFrame.frame)] = routedFrame.imageData
    }

    if (inputNodes.length > 1 && routedInputCount === 0 && isSerialCameraSource(this.source))
      this.setStatus(dashboardMsg(
        'VisionInputHeaderRoutingHint',
        'Multiple Vision inputs detected. Add vision=<input node id> to source frame headers, or configure input source routing JSON.'
      ))

    let result = vision.runSetupOnImageData(this.setupId, inputImages)
    if (result && result.imageData && this.canvas) {
      this.setPreviewRatio(result.imageData.width, result.imageData.height)
      this.canvas.$.width = result.imageData.width
      this.canvas.$.height = result.imageData.height
      vision.drawImageDataToCanvas(result.imageData, this.canvas.$)
    }
    return result
  }
  inputSourceRoutes () {
    let text = String(this.inputSources || '').trim()
    if (!text || text == '{}')
      return {map:{}}

    try {
      let parsed = JSON.parse(text)
      if (!parsed || typeof parsed != 'object' || Array.isArray(parsed))
        throw new Error('Input source routing must be a JSON object.')
      return {map:parsed}
    } catch (error) {
      return {
        map:{},
        error:error.message || dashboardMsg('VisionInputSourceRoutingInvalid', 'Input source routing JSON is invalid.')
      }
    }
  }
  usesWebcamSource () {
    if (this.source == 'Webcam')
      return true

    let routes = this.inputSourceRoutes().map
    return Object.keys(routes).some((inputId) => routes[inputId] && routes[inputId].source == 'Webcam')
  }
  async captureSourceFrame (route, signatureKey) {
    let source = route && route.source ? route.source : this.source
    if (source == 'Webcam') {
      if (!this.video.$.videoWidth || this.video.$.readyState < 2)
        return null
      return {
        imageData:await vision.videoElementToImageData(this.video.$),
        frame:{
          dataType:'image',
          contentType:'video/webcam',
          label:'Webcam'
        }
      }
    } else if (isSerialCameraSource(source)) {
      this.setStatus(dashboardMsg('WidgetSerialCameraCapturing', 'Capturing from camera source...'))
      let cameraDevice = signatureKey === 'default' && this.serialCameraDevice
        ? this.serialCameraDevice
        : resolveImageSourceSelection(route.sourceDevice || this.sourceDevice, route.sourceDeviceRef || this.sourceDeviceRef)
      if (!cameraDevice) {
        this.setStatus(sourceDeviceSelectionError(route.sourceDevice || this.sourceDevice))
        return undefined
      }
      let imageEvent = cameraDevice.feed.getLatestFrame()
      if (!imageEvent) {
        this.setStatus(serialSourceWaitingStatus(cameraDevice.feed, this.triggerMode))
        return undefined
      }
      let previousSignature = signatureKey === 'default' ? this.lastImageSignature : this.inputImageSignatures[signatureKey]
      if (imageEvent.signature == previousSignature) {
        this.setStatus(serialSourceWaitingStatus(cameraDevice.feed, this.triggerMode))
        return undefined
      }
      if (signatureKey === 'default')
        this.lastImageSignature = imageEvent.signature
      else
        this.inputImageSignatures[signatureKey] = imageEvent.signature
      return {
        imageData:await vision.imageBlobToImageData(imageEvent.blob),
        frame:imageEvent
      }
    } else {
      let imageUrl = route && route.imageUrl ? route.imageUrl : this.imageUrl
      let previousSignature = signatureKey === 'default' ? this.lastImageSignature : this.inputImageSignatures[signatureKey]
      let imageEvent = await fetchImageEvent(imageUrl, previousSignature)
      if (this.triggerMode == 'newImage' && signatureKey === 'default' && !imageEvent.changed) {
        this.setStatus(serialSourceWaitingStatus(this.serialCameraDevice ? this.serialCameraDevice.feed : undefined, this.triggerMode))
        return undefined
      }
      if (signatureKey === 'default')
        this.lastImageSignature = imageEvent.signature
      else
        this.inputImageSignatures[signatureKey] = imageEvent.signature
      return {
        imageData:await vision.imageBlobToImageData(imageEvent.blob),
        frame:{
          ...imageEvent,
          dataType:'image',
          contentType:imageEvent.blob ? imageEvent.blob.type : '',
          label:imageUrl
        }
      }
    }
  }
  formatNumber (value) {
    if (!Number.isFinite(value))
      return '0'
    if (Math.abs(value) < 1)
      return value.toFixed(3)
    return value.toFixed(1)
  }
  formatMessage (result) {
    let output = this.resultOutput(result)
    let metrics = result.metrics || {}
    let fields = output && output.fields ? output.fields : {}
    let detected = this.resultDetected(result)
    let value = result.metrics ? this.metricValue(metrics) : 0
    let outputValue = this.resultValue(result)
    let outputType = output && output.type ? output.type : ''
    let outputText = output && output.text ? output.text : ''
    let outputConfidence = output && Number.isFinite(output.confidence) ? String(output.confidence) : ''
    let engine = typeof fields.engine != 'undefined' ? String(fields.engine) : 'builtin'
    let state = typeof fields.state != 'undefined' ? String(fields.state) : (detected ? 'on' : 'off')
    let fieldNumber = (name, fallback = 0) => {
      let numeric = Number(fields[name])
      return Number.isFinite(numeric) ? this.formatNumber(numeric) : this.formatNumber(fallback)
    }
    let fieldInteger = (name, fallback = 0) => {
      let numeric = Number(fields[name])
      return Number.isFinite(numeric) ? String(Math.round(numeric)) : String(fallback)
    }
    let message = String(this.messageTemplate)
      .replace(/\{state\}/g, state)
      .replace(/\{detected\}/g, detected ? 'true' : 'false')
      .replace(/\{metric\}/g, this.metric)
      .replace(/\{value\}/g, this.formatNumber(value))
      .replace(/\{output\}/g, outputText || outputValue)
      .replace(/\{outputValue\}/g, outputValue)
      .replace(/\{outputType\}/g, outputType)
      .replace(/\{outputText\}/g, outputText)
      .replace(/\{outputConfidence\}/g, outputConfidence)
      .replace(/\{engine\}/g, engine)
      .replace(/\{count\}/g, fieldInteger('count'))
      .replace(/\{objectCount\}/g, fieldInteger('objectCount'))
      .replace(/\{bboxX\}/g, fieldNumber('bboxX', -1))
      .replace(/\{bboxY\}/g, fieldNumber('bboxY', -1))
      .replace(/\{bboxWidth\}/g, fieldNumber('bboxWidth', 0))
      .replace(/\{bboxHeight\}/g, fieldNumber('bboxHeight', 0))
      .replace(/\{area\}/g, fieldNumber('area', 0))
      .replace(/\{areaPercent\}/g, fieldNumber('areaPercent', 0))
      .replace(/\{rotationDeg\}/g, fieldNumber('rotationDeg', 0))
      .replace(/\{rotationRad\}/g, fieldNumber('rotationRad', 0))
      .replace(/\{mean\}/g, this.formatNumber(metrics.mean))
      .replace(/\{whitePercent\}/g, this.formatNumber(metrics.whitePercent))
      .replace(/\{darkPercent\}/g, this.formatNumber(metrics.darkPercent))
      .replace(/\{centerX\}/g, typeof fields.centerX != 'undefined' ? fieldNumber('centerX', metrics.centerX) : this.formatNumber(metrics.centerX))
      .replace(/\{centerY\}/g, typeof fields.centerY != 'undefined' ? fieldNumber('centerY', metrics.centerY) : this.formatNumber(metrics.centerY))
      .replace(/\{width\}/g, String(metrics.width))
      .replace(/\{height\}/g, String(metrics.height))

    return message.replace(/\{([A-Za-z0-9_]+)\}/g, (match, key) => {
      if (!Object.prototype.hasOwnProperty.call(fields, key))
        return match

      let fieldValue = fields[key]
      if (typeof fieldValue == 'object')
        return JSON.stringify(fieldValue)
      return String(fieldValue)
    })
  }
  sendResult () {
    if (!this.lastResult || (!this.lastResult.metrics && !this.lastResult.output)) {
      this.setStatus(dashboardMsg('VisionNoResultToSend', 'No vision result to send yet.'))
      return false
    }
    return this.send(this.lastResult)
  }
  maybeSend (result) {
    let dataFlowOutput = dataFlowProcessedOutput(this.setup)
    if (dataFlowOutput) {
      if (!result || (!result.metrics && !result.output) || dataFlowOutput.sendPolicy == 'manual')
        return
      let detected = this.resultDetected(result)
      if (dataFlowOutput.sendPolicy == 'onChange' && detected == this.lastDetected)
        return
      if (dataFlowOutput.sendPolicy == 'onRule' && !dataFlowRulePass(dataFlowOutput, {
        detected,
        value:this.resultValue(result),
        ...(result.metrics || {}),
        ...((result.output && result.output.fields) || {}),
        confidence:result.output && Number.isFinite(result.output.confidence) ? result.output.confidence : undefined
      }))
        return
      this.send(result)
      return
    }

    if (!result || (!result.metrics && !result.output) || this.sendMode == 'manual')
      return

    let detected = this.resultDetected(result)
    if (this.sendMode == 'changed' && detected == this.lastDetected)
      return

    this.send(result)
  }
  send (result) {
    let detected = this.resultDetected(result)
    let message = this.formatMessage(result)
    let sent = sendWidgetOutput(this.setup, this.topic, message, {
      quiet:true,
      nonInterrupting:true,
      fields:{
        detected,
        ...(result.metrics || {}),
        output:result.output || null
      }
    })

    if (sent) {
      this.lastDetected = detected
      this.setStatus(dashboardMsg('WidgetSent', 'Sent: {0}', message))
    }

    return sent
  }
  async captureSerialPreview () {
    if (!isSerialCameraSource(this.source)) {
      this.setStatus(dashboardMsg('WidgetChooseSerialCameraSource', 'Choose Source device as the image source first.'))
      return false
    }

    try {
      let cameraDevice = resolveImageSourceSelection(this.sourceDevice, this.sourceDeviceRef)
      if (!cameraDevice) {
        this.setStatus(sourceDeviceSelectionError(this.sourceDevice))
        return false
      }
      this.setStatus(dashboardMsg('WidgetSerialCameraCapturing', 'Capturing from camera source...'))
      let imageEvent = await cameraDevice.feed.getFrame((message) => this.setStatus(message))
      this.lastImageSignature = imageEvent.signature
      let imageData = await vision.imageBlobToImageData(imageEvent.blob)
      this.setPreviewRatio(imageData.width, imageData.height)
      this.canvas.$.width = imageData.width
      this.canvas.$.height = imageData.height
      vision.drawImageDataToCanvas(imageData, this.canvas.$)
      this.video.$.style.display = 'none'
      this.canvas.$.style.display = ''
      if (this.dom)
        this.dom.$.classList.remove('debug-off')
      this.setStatus(dashboardMsg('WidgetSerialCameraCapturedBytes', 'Captured image from camera source ({0} bytes).', imageEvent.byteLength || imageEvent.blob.size))
      return true
    } catch (error) {
      console.error(error)
      this.setStatus(error.message || dashboardMsg('WidgetSerialCameraConnectionFailed', 'Could not connect to the selected camera source device.'))
      return false
    }
  }
  static visionProcessor (data, dom) {
    let _VisionProcessors = new VisionProcessors(data, dom)
    let title = new DOM('h2', {innerText:data.setup.title || dashboardMsg('VisionProcessorTitle', 'Vision Processor')})
    let setupSelect = new DOM('select')

    vision.getSetups().forEach((setup) => {
      setupSelect.append(new DOM('option', {
        value:setup.id,
        innerText:setup.name
      }))
    })
    setupSelect.$.value = _VisionProcessors.setupId
    setupSelect.$.addEventListener('change', () => {
      _VisionProcessors.selectSetup(setupSelect.$.value)
    })

    _VisionProcessors.video = new DOM('video', {autoplay:true})
    _VisionProcessors.video.$.muted = true
    _VisionProcessors.video.$.playsInline = true
    _VisionProcessors.canvas = new DOM('canvas')
    _VisionProcessors.canvas.$.width = 320
    _VisionProcessors.canvas.$.height = 220
    _VisionProcessors.result = new DOM('h3', {innerText:dashboardMsg('VisionNoResultYet', 'No result yet')})
    _VisionProcessors.status = new DOM('p', {innerText:dashboardMsg('WidgetStopped', 'Stopped')})
    _VisionProcessors.startButton = new DOM('button', {innerText:dashboardMsg('WidgetStart', 'Start'), className:'noicon'})
      .onclick(_VisionProcessors, _VisionProcessors.toggle)
    let testCameraButton = new DOM('button', {
      innerText:dashboardMsg('WidgetTestCamera', 'Test camera'),
      className:'noicon'
    }).onclick(_VisionProcessors, _VisionProcessors.captureSerialPreview)
    if (!isSerialCameraSource(_VisionProcessors.source))
      testCameraButton.$.style.display = 'none'
    let sendButton = new DOM('button', {innerText:dashboardMsg('WidgetSend', 'Send'), className:'noicon'})
      .onclick(_VisionProcessors, _VisionProcessors.sendResult)

    if (_VisionProcessors.source != 'Webcam')
      _VisionProcessors.video.$.style.display = 'none'
    dom.$.classList.remove('debug-off')
    if (!_VisionProcessors.debugView)
      dom.$.classList.add('debug-off')

    _VisionProcessors.previewFrame = new DOM('div', {className:'vision-preview'}).append([
      _VisionProcessors.video,
      _VisionProcessors.canvas
    ])

    dom.append([
      title,
      setupSelect,
      _VisionProcessors.previewFrame,
      _VisionProcessors.result,
      _VisionProcessors.status,
      new DOM('div', {className:'vision-buttons'}).append([
        testCameraButton,
        _VisionProcessors.startButton,
        sendButton
      ])
    ])

    let error = _VisionProcessors.validate()
    if (error)
      _VisionProcessors.setStatus(error)
    else if (_VisionProcessors.autoStart && _VisionProcessors.source != 'Webcam' && !isSerialCameraSource(_VisionProcessors.source))
      setTimeout(() => _VisionProcessors.start(), 100)
    else if (_VisionProcessors.autoStart && _VisionProcessors.source == 'Webcam')
      _VisionProcessors.setStatus(dashboardMsg('VisionPressStartWebcam', 'Press Start to allow webcam access.'))
    else if (_VisionProcessors.autoStart && isSerialCameraSource(_VisionProcessors.source))
      _VisionProcessors.setStatus(dashboardMsg('WidgetPressStartSerialCamera', 'Press Start to begin reading from the selected camera source device.'))

    return _VisionProcessors
  }
  static regen (obj, data) {
    for (const index in obj.visionProcessors) {
      if (obj.visionProcessors[index].sid == data.sid) {
        obj.visionProcessors[index].destroy()
        obj.visionProcessors[index] = VisionProcessors.visionProcessor(data, data.target)
      }
    }
  }
  static include (grid, data, _$){
    data.target = new DOM('span')
    let content = new DOM('div')
      .append([
        _$.grab,
        _$.remove,
        data.target,
      ])
    let container = new DOM('div', {sid:data.sid, className:'vision-processor square'})
      .append(content)

    grid.muuri.add(container.$)
    grid.visionProcessors.push(VisionProcessors.visionProcessor(data, data.target))

    data.target.onevent('contextmenu', grid, (ev) => {
      ev.preventDefault()
      DOM.switchState(grid.parent.$.dashboard)
    })
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
        .then(() => callback())
			  .catch(
			    console.error
			  )
		}
	}
}
