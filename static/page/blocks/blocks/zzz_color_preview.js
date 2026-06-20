// ===========================================================================
// Live colour preview for the RGB colour blocks (color565, neopixel_color_numbers).
//
// Problem: styleBlock() was only called from the Python generator
// (pythonic/displays.js), so a colour block recoloured ONLY when code was being
// generated (the "view generated code" panel open). Changing an R/G/B field did
// nothing to the block in the workspace.
//
// Fix: wrap each block's init() to (a) tint on creation and (b) re-tint on every
// field/connection change via setOnChange — live, no code-gen needed. Hex is
// computed locally (no bipes.page.blocks.convertColor dependency) so it also
// works inside the read-only lesson embeds.
//
// ORDER-INDEPENDENT: concat_files() globs blocks/*.js UNSORTED, so this file can
// be concatenated before st7735s_dsl.js (where color565 is defined). We therefore
// patch on a deferred tick (after the whole bundle has run) and also retro-patch
// any blocks already placed in existing workspaces.
// ===========================================================================
(function () {
  function clamp(n) { n = parseInt(n, 10); return isNaN(n) ? null : Math.max(0, Math.min(255, n)); }
  function hex2(n) { var s = n.toString(16); return s.length < 2 ? '0' + s : s; }
  function rgb2hex(r, g, b) { return '#' + hex2(r) + hex2(g) + hex2(b); }

  // Read the three R/G/B value inputs; only plain math_number children count.
  function readRGB(block, names) {
    var out = [];
    for (var i = 0; i < 3; i++) {
      var t = block.getInputTargetBlock && block.getInputTargetBlock(names[i]);
      out.push(t ? clamp(t.getFieldValue('NUM')) : null);
    }
    return out;
  }

  // Perceived brightness (0-255). >150 -> dark text reads better, else light text.
  function textFor(r, g, b) {
    return (0.299 * r + 0.587 * g + 0.114 * b) > 150 ? '#000000' : '#ffffff';
  }

  // Recolour THIS block's own label text (Color 565 / Color 888 / R / G / B) so it
  // stays readable on the tinted background. Child number blocks keep their own style.
  function setTextFill(block, fill) {
    if (!block.inputList) return;
    block.inputList.forEach(function (input) {
      (input.fieldRow || []).forEach(function (field) {
        var root = field.getSvgRoot && field.getSvgRoot();
        if (!root) return;
        var texts = root.querySelectorAll ? root.querySelectorAll('text') : [];
        if (!texts.length && root.tagName === 'text') texts = [root];
        for (var i = 0; i < texts.length; i++) {
          texts[i].setAttribute('fill', fill);
          if (texts[i].style) texts[i].style.fill = fill;
        }
      });
    });
  }

  // The main block outline path (whose stroke is the border).
  function blockPath(block) {
    if (block.pathObject && block.pathObject.svgPath) return block.pathObject.svgPath;
    var root = block.getSvgRoot && block.getSvgRoot();
    return root ? root.querySelector('.blocklyPath') : null;
  }

  function tint(block, names) {
    try {
      var rgb = readRGB(block, names);
      var valid = rgb[0] != null && rgb[1] != null && rgb[2] != null;
      var hex = valid ? rgb2hex(rgb[0], rgb[1], rgb[2]) : '#5966a6'; // neutral if not plain numbers
      if (block.getColour() !== hex) block.setColour(hex);          // FILL (proven to work)
      // give it a VISIBLE category-coloured border: setColour just made the
      // outline a shade of `hex`, so override stroke to the bright category
      // colour and widen it so it reads clearly against the fill.
      var path = blockPath(block);
      if (path && block.__catBorder) {
        path.setAttribute('stroke', block.__catBorder);
        path.setAttribute('stroke-width', '3');
        if (path.style) { path.style.stroke = block.__catBorder; path.style.strokeWidth = '3px'; }
      }
      setTextFill(block, valid ? textFor(rgb[0], rgb[1], rgb[2]) : '#ffffff');
    } catch (e) { /* ignore */ }
  }

  function attach(block, names) {
    if (block.__livePreviewInst) return;
    block.__livePreviewInst = true;
    // capture the bright category colour BEFORE tinting (getColour() is the
    // category's primary hex while the block still has its category style).
    if (!block.__catBorder) {
      block.__catBorder = (block.getColour && block.getColour()) || null;
    }
    block.setOnChange(function () {
      if (block.workspace && !block.isInFlyout) tint(block, names);
    });
    tint(block, names);
  }

  function enhance(type, names) {
    var def = Blockly.Blocks[type];
    if (!def || def.__livePreview) return;
    def.__livePreview = true;
    var origInit = def.init;
    def.init = function () {                       // future instances
      origInit.call(this);
      attach(this, names);
    };
    def.styleBlock = function () { tint(this, names); };  // keep generator path working
    // retro-patch instances already on existing workspaces
    var all = Blockly.Workspace && Blockly.Workspace.getAll ? Blockly.Workspace.getAll() : [];
    all.forEach(function (ws) {
      var bs = ws.getBlocksByType ? ws.getBlocksByType(type, false) : [];
      bs.forEach(function (b) { attach(b, names); });
    });
  }

  function run() {
    if (typeof Blockly === 'undefined' || !Blockly.Blocks) return;
    enhance('color565', ['r', 'g', 'b']);
    enhance('neopixel_color_numbers', ['red', 'green', 'blue']);
  }

  // Defer: run after the whole (unsorted) bundle has defined every block.
  setTimeout(run, 0);
})();
