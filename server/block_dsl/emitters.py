from __future__ import annotations

import json
import re

from .builder import humanize_identifier, snake_case
from .model import BlockKind, BlockSpec, GeneratorSpec, InputKind, InputSpec
from .model import MethodInstanceMode

_PLACEHOLDER_RE = re.compile(r"\{([A-Za-z_][A-Za-z0-9_]*)\}")


def _num_str(value) -> str:
    """Render a numeric default without a spurious ".0". textX's FLOAT base type
    matches plain integers, so `default=8` parses to 8.0; emitting "8.0" into a
    `pinout` shadow (a dropdown whose options are integer pin numbers) makes the
    option unavailable and Blockly throws "Could not connect shadow block". Whole
    floats therefore become ints; genuine decimals (31.0 -> "31", 2.5 -> "2.5") keep
    their value."""
    if isinstance(value, bool):
        return str(value)
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return str(value)


def _label_key(text: str) -> str:
    """Stable Blockly.Msg key for a block label (dedups identical labels)."""
    key = re.sub(r"[^0-9A-Za-z]+", "_", text or "").strip("_").upper()
    return f"BLBL_{key}" if key else ""


def _label_js(text: str) -> str:
    """JS expression that translates a block label via Blockly.Msg, falling back to
    the English literal. Renders identically until a translation key is supplied, so
    it never regresses an untranslated label."""
    key = _label_key(text)
    if not key:
        return json.dumps(text)
    return f"(Blockly.Msg[{json.dumps(key)}]||{json.dumps(text)})"


def _tooltip_js(block_type: str, tooltip: str) -> str:
    """Same idea for tooltips, keyed per block type (BTIP_<type>)."""
    if not tooltip:
        return json.dumps(tooltip)
    key = "BTIP_" + re.sub(r"[^0-9A-Za-z]+", "_", block_type).strip("_").upper()
    return f"(Blockly.Msg[{json.dumps(key)}]||{json.dumps(tooltip)})"


def emit_blockly_blocks_js(blocks: list[BlockSpec]) -> str:
    chunks: list[str] = []
    for block in blocks:
        body = _emit_block_definition(block)
        chunks.append(
            f'Blockly.Blocks["{block.type}"] = {{\n'
            f'  init: function() {{\n{body}'
            f'  }}\n'
            f'}};\n'
        )
    return "\n".join(chunks)


def emit_python_generators_js(generators: list[GeneratorSpec], blocks_by_type: dict[str, BlockSpec]) -> str:
    chunks: list[str] = []
    for generator in generators:
        block = blocks_by_type[generator.block_type]
        chunks.append(_emit_python_generator(block, generator))
    return "\n\n".join(chunks) + ("\n" if chunks else "")


# Translatable display labels for DSL toolbox categories. The "# heading" stays the
# untranslated category_name (it is the toolbox-assembly key matched against the device
# .md, e.g. PicoW.md); only the <category name>/<label> DISPLAY uses a %{KEY} token that
# the client resolves via Blockly.Msg (keys live in static/msg/<lang>.js). Product /
# hardware names (DFPlayer, DS1302, ST7735S) intentionally stay English.
CATEGORY_DISPLAY_LABELS = {
    "Alarm Clock": "%{CAT_ALARM_CLOCK}",
    "App Core": "%{CAT_APP_CORE}",
    "Buttons": "%{CAT_BUTTONS}",
    "Buzzer Music": "%{CAT_BUZZER_MUSIC}",
    "NeoPixel Strip": "%{CAT_NEOPIXEL_STRIP}",
    "Sand Drawing Machine": "%{CAT_SAND_ROBOT}",
    "Ultrasonic": "%{CAT_ULTRASONIC}",
    "Robotics Board": "%{CAT_ROBOTICS_BOARD}",
}


