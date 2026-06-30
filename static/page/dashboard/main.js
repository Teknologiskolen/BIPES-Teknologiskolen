"use strict";

import {DOM, Animate, ContextMenu} from '../../base/dom.js'
import {Tool} from '../../base/tool.js'
import {command} from '../../base/command.js'
import {storage} from '../../base/storage.js'
import {navigation} from '../../base/navigation.js'

import {project} from '../project/main.js'
import {Actions} from './action.js'
import {plugins, triggerImageSourceFeedsFromChunk} from './plugins.js'

import {dataStorage} from './datastorage.js'
// EasyMQTT is retired; easyMQTT is kept only as an alias for the easymqtt_* network
// blocks (see `this.easyMQTT` below). No broker connection is made.
import {easyMQTT} from './easymqtt.js'

function dashboardMainMsg (key, fallback){
  return (window.Msg && Msg[key]) || fallback
}

/* Create dashboard with graphs, plugins and buttons */
class Dashboard {
  /* Construct the object, is executed on load of the window. */
  constructor (){
    this.name = 'dashboard'
    this.inited = false
    this.tree               //  Reference to project dashboard tree

    this.easyMQTT = easyMQTT // Alias to make acessible

    let $ = this.$ = {}
		$.dashboard = new DOM('div', {id:'dashboard'})
		$.grid = new DOM('div', {id:'grid'})
		$.header = new DOM('div', {id:'header'})
		$.storageManager = new DOM('div', {id:'storageManager', className:'popup'})
		$.addMenu = new DOM('div', {id:'addMenu', className:'popup'})

		$.dashboard.append([
		  $.header,
		  $.grid,
		  $.storageManager,
		  $.addMenu
		])
    $.contextMenu = new DOM('div')
    this.contextMenu = new ContextMenu($.contextMenu, this)

    $.section = new DOM(DOM.get('section#dashboard'))
      .append([$.dashboard, $.contextMenu])

    // Run-mode guard: the dashboard only shows live data while the device's program
    // is RUNNING. When a connected runtime device is STOPPED (program mode), show a
    // banner with a Run button instead of silently dead widgets.
    $.modeBannerRun = new DOM('button', {innerText:Msg['StartExecution'] || 'Run', className:'master'})
      .onclick(this, () => { try { window.bipes.page.files.device.startExecution() } catch (e) {} })
    $.modeBanner = new DOM('div', {className:'dashboard-mode-banner'})
      .append([
        new DOM('span', {innerText:Msg['DashboardDeviceStopped'] ||
          'Device is stopped — no live data. Press Run to start the program. '}),
        $.modeBannerRun
      ])
    $.modeBanner.$.style.display = 'none'
    $.section.append($.modeBanner)

		$.add = new DOM('button', {
			className:'icon',
			id:'add',
			title:Msg['NewDashboard']
			})
			.onclick(this, this.add, [true]);
		$.storage = new DOM('button', {
			className:'icon',
			id:'storage',
			title:Msg['EditData']
		  })
		// Run the project's blocks on the device — same Play/Stop action as the Blocks
		// page Run button (Ctrl+Shift+R), delegating to the very same BlocksCode.exec().
		// Lets the student start the program (→ runtime mode) without leaving the
		// dashboard. Blocks clears its workspace on deinit, so init it first to reload
		// the current project's blocks (and start its run-state watcher) before running.
		$.runBlocks = new DOM('button', {
			className:'icon',
			id:'run',
			title:`${Msg['RunBlocks']} (Ctrl+Shift+R)`
		  })
			.onclick(this, () => {
				let b = window.bipes.page.blocks
				if (!b) return
				if (!b.inited && typeof b.init === 'function')
					b.init()
				if (b.code && typeof b.code.exec === 'function')
					b.code.exec()
			})
		// Mirror the Blocks Run button's Play/Stop/busy state (same run-state read as
		// BlocksCode.watcher) so this button looks and behaves identically.
		setInterval(() => {
			try {
				let c = window.bipes.page.blocks && window.bipes.page.blocks.code
				if (!c) return
				let booting = typeof c._deviceBooting === 'function' && c._deviceBooting()
				let on = c.busy ? (c.busyTarget === 'run')
								: (booting || (typeof c.isRunning === 'function' && c.isRunning()))
				$.runBlocks.$.classList.toggle('on', !!on)
				$.runBlocks.$.classList.toggle('busy', !!c.busy || !!booting)
			} catch (e) {}
		}, 250)
		$.addPlugin = new DOM('button', {
			className:'icon',
			id:'add',
			title:Msg['AddWidget']
			})
		$.edit = new DOM('button', {
			className:'icon',
			id:'edit',
			title:Msg['EditDashboard']
			})
			.onclick(this, () => {
			  if ($.dashboard.classList.contains('on')) {
			    $.dashboard.classList.remove('on')
			    this.grid.closeEditor()
			  } else
			    $.dashboard.classList.add('on')
			}, [true]);

		$.tabs = new DOM('span', {id:'tabs'})
		$.wrapper = new DOM('div').append([$.tabs, $.add])
		$.wrapper2 = new DOM('span').append([$.edit, $.storage, $.runBlocks])
		$.header.append([$.wrapper, $.wrapper2])

		this.grid = new DashboardGrid($.grid, this)
		$.grid.append([$.addPlugin])

		this.storagemanager = new DataStorageManager($.storageManager,
		  this.grid, $.storage, this)

		this.addMenu = new DashboardAddMenu($.addMenu, this.grid, $.addPlugin)

    // Setup plugins to defaults
    plugins.init()

    command.add(this, {
      add: this._add,
      remove: this._remove,
      rename: this._rename
    })
  }
  /*
   * On display page, init the page.
   */
  init (){
    if (this.inited)
      return

    // Check for wrong to array convertiion, reset if so
    if (this.tree instanceof Array)
      this.tree = {}

    if (Object.keys(this.tree).length === 0)
      this.add()
    this.restore()
    this.select(Object.keys(this.tree)[0])

		dataStorage.init(this.grid)
    this.modeInterval = setInterval(() => this._updateModeBanner(), 500)
    this.inited = true
  }
  // Show the "device stopped" banner when the active device is a runtime in program
  // mode (stopped). Hidden in run mode, or when no runtime device is connected.
  _updateModeBanner (){
    let ch = window.bipes && window.bipes.channel
    let dev = window.bipes && window.bipes.page && window.bipes.page.device
    let uid = ch && ch.targetDevice
    let isRuntime = uid && ch.runtimeUids && ch.runtimeUids.has(uid)
    let mode = (isRuntime && dev && dev.runtimeMode) ? dev.runtimeMode(uid) : undefined
    let show = !!(isRuntime && mode === 'program')
    if (this.$.modeBanner)
      this.$.modeBanner.$.style.display = show ? '' : 'none'
  }
  /*
   * On page hidden, deinit the page.
   */
  deinit (){
    if(!this.inited)
      return

    this.unselect()
    this.$.tabs.removeChilds()

		dataStorage.deinit()
    clearInterval(this.modeInterval)
    if (this.$.modeBanner)
      this.$.modeBanner.$.style.display = 'none'
    this.inited = false
  }
  /*
   * On chunck receive, write to datastorage, then will refresh the charts.
   * @param {string} chunk - Incoming data.
   */
  write (chunk){
    triggerImageSourceFeedsFromChunk(chunk)
    // Push telemetry to the local widgets and the timestamped localStorage log.
    dataStorage.write(chunk)
  }
  /*
   * On load a project, load the page's scope of the project.
   * @param {Object} obj - Object with the project data in the page's scope
   */
  load (obj){
    if (!obj.hasOwnProperty('tree'))
      return

    let inited = this.inited
    if (this.inited)
      this.deinit()

    this.tree = obj.tree

    if (inited)
      this.init()
  }
  /*
   * Restore DOM navigation buttons.
   */
	restore (){
	  for (const key in this.tree){
      this.include(key, this.tree[key])
    }
	}
	/** Onresize event */
	resize (){
    this.grid.resize()
	}
  /*
   * Return minimal project scope of this page; is called by project when the
   * project does not contain this scope at all.
   */
	empty (){
	  return {tree:{}}
	}
	/*
   * Include include DOM to navigation
   * @param {string} sid - Dashboard's SID.
   * @param {Object} obj - Dashboard scope in the project.
   */
	include (sid, obj){
    let h3 = new DOM('h3', {'innerText':obj.name})

    obj.dom = new DOM('button', {'sid':sid})
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
      }).onclick(this, this.select, [sid])

    let $ = this.$
    $.tabs.append(obj.dom)
	}
	/** Save to project and refresh tabs with the same dashboard open */
	commit (){
		project.write()
		command.dispatch([this, this.grid], 'update', [
		  this.grid.ref,
		  this.currentSID,
		  project.currentUID
		])
	}
  /**
   * Add dashboard to project
   * @param {boolean} select - If should select after adding.
   */
  add (select){
    let sid = Tool.SID()
    // Apply to all tabs
    command.dispatch(this, 'add', [sid, project.currentUID])
    // Changed by reference, just write to localStorage
    project.write()
    if (select === true)
      this.select(sid)
  }
  /**
   * Add dashboard.
   * @param {string} sid - Dashboard SID.
   * @param {string} projectUID - UID of the project.
   */
  _add (sid, projectUID){
    if (projectUID !== project.currentUID)
      return

    let dash = {
      grid:[],
      name:Msg['Dashboard']
    }
    this.tree[sid] = dash

    // Add DOM.
    if (this.inited)
      this.include(sid, dash)

  }
  /**
   * Remove dashboard from project
   * @param {string} uid - Dashboard SID to remove.
   */
  remove (sid){
    this.contextMenu.close()
    // Apply to all tabs
    command.dispatch(this, 'remove', [sid, project.currentUID])
    // Changed by reference, just write to localStorage
    project.write()
  }
  /**
   * Remove dashboard.
   * @param {string} sid - Workspace SID.
   * @param {string} projectUID - UID of the project.
   */
  _remove (sid, projectUID){
    if (projectUID !== project.currentUID)
      return

    if (this.inited) {
      if (sid === this.currentSID){
        this.unselect()
        if (Object.keys(this.tree).length == 1)
          this.add()
      }

      DOM.get(`[data-sid='${sid}']`, this.$.tabs).remove()
    }
    delete this.tree[sid]

    if (this.currentSID == undefined)
      this.select(Object.keys(this.tree)[0])
  }
  /**
   * Rename dashboard from project
   * @param {string} sid - Dashboard SID to rename.
   * @param {string} name - New name.
   */
  rename (sid, name){
    this.contextMenu.oninput({
      title:Msg['DashboardName'],
      placeholder:name,
      value:name
    }, (input, ev) => {
      ev.preventDefault()
      let name = input.value

      this.contextMenu.close()

      if (name == undefined || name == '')
        return
      this.tree[sid].name = name
      // Apply to all tabs
      command.dispatch(this, 'rename', [sid, name, project.currentUID])
      // Changed by reference, just write to localStorage
      project.write()
    })
  }
  /**
   * Rename dashboard.
   * @param {string} sid - Workspace SID.
   * @param {string} name - New name.
   * @param {string} projectUID - UID of the project.
   */
  _rename (sid, name, projectUID){
    if (projectUID !== project.currentUID)
      return

    if (this.inited) {
      DOM.get(`[data-sid='${sid}'] h3`, this.$.tabs).innerText = name
    }
    this.tree[sid].name = name
  }
  /**
   * Select dashboard and init grid
   * @param {string} sid - Dashboard SID to rename.
   */
  select (sid){
    if (this.currentSID !== undefined) {
      this.unselect()
    }
    this.currentSID = sid
    this.grid.init()
    DOM.get(`[data-sid='${sid}']`, this.$.tabs).classList.add('on')
  }
  /*
   * Unselect the dashboard and deinit grid.
   */
  unselect (){
    this.grid.deinit()
    DOM.get(`[data-sid='${this.currentSID}']`, this.$.tabs).classList.remove('on')
    this.currentSID = undefined
  }
}

