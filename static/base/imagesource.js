"use strict"

/*
 * Shared image-source abstraction for ML (training + live) and Vision
 * (pipeline setup + live).
 *
 * One picker, four interchangeable sources — device camera, webcam, uploaded
 * file, image URL — each exposing the same two operations:
 *
 *   source.capture()            -> Promise<CapturedImage>   (one frame)
 *   source.stream(onFrame, opt) -> stop()                   (live frames)
 *
 * A CapturedImage normalises whatever the source produced so consumers can ask
 * for the format they need without caring where it came from:
 *
 *   await captured.toBlob()       -> Blob       (ML training samples)
 *   await captured.toImageData()  -> ImageData  (Vision pipeline input)
 *   await captured.toDataURL()    -> string     (previews)
 *
 * Device cameras ride the unified channel (serial / BLE / WebSocket all the
 * same), exactly like dashboard messaging — see channel.getImageFeed().
 */

import {channel} from './channel.js'

export const IMAGE_SOURCE_TYPES = ['device', 'webcam', 'upload', 'url']

const DEFAULT_INTERVAL_MS = 200
const DEFAULT_MAX_SIDE = 720

// A drawable is anything canvas.drawImage() accepts.
function isDrawable (value) {
  return typeof HTMLImageElement != 'undefined' && value instanceof HTMLImageElement ||
    typeof HTMLVideoElement != 'undefined' && value instanceof HTMLVideoElement ||
    typeof HTMLCanvasElement != 'undefined' && value instanceof HTMLCanvasElement ||
    typeof ImageBitmap != 'undefined' && value instanceof ImageBitmap
}

/*
 * Normalised result of a capture. Holds whatever the source produced (a Blob,
 * a drawable, or ImageData) and lazily converts to the format a consumer asks
 * for, drawing through an offscreen canvas when a conversion is required.
 */
export class CapturedImage {
  constructor ({blob = null, drawable = null, imageData = null, width = 0, height = 0, filename = '', contentType = ''} = {}) {
    this.blob = blob
    this._drawable = drawable
    this._imageData = imageData
    this.filename = filename
    this.contentType = contentType || (blob && blob.type) || ''
    this.width = width || (imageData && imageData.width) || (drawable && (drawable.width || drawable.videoWidth)) || 0
    this.height = height || (imageData && imageData.height) || (drawable && (drawable.height || drawable.videoHeight)) || 0
  }

  // Resolve to something canvas.drawImage() can paint (decoding a Blob if needed).
  async _toDrawable () {
    if (this._drawable && isDrawable(this._drawable))
      return this._drawable

    if (this.blob) {
      this._drawable = await createImageBitmap(this.blob)
      this.width = this.width || this._drawable.width
      this.height = this.height || this._drawable.height
      return this._drawable
    }

    if (this._imageData) {
      let canvas = document.createElement('canvas')
      canvas.width = this._imageData.width
      canvas.height = this._imageData.height
      canvas.getContext('2d').putImageData(this._imageData, 0, 0)
      this._drawable = canvas
      return canvas
    }

    throw new Error('CapturedImage has no usable image data.')
  }

  // Paint onto a fresh canvas, optionally scaling so the longest side <= maxSide.
  async _toCanvas (maxSide) {
    let drawable = await this._toDrawable()
    let srcW = drawable.width || drawable.videoWidth || this.width
    let srcH = drawable.height || drawable.videoHeight || this.height
    let ratio = maxSide ? Math.min(1, maxSide / Math.max(srcW, srcH)) : 1
    let width = Math.max(1, Math.round(srcW * ratio))
    let height = Math.max(1, Math.round(srcH * ratio))

    let canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    canvas.getContext('2d', {willReadFrequently:true}).drawImage(drawable, 0, 0, width, height)
    return canvas
  }

