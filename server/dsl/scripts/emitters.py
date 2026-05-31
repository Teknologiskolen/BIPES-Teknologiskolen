from __future__ import annotations

import json
import re

from .builder import humanize_identifier, snake_case
from .model import BlockKind, BlockSpec, GeneratorSpec, InputKind, InputSpec
from .model import MethodInstanceMode

_PLACEHOLDER_RE = re.compile(r"\{([A-Za-z_][A-Za-z0-9_]*)\}")

# Nested shadow XML for built-in machine bus types (hand-written blocks in communication.js).
# These are used when a YAML param declares type: SPI / I2C / UART so the toolbox
# shows a pre-filled bus block as the default input — same as pinout shadows for pins.
_BUILTIN_SHADOW_BLOCKS: dict[str, str] = {
    "SPI": (
        '    <shadow type="spi">\n'
        '      <field name="firstbit">MSB</field>\n'
        '      <value name="id"><shadow type="math_number"><field name="NUM">0</field></shadow></value>\n'
        '      <value name="baudrate"><shadow type="math_number"><field name="NUM">1000000</field></shadow></value>\n'
        '      <value name="polarity"><shadow type="math_number"><field name="NUM">0</field></shadow></value>\n'
        '      <value name="phase"><shadow type="math_number"><field name="NUM">0</field></shadow></value>\n'
        '      <value name="bits"><shadow type="math_number"><field name="NUM">8</field></shadow></value>\n'
        '      <value name="sck"><shadow type="math_number"><field name="NUM">18</field></shadow></value>\n'
        '      <value name="mosi"><shadow type="math_number"><field name="NUM">19</field></shadow></value>\n'
        '      <value name="miso"><shadow type="math_number"><field name="NUM">16</field></shadow></value>\n'
        '    </shadow>'
    ),
    "I2C": (
        '    <shadow type="i2_c">\n'
        '      <value name="id"><shadow type="math_number"><field name="NUM">0</field></shadow></value>\n'
        '      <value name="sda"><shadow type="math_number"><field name="NUM">8</field></shadow></value>\n'
        '      <value name="scl"><shadow type="math_number"><field name="NUM">9</field></shadow></value>\n'
        '      <value name="freq"><shadow type="math_number"><field name="NUM">400000</field></shadow></value>\n'
        '    </shadow>'
    ),
    "UART": (
        '    <shadow type="uart">\n'
        '      <field name="parity">NONE</field>\n'
        '      <value name="id"><shadow type="math_number"><field name="NUM">1</field></shadow></value>\n'
        '      <value name="baudrate"><shadow type="math_number"><field name="NUM">9600</field></shadow></value>\n'
        '      <value name="bits"><shadow type="math_number"><field name="NUM">8</field></shadow></value>\n'
        '      <value name="stop"><shadow type="math_number"><field name="NUM">1</field></shadow></value>\n'
        '      <value name="tx"><shadow type="math_number"><field name="NUM">4</field></shadow></value>\n'
        '      <value name="rx"><shadow type="math_number"><field name="NUM">5</field></shadow></value>\n'
        '      <value name="timeout"><shadow type="math_number"><field name="NUM">0</field></shadow></value>\n'
        '      <value name="timeout_char"><shadow type="math_number"><field name="NUM">0</field></shadow></value>\n'
        '    </shadow>'
    ),
}


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