class DashboardGrid {
	constructor (dom, parent){
	  this.parent = parent
	  this.name = 'grid'
	  this.ref              // Reference to the current grid
    // Create arrays for each plugin
		plugins.types.forEach(type => this[type] = [])
		this.editiding
		this.editingProp  // Store original position and current from plugin(string)
		this.isGrabbing = [false, undefined]
    this.responsiveLayoutPending = false
    this.responsiveContentObserver = new MutationObserver(() => {
      this.scheduleResponsiveLayout()
    })
    this.responsiveResizeObserver = typeof ResizeObserver == 'function'
      ? new ResizeObserver(() => {
        this.scheduleResponsiveLayout()
      })
      : undefined

    // Hold data points to push to charts.
    this.chartBuffer
    this.chartBufferInterval // Store chart buffer interval

		let $ = this.$ = {}
		$.grid = dom
		$.actions = new DOM('div', {id:'actions'}).append([
		    new DOM('div', {className:'silk'})
		      .onclick(this, this.closeEditor)
		])
		$.silk = new DOM('div', {id:'silk'})
		  .onclick(this, this.closeEditor)

		$.container = new DOM('div')
		$.grid.append([$.silk, $.container, $.actions])

		this.actions = new Actions($.actions)

		this.muuri = new Muuri($.container.$, {
		  layoutOnResize: false,
		  dragEnabled: true,
		  layoutOnInit: false,
		  dragHandle: '#grab',
		  dragStartPredicate: (item, e) => {
		    if (this.parent.$.dashboard.classList.contains('on')){
		      this.isGrabbing = [+new Date(),item._element.dataset.sid]
		      return true
		    }
		  }
		  /*dragCssProps: {
        touchAction: 'pan-y',
      }8?
		  /*layout: {
		    alignRight: true
		  }*/
		}).on('dragInit', (item) => {
		  item._element.classList.add('grabbing')
    }).on('dragReleaseEnd', (item) => {
		  item._element.classList.remove('grabbing')
		  if (+new Date () - this.isGrabbing[0] < 150 && this.isGrabbing[1] == item._element.dataset.sid) {
        let obj
        this.ref.forEach(p =>{
          if (p.sid === item._element.dataset.sid)
            obj = p
        })
        this.isGrabbing = [false, undefined]
        this.edit(obj, new DOM(item._element))
    } else
      this.isGrabbing = [false, undefined]
    }).on('move', () => {
	    this.storeLayout()
    })

    // Set & get CSS rule nodes (don't work locally...)
    this._css = document.createElement('style')
    this._css.type = 'text/css'
    document.getElementsByTagName('head')[0].append(this._css)
    this._css.sheet.insertRule('section#dashboard .muuri .muuri-item.broad {}', 0)
    this._css.sheet.insertRule('section#dashboard .muuri .muuri-item.square {}', 0)
    this._css.sheet.insertRule('section#dashboard .muuri .muuri-item.wide {}', 0)
    this._css.sheet.insertRule('section#dashboard .muuri .muuri-item.tiny {}', 0)
    this.css = {}
    this.css.muuriBroad = this._css.sheet.rules[3]
    this.css.muuriSquare = this._css.sheet.rules[2]
    this.css.muuriWide = this._css.sheet.rules[1]
    this.css.muuriTiny = this._css.sheet.rules[0]

    command.add([this.parent, this], {
      update: this._update
    }, true)
	}
  /**
   * Init grid.
   */
  init (){
    this.chartBuffer = {Console:{}}
    this.chartBufferInverval = setInterval(()=>{this.chartWatcher()}, 250)

    this.ref = this.parent.tree[this.parent.currentSID].grid
    this.restore()
    this.observeResponsiveItems()
    this.responsiveContentObserver.observe(this.$.container.$, {
      childList: true,
      subtree: true,
      characterData: true
    })
    this.scheduleResponsiveLayout()
  }
  /**
   * Deinit grid.
   */
	deinit (){
	  clearInterval(this.chartBufferInverval)
	  delete this.chartBuffer.Console
	  this.chartBuffer = undefined

		this.$.grid.$.classList.remove('on')
		this.editingPlugin = '';
		setTimeout(() => {this.actions.deinit()},250)

		plugins.deinit(this)

    this.muuri.remove(this.muuri.getItems(), {removeElements: true})
    this.ref = undefined
    this.responsiveContentObserver.disconnect()
    if (this.responsiveResizeObserver)
      this.responsiveResizeObserver.disconnect()
	}
  /**
   * Restore itens.
   */
	restore (){
    this.ref.forEach (item => {
      this.include(item)
    })
    this.restoreLayout()
	}
	/**
	 * Update and refresh grid on change on other tab.
	 * @param {Object} obj - Updated grid.
	 * @param {string} sid - Dashboard's SID.
	 * @param {string} projectUID - Project's UID.
	 */
	_update (obj, sid, projectUID){
	  if (projectUID !== project.currentUID)
	    return

    // Update grid
    this.parent.tree[sid].grid = obj
    // Refresh grid if is open
	  if (sid !== this.parent.currentSID)
	    return

    this.deinit()
    this.init()
	}
  /**
   * Add item from given type.
   * @param {string} type - Item type, like chart or switch.
   */
	add (type){
		let sid = Tool.SID ()
		let obj = {
      sid:sid,
      type:type,
      setup: Actions.defaults(type)
    }
    this.ref.push(obj)
		this.include(obj)
		// Changed locally, save project then dispatch modified
		this.parent.commit()
	}
  /**
   * Include item to grid.
   * @param {Object} data - Object to be included.
   */
	include (data){
    // Normalize each widget on load/add: fills defaults and migrates legacy
    // EasyMQTT source/target to Standard (Console), so existing gauges/widgets
    // start tracking live telemetry without the user reopening their settings.
    try { Actions.normalizeSetup(data) } catch (e) {}
    let _$ = {
      grab: new DOM('div', {
        id:'grab',
        title:Msg['DragMe']
      }).onevent('contextmenu', this, (ev) => {
        ev.preventDefault()
        if (!this.parent.$.dashboard.classList.contains('on'))
          this.parent.$.dashboard.classList.add('on')
      }),
      remove: new DOM('button', {
        className:'button icon notext',
        id:'dismiss',
        title:Msg['DismissPlugin']
      }).onclick(this, this.remove, [data]),
      silk: new DOM('div', {className:'silk'})
    }
    plugins.include(this, data, _$)
    this.observeResponsiveItems()
    this.scheduleResponsiveLayout()
  }
  isResponsiveItem (element){
    return element.classList.contains('chart') ||
      element.classList.contains('switch') ||
      element.classList.contains('three-state-switch') ||
      element.classList.contains('button') ||
      element.classList.contains('range') ||
      element.classList.contains('gauge') ||
      element.classList.contains('ml-classifier') ||
      element.classList.contains('vision-processor')
  }
  observeResponsiveItems (){
    if (!this.responsiveResizeObserver)
      return

    this.responsiveResizeObserver.disconnect()
    if (!this.muuri)
      return

    this.muuri.getItems().forEach((item) => {
      let element = item.getElement()
      if (!element || element.id == 'editing' || !this.isResponsiveItem(element))
        return

      let content = element.firstElementChild
      if (content)
        this.responsiveResizeObserver.observe(content)
    })
  }
  measureResponsiveItemHeight (element){
    let content = element.firstElementChild
    if (!content)
      return undefined

    let baseHeight = Math.ceil(element.getBoundingClientRect().height)
    let contentHeightStyle = content.style.height

    element.classList.add('responsive-measuring')
    content.style.height = 'auto'

    let nextHeight = Math.max(
      baseHeight,
      Math.ceil(
        Math.max(
          content.scrollHeight,
          content.getBoundingClientRect().height
        )
      )
    )

    content.style.height = contentHeightStyle
    element.classList.remove('responsive-measuring')

    return nextHeight
  }
  applyResponsiveItemHeights (){
    if (!this.muuri)
      return

    let items = this.muuri.getItems()
    let changed = false

    items.forEach((item) => {
      let element = item.getElement()
      if (!element || element.id == 'editing' || !this.isResponsiveItem(element))
        return
      element.style.removeProperty('height')
    })

    items.forEach((item) => {
      let element = item.getElement()
      if (!element || element.id == 'editing' || !this.isResponsiveItem(element))
        return

      let nextHeight = this.measureResponsiveItemHeight(element)
      if (nextHeight == undefined)
        return

      let baseHeight = Math.ceil(element.getBoundingClientRect().height)

      if (Math.abs(nextHeight - baseHeight) <= 1)
        return

      element.style.height = `${nextHeight}px`
      changed = true
    })

    if (changed)
      this.muuri.refreshItems().layout()

    this.observeResponsiveItems()
  }
  scheduleResponsiveLayout (){
    if (this.responsiveLayoutPending || !this.ref)
      return

    this.responsiveLayoutPending = true
    requestAnimationFrame(() => {
      this.responsiveLayoutPending = false
      this.applyResponsiveItemHeights()
    })
  }
  /*
   * Remove a plugin.
   * @param {Object} data - Plugin.
   */
	remove (data){
	  // Remove plugin
	  plugins.remove(this, data)

		if (this.editingPlugin == data.sid) {
			this.$.grid.$.classList.remove('on')
			this.editingPlugin = '';
			setTimeout(() => {this.actions.deinit}, 250)
		}

		this.muuri.getItems().forEach((item, index) => {
			if (item._element.dataset.sid == data.sid) {
				this.muuri.remove([item], {removeElements: true})
			}
		})
		this.ref.forEach((item, index) => {
			if (item.sid == data.sid) {
				this.ref.splice(index,1)
			}
		})
    this.observeResponsiveItems()
		// Changed locally, save project then dispatch modified
		this.parent.commit()
	  if (this.editing)
	    this.closeEditor()
	}
  /*
   * Edit a plugin.
   * @param {Object} obj - Plugin.
   */
	edit (obj, container, ev){
	  if (this.animating || this.isGrabbing[1] != undefined)
	    return

    container.id = 'editing'
    this.animating = this.editing = true

	  let transform = container.style.transform
	  let x0 = parseFloat(transform.match(/translateX\(([0-9]+\.?[0-9]*|\.[0-9]+)px\)/)[1]),
	      y0 = parseFloat(transform.match(/translateY\(([0-9]+\.?[0-9]*|\.[0-9]+)px\)/)[1])

	  let w0 = container.width,
	      h0 = container.height
    let [x, y, w, h] = this._computeEditorSize(obj.type, [w0, h0])

    let t = 0;
    container.style.zIndex = '2'
    Animate.on(this.$.grid, 125)
    this.bezier = setInterval(() => {
      let _t = t/15.
      let _b = _t*_t*(3.-2.*_t)
      let _x = (_b * x) + (x0 * (1-_b)),
          _y = (_b * y) + (y0 * (1-_b))
  	  container.style.transform = `translateX(${_x}px) translateY(${_y}px)`
  	  container.style.width = `${w0 + _b*(w - w0)}px`
  	  container.style.height = `${h0 + _b*(h - h0)}px`
      if (t++ === 15)
        clearInterval(this.bezier),
        this.animating = false
    }, 15)


	  this.actions.show(obj, this)

	  this.editing = obj
	  this.editingProp = {
	    from:[x0, y0],
	    to:[x,y],
	    size_from:[w0, h0],
	    size_to:[w, h],
	    container:container
	  }

	  this.isGrabbing = [false, undefined]
	}
	/** Compute editor size */
	_computeEditorSize(type, size){
	  let x, y, w, h
    if (type == 'chart')
      if (this.$.grid.width / 16 > 40)
        w = this.$.grid.width - (2 + 15)*16,
        h = this.$.grid.height - 3*16
      else
        w = this.$.grid.width - (2)*16,
        h = this.$.grid.height - (3 + 12)*16
    else
      w = size[0],
      h = size[1]
    if (this.$.grid.width / 16 > 40)
      x = (this.parent.$.section.width - w - 15*16) / 2,
      y = (this.parent.$.section.height - h) / 2 +
          this.$.grid.$.scrollTop - (1*16)
    else
      x = (this.parent.$.section.width - w) / 2 ,
      y = (this.parent.$.section.height - h) / 2 +
          this.$.grid.$.scrollTop - (1 + 14/2)*16

    return [x, y, w, h]
	}
	/** Refresh editor size */
	_refreshEditorSize (){
	  let o = this.editingProp
    let [x, y, w, h] = this._computeEditorSize(
      this.editing.type, o.size_from
    )
	  o.container.style.transform = `translateX(${x}px) translateY(${y}px)`
	  o.container.style.width = `${w}px`
	  o.container.style.height = `${h}px`
	  o.to = [x, y]
	  o.size_to = [w, h]
	}
	/** Closes the editor */
	closeEditor (){
	  if (this.editing === undefined)
	    return

    this.animating = true
    let o = this.editingProp,
        t = 0
    this.bezier2 = setInterval(() => {
      let _t = t/15.
      let _b = _t*_t*(3.-2.*_t)
      let _x = (_b * o.from[0]) + (o.to[0] * (1-_b)),
          _y = (_b * o.from[1]) + (o.to[1 ]* (1-_b))
  	  o.container.style.transform = `translateX(${_x}px) translateY(${_y}px)`
  	  o.container.style.width = `${o.size_to[0] + _b*(o.size_from[0] - o.size_to[0])}px`
  	  o.container.style.height = `${o.size_to[1] + _b*(o.size_from[1] - o.size_to[1])}px`
      if (t++ === 15){
        o.container.style.removeProperty('width')
        o.container.style.removeProperty('height')

        clearInterval(this.bezier2),
        this.animating = false
      }
    }, 15)

    Animate.off(this.$.grid, ()=>{
      o.container.style.zIndex = '0'
      o.container.id = ''
      this.editing = undefined
	    this.editingProp = undefined
      setTimeout(() => {this.resize()}, 500)
    }, 15)
	}
	/** On resize event, compute plugin resize widths and set actions mode (tall/broad). */
	resize (){
    if (this.$.grid.width / 16 > 40){
      this.$.actions.classList.add('broad')
      this.$.actions.classList.remove('tall')
    } else {
      this.$.actions.classList.add('tall')
      this.$.actions.classList.remove('broad')
    }

	  if (this.editing) {
	    this._refreshEditorSize()
      return
    }

    let w = this.$.container.width

    let width = this.$.grid.width / 16
    let c = [
      [[w/3,w/6],[w/6,w/6],[w/12,w/12]],
      [[w/2,w/4],[w/4,w/4],[w/8,w/8]],
      [[w/1.5,w/3],[w/3,w/3],[w/6,w/6]],
      [[w/1,w/2],[w/2,w/2],[w/4,w/4]]
    ]
    let i
    if (width > 80)
      i = 0
    else if (width > 60)
      i = 1
    else if (width > 40)
      i = 2
    else
      i = 3

    this.css.muuriBroad.style.width = `${c[i][0][0] - 1}px`
    this.css.muuriBroad.style.height = `${c[i][0][1]}px`

    this.css.muuriSquare.style.width = `${c[i][1][0] - 1}px`
    this.css.muuriSquare.style.height = `${c[i][1][1]}px`

    this.css.muuriWide.style.width = `${c[i][1][0] - 1}px`
    this.css.muuriWide.style.height = `${c[i][2][1]}px`

    this.css.muuriTiny.style.width = `${c[i][2][0] - 1}px`
    this.css.muuriTiny.style.height = `${c[i][2][1]}px`


    this.muuri.refreshItems().layout()
    this.scheduleResponsiveLayout()
  }
  /** Store current muuri positions to project */
  storeLayout (){
    let pos = this.muuri.getItems().map((item) => {
      return item.getElement().dataset.sid
    })
    this.ref.forEach((item, index) => {
      item.pos = pos.indexOf(item.sid)
    })
    this.parent.commit()
  }
  /** Restore layout */
  restoreLayout (){
    let current = this.muuri.getItems()
    let pos = current.map((item) => {
      return item.getElement().dataset.sid
    })
    let layout = [],
        noLayout = []
    let i = 0, j = 0
    this.ref.forEach((item, index) => {
      if (item.pos == undefined)
        noLayout.push(current[pos.indexOf(item.sid)])
      else
        layout[item.pos] = current[pos.indexOf(item.sid)]
    })
    layout = layout.filter(n => n) // Remove undefined items
    layout.push(...noLayout)
    this.muuri.sort(layout, {layout:'instant'})
  }
  /**
   * Push data to current charts.
   * @param{array} topic - Points' topic.
   * @param{array} coordinates - Points coordinates.
   * @param{bool} refresh - If chart should be regenerated.
   * @param{string} target - EasyMQTT or localStorage.
   */
  chartsPush (topic, coordinates, refresh, target) {
    if (!this.chartBuffer[target].hasOwnProperty(topic))
      this.chartBuffer[target][topic] = {refresh:false, coord:[]}

    this.chartBuffer[target][topic].coord.push(coordinates)
    if (refresh)
      this.chartBuffer[target][topic].refresh = true
  }
  /** Periodically update the charts with buffered data */
  chartWatcher (){
    if (this.chartBuffer === undefined)
      return
    for(const target of ['Console']){
      for (const topic in this.chartBuffer[target]){
        this.charts.forEach ((chart) => {
          if (chart.topic == topic) {
            if (this.chartBuffer[target][topic].refresh)
              this.ref.forEach(plugin => {
                if (plugin.sid === chart.sid)
                  plugins.regen(this.charts, plugin)
              })
            else {
              this.chartBuffer[target][topic].coord.forEach(coordinates => {
                chart.data.labels.push(coordinates[0])
                chart.data.datasets.forEach((_topic, index) => {
                  _topic.data.push(coordinates[index + 1])
                })
              })
              if (chart.hasOwnProperty('limitPoints') && chart.data.labels.length > chart.limitPoints) {
                chart.data.labels.splice (0, this.chartBuffer[target][topic].coord.length)
                chart.data.datasets.forEach((_topic, index) => {
                  _topic.data.splice (0, this.chartBuffer[target][topic].coord.length)
                })
              }
              chart.update()
            }
          }
        })
        delete this.chartBuffer[target][topic]
      }
    }
  }
  /** Regen charts from source criteria */
  regenCharts (source){
    this.charts.forEach ((chart) => {
      this.ref.forEach(plugin => {
        if (plugin.sid === chart.sid && plugin.setup.source == source)
          plugins.regen(this.charts, plugin)
      })
    })
  }
  /**
   * Push data to current gauges.
   * @param{array} topic - Point's topic.
   * @param{array} data - Data point.
   * @param{string} source - EasyMQTT or Console.
   */
  gaugesPush (topic, data, source) {
    this.gauges.forEach ((gauge) => {
      // Single source now (Standard) — match by topic only, so a gauge updates
      // regardless of whatever source value it was saved with.
      if (gauge.topic == topic){
        gauge.update(data)
      }
    })
  }
}