  async toImageData ({maxSide = DEFAULT_MAX_SIDE} = {}) {
    // Fast path: already ImageData and within bounds.
    if (this._imageData && (!maxSide || Math.max(this._imageData.width, this._imageData.height) <= maxSide))
      return this._imageData

    let canvas = await this._toCanvas(maxSide)
    let imageData = canvas.getContext('2d', {willReadFrequently:true}).getImageData(0, 0, canvas.width, canvas.height)
    this.width = canvas.width
    this.height = canvas.height
    return imageData
  }

  async toBlob ({type = 'image/png', quality = 0.92, maxSide = 0} = {}) {
    // Fast path: already a Blob and no rescale requested.
    if (this.blob && !maxSide)
      return this.blob

    let canvas = await this._toCanvas(maxSide)
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        blob ? resolve(blob) : reject(new Error('Failed to encode image.'))
      }, type, quality)
    })
  }

  async toDataURL ({type = 'image/png', maxSide = 0} = {}) {
    let canvas = await this._toCanvas(maxSide)
    return canvas.toDataURL(type)
  }
}

/*
 * A configurable source of CapturedImages.
 * config = {type, deviceUid?, url?, file?, label?}
 */
export class ImageSource {
  constructor (config = {}) {
    this.config = {type:'webcam', ...config}
    this._video = null
    this._mediaStream = null
    this._starting = null
  }

  get type () { return this.config.type }
  get deviceUid () { return this.config.deviceUid }

  describe () {
    if (this.config.label)
      return this.config.label
    switch (this.type) {
      case 'device': return ImageSource.deviceLabel(this.deviceUid)
      case 'webcam': return 'Webcam'
      case 'upload': return this.config.file ? (this.config.file.name || 'Uploaded image') : 'Upload image'
      case 'url': return this.config.url || 'Image URL'
      default: return this.type
    }
  }

  // Whether this source can currently produce frames.
  isReady () {
    switch (this.type) {
      case 'device': return !!this.deviceUid && channel.hasConnection(this.deviceUid)
      case 'webcam': return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
      case 'upload': return !!this.config.file
      case 'url': return !!this.config.url
      default: return false
    }
  }

  setFile (file) { this.config.file = file; return this }
  setUrl (url) { this.config.url = url; return this }

  // ---- One-shot capture -----------------------------------------------------
  async capture () {
    switch (this.type) {
      case 'device': return this._captureDevice()
      case 'webcam': return this._captureWebcam()
      case 'upload': return this._captureFile()
      case 'url': return this._captureUrl()
      default: throw new Error(`Unknown image source type: ${this.type}`)
    }
  }

  async _captureDevice () {
    if (!this.deviceUid || !channel.hasConnection(this.deviceUid))
      throw new Error('Source device is not connected.')
    let feed = channel.getImageFeed(this.deviceUid)
    if (!feed || typeof feed.getFrame != 'function')
      throw new Error('Source device is not ready for image capture.')
    let frame = await feed.getFrame()
    if (!frame || !frame.blob)
      throw new Error('Source device did not return an image.')
    return new CapturedImage({
      blob: frame.blob,
      width: frame.width,
      height: frame.height,
      contentType: frame.contentType,
      filename: `device-${this.deviceUid}.${frame.contentType === 'image/jpeg' ? 'jpg' : 'png'}`
    })
  }

  async _captureWebcam () {
    let video = await this._ensureWebcam()
    let width = video.videoWidth || 320
    let height = video.videoHeight || 240
    let canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    canvas.getContext('2d', {willReadFrequently:true}).drawImage(video, 0, 0, width, height)
    return new CapturedImage({drawable: canvas, width, height, filename: `webcam-${Date.now()}.png`})
  }

  async _captureFile () {
    let file = this.config.file
    if (!file)
      throw new Error('No file selected.')
    return new CapturedImage({blob: file, filename: file.name || 'upload.png', contentType: file.type})
  }

  async _captureUrl () {
    let url = this.config.url
    if (!url)
      throw new Error('No image URL set.')
    let image = await this._loadImageElement(url)
    return new CapturedImage({
      drawable: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      filename: url.split('/').pop() || 'image'
    })
  }

