# Block Definition DSL — Reference

This document describes the `.blockdef.yaml` file format, the JSON Schema that validates it,
the Python AST produced by parsing, and how the full code-generation pipeline works.

---

## 1. Purpose

A `.blockdef.yaml` file is a **language-agnostic** description of how functions and classes
in a MicroPython library map to **Blockly blocks**.

The MicroPython library file is never read or modified. The `.blockdef.yaml` file is the
single source of truth for the Blockly interface. The pipeline reads it and emits three
artefacts automatically:

| Artefact | Location | Purpose |
|---|---|---|
| Blockly block definitions | `static/page/blocks/blocks/*_dsl.js` | Visual shape of each block in the editor |
| Python code generators | `static/page/blocks/pythonic/*_dsl.js` | JavaScript that converts a placed block back to MicroPython code |
| Toolbox definition | `templates/page/blocks/definitions/*_dsl.md` | Markdown/XML fragment that places blocks in the sidebar toolbox |

### Why YAML and JSON Schema

YAML was chosen over a custom DSL syntax for two reasons:

1. **Live feedback during authoring.** JSON Schema can validate a YAML file structurally
   in editors that support it (missing required fields, wrong block kinds, invalid parameter
   alternatives, incompatible defaults). Errors appear before the generator runs.

2. **Separation of concerns.** The `.blockdef.yaml` file only describes which parts of a
   MicroPython library should be exposed as Blockly blocks. The MicroPython `.py` file
   remains a normal library file that can still be uploaded and used directly on the
   microcontroller. The DSL does not modify or replace the library — it only describes
   its Blockly interface.

---

## 2. Schema and validation

File: `server/dsl/definitions/blockdef_schema.json`

Validation runs in two phases:

| Phase | Tool | What it checks |
|---|---|---|
| 1 — Structural | JSON Schema (Draft 7) | Required fields, allowed properties, valid enum values, mutually exclusive param alternatives, default type compatibility |
| 2 — Semantic | Python AST traversal (`_validate_ast`) | Duplicate names, invalid `__init__` placement, circular output/input types, unresolved type references, `supertype` constraints |

**Rule:** Schema/JSON Schema defines what can be *parsed*. Semantic validation defines
what *makes sense*.

---

## 3. Metamodel

File: `server/dsl/scripts/blockdef_ast.py`

The metamodel is expressed as Python dataclasses. These are the M2-level concepts.
Parsing a `.blockdef.yaml` file produces an **object graph** (the M1 abstract syntax)
of instances of these classes.

### Object graph shape

```
BlockdefFile
 ├─ module        str                       Python module/import name
 ├─ url           str                       help URL ('' if absent)
 ├─ imports       list[ImportSpec]
 │    ├─ module   str
 │    └─ names    list[str]                 empty → "import module"
 └─ categories    list[CategoryDef]
      ├─ name     str
      ├─ color    int | None
      ├─ classes  list[SingletonClassDef | MultipleClassDef]
      │    ├── SingletonClassDef
      │    │    ├─ name           str
      │    │    ├─ instance_name  str | None
      │    │    └─ blocks         list[FunctionBlockDef]
      │    │
      │    └── MultipleClassDef
      │         ├─ name        str
      │         ├─ method_ref  str          "key_input" | "object_input"
      │         └─ blocks      list[FunctionBlockDef]
      │
      └─ blocks   list[FunctionBlockDef]    (top-level, not inside a class)
           ├─ fn           str
           ├─ label        str | None
           ├─ kind         str | None       "value" | "statement" | "hat"
           ├─ inline       bool | None
           ├─ tooltip      str
           ├─ output_type  str | None       Blockly output type (e.g. "Color565")
           ├─ supertype    str | None       e.g. "Number" → setOutput(true, ["Color565","Number"])
           └─ params       list[AnyParamDef]
                ├── ValueParamDef
                │    ├─ name     str
                │    ├─ type     str | list[str] | None
                │    ├─ default  Any
                │    └─ keyword  bool        True → name=value in generated code
                │
                ├── PinParamDef
                │    ├─ name      str
                │    ├─ pin_mode  str        "input" | "output" | "any"
                │    ├─ default   int | None
                │    └─ keyword   bool
                │
                ├── LegacyPinParamDef        passes raw integer, no Pin() wrapping
                │    ├─ name     str
                │    ├─ default  int | None
                │    └─ keyword  bool
                │
                └── DropdownParamDef
                     ├─ name     str
                     ├─ default  str | None
                     └─ options  list[DropdownOption]
                          ├─ label  str      display text
                          └─ value  str      code value
```