def emit_definition_markdown(
    category_name: str,
    library_name: str,
    blocks: list[BlockSpec],
    extra_library_names: tuple[str, ...] = (),
) -> str:
    library_names = tuple(n for n in (library_name, *extra_library_names) if n)
    # Build a registry of output_type → BlockSpec for value blocks defined in this file.
    # Used to auto-generate nested shadow blocks for custom types (e.g. Color565).
    type_registry: dict[str, BlockSpec] = {
        block.output_type: block
        for block in blocks
        if block.kind == BlockKind.VALUE and block.output_type
    }
    lines = [
        f"# {category_name}",
        f'<category name="{category_name}">',
        f'<label text="{category_name}"></label>',
    ]
    for name in library_names:
        lines.append(f'<button text="%{{INSTALL_LIBRARY}}: {name}" callbackKey="installPyLib"></button>')
    lines.append("")
    for block in blocks:
        lines.append(f"# {block.type}")
        lines.append(f'<block type="{block.type}">')
        for input_spec in block.inputs:
            shadow = _shadow_for_input(input_spec, type_registry)
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
        if block.output_supertypes:
            # [primary_type, ...supertypes] — block satisfies all listed types in Blockly
            all_types = [block.output_type] + block.output_supertypes if block.output_type else block.output_supertypes
            out_type = json.dumps(all_types)
        else:
            out_type = json.dumps(block.output_type) if block.output_type else "null"
        lines.append(f"    this.setOutput(true, {out_type});")
    else:
        lines.append("    this.setPreviousStatement(true, null);")
        lines.append("    this.setNextStatement(true, null);")

    lines.append(f"    this.setColour({block.color if block.color is not None else 230});")
    lines.append(f"    this.setInputsInline({str(block.inputs_inline).lower()});")
    lines.append(f"    this.setTooltip({json.dumps(block.tooltip)});")
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
                stmt += f'.setCheck({json.dumps(input_spec.check_type)})'
            if pending_text.strip():
                stmt += f'.appendField({json.dumps(pending_text.strip())})'
            emitted.append(stmt + ";")
        elif input_spec.input_kind == InputKind.FIELD_DROPDOWN:
            options = json.dumps([[label, val] for label, val in input_spec.options])
            label = pending_text.strip() + (" " if pending_text.strip() else "")
            emitted.append(
                'this.appendDummyInput()'
                + (f'.appendField({json.dumps(label)})' if label else "")
                + f'.appendField(new Blockly.FieldDropdown({options}), "{input_spec.name}");'
            )
        elif input_spec.input_kind == InputKind.VARIABLE:
            label = pending_text.strip() + (" " if pending_text.strip() else "")
            default_name = input_spec.name
            emitted.append(
                'this.appendDummyInput()'
                + (f'.appendField({json.dumps(label)})' if label else "")
                + f'.appendField(new Blockly.FieldVariable({json.dumps(default_name)}), "{input_spec.name}");'
            )
        else:
            label = pending_text.strip() + (" " if pending_text.strip() else "")
            default_value = "" if input_spec.default_value is None else str(input_spec.default_value)
            emitted.append(
                'this.appendDummyInput()'
                + (f'.appendField({json.dumps(label)})' if label else "")
                + f'.appendField(new Blockly.FieldTextInput({json.dumps(default_value)}), "{input_spec.name}");'
            )
        pending_text = ""

    if pending_text.strip():
        emitted.append(f'this.appendDummyInput().appendField({json.dumps(pending_text.strip())});')

    for input_spec in block.inputs:
        if input_spec.name in used_inputs:
            continue
        emitted.append(_emit_unplaced_input(input_spec))

    if not emitted:
        emitted.append(f'this.appendDummyInput().appendField({json.dumps(block.label)});')
    return emitted


def _emit_unplaced_input(input_spec: InputSpec) -> str:
    field_label = "ID #" if input_spec.name == "id" else humanize_identifier(input_spec.name)
    if input_spec.input_kind == InputKind.INPUT_VALUE:
        stmt = f'this.appendValueInput("{input_spec.name}")'
        if input_spec.check_type:
            stmt += f'.setCheck({json.dumps(input_spec.check_type)})'
        stmt += f'.appendField({json.dumps(field_label)})'
        return stmt + ";"

    if input_spec.input_kind == InputKind.FIELD_DROPDOWN:
        options = json.dumps([[label, val] for label, val in input_spec.options])
        return (
            'this.appendDummyInput()'
            + f'.appendField({json.dumps(field_label)})'
            + f'.appendField(new Blockly.FieldDropdown({options}), "{input_spec.name}");'
        )

    if input_spec.input_kind == InputKind.VARIABLE:
        default_name = input_spec.name
        return (
            'this.appendDummyInput()'
            + f'.appendField({json.dumps(field_label)})'
            + f'.appendField(new Blockly.FieldVariable({json.dumps(default_name)}), "{input_spec.name}");'
        )

    default_value = "" if input_spec.default_value is None else str(input_spec.default_value)
    return (
        'this.appendDummyInput()'
        + f'.appendField({json.dumps(field_label)})'
        + f'.appendField(new Blockly.FieldTextInput({json.dumps(default_value)}), "{input_spec.name}");'
    )