  _loadImageElement (url) {
    return new Promise((resolve, reject) => {
      let image = new Image()
      image.crossOrigin = 'anonymous'
      image.onload = () => resolve(image)
      image.onerror = () => reject(new Error(`Could not load image: ${url}`))
      image.src = url
    })
  }

  // ---- Live streaming --------------------------------------------------------
  // onFrame(CapturedImage). Returns a stop() function.
  stream (onFrame, options = {}) {
    let intervalMs = options.intervalMs || (options.fps ? Math.round(1000 / options.fps) : DEFAULT_INTERVAL_MS)

    if (this.type === 'device')
      return this._streamDevice(onFrame, {...options, intervalMs})

    // webcam / upload / url: poll capture() on an interval. Static sources
    // (upload/url) emit the same image each tick, which is what live ML/Vision
    // widgets expect.
    let stopped = false
    let busy = false
    let tick = async () => {
      if (stopped || busy)
        return
      busy = true
      try {
        let captured = await this.capture()
        if (!stopped)
          onFrame(captured)
      } catch (error) {
        console.error(error)
      } finally {
        busy = false
      }
    }
    let timer = setInterval(tick, intervalMs)
    tick()
    return () => { stopped = true; clearInterval(timer) }
  }

  _streamDevice (onFrame, options) {
    if (!this.deviceUid || !channel.hasConnection(this.deviceUid))
      throw new Error('Source device is not connected.')
    let feed = channel.getImageFeed(this.deviceUid)
    if (!feed || typeof feed.subscribe != 'function')
      throw new Error('Source device is not ready for image capture.')
    return feed.subscribe((frame) => {
      if (!frame || !frame.blob)
        return
      onFrame(new CapturedImage({
        blob: frame.blob, width: frame.width, height: frame.height, contentType: frame.contentType
      }))
    }, {mode: options.mode || 'interval', intervalMs: options.intervalMs})
  }

  // ---- Webcam lifecycle ------------------------------------------------------
  async _ensureWebcam () {
    if (this._video && this._mediaStream && this._mediaStream.active)
      return this._video
    if (this._starting)
      return this._starting

    this._starting = (async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia)
        throw new Error('Webcam is not available in this browser.')
      let constraints = {video: this.config.deviceId ? {deviceId: this.config.deviceId} : true, audio: false}
      this._mediaStream = await navigator.mediaDevices.getUserMedia(constraints)
      let video = document.createElement('video')
      video.autoplay = true
      video.playsInline = true
      video.muted = true
      video.srcObject = this._mediaStream
      await video.play().catch(() => {})
      // Wait for the first frame so videoWidth/Height are valid.
      if (!video.videoWidth)
        await new Promise((resolve) => video.addEventListener('loadeddata', resolve, {once:true}))
      this._video = video
      return video
    })()

    try {
      return await this._starting
    } finally {
      this._starting = null
    }
  }

  // Release webcam hardware. Safe to call on any source type.
  stop () {
    if (this._mediaStream) {
      this._mediaStream.getTracks().forEach((track) => track.stop())
      this._mediaStream = null
    }
    if (this._video) {
      this._video.srcObject = null
      this._video = null
    }
  }

  // ---- Source discovery ------------------------------------------------------
  // Connected devices that can serve as camera sources (any open connection;
  // the board must run a capture responder that answers BIPES_CAPTURE).
  static deviceOptions () {
    return Object.keys(channel.connections || {}).map((uid) => ({
      value: uid,
      label: ImageSource.deviceLabel(uid)
    }))
  }

  static deviceLabel (uid) {
    let page = typeof window != 'undefined' && window.bipes && window.bipes.page
    let device = page && page.device &&
      (page.device.devices || []).find((d) => d.uid === uid)
    if (device && device.nodename)
      return `${device.nodename}${device.version ? ' ' + device.version : ''}`
    return `Device ${String(uid || '').slice(0, 6)}`
  }
}