### Why separate subclasses instead of a `kind` flag

From `blockdef_ast.py` docstring:
> "Mutually exclusive alternatives (singleton vs multiple, value vs pin vs dropdown) are
> encoded as separate classes rather than mode flags on a shared struct — following the
> MDSD principle that alternatives in a rule generate subclasses in the metamodel."

---

## 4. DSL syntax guide

### Minimal file

```yaml
module: my_lib
imports:
  - my_lib

categories:
  - name: My Library
    color: 120
    blocks:
      - fn: do_something
        tooltip: Does something useful.
```

### Module header

```yaml
module: <identifier>          # becomes source_module_name on every BlockSpec
url: <help_url>               # optional; attached to every block's help button
imports:
  - <python_module>           # simple import: "import <module>"
  - from: <module>            # named import: "from <module> import <names>"
    names: [Name1, Name2]
```

### Standalone function block

```yaml
- fn: <fn_name>
  label: "Human readable label"   # optional
  kind: value | statement | hat   # optional; default: statement
  inline: true | false            # optional
  tooltip: "Shown on hover."      # optional
  params:
    - name: <name>
      type: Number | String | Boolean | Any   # optional
      default: <value>                         # optional
```

### Class block (singleton)

A singleton class creates exactly one instance in the generated code under a fixed name.
`__init__` becomes the constructor block; every other declared function becomes a method block.

```yaml
classes:
  - name: DS1302
    instance_mode: singleton
    instance_name: ds1302       # fixed variable name in generated code
    blocks:
      - fn: __init__
        tooltip: Create a DS1302 RTC instance.
        params:
          - name: clk_pin
            pin_mode: output
          - name: dat_pin
            pin_mode: output
          - name: rst_pin
            pin_mode: output

      - fn: get_time
        kind: value
        tooltip: Read the current time tuple from the RTC.
```

Generated code patterns:
- Constructor: `ds1302 = ds1302.DS1302(clk_pin_X, dat_pin_Y, rst_pin_Z)`
- Method:      `ds1302.get_time()`

### Class block (multiple instances)

Multiple-instance classes track objects in a dict keyed by a numeric `id`.
Each method block automatically receives an `id` input that selects which instance to call.

```yaml
classes:
  - name: Motor
    instance_mode: multiple
    method_ref: key_input       # optional; default: key_input
    blocks:
      - fn: __init__
        params:
          - name: pin
            pin_mode: output

      - fn: set_speed
        kind: statement
        params:
          - name: speed
            type: Number
```

Generated code patterns:
- Constructor: `motor_instances[{id}] = motor.Motor(pin_X)`
- Method:      `motor_instances[{id}].set_speed({speed})`

### Parameter kinds

#### Value parameter

```yaml
- name: count
  type: Number        # Blockly check type; also Number | String | Boolean | Any | custom
  default: 10         # optional; must match type
  keyword: false      # optional; true → name=value in generated Python
```

#### Pin parameter

```yaml
- name: clk_pin
  pin_mode: output    # "input" | "output" | "any"
  default: 18         # optional
  keyword: false
```

The emitter generates `Pin(n, Pin.OUT)` (output), `Pin(n, Pin.IN)` (input), or `Pin(n)` (any).
The variable is hoisted to `definitions_` so it appears once at the top of generated code.

#### Dropdown parameter

```yaml
- name: mode
  options:
    - label: Fast
      value: "fast"
    - label: Slow
      value: "slow"
```

Renders as a `Blockly.FieldDropdown` instead of a value input connector.

### Output type and supertype

```yaml
- fn: color565
  kind: value
  output_type: Color565     # primary Blockly output type
  supertype: Number         # Color565 is also accepted where Number is expected
```

Emits: `this.setOutput(true, ["Color565", "Number"])` — the block satisfies both type checks.

---

## 5. Implementation

### File map