def emit_definition_markdown(
    category_name: str,
    library_name: str,
    blocks: list[BlockSpec],
    extra_library_names: tuple[str, ...] = (),
) -> str:
    library_names = (library_name, *extra_library_names)
    # Carry the category colour onto the toolbox <category> so it gets a colour strip
    # (matching the blocks), like the hand-written categories.
    color = next((b.color for b in blocks if b.color is not None), None)
    # Heading stays the key; display name is translatable where mapped.
    display = CATEGORY_DISPLAY_LABELS.get(category_name, category_name)
    cat_open = f'<category name="{display}"' + (f' colour="{color}"' if color is not None else "") + ">"
    lines = [
        f"# {category_name}",
        cat_open,
        f'<label text="{display}"></label>',
    ]
    for name in library_names:
        lines.append(f'<button text="%{{INSTALL_LIBRARY}}: {name}" callbackKey="installPyLib"></button>')
    lines.append("")
    for block in blocks:
        lines.append(f"# {block.type}")
        lines.append(f'<block type="{block.type}">')
        for input_spec in block.inputs:
            shadow = _shadow_for_input(input_spec)
            if shadow:
                lines.extend([
                    f'  <value name="{input_spec.name}">',
                    shadow,
                    '  </value>',
                ])
        lines.append("</block>")
        lines.append("")
    return "\n".join(lines).strip() + "\n"


def _emit_block_definition(block: BlockSpec) -> str:
    lines: list[str] = []
    for snippet in _emit_label_inputs(block):
        lines.append(f"    {snippet}")

    if block.kind == BlockKind.VALUE:
        lines.append("    this.setOutput(true, null);")
    else:
        lines.append("    this.setPreviousStatement(true, null);")
        lines.append("    this.setNextStatement(true, null);")

    lines.append(f"    this.setColour({block.color if block.color is not None else 230});")
    lines.append(f"    this.setInputsInline({str(block.inputs_inline).lower()});")
    lines.append(f"    this.setTooltip({_tooltip_js(block.type, block.tooltip)});")
    lines.append(f"    this.setHelpUrl({json.dumps(block.help_url or '')});")
    return "\n".join(lines) + "\n"


def _emit_label_inputs(block: BlockSpec) -> list[str]:
    inputs_by_name = {inp.name: inp for inp in block.inputs}
    used_inputs: set[str] = set()
    tokens: list[tuple[str, str]] = []
    cursor = 0
    for match in _PLACEHOLDER_RE.finditer(block.label):
        if match.start() > cursor:
            tokens.append(("text", block.label[cursor:match.start()]))
        tokens.append(("placeholder", match.group(1)))
        cursor = match.end()
    if cursor < len(block.label):
        tokens.append(("text", block.label[cursor:]))

    emitted: list[str] = []
    pending_text = ""
    for token_type, value in tokens:
        if token_type == "text":
            pending_text += value
            continue

        input_spec = inputs_by_name[value]
        used_inputs.add(input_spec.name)
        if input_spec.input_kind == InputKind.INPUT_VALUE:
            stmt = f'this.appendValueInput("{input_spec.name}")'
            if input_spec.check_type:
                stmt += f'.setCheck("{input_spec.check_type}")'
            if pending_text.strip():
                stmt += f'.appendField({_label_js(pending_text.strip())})'
            emitted.append(stmt + ";")
        elif input_spec.input_kind == InputKind.FIELD_DROPDOWN:
            options = json.dumps([[label, val] for label, val in input_spec.options])
            label = pending_text.strip()
            emitted.append(
                'this.appendDummyInput()'
                + (f'.appendField({_label_js(label)})' if label else "")
                + f'.appendField(new Blockly.FieldDropdown({options}), "{input_spec.name}");'
            )
        elif input_spec.input_kind == InputKind.VARIABLE:
            label = pending_text.strip()
            default_name = input_spec.name
            emitted.append(
                'this.appendDummyInput()'
                + (f'.appendField({_label_js(label)})' if label else "")
                + f'.appendField(new Blockly.FieldVariable({json.dumps(default_name)}), "{input_spec.name}");'
            )
        else:
            label = pending_text.strip()
            default_value = "" if input_spec.default_value is None else str(input_spec.default_value)
            emitted.append(
                'this.appendDummyInput()'
                + (f'.appendField({_label_js(label)})' if label else "")
                + f'.appendField(new Blockly.FieldTextInput({json.dumps(default_value)}), "{input_spec.name}");'
            )
        pending_text = ""

    if pending_text.strip():
        emitted.append(f'this.appendDummyInput().appendField({_label_js(pending_text.strip())});')

    for input_spec in block.inputs:
        if input_spec.name in used_inputs:
            continue
        emitted.append(_emit_unplaced_input(input_spec))

    if not emitted:
        emitted.append(f'this.appendDummyInput().appendField({_label_js(block.label)});')
    return emitted


