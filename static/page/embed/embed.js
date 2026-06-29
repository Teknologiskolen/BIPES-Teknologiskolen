// ============================================================
// embed.js — renders a read-only BIPES Blockly workspace for embedding blocks
// in external pages (lessons), MakeCode-style.
//
// Block source, in priority order:
//   /embed?uid=<share_uid>   -> fetch a shared (public) BIPES project's blocks
//   /embed?xml=<base64 xml>  -> inline blocks XML (self-contained)
//   (none)                   -> a small built-in sample (proves embedding works)
// ============================================================
import { deviceSpecifications } from '/static/page/device/devices.js'

;(function () {
  // Some BIPES block init() functions (and dropdown generators) reference the
  // global `bipes` environment — warnings, colour conversion, device list,
  // project target. The embed is read-only, so provide inert defaults + the real
  // device specs (so device-pin dropdowns resolve to actual pins, not
  // "undefined"). Must exist before any block is instantiated.
  window.bipes = window.bipes || {}
  window.bipes.page = window.bipes.page || {}
  window.bipes.page.blocks = window.bipes.page.blocks || {}
  window.bipes.page.blocks.warningIfTrue = window.bipes.page.blocks.warningIfTrue || function () {}
  window.bipes.page.blocks.convertColor = window.bipes.page.blocks.convertColor || {
    RGB2HEX: function () { return '#000000' },
    HUE2HEX: function () { return '#000000' },
    HEX2RGB: function () { return [0, 0, 0] }
  }
  window.bipes.page.device = window.bipes.page.device || {}
  window.bipes.page.device.deviceInfo = deviceSpecifications   // real pin lists
  // Default target; each pinout block also carries its own DEVICE field from the
  // saved XML, which takes precedence when resolving its pins.
  window.bipes.page.project = window.bipes.page.project ||
    { current: { device: { target: 'RPIPicoW' } } }

  var host = document.getElementById('blocks')

  var params = new URLSearchParams(location.search)
  var uid = params.get('uid')
  var xmlParam = params.get('xml')
  // ?block=<sel> picks specific top-level chains (0-based index or block id). Accepts a
  // comma list and/or repeated params:  ?block=1,2   or   ?block=1&block=2  (both at once
  // is fine too). Empty when not selecting — then the whole source renders.
  var blockSel = params.getAll('block')
    .reduce(function (acc, v) { return acc.concat(String(v).split(',')) }, [])
    .map(function (s) { return s.trim() })
    .filter(function (s) { return s.length })
  var locked = blockSel.length > 0 || params.get('lock') === '1'

  // Locked: a fixed snippet — no pan/zoom/drag. Otherwise pan/zoom is allowed.
  var workspace = Blockly.inject(host, {
    readOnly: true,                 // no editing, no toolbox
    trashcan: false,
    scrollbars: !locked,
    zoom: locked ? { controls: false, wheel: false }
                 : { controls: false, wheel: true, startScale: 0.9, maxScale: 2, minScale: 0.3 },
    move: locked ? { drag: false, wheel: false, scrollbars: false }
                 : { drag: true, wheel: true, scrollbars: true }
  })

  var selectedXml = null            // the XML actually rendered (what Copy copies)

  // Escape before inserting any untrusted value (the ?uid= param, exception text) into
  // innerHTML — otherwise /embed?uid=<img src=x onerror=...> is reflected XSS on the app
  // origin (and the CSP here is permissive for framing, so nothing else blocks it).
  function esc (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    })
  }

  function textToDom (xml) {
    if (Blockly.utils && Blockly.utils.xml && Blockly.utils.xml.textToDom)
      return Blockly.utils.xml.textToDom(xml)
    return Blockly.Xml.textToDom(xml)   // older API fallback
  }

  function domToText (dom) {
    return Blockly.Xml.domToText ? Blockly.Xml.domToText(dom) : new XMLSerializer().serializeToString(dom)
  }

  // A procedure's NAME field (definitions) / mutation name (call blocks) — read from a
  // block element's DIRECT children so a function body's own blocks aren't mistaken for it.
  function directChildrenByTag (el, tag) {
    var out = []
    var kids = el.children ? Array.prototype.slice.call(el.children) : []
    kids.forEach(function (k) { if (k.tagName && k.tagName.toLowerCase() === tag) out.push(k) })
    return out
  }
  function procDefName (block) {
    var fields = directChildrenByTag(block, 'field')
    for (var i = 0; i < fields.length; i++)
      if (fields[i].getAttribute('name') === 'NAME') return fields[i].textContent
    return null
  }
  function procCallName (block) {
    var muts = directChildrenByTag(block, 'mutation')
    return muts.length ? muts[0].getAttribute('name') : null
  }
  var DEF_TYPES = ['procedures_defnoreturn', 'procedures_defreturn']
  var CALL_TYPES = ['procedures_callnoreturn', 'procedures_callreturn']

  // Keep only the chosen top-level chains (0-based indices and/or block ids) plus any
  // <variables>, so one project can power single- or multi-chain embeds. `sels` is an
  // array of selectors; chains are emitted in source order, with duplicates dropped.
  // Each chain keeps its original x/y, so multiple chains don't overlap.
  //
  // Crucially, a function CALL lives in one chain while its DEFINITION is a separate
  // top-level chain. So after the explicit picks we auto-pull the definitions any chosen
  // chain calls — transitively (a function may call another) — so the author can select
  // just the calling chain and still get a runnable, self-contained embed.
  function selectChain (xmlText, sels) {
    var dom = textToDom(xmlText)
    var kids = Array.prototype.slice.call(dom.children)
    var blocks = kids.filter(function (c) { return c.tagName && c.tagName.toLowerCase() === 'block' })
    var chosen = []
    sels.forEach(function (sel) {
      var b = /^\d+$/.test(sel) ? blocks[parseInt(sel, 10)]
        : blocks.filter(function (x) { return x.getAttribute('id') === sel })[0]
      if (b && chosen.indexOf(b) === -1) chosen.push(b)
    })
    if (!chosen.length) return xmlText      // nothing matched -> render the whole project

    // Map each top-level function definition by name, then walk the chosen chains for
    // call blocks and drag in the definitions they need.
    var defByName = {}
    blocks.forEach(function (b) {
      if (DEF_TYPES.indexOf(b.getAttribute('type')) !== -1) {
        var nm = procDefName(b)
        if (nm != null) defByName[nm] = b
      }
    })
    var queue = chosen.slice()
    while (queue.length) {
      var blk = queue.shift()
      var nested = Array.prototype.slice.call(blk.getElementsByTagName('block'))
      nested.concat(blk).forEach(function (bl) {
        if (CALL_TYPES.indexOf(bl.getAttribute('type')) === -1) return
        var def = defByName[procCallName(bl)]
        if (def && chosen.indexOf(def) === -1) { chosen.push(def); queue.push(def) }
      })
    }
    // Emit in source order so the XML stays tidy (on-canvas position comes from x/y).
    chosen.sort(function (a, b) { return blocks.indexOf(a) - blocks.indexOf(b) })
    var out = textToDom('<xml xmlns="https://developers.google.com/blockly/xml"></xml>')
    kids.forEach(function (c) {
      if (c.tagName && c.tagName.toLowerCase() === 'variables') out.appendChild(c.cloneNode(true))
    })
    chosen.forEach(function (b) { out.appendChild(b.cloneNode(true)) })
    return domToText(out)
  }

  // Fit the blocks to the iframe and center them in the MIDDLE of the frame, rather than
  // leaving them anchored at the top-left. In this Blockly version zoomToFit() sets the
  // scale but anchors top-left, so scrollCenter() afterwards does the actual centering.
  // Re-run on the next animation frame so we don't measure before the iframe has its
  // final size (otherwise the first center can be slightly off).
  function fitAndCenter () {
    var apply = function () {
      try {
        Blockly.svgResize(workspace)
        // zoomToFit()/scrollCenter() refuse to move a non-movable (locked) workspace and
        // log "Tried to move a non-movable workspace". Temporarily report the workspace
        // as movable so we can position the content ONCE, then restore the lock — the
        // user still can't pan/zoom, but the blocks get fitted + centered without warnings.
        var savedIsMovable = workspace.isMovable
        workspace.isMovable = function () { return true }
        try {
          if (workspace.zoomToFit) workspace.zoomToFit()
          if (workspace.scrollCenter) workspace.scrollCenter()
        } finally {
          workspace.isMovable = savedIsMovable
        }
      } catch (e) {}
    }
    apply()
    if (window.requestAnimationFrame) window.requestAnimationFrame(apply)
    else setTimeout(apply, 0)
  }

  // Blockly measures each field's text with getComputedTextLength() during a render
  // pass. If that first pass runs while the iframe is still hidden / zero-size (common
  // when embedded in a lesson page or a dialog) or before fonts settle, the field
  // widths come out too small and the text overflows the block shape. svgResize() does
  // NOT fix this — it resizes the SVG canvas, not the field text. The width cache is
  // per-render-pass (cleared between passes), so forcing a fresh workspace.render()
  // once the frame is actually visible + sized re-measures every field correctly.
  function relayout () {
    try { if (workspace.render) workspace.render() } catch (e) {}
    fitAndCenter()
  }
  // Run cb exactly once, as soon as fonts are ready AND #blocks has a real (nonzero)
  // size — i.e. the workspace is genuinely renderable.
  function whenRenderable (cb) {
    var done = false
    var fire = function () {
      if (done) return true
      if (host.clientWidth > 0 && host.clientHeight > 0) { done = true; cb(); return true }
      return false
    }
    var start = function () {
      if (fire()) return
      if (window.ResizeObserver) {
        var ro = new ResizeObserver(function () { if (fire()) ro.disconnect() })
        ro.observe(host)
      } else {
        var n = 0
        var t = setInterval(function () { if (fire() || ++n > 40) clearInterval(t) }, 50)
      }
    }
    if (document.fonts && document.fonts.ready && document.fonts.ready.then)
      document.fonts.ready.then(start, start)
    else
      start()
  }

  function render (xml) {
    try {
      if (blockSel.length) xml = selectChain(xml, blockSel)
      selectedXml = xml
      workspace.clear()
      Blockly.Xml.domToWorkspace(textToDom(xml), workspace)
      fitAndCenter()
      setupCopy()
      // Re-measure + re-fit once the frame is truly visible/sized and fonts are ready,
      // so field text never stays clipped from a too-early first measurement.
      whenRenderable(relayout)
    } catch (e) {
      console.error('embed: failed to render blocks', e)
      host.innerHTML = '<div id="embed-error">Could not render blocks:\n' + esc(e) + '</div>'
    }
  }

  // Copy button: copies the rendered chain's XML so it can be pasted into BIPES.
  function setupCopy () {
    var btn = document.getElementById('copy-btn')
    if (!btn || !selectedXml) return
    btn.style.display = ''
    btn.onclick = function () {
      var text = selectedXml
      function ok () { var t = btn.textContent; btn.textContent = 'Copied!'; setTimeout(function () { btn.textContent = t }, 1200) }
      if (navigator.clipboard && navigator.clipboard.writeText)
        navigator.clipboard.writeText(text).then(ok).catch(function () { fallbackCopy(text); ok() })
      else { fallbackCopy(text); ok() }
    }
  }
  function fallbackCopy (text) {
    try {
      var ta = document.createElement('textarea')
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
    } catch (e) {}
  }

  function b64ToXml (b64) {
    // decode base64 -> UTF-8 string
    try { return decodeURIComponent(escape(atob(b64))) }
    catch (e) { return atob(b64) }
  }

  // A built-in sample so opening /embed with no params shows that embedding works.
  var SAMPLE =
    '<xml xmlns="https://developers.google.com/blockly/xml">' +
    '  <block type="controls_repeat_ext" x="30" y="30">' +
    '    <value name="TIMES"><shadow type="math_number"><field name="NUM">5</field></shadow></value>' +
    '    <statement name="DO">' +
    '      <block type="text_print">' +
    '        <value name="TEXT"><shadow type="text"><field name="TEXT">Hello from BIPES!</field></shadow></value>' +
    '      </block>' +
    '    </statement>' +
    '  </block>' +
    '</xml>'

  if (uid) {
    // no-store so an edited+re-shared project shows its latest blocks instead of a
    // browser-cached copy of the shared JSON.
    fetch('/api/projects/shared/' + encodeURIComponent(uid), { cache: 'no-store' })
      .then(function (r) { return r.json() })
      .then(function (d) {
        if (d && d.xml) render(d.xml)
        else throw new Error('project has no blocks')
      })
      .catch(function (e) {
        host.innerHTML = '<div id="embed-error">Could not load shared project "' + esc(uid) + '":\n' + esc(e) + '</div>'
      })
  } else if (xmlParam) {
    render(b64ToXml(xmlParam))
  } else {
    render(SAMPLE)
  }

  // Keep the workspace sized to the iframe.
  window.addEventListener('resize', function () { Blockly.svgResize(workspace) })
})()