const DASHBOARD_WIDGET_ICONS = {
  'chart':            '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="15" x2="5" y2="8"/><line x1="9" y1="15" x2="9" y2="5"/><line x1="13" y1="15" x2="13" y2="10"/><line x1="17" y1="15" x2="17" y2="7"/><line x1="3" y1="15" x2="19" y2="15"/></svg>',
  'switch':           '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="2" y="7" width="16" height="6" rx="3"/><circle cx="13" cy="10" r="2" fill="currentColor" opacity="0.5"/></svg>',
  'threeStateSwitch': '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="2" y="7" width="16" height="6" rx="3"/><circle cx="10" cy="10" r="2" fill="currentColor" opacity="0.5"/><circle cx="5" cy="10" r="1" fill="currentColor"/><circle cx="15" cy="10" r="1" fill="currentColor"/></svg>',
  'button':           '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="3" y="7" width="14" height="7" rx="3"/></svg>',
  'range':            '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><line x1="2" y1="10" x2="18" y2="10"/><circle cx="11" cy="10" r="3" fill="currentColor" opacity="0.3"/></svg>',
  'gauge':            '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M3.5 14.5A8 8 0 1 1 16.5 14.5"/><line x1="10" y1="10" x2="14" y2="6.5"/><circle cx="10" cy="10" r="1.5" fill="currentColor" opacity="0.5"/></svg>',
  'coordinate':       '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="16" x2="4" y2="4"/><line x1="4" y1="16" x2="17" y2="16"/><polyline points="4,12 7,8 11,11 15,6"/></svg>',
  'drawing':          '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l3.5-1L16 6.5l-2.5-2.5L4 14.5z"/><line x1="13.5" y1="4" x2="16" y2="6.5"/></svg>'
}