def _emit_unplaced_input(input_spec: InputSpec) -> str:
    field_label = "ID #" if input_spec.name == "id" else humanize_identifier(input_spec.name)
    if input_spec.input_kind == InputKind.INPUT_VALUE:
        stmt = f'this.appendValueInput("{input_spec.name}")'
        if input_spec.check_type:
            stmt += f'.setCheck("{input_spec.check_type}")'
        stmt += f'.appendField({_label_js(field_label)})'
        return stmt + ";"

    if input_spec.input_kind == InputKind.FIELD_DROPDOWN:
        options = json.dumps([[label, val] for label, val in input_spec.options])
        return (
            'this.appendDummyInput()'
            + f'.appendField({_label_js(field_label)})'
            + f'.appendField(new Blockly.FieldDropdown({options}), "{input_spec.name}");'
        )

    if input_spec.input_kind == InputKind.VARIABLE:
        default_name = input_spec.name
        return (
            'this.appendDummyInput()'
            + f'.appendField({_label_js(field_label)})'
            + f'.appendField(new Blockly.FieldVariable({json.dumps(default_name)}), "{input_spec.name}");'
        )

    default_value = "" if input_spec.default_value is None else str(input_spec.default_value)
    return (
        'this.appendDummyInput()'
        + f'.appendField({_label_js(field_label)})'
        + f'.appendField(new Blockly.FieldTextInput({json.dumps(default_value)}), "{input_spec.name}");'
    )


def _emit_python_generator(block: BlockSpec, generator: GeneratorSpec) -> str:
    lines = [
        f'Blockly.Python["{block.type}"] = function(block) {{',
        f'  Blockly.Python.definitions_[{json.dumps("import_" + generator.source_module_name)}] = {json.dumps("import " + generator.source_module_name)};',
    ]
    if block.instance_ref and block.instance_ref.mode == MethodInstanceMode.KEY_INPUT:
        registry_name = f'{snake_case(block.source_class_name or "instance")}_instances'
        lines.append(
            f'  Blockly.Python.definitions_[{json.dumps("registry_" + registry_name)}] = {json.dumps(registry_name + " = {}")};'
        )

    for input_spec in block.inputs:
        lines.extend(_emit_python_input_read(input_spec))

    code_expression = _template_to_js_expression(generator.template, block.inputs) + ' + "\\n"'
    lines.append(f"  var code = {code_expression};")

    if block.kind == BlockKind.VALUE:
        lines.append("  return [code.trimEnd(), Blockly.Python.ORDER_NONE];")
    else:
        lines.append("  return code;")
    lines.append("};")
    return "\n".join(lines)


def _template_to_js_expression(template: str, inputs: list[InputSpec]) -> str:
    names = {inp.name for inp in inputs}
    parts: list[str] = []
    cursor = 0
    for match in _PLACEHOLDER_RE.finditer(template):
        if match.start() > cursor:
            parts.append(json.dumps(template[cursor:match.start()]))
        placeholder = match.group(1)
        parts.append(placeholder if placeholder in names else json.dumps(match.group(0)))
        cursor = match.end()
    if cursor < len(template):
        parts.append(json.dumps(template[cursor:]))
    return " + ".join(parts) if parts else json.dumps(template)


def _emit_python_input_read(input_spec) -> list[str]:
    if input_spec.input_kind == InputKind.INPUT_VALUE:
        return [
            f'  var {input_spec.name} = Blockly.Python.valueToCode(block, {json.dumps(input_spec.name)}, Blockly.Python.ORDER_ATOMIC);'
        ]
    if input_spec.input_kind == InputKind.FIELD_DROPDOWN:
        value = f'block.getFieldValue({json.dumps(input_spec.name)})'
        if input_spec.check_type == "Number":
            return [f"  var {input_spec.name} = String(Number({value}));"]
        return [f"  var {input_spec.name} = JSON.stringify({value});"]
    if input_spec.input_kind == InputKind.VARIABLE:
        return [
            "  $ = Blockly.internal_;",
            f"  var {input_spec.name} = $.Blockly.Python.nameDB_.getName(block.getFieldValue({json.dumps(input_spec.name)}), $.module$exports$Blockly$Names.NameType.VARIABLE);",
        ]
    raw = f'block.getFieldValue({json.dumps(input_spec.name)})'
    if input_spec.check_type == "Number":
        return [f"  var {input_spec.name} = String(Number({raw}));"]
    return [f"  var {input_spec.name} = JSON.stringify({raw});"]