def _emit_python_generator(block: BlockSpec, generator: GeneratorSpec) -> str:
    lines = [
        f'Blockly.Python["{block.type}"] = function(block) {{',
    ]
    if block.import_specs:
        for spec in block.import_specs:
            lines.append(
                f'  Blockly.Python.definitions_[{json.dumps(spec.definition_key())}] = {json.dumps(spec.to_python())};'
            )
    else:
        lines.append(
            f'  Blockly.Python.definitions_[{json.dumps("import_" + generator.source_module_name)}] = {json.dumps("import " + generator.source_module_name)};'
        )
    if block.instance_ref and block.instance_ref.mode == MethodInstanceMode.KEY_INPUT:
        registry_name = f'{snake_case(block.source_class_name or "instance")}_instances'
        lines.append(
            f'  Blockly.Python.definitions_[{json.dumps("registry_" + registry_name)}] = {json.dumps(registry_name + " = {}")};'
        )

    if any(inp.pin_mode for inp in block.inputs):
        lines.append(
            '  Blockly.Python.definitions_["import_machine_Pin"] = "from machine import Pin";'
        )

    for input_spec in block.inputs:
        lines.extend(_emit_python_input_read(input_spec))

    # Bus value blocks (SPI/I2C/UART): hoist the object creation to definitions_
    # and return just the variable name so it can be snapped into other blocks.
    is_bus_block = (
        block.kind == BlockKind.VALUE
        and any(inp.keyword for inp in block.inputs)
    )

    if is_bus_block:
        call_expr = _template_to_js_expression(generator.template, block.inputs)
        # Use the first non-keyword positional input (the bus ID) as the key
        id_inp = next(
            (inp for inp in block.inputs
             if not inp.keyword and not inp.is_instance_selector
             and inp.input_kind == InputKind.INPUT_VALUE),
            None,
        )
        fn_lower = generator.source_function_name.lower()
        var_prefix = json.dumps(fn_lower + "_")
        def_prefix = json.dumps("bus_" + fn_lower + "_")
        if id_inp:
            id_js = id_inp.name
            lines.append(f'  var _bus_key = {id_js}.replace(/[^a-zA-Z0-9_]/g, "");')
            lines.append(f'  var _bus_var = {var_prefix} + _bus_key;')
            lines.append(f'  Blockly.Python.definitions_[{def_prefix} + _bus_key] = _bus_var + " = " + {call_expr};')
        else:
            fixed_var = json.dumps(fn_lower + "_bus")
            fixed_key = json.dumps("bus_" + fn_lower)
            lines.append(f'  var _bus_var = {fixed_var};')
            lines.append(f'  Blockly.Python.definitions_[{fixed_key}] = _bus_var + " = " + {call_expr};')
        lines.append('  var code = _bus_var;')
        lines.append('  return [code, Blockly.Python.ORDER_NONE];')
    elif block.kind == BlockKind.VALUE:
        code_expression = _template_to_js_expression(generator.template, block.inputs) + ' + "\\n"'
        lines.append(f"  var code = {code_expression};")
        lines.append("  return [code.trimEnd(), Blockly.Python.ORDER_NONE];")
    else:
        code_expression = _template_to_js_expression(generator.template, block.inputs) + ' + "\\n"'
        lines.append(f"  var code = {code_expression};")
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
        if input_spec.pin_mode:
            # Pre-create the Pin object as a named variable in definitions_ so that
            # the generated Python reads e.g. "clk_pin_1 = Pin(1, Pin.OUT)" at the
            # top of the file and the constructor call uses the variable name.
            name = input_spec.name
            raw = f"{name}_raw"
            key = f"{name}_key"
            if input_spec.pin_mode == "output":
                pin_tail = json.dumps(", Pin.OUT)")
            elif input_spec.pin_mode == "input":
                pin_tail = json.dumps(", Pin.IN)")
            else:
                pin_tail = json.dumps(")")
            return [
                f'  var {raw} = Blockly.Python.valueToCode(block, {json.dumps(name)}, Blockly.Python.ORDER_ATOMIC);',
                f'  var {key} = {raw}.replace(/[^a-zA-Z0-9_]/g, "");',
                f'  var {name} = {json.dumps(name + "_")} + {key};',
                f'  Blockly.Python.definitions_[{json.dumps("pin_" + name + "_")} + {key}] = {name} + " = Pin(" + {raw} + {pin_tail};',
            ]
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


