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
  var blockParam = params.get('block')          // pick one top-level chain (index or block id)
  var locked = blockParam != null || params.get('lock') === '1'

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

  function textToDom (xml) {
    if (Blockly.utils && Blockly.utils.xml && Blockly.utils.xml.textToDom)
      return Blockly.utils.xml.textToDom(xml)
    return Blockly.Xml.textToDom(xml)   // older API fallback
  }

  function domToText (dom) {
    return Blockly.Xml.domToText ? Blockly.Xml.domToText(dom) : new XMLSerializer().serializeToString(dom)
  }

  // Keep only the chosen top-level chain (0-based index or block id) plus any
  // <variables>, so one project can power several single-chain embeds.
  function selectChain (xmlText, sel) {
    var dom = textToDom(xmlText)
    var kids = Array.prototype.slice.call(dom.children)
    var blocks = kids.filter(function (c) { return c.tagName && c.tagName.toLowerCase() === 'block' })
    var chosen = /^\d+$/.test(sel) ? blocks[parseInt(sel, 10)]
      : blocks.filter(function (b) { return b.getAttribute('id') === sel })[0]
    if (!chosen) return xmlText      // out of range / not found -> render the whole project
    var out = textToDom('<xml xmlns="https://developers.google.com/blockly/xml"></xml>')
    kids.forEach(function (c) {
      if (c.tagName && c.tagName.toLowerCase() === 'variables') out.appendChild(c.cloneNode(true))
    })
    out.appendChild(chosen.cloneNode(true))
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
      if (blockParam != null) xml = selectChain(xml, blockParam)
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
      host.innerHTML = '<div id="embed-error">Could not render blocks:\n' + e + '</div>'
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
        host.innerHTML = '<div id="embed-error">Could not load shared project "' + uid + '":\n' + e + '</div>'
      })
  } else if (xmlParam) {
    render(b64ToXml(xmlParam))
  } else {
    render(SAMPLE)
  }

  // Keep the workspace sized to the iframe.
  window.addEventListener('resize', function () { Blockly.svgResize(workspace) })
})()