def _shadow_for_input(input_spec) -> str | None:
    if input_spec.input_kind != InputKind.INPUT_VALUE:
        return None

    if _is_pin_sequence_input(input_spec):
        values = input_spec.default_value if isinstance(input_spec.default_value, (list, tuple)) else [None, None, None, None]
        return _shadow_for_sequence(values, pin_items=True)

    if _is_pin_input(input_spec):
        return _shadow_for_pin(input_spec.default_value)

    if input_spec.check_type == "Boolean" or isinstance(input_spec.default_value, bool):
        field = "TRUE" if bool(input_spec.default_value) else "FALSE"
        return (
            '    <shadow type="logic_boolean">\n'
            f'      <field name="BOOL">{field}</field>\n'
            '    </shadow>'
        )

    if isinstance(input_spec.default_value, (list, tuple)):
        return _shadow_for_sequence(input_spec.default_value)

    if input_spec.check_type == "Number" or isinstance(input_spec.default_value, (int, float)):
        value = "0" if input_spec.default_value is None else _num_str(input_spec.default_value)
        return (
            '    <shadow type="math_number">\n'
            f'      <field name="NUM">{value}</field>\n'
            '    </shadow>'
        )

    text = "" if input_spec.default_value is None else str(input_spec.default_value)
    return (
        '    <shadow type="text">\n'
        f'      <field name="TEXT">{text}</field>\n'
        '    </shadow>'
    )


def _shadow_for_sequence(values, pin_items: bool = False) -> str:
    lines = [
        '    <shadow type="lists_create_with">',
        f'      <mutation items="{len(values)}"></mutation>',
    ]
    for idx, value in enumerate(values):
        lines.append(f'      <value name="ADD{idx}">')
        if pin_items:
            pin_value = "0" if value is None else _num_str(value)
            lines.extend([
                '        <shadow type="pinout">',
                f'          <field name="PIN">{pin_value}</field>',
                '        </shadow>',
            ])
        elif isinstance(value, bool):
            field = "TRUE" if value else "FALSE"
            lines.extend([
                '        <shadow type="logic_boolean">',
                f'          <field name="BOOL">{field}</field>',
                '        </shadow>',
            ])
        elif isinstance(value, (int, float)):
            lines.extend([
                '        <shadow type="math_number">',
                f'          <field name="NUM">{_num_str(value)}</field>',
                '        </shadow>',
            ])
        else:
            lines.extend([
                '        <shadow type="text">',
                f'          <field name="TEXT">{value}</field>',
                '        </shadow>',
            ])
        lines.append('      </value>')
    lines.append('    </shadow>')
    return "\n".join(lines)


def _shadow_for_pin(default_value=None) -> str:
    pin_value = "0" if default_value is None else _num_str(default_value)
    return (
        '    <shadow type="pinout">\n'
        f'      <field name="PIN">{pin_value}</field>\n'
        '    </shadow>'
    )


def _is_pin_input(input_spec: InputSpec) -> bool:
    # Honour the explicit `pin` keyword from the .blockdef first. Then a TIGHT name
    # match — exact "pin"/"sda"/"scl" or a "*_pin" / "pin_*" suffix/prefix. The old
    # loose `"pin" in name` matched "looping" (-> a pinout shadow with "True" that
    # crashed the flyout), so don't do substring matching.
    if getattr(input_spec, "is_pin", False):
        return True
    name = input_spec.name.lower()
    if name in {"pin", "sda", "scl"}:
        return True
    return name.endswith("_pin") or name.startswith("pin_")


def _is_pin_sequence_input(input_spec: InputSpec) -> bool:
    return "pins" in input_spec.name.lower()