def _shadow_for_input(input_spec, type_registry: dict | None = None) -> str | None:
    if input_spec.input_kind != InputKind.INPUT_VALUE:
        return None

    if _is_pin_sequence_input(input_spec):
        values = input_spec.default_value if isinstance(input_spec.default_value, (list, tuple)) else [None, None, None, None]
        return _shadow_for_sequence(values, pin_items=True)

    if _is_pin_input(input_spec):
        return _shadow_for_pin(input_spec.default_value)

    # For list types use the first entry to decide shadow kind
    check = input_spec.check_type
    primary = check[0] if isinstance(check, list) else check

    # Explicit types take priority — never let default_value override the declared type.
    if primary == "Boolean":
        field = "TRUE" if bool(input_spec.default_value) else "FALSE"
        return (
            '    <shadow type="logic_boolean">\n'
            f'      <field name="BOOL">{field}</field>\n'
            '    </shadow>'
        )
    if primary == "Number":
        value = 0 if input_spec.default_value is None else input_spec.default_value
        return (
            '    <shadow type="math_number">\n'
            f'      <field name="NUM">{value}</field>\n'
            '    </shadow>'
        )
    if primary == "String":
        text = "" if input_spec.default_value is None else str(input_spec.default_value)
        return (
            '    <shadow type="text">\n'
            f'      <field name="TEXT">{text}</field>\n'
            '    </shadow>'
        )

    # Custom / platform types (e.g. SPI, Color565).
    if primary in _BUILTIN_SHADOW_BLOCKS:
        return _BUILTIN_SHADOW_BLOCKS[primary]
    if type_registry and primary in type_registry:
        return _make_block_shadow(type_registry[primary])

    # No type constraint or unresolved custom type: infer from default, then fall back to 0.
    if isinstance(input_spec.default_value, bool):
        field = "TRUE" if input_spec.default_value else "FALSE"
        return (
            '    <shadow type="logic_boolean">\n'
            f'      <field name="BOOL">{field}</field>\n'
            '    </shadow>'
        )
    if isinstance(input_spec.default_value, (list, tuple)):
        return _shadow_for_sequence(input_spec.default_value)
    value = 0 if input_spec.default_value is None else input_spec.default_value
    return (
        '    <shadow type="math_number">\n'
        f'      <field name="NUM">{value}</field>\n'
        '    </shadow>'
    )


def _make_block_shadow(block: "BlockSpec", _visiting: frozenset[str] = frozenset()) -> str:
    """Generate a nested <shadow> for a YAML-defined value block (e.g. color565)."""
    if block.type in _visiting:
        return f'    <shadow type="{block.type}"></shadow>'
    _visiting = _visiting | {block.type}
    lines = [f'    <shadow type="{block.type}">']
    for inp in block.inputs:
        if inp.input_kind != InputKind.INPUT_VALUE:
            continue
        child = _inline_shadow(inp)
        if child:
            lines.append(f'      <value name="{inp.name}">{child}</value>')
    lines.append('    </shadow>')
    return "\n".join(lines)


def _inline_shadow(inp) -> str | None:
    """One-line shadow element for use inside a nested shadow block."""
    check = inp.check_type
    primary = check[0] if isinstance(check, list) else check
    if primary == "Number" or isinstance(inp.default_value, (int, float)):
        value = 0 if inp.default_value is None else inp.default_value
        return f'<shadow type="math_number"><field name="NUM">{value}</field></shadow>'
    if primary == "String":
        text = "" if inp.default_value is None else str(inp.default_value)
        return f'<shadow type="text"><field name="TEXT">{text}</field></shadow>'
    if primary == "Boolean" or isinstance(inp.default_value, bool):
        field = "TRUE" if bool(inp.default_value) else "FALSE"
        return f'<shadow type="logic_boolean"><field name="BOOL">{field}</field></shadow>'
    return None


def _shadow_for_sequence(values, pin_items: bool = False) -> str:
    lines = [
        '    <shadow type="lists_create_with">',
        f'      <mutation items="{len(values)}"></mutation>',
    ]
    for idx, value in enumerate(values):
        lines.append(f'      <value name="ADD{idx}">')
        if pin_items:
            pin_value = "0" if value is None else str(value)
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
                f'          <field name="NUM">{value}</field>',
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
    pin_value = "0" if default_value is None else str(default_value)
    return (
        '    <shadow type="pinout">\n'
        f'      <field name="PIN">{pin_value}</field>\n'
        '    </shadow>'
    )


def _is_pin_input(input_spec: InputSpec) -> bool:
    if input_spec.pin_mode:
        return True
    name = input_spec.name.lower()
    pin_aliases = {"sda", "scl"}
    return ("pin" in name and "pins" not in name) or name in pin_aliases


def _is_pin_sequence_input(input_spec: InputSpec) -> bool:
    return "pins" in input_spec.name.lower()