class DashboardAddMenu {
  constructor (dom, grid, button){
    this.grid = grid
    this.plugins = {
      chart:dashboardMainMsg('DashboardWidgetChart', 'Chart'),
      switch:dashboardMainMsg('DashboardWidgetSwitch', 'Switch'),
      threeStateSwitch:dashboardMainMsg('DashboardWidgetThreeStateSwitch', 'Three-state switch'),
      button:dashboardMainMsg('DashboardWidgetButton', 'Button'),
      range:dashboardMainMsg('DashboardWidgetRange', 'Range'),
      gauge:dashboardMainMsg('DashboardWidgetGauge', 'Gauge'),
      coordinate:dashboardMainMsg('DashboardWidgetCoordinate', 'Coordinate'),
      drawing:dashboardMainMsg('DashboardWidgetDrawing', 'Drawing')
    }
    let $ = this.$ = {}
    $.addMenu = dom
    $.addMenu.onclick(this, this.close)
    $.plugins = []

    for (const plugin in this.plugins) {
      let btn = new DOM('button', { value: plugin, id: plugin, className: 'dashboard-add-btn' })
      btn.$.innerHTML = `${DASHBOARD_WIDGET_ICONS[plugin] || ''}<span>${this.plugins[plugin]}</span>`
      $.plugins.push(btn.onclick(grid, grid.add, [plugin]))
    }

    let title = new DOM('h2', {
      className: 'dashboard-add-title',
      innerText: (window.Msg && Msg['DashboardAddWidget']) || 'Add widget'
    })
    $.wrapper = new DOM('div', {className: 'dashboard-add-card'})
      .append([title, new DOM('div', {className: 'dashboard-add-grid'}).append($.plugins)])
    $.addMenu.append($.wrapper)

    button.onclick(this, this.open)
  }
  close (e) {
    if (e.target.id == 'addMenu')
      Animate.off(this.$.addMenu.$)
  }
  open (){
    Animate.on(this.$.addMenu.$)
  }
}


