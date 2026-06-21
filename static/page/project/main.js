"use strict"

import {Tool, API} from '../../base/tool.js'
import {DOM, Animate, ContextMenu} from '../../base/dom.js'
import {command} from '../../base/command.js'
import {dataflow} from '../../base/dataflow.js'
import {storage} from '../../base/storage.js'
import {navigation} from '../../base/navigation.js'
import {session} from '../../base/session.js'

import {notification} from '../notification/main.js'

class Project {
  constructor (){
    this.name = 'project'
    this.guestMode = !document.getElementById('user-info')
    this.currentUID = undefined
    this.current = undefined      // Reference current project
    this.projects = {}
    this.inited = false
    this.serverMode = false
    this._serverInited = false
    this._saveTimeout = null
    this._classNames = {}  // Cache of class_id -> class_name

    this.cors_token = storage.has('cors_token') ?
                      storage.fetch('cors_token') :
                      storage.set('cors_token', Tool.UID().substring(0,12))

    this.username = storage.has('username') ?
                    storage.fetch('username') :
                    storage.set('username', 'a user')

    let $ = this.$ = {}

    $.projects = new DOM('span', {className:'listy'})


    $.username = new DOM('input', {
      value:this.username == 'a user' ? Msg['AUser'] : this.username
    }).onevent('change', this, this.nameChange)
    $.header = new DOM('div', {className:'header'})
      .append([
        new DOM('h2', {innerText:Msg['PageProject']}),
        new DOM('span', {className: "username"})
        .append([
          new DOM('div', {innerText:Msg['HelloUser']}),
          $.username,
          new DOM('div', {innerText:'!'})
        ])
      ])
    $.wrapper = new DOM('span', {className: "projects"})
      .append([
        new DOM('div', {id:'user-projects'})
        .append([
          new DOM('div', {className:'header'})
            .append([
              new DOM('h3', {innerText:Msg['YourProjects']}),
              new DOM('span').append([
                DOM.prototypeInputFile({
                  id:'upload',
                  className:'icon',
                  innerText: Msg['Import']
                }).onevent('change', this, this.upload),
                new DOM('button', {
                  id:'add',
                  className:'icon text',
                  innerText: Msg['New']
                }).onclick(this, this.new)
              ])
            ]),
          $.projects
        ])
    ])

    $.container = new DOM('div', {className:'container'})
      .append([$.header, $.wrapper])

    $.contextMenu = new DOM('div')
    this.contextMenu = new ContextMenu($.contextMenu, this)

    // Only attach to DOM if section exists (for guest users)
    const sectionElement = DOM.get('section#project')
    if (sectionElement) {
      $.section = new DOM(sectionElement)
        .append([$.container, $.contextMenu])
      $.section.$.classList.add('default')
    }

    // Cross tabs event handler on connecting and disconnecting device
    command.add(this, {
      new: this._new,
      remove: this._remove,
      update: this._update,
      lazyUpdate: this._lazyUpdate,
      nameChange: this._nameChange
    })

    let keys = storage.keys(/project-(.*)/)
    keys.forEach((key) => {
      this.projects[key] = undefined
    })

    if (this.guestMode)
      this._enforceSingleGuestProject()

    // Shared projects are server/user features. Guests can still use local
    // projects, ML, and Vision without seeing sharing controls.
    if (!navigation.isLocal && !this.guestMode)
      this.shared = new SharedProject(this, $.wrapper)

    // Enable server mode when session confirms authentication
    window.addEventListener('sessionchange', (e) => {
      if (e.detail.isAuthenticated) {
        this.serverMode = true
        // If page was already initialized in localStorage mode, re-init in server mode
        if (this.inited && !this._serverInited)
          this._initServerMode()
      }
    })
  }
  _normalizeProjectAuthor (projectData){
    if (!projectData?.project)
      return projectData

    const user = session.getCurrentUser()
    if (user && projectData.project.author == 'a user')
      projectData.project.author = user.name

    return projectData
  }
  _enforceSingleGuestProject (){
    const keys = Object.keys(this.projects)
    if (keys.length <= 1)
      return

    const keep = storage.has('current_project') && this.projects.hasOwnProperty(storage.fetch('current_project')) ?
      storage.fetch('current_project') :
      keys[0]

    keys.forEach((key) => {
      if (key !== keep) {
        delete this.projects[key]
        storage.remove(`project-${key}`)
      }
    })

    storage.set('current_project', keep)
  }
  _init (){
    if (Object.keys(this.projects).length == 0){
      this.new()
      return
    }
    this.ensureCurrent()
  }
  ensureCurrent (){
    if (this.currentUID && this.projects.hasOwnProperty(this.currentUID) && this.projects[this.currentUID])
      return this.currentUID

    let key = ''
    if (storage.has('current_project') && this.projects.hasOwnProperty(storage.fetch('current_project')))
      key = storage.fetch('current_project')
    else
      key = Object.keys(this.projects)[0] || ''

    if (!key)
      return this.new()

    this.select(key)
    return this.currentUID
  }
  /*
   * Save project to localStorage.
   * @param {string} uid - Project's UID.
   */
  save (uid){
    if (uid == undefined)
      uid = this.currentUID
    this.projects[uid].lastEdited = +new Date()/1000
    this.write(uid)
  }
  /*
   * Create a new project in the platform. If an existing project is provided,
   * will be imported with a new uid, if not, a new empty project.
   * Then dispatches changes.
   * (:js:func:`_emptyProject`) is created.
   * @param {string} ev - On click event.
   * @param {Object/string} obj - Existing project, as parsed object or string.
   */
  new (ev, obj){
    if (this.guestMode && obj == undefined && Object.keys(this.projects).length >= 1) {
      const uid = storage.has('current_project') && this.projects.hasOwnProperty(storage.fetch('current_project')) ?
        storage.fetch('current_project') :
        Object.keys(this.projects)[0]
      this.select(uid)
      return uid
    }

    let uid = Tool.UID(),
        project = obj == undefined ? this._emptyProject() :
                  obj instanceof Object ? obj : JSON.parse(obj)

    storage.set(`project-${uid}`, JSON.stringify(project))
    command.dispatch(this, 'new', [uid, project])
    // Select brand new project
    this.select(uid)

    // Sync to server if authenticated
    if (this.serverMode)
      this._serverSave(uid)

    return uid
  }
  /*
   * Include the new project, called by the dispatch of :js:func:`new`.
   * @param {string} uid - Project's uid.
   * @param {Object} project - The project.
   */
  _new (uid, project){
    this.projects[uid] = undefined // unloaded instance

    if (!this.inited)
      return

    this.$.projects.$.insertBefore(
      this.$Card(uid).$,
      this.$.projects.$.firstChild
    )
  }
  remove (uid){
    let obj = this.projects[uid]
    // Stale card / already removed — nothing to do (avoids "undefined.project").
    if (!obj || !obj.project) {
      this.contextMenu.close()
      return
    }

    // Create project if no project will be left
    if (Object.keys(this.projects).length == 1)
      this.select(this.new())

    // Unshare if shared
    let shared = obj.project.shared || {}
    if (shared.uid)
      this.unshare(uid, true)

    command.dispatch(this, 'remove', [uid])
    // Update localStorage once
    storage.remove(`project-${uid}`)

    // Delete from server if authenticated
    if (this.serverMode)
      this._serverDelete(uid)

    this.contextMenu.close()
  }
  _remove (uid){
    delete this.projects[uid]

    if (!this.inited)
      return

    // Must find child to work between tabs
    let child = DOM.get(`[data-uid=${uid}]`, this.$.projects.$)
    this.$.projects.$.removeChild(child)

    if (uid == this.currentUID) {
      this.currentUID = undefined
      this.current = undefined
      if ((Object.keys(this.projects).length > 0)){
        this.select(Object.keys(this.projects)[0])
      }
    }
  }
  load (uid){
    this.currentUID = uid
    this.current = this._normalizeProjectAuthor(this.projects[uid])
    if (this.projects[uid].data == undefined)
      this.projects[uid].data = dataflow.empty()
    dataflow.load(this.projects[uid].data)
    for (const key in bipes.page) {
      if (typeof window.bipes.page[key].load === "function" && this.projects.hasOwnProperty(uid) && key != 'project') {
        // If don't exist, create empty
        if (this.projects[uid][key] == undefined)
          this.projects[uid][key] = bipes.page[key].empty()
        bipes.page[key].load(this.projects[uid][key])
      }
    }
    return uid
  }
  unload (uid){
    this.projects[uid] = undefined
    this.currentUID = undefined
    this.current = undefined
  }
  set (obj, uid){
    if (uid == undefined)
      uid = this.currentUID
    for (const key in obj){
      this.projects[uid][key] = obj[key]
    }
  }
  _emptyProject (){
    return {
      project:{
        name: Msg['EmptyProject'],
        author: this.username,
        shared:{
          uid:'',
          token:'',
          public:false,
          classId:null
        },
        createdAt: +new Date()/1000,
        lastEdited: +new Date()/1000
      }
    }
  }
  init (){
    // Server-backed mode for authenticated users
    if (session.isLoggedIn()) {
      this.serverMode = true
      if (!this._serverInited)
        this._initServerMode()
      return
    }

    if (this.inited)
      return

    let project = []
    for (const key in this.projects) {
      project.unshift(this.$Card(key))
    }
    this.$.projects.append(project)

    // Only on a slave tab
    if (this.currentUID != undefined) {
      let child = DOM.get(`[data-uid=${this.currentUID}]`, this.$.projects.$)
      child.classList.add('on')
      DOM.get('#name', child).disabled = false
    }
    if (this.hasOwnProperty('shared') && session.isLoggedIn())
      this.shared.init()

    this.inited = true
  }
  async _initServerMode (){
    if (this._serverIniting) return
    this._serverIniting = true

    const user = session.getCurrentUser()
    if (user) {
      this.username = user.name
      storage.set('username', user.name)
      this.$.username.$.value = user.name
      this.$.username.$.disabled = true
    }

    if (session.isStudent())
      await this._initStudentProjects(user)
    else if (session.isTeacher())
      await this._initTeacherProjects(user)

    for (const uid in this.projects) {
      if (storage.has(`project-${uid}`)) {
        const item = JSON.parse(storage.fetch(`project-${uid}`))
        if (item?._readOnly) {
          delete this.projects[uid]
          storage.remove(`project-${uid}`)
        }
      }
    }

    if (this.hasOwnProperty('shared'))
      this.shared.init()

    // Render project cards
    this.$.projects.$.innerHTML = ''
    let ownCards = []
    for (const uid in this.projects) {
      const item = this._normalizeProjectAuthor(JSON.parse(storage.fetch(`project-${uid}`)))
      storage.set(`project-${uid}`, JSON.stringify(item))
      ownCards.unshift(this.$Card(uid))
    }
    this.$.projects.append(ownCards)

    // Select a project if available
    if (Object.keys(this.projects).length > 0) {
      const prevUID = this.currentUID
      this.currentUID = undefined
      let key
      if (prevUID && this.projects.hasOwnProperty(prevUID))
        key = prevUID
      else if (storage.has('current_project')) {
        key = storage.fetch('current_project')
        if (!this.projects.hasOwnProperty(key))
          key = Object.keys(this.projects)[0]
      } else {
        key = Object.keys(this.projects)[0]
      }
      this.select(key)
    }

    this.inited = true
    this._serverInited = true
  }
  async _initStudentProjects (user){
    try {
      const response = await fetch('/api/projects/my-projects', {
        credentials: 'include'
      })
      const data = await response.json()

      if (response.ok) {
        const serverUids = new Set(data.projects.map(p => p.uid))

        // Migrate localStorage projects not yet on server
        const localToMigrate = []
        for (const uid in this.projects) {
          if (!serverUids.has(uid) && storage.has(`project-${uid}`)) {
            const projData = JSON.parse(storage.fetch(`project-${uid}`))
            if (!projData._serverOnly) {
              localToMigrate.push({
                uid: uid,
                name: projData.project?.name || 'Untitled',
                data: projData
              })
            }
          }
        }

        if (localToMigrate.length > 0) {
          try {
            await fetch('/api/projects/migrate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ projects: localToMigrate })
            })
          } catch (e) {
            console.error('Migration failed:', e)
          }
        }

        // Merge server data with current projects
        const mergedProjects = {}
        for (const proj of data.projects) {
          mergedProjects[proj.uid] = this.projects[proj.uid]
          if (!storage.has(`project-${proj.uid}`)) {
            storage.set(`project-${proj.uid}`, JSON.stringify({
              project: {
                name: proj.name,
                author: user?.name || 'a user',
                shared: {
                  uid: proj.share_uid || '',
                  token: proj.share_token || '',
                  public: !!proj.shared_public,
                  classId: proj.shared_class_id || null
                },
                createdAt: proj.created_at,
                lastEdited: proj.last_edited,
                assignedClassId: proj.assigned_class_id || null
              },
              _serverOnly: true
            }))
          } else {
            let cached = this._normalizeProjectAuthor(JSON.parse(storage.fetch(`project-${proj.uid}`)))
            cached.project.assignedClassId = proj.assigned_class_id || null
            cached.project.shared = {
              uid: proj.share_uid || '',
              token: proj.share_token || '',
              public: !!proj.shared_public,
              classId: proj.shared_class_id || null
            }
            storage.set(`project-${proj.uid}`, JSON.stringify(cached))
          }
        }

        for (const proj of localToMigrate) {
          if (!mergedProjects.hasOwnProperty(proj.uid))
            mergedProjects[proj.uid] = this.projects[proj.uid]
        }

        this.projects = mergedProjects
      }
    } catch (error) {
      console.error('Failed to sync projects:', error)
    }