```
server/dsl/
  definitions/
    blockdef_schema.json       JSON Schema — M2 structural validation (Phase 1)
  scripts/
    blockdef_ast.py            Typed dataclasses — M2 metamodel
    blockdef_parser.py         YAML → BlockdefFile AST → BlockSpec list
    model.py                   Shared dataclasses: BlockSpec, InputSpec, ParseResult, …
    emitters.py                BlockSpec → JS / MD text
    python_generator.py        BlockSpec → GeneratorSpec
    toolbox_builder.py         BlockSpec → ToolboxCategory
    builder.py                 humanize_identifier(), snake_case() helpers
    integrate.py               Wires pipeline into one call; registers targets
    pipeline.py                DefaultPipeline (alternative annotation-based approach)
    validation.py              Shared model validation
    scanner.py                 Comment annotation scanner (annotation pipeline)
    extractor.py               Python AST source extractor (annotation pipeline)
    resolver.py                Source metadata resolver (annotation pipeline)

server/dsl/definitions/
  ds1302.blockdef.yaml         Example definition file
  st7735s.blockdef.yaml        Example with custom output type + supertype
  sand_table_robot.blockdef.yaml
```

### Pipeline — step by step

```
.blockdef.yaml file
     │
     ▼
[1] yaml.safe_load()
     │  Reads raw YAML into a Python dict
     │
     ▼
[2] _validate_schema(raw, path, validator)
     │  JSON Schema (Draft 7) structural validation
     │  Rejects: missing fields, unknown keys, invalid enums, wrong param alternatives
     │  Raises BlockdefValidationError on failure
     │
     ▼
[3] _parse_blockdef_file(raw, import_specs)
     │  Builds the BlockdefFile AST (M1 abstract syntax)
     │  raw dict → BlockdefFile(CategoryDef, SingletonClassDef/MultipleClassDef,
     │                          FunctionBlockDef, ValueParamDef/PinParamDef/…)
     │
     ▼
[4] _validate_ast(bdf, path)
     │  Semantic validation on the typed AST
     │  Rejects: duplicate names, __init__ at category level, type mismatches,
     │           invalid supertype use, circular output/input types,
     │           unresolved custom type references
     │
     ▼
[5] BlockdefParser._extract_blocks(bdf)
     │  M1 AST → list[BlockSpec]  (model transformation)
     │  For each CategoryDef:
     │    For each ClassDef → _blocks_from_class()  (constructor first, then methods)
     │    For each top-level FunctionBlockDef → _block_from_fn()
     │
     ▼
[6] SimpleToolboxBuilder.build_toolbox(blocks)
     │  Groups BlockSpec by category name → list[ToolboxCategory]
     │
     ▼
[7] PythonGeneratorBuilder.build_generators(blocks)
     │  Derives a code template string for each block:
     │    Singleton constructor:  "ds1302 = ds1302.DS1302({clk_pin}, …)"
     │    Singleton method:       "ds1302.get_time()"
     │    Multiple constructor:   "motor_instances[{id}] = motor.Motor({pin}, …)"
     │    Multiple method:        "motor_instances[{id}].set_speed({speed})"
     │  Returns list[GeneratorSpec]
     │
     ▼
[8] Emitters
     │
     ├─ emit_blockly_blocks_js(blocks)
     │     Renders each BlockSpec as a Blockly.Blocks["type"] = { init: … } JS object.
     │     Handles label placeholders like "Set {id} speed" → inline value inputs.
     │     Uses definitions_["import_..."] to hoist imports to the top of generated code.
     │
     ├─ emit_python_generators_js(generators, blocks_by_type)
     │     Renders each GeneratorSpec as a Blockly.Python["type"] = function(block) { … }.
     │     Reads each input with valueToCode / getFieldValue depending on InputKind.
     │     Hoists Pin setup, bus objects, and instance registries into definitions_.
     │
     └─ emit_definition_markdown(category, library, blocks)
           Renders the toolbox Markdown/XML fragment.
           Auto-generates shadow (default) blocks per input type:
             Number → math_number, Boolean → logic_boolean, String → text,
             SPI/I2C/UART → pre-filled bus shadow, Pin → pinout shadow.
```

### How _block_from_fn() builds a BlockSpec