class DataStorageManager {
  constructor (dom, grid_ref, button, parent){
    this.guestMode = !document.getElementById('user-info')
    this.datalake = []
    this.parent = parent
	  this.name = 'storagemanager'

    let $ = this.$ = {}
    $.storageManager = dom
    $.storageManager.onclick (this, this.close)
		$.upload = new DOM('input', {
		    id:'uploadCSV',
		    type:'file',
		    accept:'.csv'
		  })
			.onchange(this, this.uploadCSV)
    $.uploadLabel = new DOM('label', {
			  className:'button icon notext',
			  id:'upload',
			  title:dashboardMainMsg('DashboardUploadCSV', 'Upload CSV'),
			  htmlFor:'uploadCSV'
		  })
    $.h2 = new DOM ('h2',   {innerText: dashboardMainMsg('DashboardConsoleLocalStorage', 'Console (localStorage)')})
    $.title = new DOM ('div', {className: 'header'})
      .append([
        $.h2,
        $.upload,
        $.uploadLabel
      ])
    $.container = new DOM('span', {className:'list'})

    $.wrapper = new DOM('div')
      .append([
        $.title,
        $.container
      ])

    $.storageManager.append($.wrapper)
    this.ref = grid_ref

    button.onclick(this, this.open)
  }
  close (e) {
    if (e.target.id == 'storageManager'){
     this.$.wrapper.style.marginTop = '110vh'
      Animate.off(this.$.storageManager.$, ()=>{this.deinit()})
    }
  }
  open (){
    this.restore ()

    let $ = this.$
    setTimeout(() =>{
      $.wrapper.style.marginTop = window.innerWidth/16 > 40 ? '10vh' : `calc(${window.innerHeight}px - 20.5rem)`
      },125)
    Animate.on($.storageManager.$, 125)
  }
  restore(){
		storage.keys(/datastorage:(.*)/)
		  .forEach(key => {this.include(key)})
  }
  include (sid){
		let remove = new DOM('button', {
			  className:'icon notext',
			  id:'remove',
			  title:Msg['DeleteData']
			})
		let download = new DOM('button', {
		    className: 'icon notext',
		    id:'download',
		    title:Msg['DownloadCSV']
		  })
		  .onclick(this, this.download, [sid])
		let wrapper = new DOM('div').append([
		    download,
		    remove
		  ])
		let data = new DOM('div', {
		    id:sid,
		    innerText:sid}
		  )
			.append([
				wrapper
			])
		this.datalake.push(data)

		remove.onclick(this, this.remove, [sid, data])

		let $ = this.$
		$.container.append (data)
  }
  deinit (){
    this.datalake.forEach ((item) => {
      item.$.remove()
    })
    this.datalake = []
  }
  remove (id, dom) {
    dom.$.remove()
		this.datalake.forEach((item, index) => {
			if (item.$.id == id) {
				item.$.remove()
				this.datalake.splice(index,1)
			}
		})
		storage.remove(`datastorage:${id}`)

		dataStorage.remove(id)
    if (this.ref != undefined) {
      this.ref.charts.forEach ((chart) => {
        if (chart.topic == id && chart.source == 'Console') {
          this.ref.ref.forEach(plugin => {
            if (plugin.sid === chart.sid)
              plugins.regen(this.ref.charts, plugin)
          })
        }
      })
    }
  }
  // Export a topic's stored time-series as CSV. Each row is "timestamp,value(s)"
  // (timestamp = epoch ms), preceded by a BIPES header + a column-name line, so it
  // opens cleanly in Excel / pandas for statistics.
  exportCSV (sid){
    let rows = JSON.parse(storage.fetch(`datastorage:${sid}`) || '[]')
    let maxValueCols = rows.reduce((m, r) => Math.max(m, r.length - 1), 0)
    let valueHeaders = Array.from({length: maxValueCols},
                                  (_, i) => maxValueCols > 1 ? `"value${i + 1}"` : '"value"')
    let header = `"BIPES","Dashboard"\r\n"Data:","${sid}"\r\n"Exported:","${String(+new Date())}"\r\n` +
                 `"timestamp",${valueHeaders.join(',')}\r\n`
    return header + rows.map((r) => r.join(',')).join('\r\n')
  }
  download (sid){
    let csv = this.exportCSV(sid)
    let data = "data:text/csv;charset=utf-8," + encodeURIComponent(csv)
	  let element = document.createElement('a')
	  element.setAttribute('href', data)
	  element.setAttribute('download', `${sid}.bipes.csv`)
	  element.style.display = 'none'
	  document.body.appendChild(element)
	  element.click ()
	  document.body.removeChild(element)
  }
  uploadCSV (){
    let _upload = this.$.upload.$
    if  (_upload.files [0] != undefined) {
      let file = _upload.files [0]
      if (/.csv$/.test(file.name) && file.type == 'text/csv'){
        let reader = new FileReader ()
        reader.readAsText(file,'UTF-8')
        let self = this;
        reader.onload = readerEvent => {
          let csv = readerEvent.target.result
          let lines = csv.split(/\r\n|\n/)
          let dataname;
          if (/^"BIPES","Databoard"/.test(lines[0])) {
            if (/^"Data:","(.*)"/.test(lines[1])) {
              dataname = lines[1].match(/"Data:","(.*)"/m)[1]
            }
            lines.splice(0,3)
          } else {
            dataname = file.name.replace('.csv', '')
          }

          lines.forEach ((coord, index) => {
            lines[index] = lines[index].split(',')

            lines[index].forEach ((point, index2) => {
              if (!lines[index][index2].includes('"'))
                lines[index][index2] = parseFloat(lines[index][index2])
              else
                lines[index][index2] = lines[index][index2].replaceAll('"', '')
            })
          })
          // remove empty lines or with only one column
          lines = lines.filter((line) => {
              return line.length > 1
          });

          if (!storage.has(`datastorage:${dataname}`))
            storage.set(`datastorage:${dataname}`, JSON.stringify(lines))
          else {
            let success = false,
                index = 1
            while(!success) {
              if (!storage.has(`datastorage:${dataname}_${index}`)) {
                storage.set(`datastorage:${dataname}_${index}`, JSON.stringify(lines))
                success = true
              } else
                index++
            }
          }
          this.deinit()
          this.restore()

          _upload = ''
        }
      }
    }
  }
}

export let dashboard = new Dashboard()