    // Fetch class names for display on cards
    try {
      const clsResponse = await fetch('/api/students/my-classes', {
        credentials: 'include'
      })
      const clsData = await clsResponse.json()
      if (clsResponse.ok && clsData.classes) {
        for (const cls of clsData.classes)
          this._classNames[cls.class_id] = cls.class_name
      }
    } catch (e) {}
  }
  async _initTeacherProjects (user){
    // 1. Fetch teacher's own projects
    try {
      const response = await fetch('/api/projects/my-projects', {
        credentials: 'include'
      })
      const data = await response.json()
      if (response.ok) {
        const serverUids = new Set(data.projects.map(p => p.uid))

        const localToMigrate = []
        for (const uid in this.projects) {
          if (!serverUids.has(uid) && storage.has(`project-${uid}`)) {
            const projData = JSON.parse(storage.fetch(`project-${uid}`))
            if (!projData._serverOnly && !projData._readOnly) {
              localToMigrate.push({
                uid: uid,
                name: projData.project?.name || 'Untitled',
                data: projData
              })
            }
          }
        }

        if (localToMigrate.length > 0) {
          try {
            await fetch('/api/projects/migrate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ projects: localToMigrate })
            })
          } catch (e) {
            console.error('Teacher project migration failed:', e)
          }
        }

        const mergedProjects = {}
        for (const proj of data.projects) {
          mergedProjects[proj.uid] = this.projects[proj.uid]
          if (!storage.has(`project-${proj.uid}`)) {
            storage.set(`project-${proj.uid}`, JSON.stringify({
              project: {
                name: proj.name,
                author: user?.name || 'a user',
                shared: {
                  uid: proj.share_uid || '',
                  token: proj.share_token || '',
                  public: !!proj.shared_public,
                  classId: proj.shared_class_id || null
                },
                createdAt: proj.created_at,
                lastEdited: proj.last_edited
              },
              _serverOnly: true
            }))
          } else {
            let cached = this._normalizeProjectAuthor(JSON.parse(storage.fetch(`project-${proj.uid}`)))
            cached.project.shared = {
              uid: proj.share_uid || '',
              token: proj.share_token || '',
              public: !!proj.shared_public,
              classId: proj.shared_class_id || null
            }
            storage.set(`project-${proj.uid}`, JSON.stringify(cached))
          }
        }

        for (const proj of localToMigrate) {
          if (!mergedProjects.hasOwnProperty(proj.uid))
            mergedProjects[proj.uid] = this.projects[proj.uid]
        }

        this.projects = mergedProjects
      }
    } catch (error) {
      console.error('Failed to sync teacher projects:', error)
    }
  }
  select (uid){
    if (!uid || !this.projects.hasOwnProperty(uid)) {
      uid = Object.keys(this.projects)[0]
      if (!uid)
        return this.new()
    }

    if (uid == this.currentUID && this.projects[uid])
      return uid
    if (uid == this.currentUID && !this.projects[uid]) {
      this.currentUID = undefined
      this.current = undefined
    }

    // Search the whole section for cards (own + student projects)
    const searchRoot = this.$.section?.$ || this.$.projects.$

    if (this.currentUID != undefined){
      if (this.inited) {
        let child = DOM.get(`[data-uid=${this.currentUID}]`, searchRoot)
        if (child) {
          child.classList.remove('on')
          DOM.get('#name', child).disabled = true
        }
      }
      this.unload(this.currentUID)
    }

    let proj = storage.fetch(`project-${uid}`)
    this.projects[uid] = JSON.parse(proj)

    // Fetch full data from server if only metadata is cached
    if (this.serverMode && this.projects[uid]._serverOnly) {
      this._fetchAndSelect(uid)
      return
    }

    storage.set('current_project', this.load(uid))

    if (this.inited){
      let child2 = DOM.get(`[data-uid=${this.currentUID}]`, searchRoot)
      if (child2) {
        child2.classList.add('on')
        DOM.get('#name', child2).disabled = false
      }
    }

    // Update author if changed globally
    let _username = storage.fetch('username')
    if (_username != this.current.project.author)
      this.current.project.author = _username

    return this.currentUID
  }
  async _fetchAndSelect (uid){
    // Preserve assignedClassId from metadata before overwriting
    let prevCached = JSON.parse(storage.fetch(`project-${uid}`))
    let assignedClassId = prevCached?.project?.assignedClassId || null
    let sharedState = prevCached?.project?.shared || {uid:'', token:'', public:false, classId:null}
    try {
      const response = await fetch(`/api/projects/${uid}`, {
        credentials: 'include'
      })
      const data = await response.json()
      if (response.ok && data.data) {
        this.projects[uid] = data.data
        delete this.projects[uid]._serverOnly
        // Restore assignedClassId from metadata
        if (this.projects[uid].project)
          this.projects[uid].project.assignedClassId = assignedClassId
        if (this.projects[uid].project)
          this.projects[uid].project.shared = {
            uid: data.share_uid || sharedState.uid || '',
            token: data.share_token || sharedState.token || '',
            public: data.shared_public ?? sharedState.public ?? false,
            classId: data.shared_class_id || sharedState.classId || null
          }
        storage.set(`project-${uid}`, JSON.stringify(this.projects[uid]))
      }
    } catch (error) {
      console.error('Failed to fetch project:', error)
    }

    storage.set('current_project', this.load(uid))

    if (this.inited) {
      let child = DOM.get(`[data-uid=${this.currentUID}]`, this.$.projects.$)
      if (child) {
        child.classList.add('on')
        DOM.get('#name', child).disabled = false
      }
    }
  }
  deinit (){
    if(!this.inited)
      return

    if (this.hasOwnProperty('shared'))
      this.shared.deinit()
  }
  /*
   * Creates a DOM project card from temporary instance, just to read some
   * properties.
   * @param {string} uid - Project UID.
   */
  $Card (uid){
    let item = this._normalizeProjectAuthor(JSON.parse(storage.fetch(`project-${uid}`)))
    if (!item.project.shared)
      item.project.shared = {uid:'', token:'', public:false, classId:null}

    let _shared_class = item.project.shared.uid != '' ? 'shared' : ''

    let rowItems = [
      new DOM('div', {
        id:'lastEdited',
        innerText:Tool.prettyEditedAt(item.project.lastEdited)
      })
    ]

    // Show class name on the card
    if (this.serverMode) {
      let className = item._className ||
        (item.project.assignedClassId ? this._classNames[item.project.assignedClassId] : null)
      if (className) {
        rowItems.push(new DOM('div', {
          id:'assignedClass',
          innerText: className
        }))
      }
    }

    // Read the share id from the badge's CURRENT text at click time, not from this
    // render-time localStorage snapshot: (re)sharing changes the id and refreshes the
    // badge via lazyUpdate, but a captured snapshot would stay stale (often '') and
    // copyShareId() would then silently no-op.
    let uidBadge = new DOM('div', {
      id:'sharedUID',
      innerText:item.project.shared.uid,
      title: Msg['CopyShareId'] || 'Click to copy share id'
    }).onclick(this, function (e) {
      if (e) e.stopPropagation()      // copy, don't also open the project
      this.copyShareId((uidBadge.$.innerText || '').trim())
    })

    return new DOM('button', {className:_shared_class, uid: uid})
      .append([
        new DOM('div', {className:'row'}).append([
          new DOM('h4', {
            id:'name',
            innerText: item.project.name
          }),
          uidBadge
        ]),
        new DOM('div', {className:'row'}).append(rowItems)
     ])
     .onclick(this, this.select, [uid])
     .onevent('contextmenu', this, (ev) => {
       ev.preventDefault()
       let actions = [
         {
           id:'download',
           innerText:Msg['Download'],
           fun:this.download,
           args:[uid]
         }
       ]
       // Read-only projects (teacher viewing student work): download only
       if (item._readOnly) {
         this.contextMenu.open(actions, ev)
         return
       }
       if (uid == this.currentUID) {
         let obj = this.projects[uid]
         actions.unshift({
           id:'rename',
           innerText:Msg['Rename'],
           fun:this.rename,
           args:[uid, obj.project.name]
         },
         {
           id:'remove',
           innerText:Msg['Delete'],
           fun:this.remove,
           args:[uid]
         })

         // All sharing/embedding lives in a single focused dialog (one menu entry)
         // instead of half a dozen toggle items.
         if (this.serverMode && session.isTeacher()) {
           actions.unshift({
             id:'share',
             innerText:Msg['ShareAndEmbed'] || 'Share & embed…',
             fun:this.openShareDialog,
             args:[uid]
           })
         }
         }
         this.contextMenu.open(actions, ev)
       })
  }
  // Copy the project's share id (use it in /embed?uid=<id>).
  copyShareId (shareUid) {
    if (!shareUid) return
    this._copyText(shareUid, (Msg['Copied'] || 'Copied') + ': ' + shareUid)
  }
  // Copy a ready-to-paste <iframe> embed snippet for a lesson page.
  copyEmbedLink (shareUid) {
    if (!shareUid) return
    let src = window.location.origin + '/embed?uid=' + encodeURIComponent(shareUid)
    let snippet = '<iframe src="' + src + '" width="100%" height="360" style="border:1px solid #ccc"></iframe>'
    this._copyText(snippet, Msg['CopiedEmbed'] || 'Embed code copied')
  }
  _copyText (text, msg) {
    let notify = () => { try { notification.send(`${Msg['PageProject']}: ${msg}`) } catch (e) {} }
    if (navigator.clipboard && navigator.clipboard.writeText)
      navigator.clipboard.writeText(text).then(notify).catch(() => { this._copyFallback(text); notify() })
    else { this._copyFallback(text); notify() }
  }
  _copyFallback (text) {
    try {
      let ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'; ta.style.opacity = '0'
      document.body.appendChild(ta); ta.focus(); ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    } catch (e) {}
  }
  // ---- Share & Embed dialog (teacher) -------------------------------------
  // One focused surface for public sharing, class sharing, and embedding, replacing
  // the long flat context menu. Reuses updateShareSettings()/unshare() for the API.
  async openShareDialog (uid){
    this.contextMenu.close()
    if (!this.projects[uid] || !this.projects[uid].project) return
    this._shareUid = uid
    this._buildShareDialog()
    this._embedFrameLogical = null      // force the preview iframe to (re)load fresh
    this._renderShareDialog()
    this.$.shareDialog.$.hidden = false
    // Load classes then refresh the dropdown selection.
    this._loadShareClasses().then(() => this._renderShareDialog())
    // The server snapshots block XML only at share time, so an already-shared project
    // shows STALE blocks in the embed after further edits. Re-push the current blocks
    // (no setting change) so the preview + live embed reflect the latest edits.
    const sh = this.projects[uid].project.shared
    if (sh && sh.uid) {
      await this.updateShareSettings(uid, {})
      this._embedFrameLogical = null
      this._renderShareDialog()
    }
  }
  closeShareDialog (){
    if (this.$.shareDialog) this.$.shareDialog.$.hidden = true
    this._shareUid = null
  }
  async _loadShareClasses (){
    try {
      const r = await fetch('/api/classes/my-classes', {credentials:'include'})
      const d = await r.json()
      this._shareClasses = (r.ok && Array.isArray(d.classes)) ? d.classes : []
    } catch (e) { this._shareClasses = [] }
    const sel = this.$.shareClass
    if (!sel) return
    sel.$.innerHTML = ''
    sel.$.appendChild(new DOM('option', {value:'', innerText:Msg['ShareClassNone'] || 'No class'}).$)
    this._shareClasses.forEach(c =>
      sel.$.appendChild(new DOM('option', {value:String(c.class_id), innerText:c.class_name}).$))
  }
  _buildShareDialog (){
    if (this.$.shareDialog) return   // built once, reused
    const $ = this.$
    // No × button — the system closes pop-ups by clicking outside (handled by the
    // overlay onclick below).
    $.shareName = new DOM('span', {className:'share-name'})

    // Public toggle + link
    $.sharePublic = new DOM('input', {type:'checkbox'}).onevent('change', this, this._onTogglePublic)
    $.shareLink = new DOM('input', {className:'share-field'}); $.shareLink.$.readOnly = true
    const copyLink = new DOM('button', {className:'share-btn', innerText:Msg['Copy']||'Copy'})
      .onclick(this, () => this._copyText($.shareLink.value, Msg['Copied']||'Copied'))
    $.shareLinkRow = new DOM('div', {className:'share-link-row'}).append([$.shareLink, copyLink])

    // Share with class
    $.shareClass = new DOM('select').onevent('change', this, this._onChangeClass)

    // Embed
    $.embedW = new DOM('input', {className:'embed-num', value:'100%'}).onevent('input', this, this._refreshEmbed)
    $.embedH = new DOM('input', {className:'embed-num', value:'360'}).onevent('input', this, this._refreshEmbed)
    $.embedLock = new DOM('input', {type:'checkbox'}).onevent('change', this, this._refreshEmbed)
    $.embedCode = new DOM('textarea', {className:'embed-code'}); $.embedCode.$.readOnly = true; $.embedCode.$.rows = 2
    const copyEmbed = new DOM('button', {className:'share-btn', innerText:Msg['CopyEmbedLink']||'Copy embed code'})
      .onclick(this, () => this._copyText($.embedCode.value, Msg['CopiedEmbed']||'Embed code copied'))
    $.embedPreview = new DOM('a', {className:'share-link', innerText:Msg['OpenPreview']||'Open preview'})
    $.embedPreview.$.target = '_blank'; $.embedPreview.$.rel = 'noopener'
    $.embedFrame = new DOM('iframe', {className:'embed-frame'})
    $.embedSection = new DOM('fieldset', {className:'embed-section'}).append([
      new DOM('legend', {innerText:Msg['EmbedTitle']||'Embed'}),
      new DOM('div', {className:'embed-opts'}).append([
        new DOM('label', {innerText:(Msg['EmbedWidth']||'Width')+' '}).append([$.embedW]),
        new DOM('label', {innerText:(Msg['EmbedHeight']||'Height')+' '}).append([$.embedH]),
        new DOM('label', {className:'embed-lock'}).append([$.embedLock, new DOM('span', {innerText:' '+(Msg['EmbedLock']||'Lock (no pan/zoom)')})])
      ]),
      $.embedCode,
      new DOM('div', {className:'embed-actions'}).append([copyEmbed, $.embedPreview]),
      $.embedFrame
    ])

    // Unshare
    $.shareUnshare = new DOM('button', {className:'share-btn danger', innerText:Msg['StopAllSharing']||'Stop sharing'})
      .onclick(this, this._onUnshare)

    const body = new DOM('div', {className:'share-body'}).append([
      new DOM('label', {className:'share-row'}).append([
        $.sharePublic, new DOM('span', {innerText:' '+(Msg['SharePubliclyLabel']||'Anyone with the link can view')})
      ]),
      $.shareLinkRow,
      new DOM('div', {className:'share-row'}).append([
        new DOM('label', {innerText:(Msg['ShareWithClass']||'Share with class')+' '}), $.shareClass
      ]),
      $.embedSection,
      $.shareUnshare
    ])
    const dialog = new DOM('div', {className:'share-dialog'}).append([
      new DOM('div', {className:'share-head'}).append([
        new DOM('h2', {innerText:Msg['ShareAndEmbed']||'Share & embed'}), $.shareName
      ]),
      body
    ])
    $.shareDialog = new DOM('div', {className:'share-overlay'}).append([dialog])
    $.shareDialog.$.hidden = true
    $.shareDialog.onclick(this, (e) => { if (e.target === $.shareDialog.$) this.closeShareDialog() })
    ;($.section || $.container).append([$.shareDialog])
  }
  _renderShareDialog (){
    const item = this.projects[this._shareUid]
    if (!item || !this.$.shareDialog) return
    const shared = {
      uid: item.project.shared?.uid || '',
      public: !!item.project.shared?.public,
      classId: item.project.shared?.classId || null
    }
    const isShared = !!shared.uid
    this.$.shareName.$.textContent = item.project.name || ''
    this.$.sharePublic.$.checked = shared.public
    this.$.shareClass.$.value = shared.classId ? String(shared.classId) : ''
    // The /embed view-link and embed code only work for PUBLIC projects — the public
    // endpoint 403s on class-only shares (those are consumed in-app by enrolled students,
    // not via a public link). So gate the link + embed section on `public`, not on
    // "is shared at all". Unshare stays available for any share (public or class).
    this.$.shareLink.$.value = shared.public ? this._embedSrc(shared.uid, false) : ''
    this.$.shareLinkRow.$.hidden = !shared.public
    this.$.embedSection.$.hidden = !shared.public
    this.$.shareUnshare.$.hidden = !isShared
    if (shared.public) this._refreshEmbed()
  }
  _embedSrc (shareUid, lock){
    return window.location.origin + '/embed?uid=' + encodeURIComponent(shareUid) + (lock ? '&lock=1' : '')
  }
  _refreshEmbed (){
    const shared = this.projects[this._shareUid]?.project?.shared
    if (!shared?.uid) return
    const w = (this.$.embedW.value || '100%').trim()
    const h = (this.$.embedH.value || '360').trim()
    const src = this._embedSrc(shared.uid, this.$.embedLock.$.checked)
    // Copyable code/link stay clean; only the live preview iframe gets a cache-buster
    // so it actually reloads when the uid/lock changes or blocks were re-pushed.
    this.$.embedCode.$.value = '<iframe src="' + src + '" width="' + w + '" height="' + h + '" style="border:1px solid #ccc"></iframe>'
    this.$.embedPreview.$.href = src
    if (this._embedFrameLogical !== src) {
      this._embedFrameLogical = src
      this._embedNonce = (this._embedNonce || 0) + 1
      this.$.embedFrame.$.src = src + '&_=' + this._embedNonce   // _embedSrc always has ?uid=
    }
    this.$.embedFrame.$.style.height = (/^\d+$/.test(h) ? h+'px' : '220px')
  }
  async _onTogglePublic (){
    await this.updateShareSettings(this._shareUid, {public: this.$.sharePublic.$.checked})
    this._renderShareDialog()
  }
  async _onChangeClass (){
    const val = this.$.shareClass.value
    await this.updateShareSettings(this._shareUid, {classId: val ? parseInt(val, 10) : null})
    this._renderShareDialog()
  }
  async _onUnshare (){
    await this.unshare(this._shareUid)
    this._renderShareDialog()
  }
  /*
   * Write project from current scope to localStorage.
   * @param {string} uid - project's uid.
   */
  write (uid){
    uid = uid == undefined ? this.currentUID : uid
    storage.set(`project-${uid}`, JSON.stringify(this.projects[uid]))
    if (this.serverMode)
      this._scheduleServerSave(uid)
  }
  _scheduleServerSave (uid){
    if (this._saveTimeout) clearTimeout(this._saveTimeout)
    this._saveTimeout = setTimeout(() => {
      this._serverSave(uid || this.currentUID)
    }, 3000)
  }
  _forkProjectUid (uid){
    if (!uid || !this.projects[uid])
      return null

    const newUid = Tool.UID()
    this.projects[newUid] = this.projects[uid]
    delete this.projects[uid]

    if (storage.has(`project-${uid}`)) {
      storage.set(`project-${newUid}`, storage.fetch(`project-${uid}`))
      storage.remove(`project-${uid}`)
    }

    if (this.currentUID === uid)
      this.currentUID = newUid

    if (storage.fetch('current_project') === uid)
      storage.set('current_project', newUid)

    return newUid
  }
  async _serverSave (uid){
    if (!uid || !this.projects[uid]) return
    const proj = this.projects[uid]
    try {
      const response = await fetch('/api/projects/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          uid: uid,
          name: proj.project?.name || 'Untitled',
          data: proj
        })
      })
      if (!response.ok) {
        let message = `${response.status} ${response.statusText}`
        let errorCode = ''
        try {
          const data = await response.json()
          if (data?.error) {
            message = data.error
            errorCode = data.error
          }
        } catch (e) {}

        if (response.status === 403 && errorCode === 'Unauthorized') {
          const newUid = this._forkProjectUid(uid)
          if (newUid) {
            await this._serverSave(newUid)
            return
          }
        }

        console.error('Failed to save project to server:', message)
      }
    } catch (error) {
      console.error('Failed to save project to server:', error)
    }
  }
  async _serverDelete (uid){
    try {
      await fetch(`/api/projects/${uid}`, {
        method: 'DELETE',
        credentials: 'include'
      })
    } catch (error) {
      console.error('Failed to delete project from server:', error)
    }
  }
  async assignToClass (uid, ev){
    this.contextMenu.close()
    try {
      const response = await fetch('/api/students/my-classes', {
        credentials: 'include'
      })
      const data = await response.json()
      if (!response.ok || !data.classes || data.classes.length === 0) {
        notification.send(`${Msg['PageProject']}: ${Msg['NoClasses']}`)
        return
      }
      // Open context menu with class options
      const actions = data.classes.map(cls => ({
        id: 'class-' + cls.class_id,
        innerText: cls.class_name,
        fun: this._doAssignToClass,
        args: [uid, cls.class_id, cls.class_name]
      }))
      this.contextMenu.open(actions, ev)
    } catch (error) {
      console.error('Failed to fetch classes:', error)
    }
  }
  async _doAssignToClass (uid, classId, className){
    this.contextMenu.close()
    try {
      const response = await fetch(`/api/projects/${uid}/assign-class`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ class_id: classId })
      })
      if (response.ok) {
        // Update local metadata
        this.projects[uid].project.assignedClassId = classId
        let cached = JSON.parse(storage.fetch(`project-${uid}`))
        cached.project.assignedClassId = classId
        storage.set(`project-${uid}`, JSON.stringify(cached))
        // Update card display
        let card = DOM.get(`[data-uid=${uid}]`, this.$.projects.$)
        if (card) {
          let assignedEl = DOM.get('#assignedClass', card)
          if (assignedEl) {
            assignedEl.innerText = `${Msg['AssignedTo']} ${className}`
          } else {
            let row = card.querySelector('.row:last-child')
            if (row) {
              let span = document.createElement('div')
              span.id = 'assignedClass'
              span.innerText = `${Msg['AssignedTo']} ${className}`
              row.appendChild(span)
            }
          }
        }
        notification.send(`${Msg['PageProject']}: ${Msg['AssignedTo']} ${className}`)
      }
    } catch (error) {
      console.error('Failed to assign project to class:', error)
    }
  }
  async updateShareSettings (uid, patch){
    let item = this.projects[uid]
    if (!item || !item.project)
      return

    // Sharing a project that isn't the currently-open one leaves only its metadata in
    // memory (no `.blocks`). Saving that would wipe the project's blocks server-side and
    // make the embed show "no blocks". Hydrate the full project (with blocks) from its
    // localStorage copy first.
    if (!item.blocks && storage.has(`project-${uid}`)) {
      try {
        const full = JSON.parse(storage.fetch(`project-${uid}`))
        if (full && full.blocks) {
          item = full
          this.projects[uid] = full
        }
      } catch (e) {}
    }

    let shared = {
      uid: item.project.shared?.uid || '',
      token: item.project.shared?.token || '',
      public: !!item.project.shared?.public,
      classId: item.project.shared?.classId || null
    }
    shared = {...shared, ...patch}
    if (!shared.public && !shared.classId) {
      await this.unshare(uid)
      return
    }

    try {
      const obj = await API.do('project/w', {
        project_uid: uid,
        shared_public: shared.public,
        shared_class_id: shared.classId,
        data: item,
        name: item.project.name
      })
      let proj = {...item.project}
      const previousSharedUid = proj.shared?.uid || ''
      proj.author = this.username
      proj.shared = {
        uid: obj.uid || '',
        token: obj.token || '',
        public: !!obj.shared_public,
        classId: obj.shared_class_id || null
      }
      // Keep the in-memory project authoritative even when it isn't the open tab:
      // `update()`/`_update()` only sync `this.projects[uid]` for the CURRENT tab, so
      // without this a non-current project keeps a stale share uid -> re-toggling mints
      // duplicate shares and unshare appears to "stay shared".
      this.projects[uid].project = proj
      if (this.hasOwnProperty('shared')) {
        if (proj.shared.public) {
          this.shared.upsert({
            uid: proj.shared.uid,
            name: proj.name,
            author: proj.author,
            lastEdited: proj.lastEdited
          })
        } else if (previousSharedUid) {
          this.shared.remove(previousSharedUid)
        }
      }
      let _obj = {name:proj.name, shared:proj.shared, lastEdited:proj.lastEdited}
      command.dispatch(this, 'lazyUpdate', [uid, _obj])
      this.update({project:proj}, uid)
    } catch(e) {
      console.error(e)
    }
  }
  async togglePublicShare (uid){
    this.contextMenu.close()
    const shared = this.projects[uid]?.project?.shared || {}
    const nextPublic = !shared.public
    if (!nextPublic && !shared.classId) {
      await this.unshare(uid)
      return
    }
    await this.updateShareSettings(uid, {public: nextPublic})
  }
  async openClassShareMenu (uid, ev){
    this.contextMenu.close()
    try {
      const response = await fetch('/api/classes/my-classes', {
        credentials: 'include'
      })
      const data = await response.json()
      if (!response.ok || !data.classes || data.classes.length === 0) {
        notification.send(`${Msg['PageProject']}: ${Msg['NoClasses']}`)
        return
      }
      const actions = data.classes.map(cls => ({
        id: 'share-class-' + cls.class_id,
        innerText: cls.class_name,
        fun: this._doShareWithClass,
        args: [uid, cls.class_id]
      }))
      this.contextMenu.open(actions, ev)
    } catch (error) {
      console.error('Failed to fetch classes for sharing:', error)
    }
  }
  async _doShareWithClass (uid, classId){
    this.contextMenu.close()
    await this.updateShareSettings(uid, {classId: classId})
  }
  async clearClassShare (uid){
    this.contextMenu.close()
    await this.updateShareSettings(uid, {classId: null})
  }
  async unassignFromClass (uid){
    this.contextMenu.close()
    try {
      const response = await fetch(`/api/projects/${uid}/assign-class`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ class_id: null })
      })
      if (response.ok) {
        this.projects[uid].project.assignedClassId = null
        let cached = JSON.parse(storage.fetch(`project-${uid}`))
        cached.project.assignedClassId = null
        storage.set(`project-${uid}`, JSON.stringify(cached))
        // Remove assigned class display from card
        let card = DOM.get(`[data-uid=${uid}]`, this.$.projects.$)
        if (card) {
          let assignedEl = DOM.get('#assignedClass', card)
          if (assignedEl) assignedEl.remove()
        }
        notification.send(`${Msg['PageProject']}: ${Msg['UnassignFromClass']}`)
      }
    } catch (error) {
      console.error('Failed to unassign project from class:', error)
    }
  }
  /*
   * Rename a project.
   * @param {string} uid - Project's uid
   * @param {string} name - Old project's name
   */
  rename (uid, name){
    this.contextMenu.oninput({
      title:Msg['ProjectName'],
      placeholder:name,
      value:name
    }, (input, ev) => {
      ev.preventDefault()
      let name = input.value

      this.contextMenu.close()

      if (name == undefined || name == '')
        return
      let obj = {...this.projects[uid].project}
      obj.name = name

      // Update outside the update context, since soft affects the project list
      let item = {name:obj.name, shared:obj.shared, lastEdited:obj.lastEdited}
      command.dispatch(this, 'lazyUpdate', [uid, item])
      // Now send actual update action
      this.update({project:obj}, uid)
    })
  }
  /*
   * Lazy upodate project DOM card with name, lastEdited and shared status.
   * @param {string} uid - Project's uid
   * @param {string} obj - Object with name, lastEdited and shared.
   */
  _lazyUpdate (uid, obj){
    DOM.lazyUpdate(this.$.projects.$, uid, {
      name: obj.name,
      lastEdited: Tool.prettyEditedAt(obj.lastEdited),
      sharedUID: obj.shared.uid
    })
    let $ = DOM.get(`[data-uid='${uid}']`, this.$.projects)
    if (obj.shared.uid != '')
     $.classList.add('shared')
    else
     $.classList.remove('shared')
  }
  /*
   * Update project data on all tabs then from current scope write to localStorage.
   * @param {Object} data - Changed project data
   * @param {string} uid - Project's uid
   */
  update (data, uid){
    uid = uid == undefined ? this.currentUID : uid
    // Update lastEdited
    if (!data.hasOwnProperty('project'))
      data.project = {...this.projects[uid].project}
    data.project.lastEdited = +new Date()/1000

    command.dispatch(this, 'update', [uid, data, command.tabUID])
    // Update localStorage once
    this.write(uid)
  }
  /*
   * Update project data if the current one is the same as the dispatched change.
   * @param {string} uid - Project's uid
   * @param {string} data - Changed project data
   * @param {string} tabUID - Source tab UID.
   */
  _update (uid, data, tabUID){
    // Update only the current project, since the others are not in memory.
    if (uid !== this.currentUID)
      return

    for (const key in data){
      if (key != 'load')
        this.projects[uid][key] = data[key]
    }
    if (data.hasOwnProperty('load') && data.load == false)
      return
    for (const key in data){
      switch (key) {
        case 'project':
          break
        default:
          for (const key in data){
            if (typeof window.bipes.page[key].load == 'function' && this.projects.hasOwnProperty(uid) && key != 'project')
              window.bipes.page[key].load(data[key], tabUID)
        }
      }
    }
  }
  /**
   * Get the most recent project by last edited date.
   */
  _mostRecent (){
    let timestamp = 0,
        uid
    for (const key in this.projects) {
      if (this.projects[key].project.lastEdited > timestamp)
        timestamp = this.projects[key].project.lastEdited,
        uid = key
    }
    return uid
  }
  /**
   * Download a project to the computer
   * @param {string} uid - Project uid
   */
  download (uid){
    let proj = JSON.parse(storage.fetch(`project-${uid}`))
    if (proj?.project) {
      proj.project.shared = {
        uid:'',
        token:'',
        public:false,
        classId:null
      }
    }
    let name = proj?.project?.name || 'project'
    DOM.prototypeDownload(`${name}.bipes.json`, JSON.stringify(proj))
    this.contextMenu.close()
  }
  /**
   * Share a local project.
   * @param {string} uid - Project uid
   */
  async unshare (uid){
    this.contextMenu.close()
    let item = this.projects[uid]
    if (!item)
      return
    const previousSharedUid = item.project?.shared?.uid || ''
    try {
      await API.do('project/rm', {
        project_uid: uid
      })
      let _proj = {...item.project}
      _proj.shared = {
        uid:'',
        token:'',
        public:false,
        classId:null
      }
      if (this.hasOwnProperty('shared') && previousSharedUid)
        this.shared.remove(previousSharedUid)
      // Sync in-memory state (see updateShareSettings) so a non-current project really
      // reflects "no longer shared" instead of re-rendering its stale shared state.
      this.projects[uid].project = _proj
      let _obj = {name:_proj.name, shared:_proj.shared, lastEdited:_proj.lastEdited}
      command.dispatch(this, 'lazyUpdate', [uid, _obj])
      this.update({project:_proj}, uid)
    } catch (e) {
      console.error(e)
    }
  }
  /*
   * Upload a project to the platform.
   * @param {string} ev - Input on change event, contains the input node as target.
   */
  upload (ev){
    if  (ev.target.files [0] == undefined)
      return

    let file = ev.target.files[0]

    let reader = new FileReader()
    reader.onload = (e) => {
      this.new(ev, e.target.result)
    }
    reader.readAsText(file)
  }
  nameChange (){
    if (this.$.username.value == undefined || this.$.username.value == '')
        this.$.username.value = Msg['AUser']

    let name = this.$.username.value == Msg['AUser'] ? 'a user' : this.$.username.value
    command.dispatch(this, 'nameChange',
      [name,
      this.currentUID
    ])

    storage.set('username', name)

    let obj = {...this.current.project}
    obj.author = name

    this.update({project:obj}, this.currentUID)
  }
  _nameChange (name){
    if (name == 'a user')
      name = Msg['AUser']

    this.$.username.value = name
  }
}
/* Show shared projects */
class SharedProject {
  constructor (parent, dom){
    this.parent = parent
    // This is a lazy object and is not in sync with the DOM list.
    this.projects = []
    this.inited = false
    this.firstInited = false

    let $ = this.$ = {}

    $.projects = new DOM('span', {className:'listy'})

    $.fromHash = new DOM('div', {id:'ask-shared-project'})
    $.fromHashListy = new DOM('span', {className:'listy'})

    dom.append([
      new DOM('div', {id:'shared-projects'})
        .append([
          new DOM('div', {className:'header'})
            .append([
              new DOM('h3', {innerText:Msg['SharedProjects']})
          ]),
        $.projects,
        new DOM('span', {className:'listy more-button'})
          .append([
            new DOM('button', {title:Msg['LoadMore']})
              .append([new DOM('div', {className:'button icon'})])
              .onclick(this, this.fetchAutoFrom)
        ])
      ]),
      $.fromHash
        .append([
          new DOM('div', {className:'header'})
            .append([
              new DOM('h3', {innerText:Msg['ProjectFromURL']}),
              new DOM('span', {innerText:Msg['ClickToImport']})
            ]),
          $.fromHashListy
        ])
    ])

    // Check for project to import
    if (window.location.hash){
      this.fromHash(window.location.hash.substring(1))
      window.location.hash = ''
    }
  }
  init (){
    if (!this.firstInited) {
      this.fetchSome({from: +new Date()/1000, limit:5})
      this.firstInited = true
    }
    if (this.inited)
      return

    this.render()

    this.inited = true
  }
  deinit (){
    if (!this.inited)
      return

    this.inited = false
  }
  upsert (item){
    const existing = this.projects.find(proj => proj.uid == item.uid)
    if (existing)
      Object.assign(existing, item)
    else
      this.projects.unshift(item)

    if (!this.inited)
      return
    this.render()
  }
  remove (uid){
    this.projects = this.projects.filter(proj => proj.uid != uid)
    if (!this.inited)
      return
    this.render()
  }
  render (){
    this.$.projects.$.innerHTML = ''

    if (session.isStudent()) {
      const groups = new Map()
      this.projects.forEach((proj) => {
        const key = proj.class_id || 'ungrouped'
        if (!groups.has(key)) {
          groups.set(key, {
            label: proj.class_name ?
              `${proj.class_name}${proj.class_code ? ` (${proj.class_code})` : ''}` :
              'Shared Projects',
            teacher: proj.teacher_name || proj.author || '',
            items: []
          })
        }
        groups.get(key).items.push(proj)
      })

      const fragments = []
      groups.forEach((group) => {
        fragments.push(
          new DOM('div', {className:'shared-group'}).append([
            new DOM('div', {className:'shared-group-header'}).append([
              new DOM('h4', {innerText: group.label}),
              new DOM('span', {innerText: group.teacher ? `${Msg['By']} ${group.teacher}` : ''})
            ]),
            new DOM('span', {className:'listy shared-group-list'})
              .append(group.items.map(item => this.$Card(item)))
          ])
        )
      })
      this.$.projects.append(fragments)
      return
    }

    let doms = []
    this.projects.forEach(proj => doms.unshift(this.$Card(proj)))
    this.$.projects.append(doms)
  }
  /*
   * Fetch some shared projects.
   * @param{Object} args - Arguments to pass to the project ls command,
   *                       send empty {} object to fetch latest batch.
   * @param{bool} notify- True to throw a notification.
   */
  async fetchSome (args, notify){
    API.do('project/ls', args)
      .then(obj => {
        // Push unique values and also return an array of these unique
        Tool.pushUnique(this.projects, obj.projects, 'uid')
        if (this.inited)
          this.render()
        if (obj.projects.length == 0 && notify === true)
          notification.send(`${Msg['PageProject']}: ${Msg['NoOlderProjects']}.`)
      })
      .catch(e => {console.error(e)})
  }
  /*
   * Clone a shared project.
   * @param{string} uid - shared project unique public id.
   */
  async clone (uid){
   API.do('project/o', {uid:uid})
    .then(obj => {
      if (obj.hasOwnProperty('projects')) {
        const data = obj.projects[0].data || {}
        if (data.project) {
          data.project.shared = {
            uid:'',
            token:'',
            public:false,
            classId:null
          }
        }
        this.parent.new(undefined, data)
      }
      else
        notification.send(`${Msg['PageProject']}: ${Msg['SharedProjectDoesNotExist']}.`)
    })
    .catch(e => {console.error(e)})
  }
  /*
   * Automatically fetch a new from to lastEdited interval.
   */
  fetchAutoFrom (){
    // Get oldest edited project
    let obj = Tool.getMin(this.projects, 'lastEdited')
    if (obj !== null)
      this.fetchSome({from:obj.lastEdited, limit:10}, true)
    else
      this.fetchSome({from:+new Date()/1000, limit:10}, true)
  }
  /**
   * Creates a DOM shared project card
   */
  $Card (item){
    const metaLine = item.class_name && !session.isTeacher() ?
      `${item.class_name}${item.class_code ? ` (${item.class_code})` : ''}` :
      `${Msg['By']} ${item.author}`

    return new DOM('button', {uid: item.uid})
      .append([
        new DOM('div', {className:'row'}).append([
          new DOM('h4', {
            id:'name',
            innerText: item.name
          }),
          new DOM('div', {
            id:'uid',
            innerText: item.uid
          })
        ]),
        new DOM('div', {className:'row'}).append([
          new DOM('span', {
            id:'author',
            innerText: metaLine
          }),
          new DOM('div', {
            id:'lastEdited',
            innerText: Tool.prettyEditedAt(item.lastEdited)
          })
        ]),
        new DOM('div', {className:'row'}).append([
          new DOM('span', {
            id:'teacherName',
            innerText: item.teacher_name && item.teacher_name !== item.author ? `${Msg['By']} ${item.teacher_name}` : ''
          })
        ])
      ])
      .onclick(this, this.clone, [item.uid])
  }
  /**
   * Import project using URL hash.
   * @param{string} uid - shared project unique public id.
   */
  fromHash (uid){
   API.do('project/o', {uid:uid})
    .then(obj => {
      if (obj.hasOwnProperty('projects')){
        let dom = this.$Card(obj.projects[0])
        this.$.fromHashListy.append(dom)
        this.$.fromHash.classList.add('on')
        this.parent.nav.click()
        dom.focus()
      } else
        notification.send(`${Msg['PageProject']}: ${Msg['SharedProjectDoesNotExist']}.`)
    })
    .catch(e => {console.error(e)})
  }
}

export let project = new Project()
