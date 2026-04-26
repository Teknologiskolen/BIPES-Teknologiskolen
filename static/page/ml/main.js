"use strict";

import {DOM} from '../../base/dom.js'

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
    this.tabMenuState = null
    this.restoreToken = 0

    let $ = this.$ = {}
    const section = DOM.get('section#ml')
    if (!section)
      return

    this.available = true
    $.section = new DOM(section)
    $.section.$.classList.add('default')
    $.container = new DOM('div', {className:'container ml-container'})
    $.section.append($.container)

    this.load(this.empty())
  }

  init (){
    if (!this.available || this.inited)
      return

    this.inited = true
    this.render()
  }

  deinit (){
    if (!this.available || !this.inited)
      return

    this.stopLivePredictionLoop()
    this.stopWebcam()
    this.stopRecording(true)
    this.inited = false
  }

  empty (){
    let workspace = this.makeWorkspace()
    let tree = {}
    tree[workspace.id] = workspace
    return {
      selectedModelId:workspace.id,
      tree:tree
    }
  }

  load (obj){
    let data = this.normalizeData(obj)
    this.tree = data.tree
    this.selectedModelId = data.selectedModelId
    this.stopLivePredictionLoop()
    this.stopWebcam()
    this.stopRecording(true)
    if (this.available)
      this.render()
    this.restorePersistedState()
  }

  render (){
    this.renderShell()
    this.renderTabs()
    this.renderClassesPanel()
    this.renderTrainPanel()
    this.renderPreviewPanel()
    this.attachVideoStream()
  }

  renderShell (){
    this.$.container.$.innerHTML = ''

    this.$.container.append(
      new DOM('div', {className:'ml-shell'}).append([
        new DOM('div', {className:'ml-header'}).append([
          new DOM('div', {className:'ml-tabs'}),
          new DOM('div', {className:'ml-header-actions'}).append([
            new DOM('button', {
              className:'icon',
              id:'add',
              title:Msg['MLNewWorkspace']
            }).onclick(this, this.toggleAddMenu)
          ])
        ]),
        new DOM('div', {className:`ml-add-menu${this.addMenuOpen ? ' on' : ''}`}),
        new DOM('div', {className:`ml-tab-menu${this.tabMenuState ? ' on' : ''}`}),
        new DOM('div', {className:'ml-workspace'}).append([
          new DOM('div', {className:'ml-grid'}).append([
            new DOM('section', {className:'ml-panel ml-classes-panel'}),
            new DOM('section', {className:'ml-panel ml-train-panel'}),
            new DOM('section', {className:'ml-panel ml-preview-panel'})
          ])
        ])
      ])
    )

    this.$.tabs = DOM.get('.ml-tabs', this.$.container.$)
    this.$.addMenu = DOM.get('.ml-add-menu', this.$.container.$)
    this.$.tabMenu = DOM.get('.ml-tab-menu', this.$.container.$)
    this.$.classesPanel = DOM.get('.ml-classes-panel', this.$.container.$)
    this.$.trainPanel = DOM.get('.ml-train-panel', this.$.container.$)
    this.$.previewPanel = DOM.get('.ml-preview-panel', this.$.container.$)

    this.$.container.$.addEventListener('click', (ev) => {
      if (ev.target.closest('.ml-add-menu, .ml-tab-menu, .ml-tabs, #add'))
        return
      if (this.addMenuOpen || this.tabMenuState) {
        this.addMenuOpen = false
        this.tabMenuState = null
        this.renderTabs()
      }
    })
  }

  renderTabs (){
    let selected = this.getCurrentWorkspace()
    this.$.tabs.innerHTML = ''

    Object.keys(this.tree).forEach((workspaceId) => {
      let workspace = this.tree[workspaceId]
      let button = document.createElement('button')
      button.className = `ml-tab${selected && selected.id === workspaceId ? ' on' : ''}`
      button.dataset.sid = workspaceId
      button.innerHTML = `<h3>${workspace.name}</h3>`
      button.addEventListener('click', () => {
        this.selectWorkspace(workspaceId)
      })
      button.addEventListener('contextmenu', (ev) => {
        ev.preventDefault()
        this.openTabMenu(workspaceId, ev.clientX, ev.clientY)
      })
      this.$.tabs.appendChild(button)
    })

    this.renderAddMenu()
    this.renderTabMenu()
  }

  renderSummaryBand (){
    return
  }

  renameCurrentWorkspace (){
    let workspace = this.getCurrentWorkspace()
    if (!workspace)
      return

    let next = window.prompt(Msg['MLWorkspaceName'], workspace.name)
    if (next !== null)
      this.renameWorkspace(workspace.id, next)
  }

  removeCurrentWorkspace (){
    let workspace = this.getCurrentWorkspace()
    if (!workspace)
      return

    this.removeWorkspace(workspace.id)
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
          <p>${Msg['MLSetupHelp']}</p>
        </div>
        <div class="ml-model-config">
          <label for="ml-workspace-name">
            <span>${Msg['MLWorkspaceName']}</span>
            <input type="text" id="ml-workspace-name" name="ml-workspace-name" value="${workspace.name}" autocomplete="off">
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
    if (workspace.classes.length === 0) {
      list.innerHTML = `<div class="ml-shelf-empty">${Msg['MLNoClassesYet']}</div>`
      return
    }

    workspace.classes.forEach((item) => {
      let runtime = this.getWorkspaceSession(workspace.id)
      let samples = this.getSamplesForClass(workspace.id, item.id)
      let count = samples.length
      let isActive = !!(selected && selected.id === item.id)
      let classLive = !!(this.stream && runtime.captureClassId === item.id)
      let renameId = `ml-rename-${workspace.id}-${item.id}`
      let uploadId = `ml-upload-${workspace.id}-${item.id}`
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
              <input type="text" id="${renameId}" name="${renameId}" value="${item.name}" data-rename="${item.id}" autocomplete="off">
            </label>
          </div>
          <button class="ml-class-delete" data-delete="${item.id}" title="${Msg['MLDeleteClass']}">×</button>
        </div>
        <div class="ml-class-body">
          <div class="ml-class-input-pane">
            <button class="ml-class-select" data-select="${item.id}">
              <span class="ml-class-source-label">${workspace.kind === 'audio' ? Msg['MLReadyForAudio'] : Msg['MLStartWebcam']}</span>
            </button>
            ${stageMarkup ? `<div class="ml-class-stage-wrap">${stageMarkup}</div>` : ''}
            <div class="ml-class-actions">
          ${(workspace.kind === 'image' || workspace.kind === 'pose') ? `
            ${classLive ? `
              <button class="ghost" data-webcam="${item.id}">${Msg['MLStopWebcam']}</button>
              <button class="primary" data-capture="${item.id}">${Msg['MLCaptureExample']}</button>
              <button class="ghost" data-upload-trigger="${uploadId}">${Msg['MLUploadExamples']}</button>
            ` : `
              <button class="ghost" data-webcam="${item.id}">${Msg['MLStartWebcam']}</button>
              <button class="ghost" data-upload-trigger="${uploadId}">${Msg['MLUploadExamples']}</button>
            `}
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

  renderTrainPanel (){
    let workspace = this.getCurrentWorkspace()
    if (!workspace) {
      this.$.trainPanel.innerHTML = ''
      return
    }

    if (!workspace.kind) {
      this.$.trainPanel.innerHTML = this.renderEmptyPanel(
        Msg['MLTrainModel'],
        Msg['MLSelectModelFirst']
      )
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
      this.$.previewPanel.innerHTML = this.renderEmptyPanel(
        Msg['MLPreviewTitle'],
        Msg['MLSelectModelFirst']
      )
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
        ${!this.stream && latest ? `<img src="${latest.url}" alt="${latest.name}">` : ''}
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
          <div class="ml-audio-name">${latest.name}</div>
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
        <strong>${result.label}</strong>
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
        <strong>${Msg['MLModelNotSelected']}</strong>
        <span>${text}</span>
      </div>
    `
  }

  renderAddMenu (){
    if (!this.$.addMenu)
      return

    this.$.addMenu.className = `ml-add-menu${this.addMenuOpen ? ' on' : ''}`
    this.$.addMenu.innerHTML = `
      <button data-kind="image">${Msg['MLConfigureImageModel']}</button>
      <button data-kind="audio">${Msg['MLConfigureAudioModel']}</button>
      <button data-kind="pose">${Msg['MLConfigurePoseModel']}</button>
    `

    this.$.addMenu.querySelectorAll('[data-kind]').forEach((button) => {
      button.addEventListener('click', () => {
        this.addWorkspace(button.dataset.kind)
      })
    })
  }

  renderTabMenu (){
    if (!this.$.tabMenu)
      return

    if (!this.tabMenuState) {
      this.$.tabMenu.className = 'ml-tab-menu'
      this.$.tabMenu.innerHTML = ''
      return
    }

    this.$.tabMenu.className = 'ml-tab-menu on'
    this.$.tabMenu.style.left = `${this.tabMenuState.x}px`
    this.$.tabMenu.style.top = `${this.tabMenuState.y}px`
    this.$.tabMenu.innerHTML = `
      <button data-action="rename">${Msg['Rename']}</button>
      <button data-action="remove" ${Object.keys(this.tree).length <= 1 ? 'disabled' : ''}>${Msg['Remove']}</button>
    `

    this.$.tabMenu.querySelector('[data-action="rename"]').addEventListener('click', () => {
      let workspaceId = this.tabMenuState.workspaceId
      let next = window.prompt(Msg['MLWorkspaceName'], this.tree[workspaceId].name)
      this.closeTabMenu()
      if (next !== null)
        this.renameWorkspace(workspaceId, next)
    })

    this.$.tabMenu.querySelector('[data-action="remove"]').addEventListener('click', () => {
      let id = this.tabMenuState.workspaceId
      this.closeTabMenu()
      this.removeWorkspace(id)
    })
  }

  toggleAddMenu (){
    this.addMenuOpen = !this.addMenuOpen
    this.tabMenuState = null
    this.renderTabs()
  }

  openTabMenu (workspaceId, x, y){
    let rect = this.$.container.$.getBoundingClientRect()
    this.addMenuOpen = false
    this.tabMenuState = {
      workspaceId:workspaceId,
      x:Math.max(12, x - rect.left),
      y:Math.max(12, y - rect.top)
    }
    this.renderTabs()
  }

  closeTabMenu (){
    this.tabMenuState = null
    this.renderTabs()
  }

  addWorkspace (kind){
    this.stopWebcam()
    this.stopRecording(true)
    let workspace = this.makeWorkspace()
    workspace.kind = kind === 'audio' || kind === 'pose' ? kind : 'image'
    workspace.classes = this.makeDefaultClasses()
    workspace.selectedClassId = workspace.classes[0].id
    this.tree[workspace.id] = workspace
    this.selectedModelId = workspace.id
    this.addMenuOpen = false
    this.syncProject()
    this.render()
  }

  removeWorkspace (workspaceId){
    if (!this.tree[workspaceId] || Object.keys(this.tree).length <= 1)
      return

    if (this.selectedModelId === workspaceId) {
      this.stopWebcam()
      this.stopRecording(true)
    }

    this.clearWorkspaceSession(workspaceId)
    delete this.tree[workspaceId]
    if (!this.tree[this.selectedModelId])
      this.selectedModelId = Object.keys(this.tree)[0] || null
    this.syncProject()
    this.render()
  }

  selectWorkspace (workspaceId){
    if (!this.tree[workspaceId] || this.selectedModelId === workspaceId)
      return

    this.stopWebcam()
    this.stopRecording(true)
    this.selectedModelId = workspaceId
    this.addMenuOpen = false
    this.tabMenuState = null
    this.syncProject()
    this.render()
  }

  renameWorkspace (workspaceId, name){
    let workspace = this.tree[workspaceId]
    let trimmed = String(name || '').trim()
    if (!workspace)
      return

    workspace.name = trimmed === '' ? workspace.name : trimmed
    this.syncProject()
    this.renderTabs()
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
            <img src="${sample.url}" alt="${sample.name}">
            <button class="ml-class-sample-delete" data-class-id="${classItem.id}" data-remove-sample="${sample.id}" title="${Msg['MLDeleteExample']}">×</button>
          </div>
        `
      }

      return `
        <div class="ml-class-sample audio">
          <span>${sample.name}</span>
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
    if (this.available)
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
    return this.selectedModelId ? this.tree[this.selectedModelId] || null : null
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

  makeWorkspace (){
    let workspaceNumber = Object.keys(this.tree).length + 1
    return {
      id:`ml-workspace-${DOM.UID()}`,
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
      let workspace = this.makeWorkspace()
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

    return this.empty()
  }

  normalizeTree (tree){
    let normalized = {}
    Object.keys(tree || {}).forEach((workspaceId, index) => {
      let item = tree[workspaceId] || {}
      let classes = this.normalizeClasses(item.classes)
      let kind = item.kind === 'audio' || item.kind === 'image' || item.kind === 'pose' ? item.kind : 'image'
      let selectedClassId = kind && classes.some((entry) => entry.id === item.selectedClassId)
        ? item.selectedClassId
        : (classes[0] ? classes[0].id : null)
      normalized[workspaceId] = {
        id:workspaceId,
        name:typeof item.name === 'string' && item.name.trim() !== '' ? item.name.trim() : `${Msg['MLWorkspace']} ${index + 1}`,
        kind:kind,
        classes:kind ? classes : [],
        selectedClassId:selectedClassId,
        settings:this.normalizeSettings(item.settings),
        sampleRefs:this.normalizeSampleRefs(item.sampleRefs),
        trainedModelRef:this.normalizeModelRef(item.trainedModelRef)
      }
    })

    if (Object.keys(normalized).length === 0) {
      let fallback = this.makeWorkspace()
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

    project.update({
      load:false,
      ml:{
        selectedModelId:this.selectedModelId,
        tree:tree
      }
    })
  }
}

export let ml = new MLPage()
