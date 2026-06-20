"use strict";

import {DOM, ContextMenu} from '../../base/dom.js'
import {Tool} from '../../base/tool.js'
import {command} from '../../base/command.js'
import {channel} from '../../base/channel.js'
import {ImageSource} from '../../base/imagesource.js'

import {project} from '../project/main.js'

const ML_CLASS_COLORS = [
  '#ea580c',
  '#0891b2',
  '#16a34a',
  '#dc2626',
  '#7c3aed',
  '#c2410c',
  '#2563eb',
  '#0f766e'
]

const ML_STORAGE_DB = 'bipes-ml-storage'
const ML_STORAGE_VERSION = 1
const ML_STORAGE_SAMPLES = 'samples'
const ML_STORAGE_MODELS = 'models'

let mlStoragePromise = null

function escapeHTML (value){
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function openMLStorage (){
  if (!window.indexedDB)
    return Promise.reject(new Error('IndexedDB is not available'))

  if (mlStoragePromise)
    return mlStoragePromise

  mlStoragePromise = new Promise((resolve, reject) => {
    let request = window.indexedDB.open(ML_STORAGE_DB, ML_STORAGE_VERSION)

    request.onupgradeneeded = () => {
      let db = request.result
      if (!db.objectStoreNames.contains(ML_STORAGE_SAMPLES))
        db.createObjectStore(ML_STORAGE_SAMPLES, {keyPath:'key'})
      if (!db.objectStoreNames.contains(ML_STORAGE_MODELS))
        db.createObjectStore(ML_STORAGE_MODELS, {keyPath:'key'})
    }

    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onerror = () => {
      reject(request.error || new Error('Failed to open ML storage'))
    }
  })

  return mlStoragePromise
}

function readMLStorage (storeName, key){
  return openMLStorage().then((db) => {
    return new Promise((resolve, reject) => {
      let transaction = db.transaction(storeName, 'readonly')
      let request = transaction.objectStore(storeName).get(key)

      request.onsuccess = () => {
        resolve(request.result || null)
      }

      request.onerror = () => {
        reject(request.error || new Error('Failed to read ML storage'))
      }
    })
  })
}

function writeMLStorage (storeName, value){
  return openMLStorage().then((db) => {
    return new Promise((resolve, reject) => {
      let transaction = db.transaction(storeName, 'readwrite')
      transaction.oncomplete = () => {resolve(true)}
      transaction.onerror = () => {
        reject(transaction.error || new Error('Failed to write ML storage'))
      }
      transaction.onabort = () => {
        reject(transaction.error || new Error('Failed to write ML storage'))
      }
      transaction.objectStore(storeName).put(value)
    })
  })
}

function deleteMLStorage (storeName, key){
  return openMLStorage().then((db) => {
    return new Promise((resolve, reject) => {
      let transaction = db.transaction(storeName, 'readwrite')
      transaction.oncomplete = () => {resolve(true)}
      transaction.onerror = () => {
        reject(transaction.error || new Error('Failed to delete ML storage'))
      }
      transaction.onabort = () => {
        reject(transaction.error || new Error('Failed to delete ML storage'))
      }
      transaction.objectStore(storeName).delete(key)
    })
  })
}

class MLPage {
  constructor (){
    this.name = 'ml'
    this.available = false
    this.inited = false
    this.tree = {}
    this.currentSID = undefined
    this.selectedModelId = null
    this.sessionState = {}
    this.stream = null
    this.audioStream = null
    this.mediaRecorder = null
    this.recordedChunks = []
    this.recordingCanceled = false
    this.audioContext = null
    this.livePredictToken = 0
    this.livePredictAt = 0
    this.livePredictBusy = false
    this.addMenuOpen = false
    this.restoreToken = 0
    this.sourceDeviceId = ''
    this.sourceImageUrl = ''
    this.sourceCaptureBusy = false

    let $ = this.$ = {}
    const section = DOM.get('section#ml')
    if (!section)
      return

    this.available = true
    $.section = new DOM(section)
    $.section.$.classList.add('default')
    $.container = new DOM('div', {className:'container ml-container'})
    $.contextMenu = new DOM('div')

    this.contextMenu = new ContextMenu($.contextMenu, this)

    $.section.append([
      $.container,
      $.contextMenu
    ])

    command.add(this, {
      add: this._add,
      remove: this._remove,
      rename: this._rename
    })

    this.load(this.empty())
  }

  init (){
    if (!this.available || this.inited)
      return

    this.closeMenus()

    if (this.tree instanceof Array)
      this.tree = {}

    if (!this.tree || Object.keys(this.tree).length === 0) {
      let workspace = this.makeWorkspace(undefined, 1)
      this.tree[workspace.id] = workspace
      this.selectedModelId = workspace.id
    }

    this.renderShell()
    this.restore()
    this.inited = true
    this.select(this.selectedModelId || Object.keys(this.tree)[0])
    this.restorePersistedState()
  }

  deinit (){
    if (!this.available || !this.inited)
      return

    this.stopLivePredictionLoop()
    this.stopWebcam()
    this.stopRecording(true)
    this.closeMenus()

    if (this.$.tabs)
      this.$.tabs.removeChilds()

    if (this.$.container)
      this.$.container.$.innerHTML = ''

    this.currentSID = undefined
    this.inited = false
  }

  empty (){
    return {
      selectedModelId:null,
      tree:{}
    }
  }

  load (obj){
    let wasInited = this.inited

    if (wasInited)
      this.deinit()

    let data = this.normalizeData(obj)

    this.tree = data.tree
    this.selectedModelId = data.selectedModelId
    this.currentSID = undefined

    this.stopLivePredictionLoop()
    this.stopWebcam()
    this.stopRecording(true)

    if (wasInited)
      this.init()
    else
      this.restorePersistedState()
  }

  renderShell (){
    let $ = this.$

    $.container.$.innerHTML = ''
    this.closeMenus()

    let tabs = new DOM('div', {className:'ml-tabs'})
    let add = new DOM('button', {
      className:'icon',
      id:'add',
      title:Msg['MLNewWorkspace']
    }).onclick(this, this.toggleAddMenu)
    let addMenu = new DOM('div', {className:'ml-add-menu'})
    let classesPanel = new DOM('div', {className:'ml-panel ml-classes-panel'})
    let trainPanel = new DOM('div', {className:'ml-panel ml-train-panel'})
    let previewPanel = new DOM('div', {className:'ml-panel ml-preview-panel'})

    $.tabs = tabs
    $.add = add
    $.addMenu = addMenu
    $.classesPanel = classesPanel.$
    $.trainPanel = trainPanel.$
    $.previewPanel = previewPanel.$

    let grid = new DOM('div', {className:'ml-grid'}).append([
        classesPanel,
        trainPanel,
        previewPanel
      ])
    let workspace = new DOM('div', {className:'ml-workspace'}).append(grid)

    workspace.$.addEventListener('click', (ev) => {
      this.handleWorkspaceClick(ev)
    }, true)

    $.workspace = workspace.$
    $.grid = grid.$

    $.shell = new DOM('div', {className:'ml-shell'}).append([
      new DOM('div', {className:'ml-header'}).append([
        tabs,
        add
      ]),
      addMenu,
      workspace
    ])

    $.container.append($.shell)

    $.container.$.addEventListener('click', (ev) => {
      if (ev.target.closest('.ml-add-menu, .ml-tabs, #add'))
        return

      if (this.addMenuOpen) {
        this.addMenuOpen = false
        this.renderAddMenu()
      }
    })

    this.renderAddMenu()
  }

  handleWorkspaceClick (ev){
    if (!this.$.workspace || !this.$.workspace.contains(ev.target))
      return

    let control = ev.target.closest([
      '[data-kind]',
      '[data-action]',
      '[data-select]',
      '[data-delete]',
      '[data-webcam]',
      '[data-capture]',
      '[data-source-capture]',
      '[data-record]',
      '[data-stop-recording]',
      '[data-upload-trigger]',
      '[data-remove-sample]',
      '[data-source-capture-selected]'
    ].join(','))

    if (!control || !this.$.workspace.contains(control) || control.disabled)
      return

    let workspace = this.getCurrentWorkspace()
    if (!workspace)
      return

    ev.preventDefault()
    ev.stopImmediatePropagation()

    if (control.dataset.kind) {
      this.configureWorkspaceKind(workspace.id, control.dataset.kind)
      return
    }

    if (control.dataset.select) {
      workspace.selectedClassId = control.dataset.select
      this.syncProject()
      this.render()
      return
    }

    if (control.dataset.delete) {
      this.removeClass(control.dataset.delete)
      return
    }

    if (control.dataset.webcam) {
      let runtime = this.getWorkspaceSession(workspace.id)
      if (runtime.captureClassId === control.dataset.webcam) {
        this.stopClassWebcam(workspace.id, control.dataset.webcam)
        this.render()
        return
      }
      this.startWebcam(control.dataset.webcam)
      return
    }

    if (control.dataset.capture) {
      this.captureImageExample(control.dataset.capture)
      return
    }

    if (control.dataset.sourceCapture) {
      this.captureSourceDeviceExample(control.dataset.sourceCapture)
      return
    }

    if (control.dataset.record) {
      this.startRecording(control.dataset.record)
      return
    }

    if (control.dataset.stopRecording) {
      workspace.selectedClassId = control.dataset.stopRecording
      this.syncProject()
      this.stopRecording(false)
      return
    }

    if (control.dataset.uploadTrigger) {
      let input = this.$.workspace.querySelector(`#${CSS.escape(control.dataset.uploadTrigger)}`)
      let classId = input ? input.dataset.uploadInput : null
      if (classId) {
        workspace.selectedClassId = classId
        this.syncProject()
      }
      this.openFilePicker(input)
      return
    }

    if (control.dataset.removeSample) {
      this.removeSample(control.dataset.classId, control.dataset.removeSample)
      return
    }

    if (control.hasAttribute('data-source-capture-selected')) {
      this.captureSourceDeviceExample(workspace.selectedClassId)
      return
    }

    switch (control.dataset.action) {
      case 'add-class':
        this.addClass()
        break
      case 'train-model':
        this.prepareTraining()
        break
      case 'export-model':
        this.prepareExport()
        break
      case 'toggle-live-preview': {
        let runtime = this.getWorkspaceSession(workspace.id)
        if (runtime.previewLive)
          this.stopLivePreview(workspace.id)
        else
          this.startLivePreview(workspace.id)
        break
      }
      case 'stop-webcam':
        this.stopWebcam()
        this.render()
        break
      case 'stop-audio':
        this.stopRecording(false)
        break
    }
  }

  render (){
    if (!this.available || !this.inited)
      return

    this.renderTabs()
    this.renderWorkspace()
  }

  renderWorkspace (){
    let workspace = this.getCurrentWorkspace()
    if (this.$.grid)
      this.$.grid.classList.toggle('ml-grid-setup', !!workspace && !workspace.kind)

    this.renderClassesPanel()
    this.renderTrainPanel()
    this.renderPreviewPanel()
    this.attachVideoStream()
  }

  restore (){
    this.renderTabs()
  }

  renderTabs (){
    if (!this.$.tabs)
      return

    this.$.tabs.removeChilds()

    for (const sid in this.tree)
      this.include(sid, this.tree[sid])

    this.renderAddMenu()
  }

  include (sid, obj){
    let h3 = new DOM('h3', {innerText:obj.name})

    obj.dom = new DOM('button', {
      sid:sid,
      className:`ml-tab${sid === this.selectedModelId ? ' on' : ''}`
    })
      .append([h3])
      .onevent('contextmenu', this, (ev) => {
        ev.preventDefault()

        this.contextMenu.open([
          {
            id:'rename',
            innerText:Msg['Rename'],
            fun:this.rename,
            args:[sid, obj.name]
          }, {
            id:'remove',
            innerText:Msg['Remove'],
            fun:this.remove,
            args:[sid]
          }
        ], ev)
      })
      .onclick(this, this.select, [sid])

    this.$.tabs.append(obj.dom)
  }

  renderAddMenu (){
    if (!this.$.addMenu)
      return

    this.$.addMenu.$.className = `ml-add-menu${this.addMenuOpen ? ' on' : ''}`
    this.$.addMenu.$.innerHTML = `
      <button data-kind="image">${Msg['MLConfigureImageModel']}</button>
      <button data-kind="audio">${Msg['MLConfigureAudioModel']}</button>
      <button data-kind="pose">${Msg['MLConfigurePoseModel']}</button>
    `

    this.$.addMenu.$.querySelectorAll('[data-kind]').forEach((button) => {
      button.addEventListener('click', () => {
        this.add(button.dataset.kind, true)
      })
    })
  }

  toggleAddMenu (){
    this.addMenuOpen = !this.addMenuOpen
    this.renderAddMenu()
  }

  closeMenus (){
    this.addMenuOpen = false
    if (this.contextMenu)
      this.contextMenu.close()
    if (this.$ && this.$.addMenu)
      this.$.addMenu.$.className = 'ml-add-menu'
  }

  commit (){
    this.syncProject()
  }

  add (kind, select){
    let sid = `ml-workspace-${Tool.SID()}`

    command.dispatch(this, 'add', [
      sid,
      kind,
      project.currentUID
    ])

    this.commit()

    if (select === true)
      this.select(sid)
  }

  _add (sid, kind, projectUID){
    if (projectUID !== project.currentUID)
      return

    let workspace = this.makeWorkspace(sid)

    if (kind) {
      workspace.kind = kind === 'audio' || kind === 'pose' ? kind : 'image'
      workspace.classes = this.makeDefaultClasses()
      workspace.selectedClassId = workspace.classes[0].id
    }

    this.tree[sid] = workspace

    if (this.inited)
      this.renderTabs()
  }

  remove (sid){
    this.contextMenu.close()

    if (!this.tree[sid] || Object.keys(this.tree).length <= 1)
      return

    command.dispatch(this, 'remove', [
      sid,
      project.currentUID
    ])

    this.commit()
  }

  _remove (sid, projectUID){
    if (projectUID !== project.currentUID)
      return

    if (!this.tree[sid] || Object.keys(this.tree).length <= 1)
      return

    if (sid === this.currentSID)
      this.unselect()

    this.clearWorkspaceSession(sid)
    delete this.tree[sid]

    if (!this.tree[this.selectedModelId])
      this.selectedModelId = Object.keys(this.tree)[0] || null

    if (this.inited) {
      this.renderTabs()

      if (this.selectedModelId)
        this.select(this.selectedModelId)
    }
  }

  rename (sid, name){
    this.contextMenu.oninput({
      title:Msg['MLWorkspaceName'],
      placeholder:name,
      value:name
    }, (input, ev) => {
      ev.preventDefault()

      let next = input.value
      this.contextMenu.close()

      if (next == undefined || next.trim() === '')
        return

      this.renameWorkspace(sid, next)
    })
  }

  renameCurrentWorkspace (){
    let workspace = this.getCurrentWorkspace()
    if (!workspace)
      return

    this.rename(workspace.id, workspace.name)
  }

  removeCurrentWorkspace (){
    let workspace = this.getCurrentWorkspace()
    if (!workspace)
      return

    this.removeWorkspace(workspace.id)
  }

  renameWorkspace (sid, name){
    command.dispatch(this, 'rename', [
      sid,
      name,
      project.currentUID
    ])

    this.commit()
  }

  _rename (sid, name, projectUID){
    if (projectUID !== project.currentUID)
      return

    let workspace = this.tree[sid]
    let trimmed = String(name || '').trim()

    if (!workspace || trimmed === '')
      return

    workspace.name = trimmed

    if (this.inited) {
      let title = DOM.get(`[data-sid='${sid}'] h3`, this.$.tabs)
      if (title)
        title.innerText = trimmed
    }
  }

  select (sid){
    if (!this.tree[sid])
      return

    if (this.currentSID !== undefined && this.currentSID !== sid)
      this.unselect()

    this.currentSID = sid
    this.selectedModelId = sid
    this.addMenuOpen = false
    this.renderAddMenu()

    let tab = DOM.get(`[data-sid='${sid}']`, this.$.tabs)
    if (tab)
      tab.classList.add('on')

    this.commit()
    this.renderWorkspace()
  }

  unselect (){
    if (this.currentSID === undefined)
      return

    this.stopWebcam()
    this.stopRecording(true)

    let tab = DOM.get(`[data-sid='${this.currentSID}']`, this.$.tabs)
    if (tab)
      tab.classList.remove('on')

    this.currentSID = undefined
  }

  addWorkspace (kind){
    this.add(kind, true)
  }

  removeWorkspace (workspaceId){
    this.remove(workspaceId)
  }

  selectWorkspace (workspaceId){
    this.select(workspaceId)
  }

  renderClassesPanel (){
    let workspace = this.getCurrentWorkspace()
    if (!workspace) {
      this.$.classesPanel.innerHTML = ''
      return
    }

    if (!workspace.kind) {
      this.$.classesPanel.innerHTML = `
        <div class="ml-panel-head">
          <h3>${Msg['MLSetupTitle']}</h3>
        </div>
        <div class="ml-model-config">
          <label for="ml-workspace-name">
            <span>${Msg['MLWorkspaceName']}</span>
            <input type="text" id="ml-workspace-name" name="ml-workspace-name" value="${escapeHTML(workspace.name)}" autocomplete="off">
          </label>
          <div class="ml-kind-picker">
            <button class="primary" data-kind="image">${Msg['MLConfigureImageModel']}</button>
            <button class="ghost" data-kind="audio">${Msg['MLConfigureAudioModel']}</button>
            <button class="ghost" data-kind="pose">${Msg['MLConfigurePoseModel']}</button>
          </div>
        </div>
      `

      this.$.classesPanel.querySelector('#ml-workspace-name').addEventListener('change', (ev) => {
        this.renameWorkspace(workspace.id, ev.target.value)
      })

      this.$.classesPanel.querySelectorAll('[data-kind]').forEach((button) => {
        button.addEventListener('click', () => {
          this.configureWorkspaceKind(workspace.id, button.dataset.kind)
        })
      })
      return
    }

    let selected = this.getSelectedClass(workspace)
    this.$.classesPanel.innerHTML = `
      <div class="ml-class-list"></div>
      <button class="ml-add-class-card" data-action="add-class">+ ${Msg['MLAddClass']}</button>
    `

    this.$.classesPanel.querySelector('[data-action="add-class"]').addEventListener('click', () => {this.addClass()})

    let list = DOM.get('.ml-class-list', this.$.classesPanel)
    if (workspace.classes.length === 0)
      return

    workspace.classes.forEach((item) => {
      let runtime = this.getWorkspaceSession(workspace.id)
      let samples = this.getSamplesForClass(workspace.id, item.id)
      let count = samples.length
      let isActive = !!(selected && selected.id === item.id)
      let classLive = !!(this.stream && runtime.captureClassId === item.id)
      let renameId = `ml-rename-${workspace.id}-${item.id}`
      let uploadId = `ml-upload-${workspace.id}-${item.id}`
      let imageActionsMarkup = this.renderImageClassActions(workspace, item, classLive, uploadId)
      let samplesMarkup = this.renderClassSamples(workspace, item)
      let stageMarkup = this.renderClassStage(workspace, item, isActive)
      let countLabel = this.getClassCountLabel(workspace.kind, count)
      let card = document.createElement('div')
      card.className = `ml-class-card${isActive ? ' active' : ''}`
      card.dataset.classCard = item.id
      card.style.setProperty('--ml-class-accent', item.color)
      card.innerHTML = `
        <div class="ml-class-head">
          <div class="ml-class-title">
            <span class="ml-class-dot"></span>
            <label class="ml-class-name" for="${renameId}" title="${Msg['MLRenameClass']}">
              <input type="text" id="${renameId}" name="${renameId}" value="${escapeHTML(item.name)}" data-rename="${item.id}" autocomplete="off">
            </label>
          </div>
          <button class="ml-class-delete" data-delete="${item.id}" title="${Msg['MLDeleteClass']}">×</button>
        </div>
        <div class="ml-class-body">
          <div class="ml-class-input-pane">
            <button class="ml-class-select" data-select="${item.id}">
              <span class="ml-class-source-label">${workspace.kind === 'audio' ? Msg['MLReadyForAudio'] : this.getClassSourceLabel()}</span>
            </button>
            ${stageMarkup ? `<div class="ml-class-stage-wrap">${stageMarkup}</div>` : ''}
            <div class="ml-class-actions">
          ${(workspace.kind === 'image' || workspace.kind === 'pose') ? `
            ${imageActionsMarkup}
          ` : `
            ${this.mediaRecorder && this.mediaRecorder.state === 'recording' && isActive ? `
              <button class="ghost" data-stop-recording="${item.id}">${Msg['MLStopRecording']}</button>
              <button class="ghost" data-upload-trigger="${uploadId}">${Msg['MLUploadClips']}</button>
            ` : `
              <button class="primary" data-record="${item.id}" ${this.mediaRecorder && this.mediaRecorder.state === 'recording' ? 'disabled' : ''}>${Msg['MLRecordClip']}</button>
              <button class="ghost" data-upload-trigger="${uploadId}">${Msg['MLUploadClips']}</button>
            `}
          `}
          <input type="file" id="${uploadId}" name="${uploadId}" ${(workspace.kind === 'image' || workspace.kind === 'pose') ? 'accept="image/*"' : 'accept="audio/*"'} multiple data-upload-input="${item.id}">
            </div>
          </div>
          <div class="ml-class-samples-pane">
            <div class="ml-class-count" data-class-count="${item.id}">${count} ${countLabel}</div>
            <div class="ml-class-samples${samples.length === 0 ? ' empty' : ''}" data-class-samples="${item.id}">
              ${samplesMarkup}
            </div>
          </div>
        </div>
      `
      list.appendChild(card)
    })

    this.$.videos = Array.from(this.$.container.$.querySelectorAll('.ml-video'))
    this.$.classVideo = this.$.classesPanel.querySelector('.ml-class-stage .ml-video')

    list.querySelectorAll('[data-select]').forEach((button) => {
      button.addEventListener('click', () => {
        workspace.selectedClassId = button.dataset.select
        this.syncProject()
        this.render()
      })
    })

    list.querySelectorAll('[data-rename]').forEach((input) => {
      input.addEventListener('change', (ev) => {
        this.renameClass(ev.target.dataset.rename, ev.target.value)
      })
      input.addEventListener('keydown', (ev) => {
        ev.stopPropagation()
        if (ev.key === 'Enter')
          ev.target.blur()
      })
      input.addEventListener('click', (ev) => {
        ev.stopPropagation()
      })
    })

    list.querySelectorAll('[data-delete]').forEach((button) => {
      button.addEventListener('click', () => {
        this.removeClass(button.dataset.delete)
      })
    })

    list.querySelectorAll('[data-webcam]').forEach((button) => {
      button.addEventListener('click', () => {
        let workspace = this.getCurrentWorkspace()
        let runtime = workspace ? this.getWorkspaceSession(workspace.id) : null
        if (!workspace)
          return
        if (runtime && runtime.captureClassId === button.dataset.webcam) {
          this.stopClassWebcam(workspace.id, button.dataset.webcam)
          this.render()
          return
        }
        this.startWebcam(button.dataset.webcam)
      })
    })

    list.querySelectorAll('[data-capture]').forEach((button) => {
      button.addEventListener('click', () => {
        this.captureImageExample(button.dataset.capture)
      })
    })

    list.querySelectorAll('[data-source-capture]').forEach((button) => {
      button.addEventListener('click', () => {
        this.captureSourceDeviceExample(button.dataset.sourceCapture)
      })
    })

    list.querySelectorAll('[data-record]').forEach((button) => {
      button.addEventListener('click', () => {
        this.startRecording(button.dataset.record)
      })
    })

    list.querySelectorAll('[data-stop-recording]').forEach((button) => {
      button.addEventListener('click', () => {
        let workspace = this.getCurrentWorkspace()
        if (!workspace)
          return
        workspace.selectedClassId = button.dataset.stopRecording
        this.syncProject()
        this.stopRecording(false)
      })
    })

    list.querySelectorAll('[data-upload-trigger]').forEach((button) => {
      button.addEventListener('click', (ev) => {
        ev.preventDefault()
        let input = list.querySelector(`#${button.dataset.uploadTrigger}`)
        let workspace = this.getCurrentWorkspace()
        let classId = input ? input.dataset.uploadInput : null
        if (workspace && classId) {
          workspace.selectedClassId = classId
          this.syncProject()
        }
        this.openFilePicker(input)
      })
    })

    list.querySelectorAll('[data-upload-input]').forEach((input) => {
      input.addEventListener('change', (ev) => {
        this.uploadExamples(ev, input.dataset.uploadInput)
      })
    })

    list.querySelectorAll('[data-remove-sample]').forEach((button) => {
      button.addEventListener('click', () => {
        this.removeSample(button.dataset.classId, button.dataset.removeSample)
      })
    })
  }

  renderSourceDeviceControls (workspace, selected){
    if (!workspace || (workspace.kind !== 'image' && workspace.kind !== 'pose'))
      return ''

    let options = this.sourceDeviceOptions()
    let selectedUid = this.selectedSourceDeviceUid(options)
    let disabled = !selected || !selectedUid || this.sourceCaptureBusy ? 'disabled' : ''

    return `
      <div class="ml-source-device-card">
        <label>
          <span>${Msg['MLSourceDevice'] || 'Source device'}</span>
          <select id="ml-source-device-select" name="ml-source-device-select" data-source-device-select>
            <option value="">${Msg['MLChooseSourceDevice'] || 'Choose source device'}</option>
            ${options.map((device) => `
              <option value="${escapeHTML(device.uid)}" ${device.uid === selectedUid ? 'selected' : ''}>${escapeHTML(device.label)}</option>
            `).join('')}
          </select>
        </label>
        <button class="ghost" data-source-capture-selected ${disabled}>${this.sourceCaptureBusy ? (Msg['MLRequestingSourceImage'] || 'Requesting image...') : (Msg['MLRequestSourceImage'] || 'Request source image')}</button>
        <div class="ml-source-url-row">
          <input type="text" id="ml-source-url" name="ml-source-url" data-source-url placeholder="https://..." value="${escapeHTML(this.sourceImageUrl || '')}">
          <button class="ghost" data-source-url-capture ${selected ? '' : 'disabled'}>${Msg['MLAddFromUrl'] || 'Add from URL'}</button>
        </div>
      </div>
    `
  }

  getClassSourceLabel (){
    return Msg['MLStartWebcam']
  }

  renderImageClassActions (workspace, item, classLive, uploadId){
    if (classLive)
      return `
        <button class="ghost" data-webcam="${item.id}">${Msg['MLStopWebcam']}</button>
        <button class="primary" data-capture="${item.id}">${Msg['MLCaptureExample']}</button>
      `

    return `
      <button class="ghost" data-webcam="${item.id}">${Msg['MLStartWebcam']}</button>
      <button class="ghost" data-upload-trigger="${uploadId}">${Msg['MLUploadExamples']}</button>
    `
  }

  attachSourceDeviceControls (workspace){
    if (!workspace || (workspace.kind !== 'image' && workspace.kind !== 'pose'))
      return

    let select = this.$.classesPanel.querySelector('[data-source-device-select]')
    if (select) {
      select.addEventListener('change', (ev) => {
        this.sourceDeviceId = ev.target.value
        this.renderClassesPanel()
      })
    }

    let capture = this.$.classesPanel.querySelector('[data-source-capture-selected]')
    if (capture)
      capture.addEventListener('click', () => {this.captureSourceDeviceExample(workspace.selectedClassId)})

    let urlInput = this.$.classesPanel.querySelector('[data-source-url]')
    if (urlInput)
      urlInput.addEventListener('change', (ev) => {this.sourceImageUrl = ev.target.value})

    let urlCapture = this.$.classesPanel.querySelector('[data-source-url-capture]')
    if (urlCapture)
      urlCapture.addEventListener('click', () => {this.captureUrlExample(workspace.selectedClassId)})
  }

  renderTrainPanel (){
    let workspace = this.getCurrentWorkspace()
    if (!workspace) {
      this.$.trainPanel.innerHTML = ''
      return
    }

    if (!workspace.kind) {
      this.$.trainPanel.innerHTML = ''
      return
    }

    let runtime = this.getWorkspaceSession(workspace.id)
    let totalSamples = this.getTotalSamples(workspace.id)
    let coveredClasses = this.getCoveredClassCount(workspace.id)
    let embeddingCount = runtime.trainedModel ? runtime.trainedModel.embeddingCount : 0

    this.$.trainPanel.innerHTML = `
      <div class="ml-panel-head ml-compact-head">
        <h3>${Msg['MLTrainModel']}</h3>
      </div>
      <div class="ml-train-card">
        <button class="primary ml-train-main" data-action="train-model" ${runtime.training || totalSamples === 0 || workspace.classes.length === 0 ? 'disabled' : ''}>${runtime.training ? Msg['MLTrainingInProgress'] : Msg['MLTrainModel']}</button>
      </div>
      <details class="ml-advanced">
        <summary>${Msg['MLTrainingSettings']}</summary>
        <div class="ml-advanced-body">
          <div class="ml-mini-stats">
            <div><span>${Msg['MLSamplesChip']}</span><strong>${totalSamples}</strong></div>
            <div><span>${Msg['MLClassesCovered']}</span><strong>${coveredClasses}/${workspace.classes.length || 0}</strong></div>
            <div><span>${Msg['MLEmbeddingsLabel']}</span><strong>${embeddingCount}</strong></div>
          </div>
          <label class="ml-setting">
            <span id="ml-epochs-label">${Msg['MLEpochs']}</span>
            <input type="range" id="ml-epochs" name="ml-epochs" min="5" max="60" step="1" value="${workspace.settings.epochs}" data-setting="epochs" aria-labelledby="ml-epochs-label">
            <strong>${workspace.settings.epochs}</strong>
          </label>
          <label class="ml-setting">
            <span id="ml-batch-size-label">${Msg['MLBatchSize']}</span>
            <input type="range" id="ml-batch-size" name="ml-batch-size" min="4" max="64" step="4" value="${workspace.settings.batchSize}" data-setting="batchSize" aria-labelledby="ml-batch-size-label">
            <strong>${workspace.settings.batchSize}</strong>
          </label>
          <label class="ml-setting">
            <span id="ml-learning-rate-label">${Msg['MLLearningRate']}</span>
            <input type="range" id="ml-learning-rate" name="ml-learning-rate" min="1" max="20" step="1" value="${workspace.settings.learningRate * 1000}" data-setting="learningRate" aria-labelledby="ml-learning-rate-label">
            <strong>${workspace.settings.learningRate.toFixed(3)}</strong>
          </label>
          <p class="ml-panel-note">${runtime.trainingNote}</p>
        </div>
      </details>
    `

    this.$.trainPanel.querySelectorAll('[data-setting]').forEach((input) => {
      input.addEventListener('input', (ev) => {
        this.updateSetting(ev.target.dataset.setting, ev.target.value)
      })
    })

    let trainButton = this.$.trainPanel.querySelector('[data-action="train-model"]')
    if (trainButton)
      trainButton.addEventListener('click', () => {this.prepareTraining()})
  }

  renderPreviewPanel (){
    let workspace = this.getCurrentWorkspace()
    if (!workspace) {
      this.$.previewPanel.innerHTML = ''
      return
    }

    if (!workspace.kind) {
      this.$.previewPanel.innerHTML = ''
      return
    }

    let runtime = this.getWorkspaceSession(workspace.id)
    this.$.previewPanel.innerHTML = `
      <div class="ml-panel-head ml-compact-head">
        <h3>${Msg['MLPreviewTitle']}</h3>
        <button class="ghost" data-action="export-model" ${runtime.trainedModel ? '' : 'disabled'}>${Msg['MLExportModel']}</button>
      </div>
      <div class="ml-preview-card">
        ${runtime.trainedModel ? this.renderPreviewMarkup(workspace, runtime) : `
          <div class="ml-preview-empty">
            <p>${Msg['MLTestNeedsModel']}</p>
          </div>
        `}
      </div>
    `

    let exportButton = this.$.previewPanel.querySelector('[data-action="export-model"]')

    if (exportButton)
      exportButton.addEventListener('click', () => {this.prepareExport()})

    let previewButton = this.$.previewPanel.querySelector('[data-action="toggle-live-preview"]')
    if (previewButton) {
      previewButton.addEventListener('click', () => {
        if (runtime.previewLive)
          this.stopLivePreview(workspace.id)
        else
          this.startLivePreview(workspace.id)
      })
    }
  }

  renderImageSourceMarkup (workspace, selected, latest){
    return `
      <div class="ml-stage">
        ${this.stream ? '<video class="ml-video" playsinline muted></video>' : ''}
        ${!this.stream && latest ? `<img src="${latest.url}" alt="${escapeHTML(latest.name)}">` : ''}
        <div class="ml-stage-placeholder"${this.stream || latest ? ' hidden' : ''}>${Msg['MLCapturePlaceholder']}</div>
      </div>
      <div class="ml-control-row">
        <button class="ghost" data-action="stop-webcam" ${this.stream ? '' : 'disabled'}>${Msg['MLStopWebcam']}</button>
      </div>
      <p class="ml-panel-note">${selected ? (workspace.kind === 'pose' ? Msg['MLReadyForPose'] : Msg['MLReadyForImage']) : Msg['MLNeedClassFirst']}</p>
    `
  }

  renderAudioSourceMarkup (workspace, selected, latest){
    let recording = this.mediaRecorder && this.mediaRecorder.state === 'recording'
    return `
      <div class="${recording ? 'ml-audio-stage' : 'ml-test-preview'}">
        ${recording ? `
          <div class="ml-audio-mark">${Msg['MLAudioPlaceholder']}</div>
          <div class="ml-audio-bars">
            <span></span><span></span><span></span><span></span><span></span>
          </div>
        ` : latest ? `
          <audio controls src="${latest.url}"></audio>
          <div class="ml-audio-name">${escapeHTML(latest.name)}</div>
        ` : `
          <div class="ml-test-empty">${Msg['MLAudioPlaceholder']}</div>
        `}
      </div>
      <div class="ml-control-row">
        <button class="ghost" data-action="stop-audio" ${recording ? '' : 'disabled'}>${Msg['MLStopRecording']}</button>
      </div>
      <p class="ml-panel-note">${selected ? Msg['MLReadyForAudio'] : Msg['MLNeedClassFirst']}</p>
    `
  }

  renderPreviewMarkup (workspace, runtime){
    let liveEnabled = workspace.kind === 'image' || workspace.kind === 'pose'
    return `
      <div class="ml-preview-input-row">
        <span>Input</span>
        <strong>${runtime.previewLive ? 'Webcam' : Msg['MLLiveTest']}</strong>
      </div>
      ${liveEnabled ? `
        <div class="ml-control-row">
          <button class="ghost" data-action="toggle-live-preview">${runtime.previewLive ? Msg['MLStopLivePreview'] : Msg['MLStartLivePreview']}</button>
        </div>
        <div class="ml-test-preview${runtime.previewLive ? ' live' : ''}">
          ${runtime.previewLive ? '<video class="ml-video ml-preview-video" playsinline muted></video>' : `<div class="ml-test-empty">${Msg['MLLivePreviewOff']}</div>`}
        </div>
      ` : `
        <div class="ml-preview-empty">
          <p>${Msg['MLAudioPreviewHelp']}</p>
        </div>
      `}
      <div class="ml-preview-result" data-live-prediction>${this.renderPredictionCard(runtime.livePrediction)}</div>
      <p class="ml-panel-note">${this.getTestNote(runtime)}</p>
    `
  }

  renderPredictionCard (result){
    if (!result) {
      return `
        <div class="ml-prediction-card empty">
          <span>${Msg['MLPredictionResult']}</span>
          <strong>${Msg['MLLivePredictionPending']}</strong>
        </div>
      `
    }

    return `
      <div class="ml-prediction-card">
        <span>${Msg['MLPredictionResult']}</span>
        <strong>${escapeHTML(result.label)}</strong>
        <em>${Msg['MLPredictionConfidence']}: ${(result.confidence * 100).toFixed(1)}%</em>
      </div>
    `
  }

  renderEmptyPanel (title, text){
    return `
      <div class="ml-panel-head">
        <h3>${title}</h3>
        <p>${text}</p>
      </div>
      <div class="ml-empty-panel">
        <svg class="ml-empty-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="10" cy="10" r="2"/><circle cx="3" cy="5" r="1.5"/><circle cx="3" cy="15" r="1.5"/><circle cx="17" cy="5" r="1.5"/><circle cx="17" cy="15" r="1.5"/><line x1="4.5" y1="5.5" x2="8.5" y2="9.2"/><line x1="4.5" y1="14.5" x2="8.5" y2="10.8"/><line x1="15.5" y1="5.5" x2="11.5" y2="9.2"/><line x1="15.5" y1="14.5" x2="11.5" y2="10.8"/></svg>
        <strong>${Msg['MLModelNotSelected']}</strong>
        <span>${text}</span>
      </div>
    `
  }

  configureWorkspaceKind (workspaceId, kind){
    let workspace = this.tree[workspaceId]
    if (!workspace)
      return

    this.clearAllSamplesForWorkspace(workspaceId)
    workspace.kind = kind === 'audio' || kind === 'pose' ? kind : 'image'
    workspace.classes = this.makeDefaultClasses()
    workspace.selectedClassId = workspace.classes[0].id
    this.getWorkspaceSession(workspaceId).trainingNote = Msg['MLTrainPending']
    this.invalidateWorkspaceModel(workspaceId)
    this.syncProject()
    this.render()
  }

  addClass (){
    let workspace = this.getCurrentWorkspace()
    if (!workspace || !workspace.kind)
      return

    let nextNumber = workspace.classes.length + 1
    let item = {
      id:`ml-class-${DOM.UID()}`,
      name:`Class ${nextNumber}`,
      color:ML_CLASS_COLORS[(nextNumber - 1) % ML_CLASS_COLORS.length]
    }
    workspace.classes.push(item)
    workspace.selectedClassId = item.id
    this.invalidateWorkspaceModel(workspace.id)
    this.syncProject()
    this.render()
  }

  removeClass (classId){
    let workspace = this.getCurrentWorkspace()
    if (!workspace)
      return

    this.clearSamplesForClass(workspace.id, classId)
    workspace.classes = workspace.classes.filter((item) => item.id !== classId)
    workspace.selectedClassId = workspace.classes[0] ? workspace.classes[0].id : null
    this.invalidateWorkspaceModel(workspace.id)
    this.syncProject()
    this.render()
  }

  renameClass (classId, name){
    let workspace = this.getCurrentWorkspace()
    let trimmed = String(name || '').trim()
    if (!workspace)
      return

    let item = workspace.classes.find((entry) => entry.id === classId)
    if (!item)
      return

    item.name = trimmed === '' ? item.name : trimmed
    this.invalidateWorkspaceModel(workspace.id)
    this.syncProject()
    this.render()
  }

  clearDataset (){
    let workspace = this.getCurrentWorkspace()
    if (!workspace)
      return

    this.clearAllSamplesForWorkspace(workspace.id)
    this.clearTestSample(workspace.id)
    this.invalidateWorkspaceModel(workspace.id)
    this.getWorkspaceSession(workspace.id).trainingNote = Msg['MLTrainPending']
    this.syncProject()
    this.render()
  }

  updateSetting (name, value){
    let workspace = this.getCurrentWorkspace()
    if (!workspace)
      return

    if (name === 'learningRate')
      workspace.settings.learningRate = Math.max(0.001, Math.min(0.020, Number(value) / 1000))
    else if (name === 'epochs')
      workspace.settings.epochs = Math.max(5, Math.min(60, Number(value) || 20))
    else if (name === 'batchSize')
      workspace.settings.batchSize = Math.max(4, Math.min(64, Number(value) || 16))
    this.syncProject()
    this.renderPreviewPanel()
  }

  async prepareTraining (){
    let workspace = this.getCurrentWorkspace()
    if (!workspace || !workspace.kind)
      return

    let runtime = this.getWorkspaceSession(workspace.id)
    let total = this.getTotalSamples(workspace.id)
    if (total === 0 || workspace.classes.length === 0) {
      runtime.trainingNote = Msg['MLNoExamplesToTrain']
      this.renderTrainPanel()
      this.renderPreviewPanel()
      return
    }

    runtime.training = true
    runtime.trainingNote = Msg['MLTrainingStarted']
    this.renderTrainPanel()
    this.renderPreviewPanel()

    try {
      runtime.trainedModel = await this.buildEmbeddingModel(workspace)
      if (await this.persistTrainedModel(workspace.id, runtime.trainedModel))
        this.updateWorkspaceModelRef(workspace.id)
      runtime.trainingNote = `${Msg['MLModelReady']} ${runtime.trainedModel.embeddingCount} ${Msg['MLEmbeddingsLabel'].toLowerCase()}.`
      if (runtime.testSample)
        await this.predictCurrentTestSample(workspace.id)
      this.syncProject()
    } catch (err) {
      console.error('Failed to train ML page model:', err)
      runtime.trainingNote = Msg['MLTrainError']
    } finally {
      runtime.training = false
      this.renderTrainPanel()
      this.renderPreviewPanel()
    }
  }

  prepareExport (){
    let workspace = this.getCurrentWorkspace()
    let runtime = workspace ? this.getWorkspaceSession(workspace.id) : null
    if (!workspace || !runtime || !runtime.trainedModel) {
      if (runtime)
        runtime.trainingNote = Msg['MLNoModelYet']
      this.renderPreviewPanel()
      return
    }

    let blob = new Blob([JSON.stringify({
      id:workspace.id,
      name:workspace.name,
      kind:workspace.kind,
      trainedAt:runtime.trainedModel.trainedAt,
      classes:runtime.trainedModel.classes,
      settings:{...workspace.settings},
      embeddings:runtime.trainedModel.embeddings
    }, null, 2)], {type:'application/json'})
    let url = URL.createObjectURL(blob)
    let link = document.createElement('a')
    link.href = url
    link.download = `ml-${workspace.kind}-${workspace.id}.json`
    link.click()
    URL.revokeObjectURL(url)
    runtime.trainingNote = Msg['MLExportReady']
    this.renderPreviewPanel()
  }

  async startWebcam (classId){
    let workspace = this.getCurrentWorkspace()
    if (!workspace || (workspace.kind !== 'image' && workspace.kind !== 'pose'))
      return
    let runtime = this.getWorkspaceSession(workspace.id)

    if (classId) {
      workspace.selectedClassId = classId
      this.syncProject()
    }

    try {
      if (!this.stream)
        this.stream = await navigator.mediaDevices.getUserMedia({video:true, audio:false})
      runtime.captureClassId = classId || workspace.selectedClassId
      this.render()
      this.syncLivePredictionLoop()
    } catch (err) {
      console.error('Failed to start webcam:', err)
    }
  }

  stopClassWebcam (workspaceId, classId){
    let workspace = this.tree[workspaceId]
    let runtime = workspace ? this.getWorkspaceSession(workspaceId) : null
    if (!workspace || !runtime)
      return

    if (!classId || runtime.captureClassId === classId)
      runtime.captureClassId = null

    if (!runtime.previewLive)
      this.stopWebcam()
  }

  async startLivePreview (workspaceId){
    let workspace = this.tree[workspaceId]
    let runtime = workspace ? this.getWorkspaceSession(workspaceId) : null
    if (!workspace || !runtime || !runtime.trainedModel)
      return

    runtime.previewLive = true
    runtime.livePrediction = null

    try {
      if (!this.stream)
        this.stream = await navigator.mediaDevices.getUserMedia({video:true, audio:false})
      this.renderPreviewPanel()
      this.$.videos = Array.from(this.$.container.$.querySelectorAll('.ml-video'))
      this.attachVideoStream()
      this.syncLivePredictionLoop()
    } catch (err) {
      runtime.previewLive = false
      console.error('Failed to start ML preview webcam:', err)
      this.renderPreviewPanel()
    }
  }

  stopLivePreview (workspaceId){
    let workspace = this.tree[workspaceId]
    let runtime = workspace ? this.getWorkspaceSession(workspaceId) : null
    if (!workspace || !runtime)
      return

    runtime.previewLive = false
    runtime.livePrediction = null
    this.stopLivePredictionLoop()
    if (!runtime.captureClassId)
      this.stopWebcam()
    this.renderPreviewPanel()
  }

  stopWebcam (){
    this.stopLivePredictionLoop()
    let workspace = this.getCurrentWorkspace()
    let runtime = workspace ? this.getWorkspaceSession(workspace.id) : null
    if (runtime) {
      runtime.captureClassId = null
      runtime.previewLive = false
      runtime.livePrediction = null
    }
    if (!this.stream)
      return

    this.stream.getTracks().forEach((track) => track.stop())
    this.stream = null
  }

  attachVideoStream (){
    if (!this.$.videos || this.$.videos.length === 0 || !this.stream)
      return

    this.$.videos.forEach((video) => {
      video.srcObject = this.stream
      video.play().catch(() => {})
    })
    this.syncLivePredictionLoop()
  }

  syncLivePredictionLoop (){
    let workspace = this.getCurrentWorkspace()
    let runtime = workspace ? this.getWorkspaceSession(workspace.id) : null

    if (!workspace || !runtime || !runtime.previewLive || !runtime.trainedModel || !this.stream) {
      this.stopLivePredictionLoop()
      return
    }

    let token = ++this.livePredictToken
    this.livePredictAt = 0
    this.livePredictBusy = false

    let tick = async (now) => {
      if (token !== this.livePredictToken)
        return

      let currentWorkspace = this.getCurrentWorkspace()
      let currentRuntime = currentWorkspace ? this.getWorkspaceSession(currentWorkspace.id) : null
      let previewVideo = this.$.previewPanel ? this.$.previewPanel.querySelector('.ml-preview-video') : null

      if (!currentWorkspace || !currentRuntime || !currentRuntime.previewLive || !currentRuntime.trainedModel || !this.stream || !previewVideo) {
        this.stopLivePredictionLoop()
        return
      }

      if (!this.livePredictBusy && previewVideo.readyState >= 2 && now - this.livePredictAt > 240) {
        this.livePredictBusy = true
        this.livePredictAt = now
        try {
          let vector = await this.videoElementToVector(currentWorkspace.kind, previewVideo)
          currentRuntime.livePrediction = this.predictVector(currentRuntime.trainedModel, vector)
          this.refreshPreviewPrediction(currentWorkspace.id)
        } catch (err) {
          console.error('Failed to run live ML preview prediction:', err)
        } finally {
          this.livePredictBusy = false
        }
      }

      window.requestAnimationFrame(tick)
    }

    window.requestAnimationFrame(tick)
  }

  stopLivePredictionLoop (){
    this.livePredictToken += 1
    this.livePredictBusy = false
  }

  async videoElementToVector (mode, video){
    let canvas = document.createElement('canvas')
    let width = video.videoWidth || 320
    let height = video.videoHeight || 240
    canvas.width = width
    canvas.height = height
    let context = canvas.getContext('2d', {willReadFrequently:true})
    context.drawImage(video, 0, 0, width, height)
    let blob = await new Promise((resolve) => {
      canvas.toBlob((nextBlob) => {resolve(nextBlob)}, 'image/png', 0.92)
    })
    if (!blob)
      throw new Error('Failed to capture preview frame')
    return this.sampleToVector(mode, blob)
  }

  refreshPreviewPrediction (workspaceId){
    if (!this.$.previewPanel)
      return

    let workspace = this.tree[workspaceId]
    let runtime = workspace ? this.getWorkspaceSession(workspaceId) : null
    let target = this.$.previewPanel.querySelector('[data-live-prediction]')
    if (!workspace || !runtime || !target)
      return

    target.innerHTML = this.renderPredictionCard(runtime.livePrediction)
  }

  sourceDeviceOptions (){
    let options = []
    let known = new Set()
    let pageDevices = window.bipes && bipes.page && bipes.page.device && Array.isArray(bipes.page.device.devices)
      ? bipes.page.device.devices
      : []

    pageDevices.forEach((device) => {
      if (!device || !device.uid || !channel.hasConnection(device.uid) || known.has(device.uid))
        return
      known.add(device.uid)
      options.push({
        uid:device.uid,
        label:this.formatSourceDeviceLabel(device)
      })
    })

    Object.keys(channel.connections || {}).forEach((uid) => {
      if (known.has(uid))
        return
      known.add(uid)
      options.push({
        uid,
        label:this.formatSourceDeviceLabel({uid})
      })
    })

    return options
  }

  formatSourceDeviceLabel (device){
    let name = device && device.nodename ? device.nodename : (Msg['MLSourceDevice'] || 'Source device')
    let version = device && device.version && device.version !== '-' ? ` ${device.version}` : ''
    let protocol = device && device.protocol ? device.protocol : 'device'
    return `${name}${version} (${protocol})`
  }

  selectedSourceDeviceUid (options){
    options = options || this.sourceDeviceOptions()
    if (this.sourceDeviceId && options.some((device) => device.uid === this.sourceDeviceId))
      return this.sourceDeviceId
    if (options.length === 1)
      return options[0].uid
    return ''
  }

  async captureSourceDeviceExample (classId){
    let workspace = this.getCurrentWorkspace()
    if (!workspace || (workspace.kind !== 'image' && workspace.kind !== 'pose') || this.sourceCaptureBusy)
      return

    if (classId) {
      workspace.selectedClassId = classId
      this.syncProject()
    }

    let selected = this.getSelectedClass(workspace)
    let runtime = this.getWorkspaceSession(workspace.id)
    let sourceUid = this.selectedSourceDeviceUid()
    if (!selected || !sourceUid || !channel.hasConnection(sourceUid)) {
      runtime.trainingNote = Msg['MLChooseSourceDevice'] || 'Choose source device'
      this.renderTrainPanel()
      return
    }

    let feed = channel.getImageFeed(sourceUid)
    if (!feed || typeof feed.getFrame != 'function') {
      runtime.trainingNote = Msg['MLSourceDeviceUnavailable'] || 'Source device is not ready for image capture.'
      this.renderTrainPanel()
      return
    }

    this.sourceCaptureBusy = true
    runtime.trainingNote = Msg['MLRequestingSourceImage'] || 'Requesting image from source device...'
    this.renderClassesPanel()
    this.renderTrainPanel()

    try {
      let frame = await feed.getFrame()
      if (!frame || !frame.blob)
        throw new Error(Msg['MLSourceDeviceUnavailable'] || 'Source device is not ready for image capture.')

      this.sourceDeviceId = sourceUid
      this.addSample(selected.id, frame.blob, `source-${Date.now()}.${frame.contentType === 'image/jpeg' ? 'jpg' : 'png'}`)
      runtime.trainingNote = Msg['MLSourceImageCaptured'] || 'Captured image from source device.'
    } catch (err) {
      console.error('Failed to capture ML source device image:', err)
      runtime.trainingNote = (err && err.message) || (Msg['MLSourceCaptureFailed'] || 'Could not capture image from source device.')
    } finally {
      this.sourceCaptureBusy = false
      this.renderClassesPanel()
      this.renderTrainPanel()
      this.renderPreviewPanel()
    }
  }

  async captureUrlExample (classId){
    let workspace = this.getCurrentWorkspace()
    if (!workspace || (workspace.kind !== 'image' && workspace.kind !== 'pose'))
      return

    if (classId) {
      workspace.selectedClassId = classId
      this.syncProject()
    }

    let selected = this.getSelectedClass(workspace)
    let runtime = this.getWorkspaceSession(workspace.id)
    let url = (this.sourceImageUrl || '').trim()
    if (!selected || !url) {
      runtime.trainingNote = Msg['MLEnterImageUrl'] || 'Enter an image URL.'
      this.renderTrainPanel()
      return
    }

    try {
      let captured = await new ImageSource({type:'url', url}).capture()
      let blob = await captured.toBlob({type:'image/png'})
      this.addSample(selected.id, blob, captured.filename || `url-${Date.now()}.png`)
      runtime.trainingNote = Msg['MLUrlImageCaptured'] || 'Added image from URL.'
    } catch (err) {
      console.error('ML: URL image capture failed', err)
      runtime.trainingNote = (err && err.message) || (Msg['MLUrlCaptureFailed'] || 'Could not load image from URL (check the link allows cross-origin access).')
    } finally {
      this.renderClassesPanel()
      this.renderTrainPanel()
      this.renderPreviewPanel()
    }
  }

  captureImageExample (classId){
    let workspace = this.getCurrentWorkspace()
    if (!workspace || (workspace.kind !== 'image' && workspace.kind !== 'pose'))
      return

    if (classId) {
      workspace.selectedClassId = classId
      this.syncProject()
    }

    let selected = this.getSelectedClass(workspace)
    if (!this.stream || !this.$.classVideo || !selected)
      return

    let canvas = document.createElement('canvas')
    canvas.width = this.$.classVideo.videoWidth || 320
    canvas.height = this.$.classVideo.videoHeight || 240
    let context = canvas.getContext('2d', {willReadFrequently:true})
    context.drawImage(this.$.classVideo, 0, 0, canvas.width, canvas.height)
    canvas.toBlob((blob) => {
      if (!blob)
        return
      this.addSample(selected.id, blob, `capture-${Date.now()}.png`)
    }, 'image/png', 0.92)
  }

  async startRecording (classId){
    let workspace = this.getCurrentWorkspace()
    if (!workspace || workspace.kind !== 'audio')
      return

    if (classId) {
      workspace.selectedClassId = classId
      this.syncProject()
    }

    let selected = this.getSelectedClass(workspace)
    if (!selected)
      return

    if (!window.MediaRecorder || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.getWorkspaceSession(workspace.id).trainingNote = Msg['MLBrowserSupport']
      this.renderPreviewPanel()
      return
    }

    try {
      this.audioStream = await navigator.mediaDevices.getUserMedia({audio:true})
      this.recordingCanceled = false
      this.recordedChunks = []
      this.mediaRecorder = new MediaRecorder(this.audioStream)
      this.mediaRecorder.addEventListener('dataavailable', (ev) => {
        if (ev.data && ev.data.size > 0)
          this.recordedChunks.push(ev.data)
      })
      this.mediaRecorder.addEventListener('stop', () => {
        let chunks = this.recordedChunks.slice()
        let canceled = this.recordingCanceled
        this.recordedChunks = []
        if (this.audioStream) {
          this.audioStream.getTracks().forEach((track) => track.stop())
          this.audioStream = null
        }
        this.mediaRecorder = null
        let current = this.getCurrentWorkspace()
        let currentClass = this.getSelectedClass(current)
        if (!canceled && chunks.length > 0 && current && current.kind === 'audio' && currentClass) {
          let blob = new Blob(chunks, {type:'audio/webm'})
          this.addSample(currentClass.id, blob, `clip-${Date.now()}.webm`)
        } else {
          this.render()
        }
      })
      this.mediaRecorder.start()
      this.render()
    } catch (err) {
      console.error('Failed to start audio recording:', err)
    }
  }

  stopRecording (cancel){
    if (!this.mediaRecorder)
      return

    this.recordingCanceled = !!cancel
    if (this.mediaRecorder.state !== 'inactive')
      this.mediaRecorder.stop()
  }

  uploadExamples (ev, classId){
    let workspace = this.getCurrentWorkspace()
    if (!workspace) {
      ev.target.value = ''
      return
    }

    if (classId) {
      workspace.selectedClassId = classId
      this.syncProject()
    }

    let selected = this.getSelectedClass(workspace)
    let files = ev.target.files ? Array.from(ev.target.files) : []
    if (!selected) {
      ev.target.value = ''
      return
    }

    files.forEach((file) => {
      this.addSample(selected.id, file, file.name)
    })
    ev.target.value = ''
  }

  renderClassSamples (workspace, classItem){
    let samples = this.getSamplesForClass(workspace.id, classItem.id)
    if (samples.length === 0)
      return ''

    return samples.slice(0, 6).map((sample) => {
      if (sample.kind === 'image' || sample.kind === 'pose') {
        return `
          <div class="ml-class-sample image">
            <img src="${sample.url}" alt="${escapeHTML(sample.name)}">
            <button class="ml-class-sample-delete" data-class-id="${classItem.id}" data-remove-sample="${sample.id}" title="${Msg['MLDeleteExample']}">×</button>
          </div>
        `
      }

      return `
        <div class="ml-class-sample audio">
          <span>${escapeHTML(sample.name)}</span>
          <button class="ml-class-sample-delete" data-class-id="${classItem.id}" data-remove-sample="${sample.id}" title="${Msg['MLDeleteExample']}">×</button>
        </div>
      `
    }).join('')
  }

  renderClassStage (workspace, classItem, isActive){
    let runtime = this.getWorkspaceSession(workspace.id)
    if (workspace.kind === 'image' || workspace.kind === 'pose') {
      if (!(this.stream && runtime.captureClassId === classItem.id && isActive))
        return ''
      return `
        <div class="ml-class-stage image">
          <video class="ml-video" playsinline muted></video>
        </div>
      `
    }

    let recording = this.mediaRecorder && this.mediaRecorder.state === 'recording' && isActive
    if (!recording)
      return ''
    return `
      <div class="ml-class-stage audio">
        <div class="ml-audio-mark">${Msg['MLAudioPlaceholder']}</div>
        <div class="ml-audio-bars">
          <span></span><span></span><span></span><span></span><span></span>
        </div>
      </div>
    `
  }

  getClassCountLabel (kind, count){
    if (kind === 'audio')
      return count === 1 ? 'audio clip' : 'audio clips'
    if (kind === 'pose')
      return count === 1 ? 'pose sample' : 'pose samples'
    return count === 1 ? 'image sample' : 'image samples'
  }

  uploadTestSample (ev){
    let workspace = this.getCurrentWorkspace()
    let runtime = workspace ? this.getWorkspaceSession(workspace.id) : null
    let file = ev.target.files && ev.target.files[0]
    if (!workspace || !runtime || !file)
      return

    this.clearTestSample(workspace.id)
    runtime.testSample = {
      kind:workspace.kind,
      name:file.name,
      url:URL.createObjectURL(file),
      blob:file,
      result:null
    }
    this.predictCurrentTestSample(workspace.id).finally(() => {this.renderPreviewPanel()})
    ev.target.value = ''
  }

  addSample (classId, blob, name){
    let workspace = this.getCurrentWorkspace()
    if (!workspace)
      return
    let runtime = this.getWorkspaceSession(workspace.id)

    let store = this.getSampleStore(workspace.id)
    if (!store[classId])
      store[classId] = []

    let sample = {
      id:`ml-sample-${DOM.UID()}`,
      kind:workspace.kind,
      name:name || `${workspace.kind}-${Date.now()}`,
      url:URL.createObjectURL(blob),
      blob:blob
    }
    store[classId].unshift(sample)
    this.updateWorkspaceSampleRefs(workspace.id)
    this.persistSample(workspace.id, classId, sample)
    this.invalidateWorkspaceModel(workspace.id)
    this.syncProject()
    if (this.stream && runtime.captureClassId === classId) {
      this.refreshClassCard(workspace, classId)
      return
    } else {
      this.renderClassesPanel()
      this.renderTrainPanel()
      this.renderPreviewPanel()
      this.$.videos = Array.from(this.$.container.$.querySelectorAll('.ml-video'))
      this.$.classVideo = this.$.classesPanel.querySelector('.ml-class-stage .ml-video')
      this.attachVideoStream()
    }
  }

  removeSample (classId, sampleId){
    let workspace = this.getCurrentWorkspace()
    if (!workspace)
      return
    let runtime = this.getWorkspaceSession(workspace.id)

    let store = this.getSampleStore(workspace.id)
    if (!store[classId])
      return

    let index = store[classId].findIndex((item) => item.id === sampleId)
    if (index === -1)
      return

    this.revokeSample(store[classId][index])
    store[classId].splice(index, 1)
    this.deletePersistedSample(workspace.id, classId, sampleId)
    this.updateWorkspaceSampleRefs(workspace.id)
    this.invalidateWorkspaceModel(workspace.id)
    this.syncProject()
    if (this.stream && runtime.captureClassId === classId) {
      this.refreshClassCard(workspace, classId)
      return
    } else {
      this.renderClassesPanel()
      this.renderTrainPanel()
      this.renderPreviewPanel()
      this.$.videos = Array.from(this.$.container.$.querySelectorAll('.ml-video'))
      this.$.classVideo = this.$.classesPanel.querySelector('.ml-class-stage .ml-video')
      this.attachVideoStream()
    }
  }

  refreshClassCard (workspace, classId){
    if (!this.$.classesPanel)
      return

    let count = this.getSamplesForClass(workspace.id, classId).length
    let label = this.getClassCountLabel(workspace.kind, count)
    let countNode = this.$.classesPanel.querySelector(`[data-class-count="${classId}"]`)
    let samplesNode = this.$.classesPanel.querySelector(`[data-class-samples="${classId}"]`)
    let classItem = workspace.classes.find((item) => item.id === classId)

    if (countNode)
      countNode.textContent = `${count} ${label}`

    if (samplesNode && classItem) {
      samplesNode.innerHTML = this.renderClassSamples(workspace, classItem)
      samplesNode.classList.toggle('empty', count === 0)
      samplesNode.querySelectorAll('[data-remove-sample]').forEach((button) => {
        button.addEventListener('click', () => {
          this.removeSample(button.dataset.classId, button.dataset.removeSample)
        })
      })
    }
  }

  clearSamplesForClass (workspaceId, classId, options){
    options = options || {}
    let workspace = this.tree[workspaceId]
    let refs = workspace ? this.normalizeSampleRefs(workspace.sampleRefs) : {}
    let store = this.getSampleStore(workspaceId)
    let samples = store[classId] || []
    samples.forEach((sample) => {this.revokeSample(sample)})
    if (options.deletePersisted !== false) {
      let persistedSamples = refs[classId] || samples
      persistedSamples.forEach((sample) => {
        this.deletePersistedSample(workspaceId, classId, sample.id)
      })
    }
    delete store[classId]
    if (workspace && options.updateRefs !== false) {
      if (!workspace.sampleRefs)
        workspace.sampleRefs = {}
      delete workspace.sampleRefs[classId]
    }
  }

  clearAllSamplesForWorkspace (workspaceId, options){
    options = options || {}
    let workspace = this.tree[workspaceId]
    let refs = workspace ? this.normalizeSampleRefs(workspace.sampleRefs) : {}
    let store = this.getSampleStore(workspaceId)
    let queuedDeletes = new Set()
    let queueDelete = (classId, sampleId) => {
      let key = `${classId}:${sampleId}`
      if (queuedDeletes.has(key))
        return
      queuedDeletes.add(key)
      this.deletePersistedSample(workspaceId, classId, sampleId)
    }
    if (options.deletePersisted !== false) {
      Object.keys(refs).forEach((classId) => {
        refs[classId].forEach((sample) => {
          queueDelete(classId, sample.id)
        })
      })
    }
    Object.keys(store).forEach((classId) => {
      store[classId].forEach((sample) => {this.revokeSample(sample)})
      if (options.deletePersisted !== false) {
        store[classId].forEach((sample) => {
          queueDelete(classId, sample.id)
        })
      }
      delete store[classId]
    })
    if (workspace && options.updateRefs !== false)
      workspace.sampleRefs = {}
  }

  clearTestSample (workspaceId){
    let runtime = this.getWorkspaceSession(workspaceId)
    if (runtime.testSample)
      this.revokeSample(runtime.testSample)
    runtime.testSample = null
  }

  clearWorkspaceSession (workspaceId){
    this.clearAllSamplesForWorkspace(workspaceId)
    this.clearTestSample(workspaceId)
    this.deletePersistedModel(workspaceId)
    let bucket = this.getProjectBucket()
    delete bucket.workspaces[workspaceId]
  }

  getStorageProjectId (){
    return project.currentUID || '__session__'
  }

  storageSampleKey (projectId, workspaceId, classId, sampleId){
    return [projectId, workspaceId, classId, sampleId].join('::')
  }

  storageModelKey (projectId, workspaceId){
    return [projectId, workspaceId, 'trained-model'].join('::')
  }

  persistSample (workspaceId, classId, sample){
    let projectId = this.getStorageProjectId()
    if (!sample || !sample.blob)
      return Promise.resolve(false)

    return writeMLStorage(ML_STORAGE_SAMPLES, {
      key:this.storageSampleKey(projectId, workspaceId, classId, sample.id),
      projectId:projectId,
      workspaceId:workspaceId,
      classId:classId,
      sampleId:sample.id,
      kind:sample.kind,
      name:sample.name,
      blob:sample.blob
    }).catch((err) => {
      console.error('Failed to persist ML sample:', err)
      return false
    })
  }

  deletePersistedSample (workspaceId, classId, sampleId){
    let projectId = this.getStorageProjectId()
    return deleteMLStorage(ML_STORAGE_SAMPLES, this.storageSampleKey(projectId, workspaceId, classId, sampleId)).catch((err) => {
      console.error('Failed to delete persisted ML sample:', err)
      return false
    })
  }

  persistTrainedModel (workspaceId, trainedModel){
    let projectId = this.getStorageProjectId()
    if (!trainedModel)
      return Promise.resolve(false)

    return writeMLStorage(ML_STORAGE_MODELS, {
      key:this.storageModelKey(projectId, workspaceId),
      projectId:projectId,
      workspaceId:workspaceId,
      model:trainedModel
    }).catch((err) => {
      console.error('Failed to persist ML model:', err)
      return false
    })
  }

  deletePersistedModel (workspaceId){
    let projectId = this.getStorageProjectId()
    return deleteMLStorage(ML_STORAGE_MODELS, this.storageModelKey(projectId, workspaceId)).catch((err) => {
      console.error('Failed to delete persisted ML model:', err)
      return false
    })
  }

  async restorePersistedState (){
    let token = ++this.restoreToken
    let projectId = this.getStorageProjectId()
    let changed = false

    await Promise.all(Object.keys(this.tree).map(async (workspaceId) => {
      let workspaceChanged = await this.restoreWorkspacePersistence(projectId, workspaceId)
      changed = changed || workspaceChanged
    })).catch((err) => {
      console.error('Failed to restore ML storage:', err)
    })

    if (token !== this.restoreToken)
      return

    if (changed)
      this.syncProject()
    if (this.available && this.inited)
      this.render()
  }

  async restoreWorkspacePersistence (projectId, workspaceId){
    let workspace = this.tree[workspaceId]
    if (!workspace)
      return false

    let changed = false
    let runtime = this.getWorkspaceSession(workspaceId)
    this.clearAllSamplesForWorkspace(workspaceId, {
      deletePersisted:false,
      updateRefs:false
    })

    let refs = this.normalizeSampleRefs(workspace.sampleRefs)
    let nextRefs = {}
    let classIds = new Set(workspace.classes.map((item) => item.id))

    for (let classId of Object.keys(refs)) {
      if (!classIds.has(classId)) {
        changed = true
        continue
      }

      let samples = []
      for (let sampleRef of refs[classId]) {
        let record = await readMLStorage(
          ML_STORAGE_SAMPLES,
          this.storageSampleKey(projectId, workspaceId, classId, sampleRef.id)
        ).catch((err) => {
          console.error('Failed to read persisted ML sample:', err)
          return null
        })

        if (!record || !record.blob) {
          changed = true
          continue
        }

        let sample = {
          id:sampleRef.id,
          kind:record.kind || sampleRef.kind || workspace.kind,
          name:record.name || sampleRef.name || `${workspace.kind}-${Date.now()}`,
          url:URL.createObjectURL(record.blob),
          blob:record.blob
        }
        samples.push(sample)
      }

      if (samples.length > 0) {
        runtime.samples[classId] = samples
        nextRefs[classId] = samples.map((sample) => {
          return {
            id:sample.id,
            kind:sample.kind,
            name:sample.name
          }
        })
      }
    }

    workspace.sampleRefs = nextRefs
    runtime.trainedModel = null
    runtime.livePrediction = null
    runtime.previewLive = false

    if (workspace.trainedModelRef) {
      let record = await readMLStorage(
        ML_STORAGE_MODELS,
        this.storageModelKey(projectId, workspaceId)
      ).catch((err) => {
        console.error('Failed to read persisted ML model:', err)
        return null
      })

      if (record && record.model) {
        runtime.trainedModel = record.model
        runtime.trainingNote = `${Msg['MLModelReady']} ${record.model.embeddingCount} ${Msg['MLEmbeddingsLabel'].toLowerCase()}.`
      } else {
        workspace.trainedModelRef = null
        changed = true
      }
    }

    return changed
  }

  openFilePicker (input){
    if (!input)
      return

    if (typeof input.showPicker === 'function') {
      try {
        input.showPicker()
        return
      } catch (err) {}
    }

    input.click()
  }

  revokeSample (sample){
    if (sample && sample.url && sample.url.startsWith('blob:'))
      URL.revokeObjectURL(sample.url)
  }

  updateWorkspaceSampleRefs (workspaceId){
    let workspace = this.tree[workspaceId]
    if (!workspace)
      return

    let store = this.getSampleStore(workspaceId)
    let refs = {}
    Object.keys(store).forEach((classId) => {
      if (!store[classId] || store[classId].length === 0)
        return
      refs[classId] = store[classId].map((sample) => {
        return {
          id:sample.id,
          kind:sample.kind,
          name:sample.name
        }
      })
    })
    workspace.sampleRefs = refs
  }

  updateWorkspaceModelRef (workspaceId){
    let workspace = this.tree[workspaceId]
    let runtime = workspace ? this.getWorkspaceSession(workspaceId) : null
    if (!workspace || !runtime || !runtime.trainedModel)
      return

    workspace.trainedModelRef = {
      id:'trained-model',
      trainedAt:runtime.trainedModel.trainedAt,
      classCount:runtime.trainedModel.classCount,
      embeddingCount:runtime.trainedModel.embeddingCount
    }
  }

  invalidateWorkspaceModel (workspaceId, options){
    options = options || {}
    let runtime = this.getWorkspaceSession(workspaceId)
    runtime.trainedModel = null
    runtime.previewLive = false
    runtime.livePrediction = null
    if (this.tree[workspaceId])
      this.tree[workspaceId].trainedModelRef = null
    if (options.deletePersisted !== false)
      this.deletePersistedModel(workspaceId)
    this.stopLivePredictionLoop()
    if (runtime.testSample)
      runtime.testSample.result = null
    if (this.selectedModelId === workspaceId && !runtime.captureClassId)
      this.stopWebcam()
  }

  getTestNote (runtime){
    if (!runtime.trainedModel)
      return Msg['MLTestNeedsModel']
    if (runtime.previewLive)
      return Msg['MLLivePreviewReady']
    return Msg['MLPreviewReady']
  }

  async predictCurrentTestSample (workspaceId){
    let workspace = this.tree[workspaceId]
    let runtime = this.getWorkspaceSession(workspaceId)
    if (!workspace || !runtime.testSample || !runtime.trainedModel) {
      if (runtime.testSample)
        runtime.testSample.result = null
      return
    }

    runtime.testSample.result = await this.predictSample(workspace.kind, runtime.trainedModel, runtime.testSample.blob)
  }

  async buildEmbeddingModel (workspace){
    let embeddings = []
    let classes = []
    for (let classItem of workspace.classes) {
      let samples = this.getSamplesForClass(workspace.id, classItem.id)
      if (samples.length === 0)
        continue

      let vectors = await Promise.all(samples.map((sample) => this.sampleToVector(workspace.kind, sample.blob)))
      vectors.forEach((vector, index) => {
        embeddings.push({
          id:`embedding-${classItem.id}-${index}`,
          classId:classItem.id,
          label:classItem.name,
          vector:vector
        })
      })
      classes.push({
        id:classItem.id,
        label:classItem.name,
        count:vectors.length
      })
    }

    if (embeddings.length === 0)
      throw new Error('No usable samples to train')

    return {
      mode:workspace.kind,
      trainedAt:Date.now(),
      classCount:classes.length,
      embeddingCount:embeddings.length,
      classes:classes,
      embeddings:embeddings
    }
  }

  async predictSample (mode, trainedModel, blob){
    if (!trainedModel)
      return null

    let vector = await this.sampleToVector(mode, blob)
    return this.predictVector(trainedModel, vector)
  }

  predictVector (trainedModel, vector){
    let ranked = trainedModel.embeddings.map((item) => {
      return {
        classId:item.classId,
        label:item.label,
        distance:this.vectorDistance(vector, item.vector)
      }
    }).sort((left, right) => left.distance - right.distance)

    let topK = ranked.slice(0, Math.min(5, ranked.length))
    let scores = {}
    topK.forEach((item) => {
      let score = Math.exp(-item.distance * 10)
      scores[item.label] = (scores[item.label] || 0) + score
    })

    let best = Object.entries(scores).sort((left, right) => right[1] - left[1])[0]
    let total = Object.values(scores).reduce((sum, value) => sum + value, 0) || 1
    return {
      label:best ? best[0] : '—',
      confidence:best ? best[1] / total : 0
    }
  }

  async sampleToVector (mode, blob){
    if (mode === 'image' || mode === 'pose')
      return this.imageBlobToVector(blob)
    return this.audioBlobToVector(blob)
  }

  async imageBlobToVector (blob){
    let image = await this.loadImageBlob(blob)
    let canvas = document.createElement('canvas')
    let context = canvas.getContext('2d', {willReadFrequently:true})
    let width = 24
    let height = 24
    canvas.width = width
    canvas.height = height
    context.drawImage(image, 0, 0, width, height)
    let pixels = context.getImageData(0, 0, width, height).data
    let vector = []

    for (let index = 0; index < pixels.length; index += 4)
      vector.push(((pixels[index] * 0.299) + (pixels[index + 1] * 0.587) + (pixels[index + 2] * 0.114)) / 255)

    return vector
  }

  loadImageBlob (blob){
    return new Promise((resolve, reject) => {
      let image = new Image()
      let url = URL.createObjectURL(blob)
      image.onload = () => {
        URL.revokeObjectURL(url)
        resolve(image)
      }
      image.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('Failed to load image sample'))
      }
      image.src = url
    })
  }

  ensureAudioContext (){
    if (this.audioContext)
      return this.audioContext

    let AudioContextCtor = window.AudioContext || window.webkitAudioContext
    if (!AudioContextCtor)
      throw new Error('AudioContext not supported')

    this.audioContext = new AudioContextCtor()
    return this.audioContext
  }

  async audioBlobToVector (blob){
    let context = this.ensureAudioContext()
    let arrayBuffer = await blob.arrayBuffer()
    let audioBuffer = await context.decodeAudioData(arrayBuffer.slice(0))
    let data = audioBuffer.getChannelData(0)
    let bins = 64
    let step = Math.max(1, Math.floor(data.length / bins))
    let vector = new Array(bins).fill(0)
    let maxValue = 0

    for (let index = 0; index < bins; index++) {
      let start = index * step
      let end = Math.min(data.length, start + step)
      if (start >= data.length)
        break
      let sum = 0
      for (let cursor = start; cursor < end; cursor++)
        sum += Math.abs(data[cursor])
      vector[index] = sum / Math.max(1, end - start)
      maxValue = Math.max(maxValue, vector[index])
    }

    if (maxValue > 0)
      vector = vector.map((value) => value / maxValue)
    return vector
  }

  averageVectors (vectors){
    let output = new Array(vectors[0].length).fill(0)
    vectors.forEach((vector) => {
      for (let index = 0; index < vector.length; index++)
        output[index] += vector[index]
    })
    return output.map((value) => value / vectors.length)
  }

  vectorDistance (left, right){
    let total = 0
    for (let index = 0; index < left.length; index++) {
      let diff = left[index] - right[index]
      total += diff * diff
    }
    return Math.sqrt(total / Math.max(1, left.length))
  }

  getCurrentWorkspace (){
    let sid = this.currentSID || this.selectedModelId
    return sid ? this.tree[sid] || null : null
  }

  getSelectedClass (workspace){
    if (!workspace || !workspace.selectedClassId)
      return null
    return workspace.classes.find((item) => item.id === workspace.selectedClassId) || null
  }

  getWorkspaceKindLabel (workspace){
    if (!workspace || !workspace.kind)
      return Msg['MLUnconfigured']
    if (workspace.kind === 'audio')
      return Msg['MLModeAudio']
    if (workspace.kind === 'pose')
      return Msg['MLModePose']
    return Msg['MLModeImage']
  }

  getProjectBucket (){
    let key = project.currentUID || '__session__'
    if (!this.sessionState[key])
      this.sessionState[key] = {workspaces:{}}
    return this.sessionState[key]
  }

  // Public: list saved ML workspaces (id + name). Used by the Architecture page to bind
  // an ML node to a specific workspace. Mirrors the Vision page's getSetups().
  getWorkspaces (){
    return Object.keys(this.tree || {}).map((id) => ({
      id,
      name:(this.tree[id] && this.tree[id].name) || id
    }))
  }

  getWorkspaceSession (workspaceId){
    let bucket = this.getProjectBucket()
    if (!bucket.workspaces[workspaceId]) {
      bucket.workspaces[workspaceId] = {
        samples:{},
        testSample:null,
        trainedModel:null,
        training:false,
        trainingNote:Msg['MLTrainPending'],
        captureClassId:null,
        previewLive:false,
        livePrediction:null
      }
    }
    if (!bucket.workspaces[workspaceId].hasOwnProperty('captureClassId'))
      bucket.workspaces[workspaceId].captureClassId = null
    if (!bucket.workspaces[workspaceId].hasOwnProperty('previewLive'))
      bucket.workspaces[workspaceId].previewLive = false
    if (!bucket.workspaces[workspaceId].hasOwnProperty('livePrediction'))
      bucket.workspaces[workspaceId].livePrediction = null
    return bucket.workspaces[workspaceId]
  }

  getSampleStore (workspaceId){
    return this.getWorkspaceSession(workspaceId).samples
  }

  getSamplesForClass (workspaceId, classId){
    let store = this.getSampleStore(workspaceId)
    if (!store[classId])
      store[classId] = []
    return store[classId]
  }

  getTotalSamples (workspaceId){
    let workspace = this.tree[workspaceId]
    if (!workspace)
      return 0
    return workspace.classes.reduce((count, item) => {
      return count + this.getSamplesForClass(workspaceId, item.id).length
    }, 0)
  }

  getCoveredClassCount (workspaceId){
    let workspace = this.tree[workspaceId]
    if (!workspace)
      return 0
    return workspace.classes.filter((item) => this.getSamplesForClass(workspaceId, item.id).length > 0).length
  }

  makeWorkspace (sid, workspaceNumber){
    workspaceNumber = workspaceNumber || Object.keys(this.tree || {}).length + 1
    return {
      id:sid || `ml-workspace-${DOM.UID()}`,
      name:`${Msg['MLWorkspace']} ${workspaceNumber}`,
      kind:null,
      classes:[],
      selectedClassId:null,
      settings:this.defaultSettings(),
      sampleRefs:{},
      trainedModelRef:null
    }
  }

  makeDefaultClasses (){
    return [{
      id:`ml-class-${DOM.UID()}`,
      name:'Class 1',
      color:ML_CLASS_COLORS[0]
    }, {
      id:`ml-class-${DOM.UID()}`,
      name:'Class 2',
      color:ML_CLASS_COLORS[1]
    }]
  }

  defaultSettings (){
    return {
      epochs:20,
      batchSize:16,
      learningRate:0.003
    }
  }

  normalizeData (obj){
    if (obj && obj.tree && typeof obj.tree === 'object' && !Array.isArray(obj.tree)) {
      let tree = this.normalizeTree(obj.tree)
      let selectedModelId = tree[obj.selectedModelId] ? obj.selectedModelId : Object.keys(tree)[0]
      return {selectedModelId:selectedModelId, tree:tree}
    }

    if (obj && (obj.mode || obj.classes || obj.settings)) {
      let workspace = this.makeWorkspace(undefined, 1)
      workspace.kind = obj.mode === 'audio' || obj.mode === 'pose' ? obj.mode : 'image'
      workspace.classes = this.normalizeClasses(obj.classes)
      workspace.selectedClassId = workspace.classes[0] ? workspace.classes[0].id : null
      workspace.settings = this.normalizeSettings(obj.settings)
      workspace.sampleRefs = this.normalizeSampleRefs(obj.sampleRefs)
      workspace.trainedModelRef = this.normalizeModelRef(obj.trainedModelRef)
      let tree = {}
      tree[workspace.id] = workspace
      return {selectedModelId:workspace.id, tree:tree}
    }

    let workspace = this.makeWorkspace(undefined, 1)
    let tree = {}
    tree[workspace.id] = workspace
    return {selectedModelId:workspace.id, tree:tree}
  }

  normalizeTree (tree){
    let normalized = {}
    let workspaceIds = Object.keys(tree || {})
    workspaceIds.forEach((workspaceId, index) => {
      let item = tree[workspaceId] || {}
      let classes = this.normalizeClasses(item.classes)
      let kind = item.kind === 'audio' || item.kind === 'image' || item.kind === 'pose' ? item.kind : null
      let selectedClassId = kind && classes.some((entry) => entry.id === item.selectedClassId)
        ? item.selectedClassId
        : (kind && classes[0] ? classes[0].id : null)
      let name = typeof item.name === 'string' && item.name.trim() !== ''
        ? item.name.trim()
        : `${Msg['MLWorkspace']} ${index + 1}`
      if (workspaceIds.length === 1 && name === `${Msg['MLWorkspace']} 2`)
        name = `${Msg['MLWorkspace']} 1`
      normalized[workspaceId] = {
        id:workspaceId,
        name:name,
        kind:kind,
        classes:kind ? classes : [],
        selectedClassId:selectedClassId,
        settings:this.normalizeSettings(item.settings),
        sampleRefs:this.normalizeSampleRefs(item.sampleRefs),
        trainedModelRef:this.normalizeModelRef(item.trainedModelRef)
      }
    })

    if (Object.keys(normalized).length === 0) {
      let fallback = this.makeWorkspace(undefined, 1)
      normalized[fallback.id] = fallback
    }

    return normalized
  }

  normalizeClasses (classes){
    return Array.isArray(classes) ? classes
      .filter((item) => item && typeof item.id === 'string')
      .map((item, index) => {
        return {
          id:item.id,
          name:typeof item.name === 'string' && item.name.trim() !== '' ? item.name.trim() : `Class ${index + 1}`,
          color:typeof item.color === 'string' ? item.color : ML_CLASS_COLORS[index % ML_CLASS_COLORS.length]
        }
      }) : []
  }

  normalizeSettings (settings){
    return {
      epochs:Math.max(5, Math.min(60, Number(settings && settings.epochs) || 20)),
      batchSize:Math.max(4, Math.min(64, Number(settings && settings.batchSize) || 16)),
      learningRate:Math.max(0.001, Math.min(0.020, Number(settings && settings.learningRate) || 0.003))
    }
  }

  normalizeSampleRefs (sampleRefs){
    let normalized = {}
    if (!sampleRefs || typeof sampleRefs !== 'object' || Array.isArray(sampleRefs))
      return normalized

    Object.keys(sampleRefs).forEach((classId) => {
      if (!Array.isArray(sampleRefs[classId]))
        return

      let refs = sampleRefs[classId]
        .filter((item) => item && typeof item.id === 'string')
        .map((item) => {
          return {
            id:item.id,
            kind:typeof item.kind === 'string' ? item.kind : null,
            name:typeof item.name === 'string' ? item.name : item.id
          }
        })

      if (refs.length > 0)
        normalized[classId] = refs
    })

    return normalized
  }

  normalizeModelRef (modelRef){
    if (!modelRef || typeof modelRef !== 'object' || Array.isArray(modelRef))
      return null

    return {
      id:'trained-model',
      trainedAt:Number(modelRef.trainedAt) || null,
      classCount:Number(modelRef.classCount) || 0,
      embeddingCount:Number(modelRef.embeddingCount) || 0
    }
  }

  cloneClasses (classes){
    return classes.map((item) => {
      return {
        id:item.id,
        name:item.name,
        color:item.color
      }
    })
  }

  cloneSampleRefs (sampleRefs){
    let normalized = this.normalizeSampleRefs(sampleRefs)
    let cloned = {}
    Object.keys(normalized).forEach((classId) => {
      cloned[classId] = normalized[classId].map((item) => {
        return {
          id:item.id,
          kind:item.kind,
          name:item.name
        }
      })
    })
    return cloned
  }

  cloneModelRef (modelRef){
    let normalized = this.normalizeModelRef(modelRef)
    return normalized ? {...normalized} : null
  }

  syncProject (){
    if (!project.currentUID)
      return

    let currentProject = project.projects[project.currentUID]
    if (!currentProject)
      return

    let tree = {}
    Object.keys(this.tree).forEach((workspaceId) => {
      let workspace = this.tree[workspaceId]
      tree[workspaceId] = {
        name:workspace.name,
        kind:workspace.kind,
        classes:this.cloneClasses(workspace.classes),
        selectedClassId:workspace.selectedClassId,
        settings:{...workspace.settings},
        sampleRefs:this.cloneSampleRefs(workspace.sampleRefs),
        trainedModelRef:this.cloneModelRef(workspace.trainedModelRef)
      }
    })

    currentProject.ml = {
      selectedModelId:this.selectedModelId,
      tree:tree
    }
    if (currentProject.project)
      currentProject.project.lastEdited = +new Date()/1000
    project.write(project.currentUID)
  }
}

export let ml = new MLPage()