```python
BlockSpec(
    type         = "ds1302__get_time_text"   # snake_case(class)__snake_case(fn)
    label        = "Get Time Text"           # fb.label or humanize_identifier(fn_name)
    category     = "DS1302 DSL"              # from CategoryDef.name
    color        = 35                        # from CategoryDef.color
    tooltip      = "Format the current…"     # from fb.tooltip
    help_url     = "https://github.com/…"    # from BlockdefFile.url
    kind         = BlockKind.VALUE           # from fb.kind; constructors are always STATEMENT
    is_constructor_block = False
    inputs_inline = False                    # from fb.inline
    inputs       = [InputSpec(…), …]        # built by _build_inputs_ast()
    source_module_name   = "ds1302"          # from BlockdefFile.module
    source_function_name = "get_time_text"   # from FunctionBlockDef.fn
    source_class_name    = "DS1302"          # from ClassDef.name
    instance_ref         = InstanceReferenceSpec(
                               mode=FIXED_NAME,
                               fixed_instance_name="ds1302"
                           )
    output_type       = None
    output_supertypes = []
)
```

### How _input_from_param_ast() builds an InputSpec

```
ParamDef in YAML               →   InputSpec
─────────────────────────────────────────────────────────────
options: [...]                 →   FIELD_DROPDOWN + options list
pin_mode: output               →   INPUT_VALUE, check_type="Number", pin_mode="output"
pin: true  (legacy)            →   INPUT_VALUE, check_type="Number"  (no Pin() wrapping)
type: Number                   →   INPUT_VALUE, check_type="Number"
type: Boolean, default: true   →   INPUT_VALUE, check_type="Boolean", default_value=True
type: Any / absent             →   INPUT_VALUE, check_type=None
```

### Instance reference modes

| YAML declaration | InstanceReferenceSpec produced | Generated code pattern |
|---|---|---|
| `instance_mode: singleton` + `instance_name: x` | `FIXED_NAME, fixed="x"` | `x.method(…)` |
| `instance_mode: singleton` (no name) | `FIXED_NAME, fixed=None` | `ClassName.method(…)` |
| `instance_mode: multiple` | `KEY_INPUT, key="id"` | `cls_instances[{id}].method(…)` |
| `instance_mode: multiple` + `method_ref: object_input` | `OBJECT_INPUT` | object passed as input connector |

### Registering a new .blockdef.yaml target

In `server/dsl/scripts/integrate.py`, add an entry to `DEFAULT_BLOCKDEF_TARGETS`:

```python
BlockdefTarget(
    blockdef             = "server/dsl/definitions/<name>.blockdef.yaml",
    library_name         = "<import_name>",
    output_block_js      = "static/page/blocks/blocks/<name>_dsl.js",
    output_generator_js  = "static/page/blocks/pythonic/<name>_dsl.js",
    output_definition_md = "templates/page/blocks/definitions/<name>_dsl.md",
    extra_library_names  = ("dep1", "dep2"),   # optional
)
```

---

## 6. Complete example — ds1302.blockdef.yaml

```yaml
module: ds1302
url: "https://github.com/micropython/micropython"
imports:
  - ds1302

categories:
  - name: DS1302 DSL
    color: 35
    classes:
      - name: DS1302
        instance_mode: singleton
        instance_name: ds1302
        blocks:
          - fn: __init__
            tooltip: Create a DS1302 RTC instance.
            params:
              - name: clk_pin
                pin_mode: output
              - name: dat_pin
                pin_mode: output
              - name: rst_pin
                pin_mode: output

          - fn: get_time
            kind: value
            tooltip: Read the current time tuple from the RTC.

          - fn: get_year
            kind: value
            tooltip: Read the current year from the RTC.

          - fn: get_time_text
            kind: value
            tooltip: Format the current time as text.
            params:
              - name: show_seconds
                type: Boolean
                default: true

          - fn: set_time
            tooltip: Set the RTC date and time.
            params:
              - name: year
                type: Number
              - name: month
                type: Number
              - name: day
                type: Number
              - name: hour
                type: Number
              - name: minute
                type: Number
              - name: second
                type: Number
```

This single file produces:

- Blockly block definitions (one per fn)
- Python code generators with correct singleton instance references
- A toolbox markdown with `pinout` shadows on pin inputs and typed shadows elsewhere
