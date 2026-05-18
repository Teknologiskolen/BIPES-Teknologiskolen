# Block Definition DSL — Reference

This document describes the `.blockdef` file format, the textX grammar that defines it,
the Python metamodel produced by parsing, and how the full code-generation pipeline works.

---

## 1. Purpose

A `.blockdef` file is a **language-agnostic** description of how functions and classes in
any source file (MicroPython, C, JavaScript, …) map to **Blockly blocks**.

The source file itself is never read or modified. The `.blockdef` file is the single source
of truth. The pipeline reads it and emits three artefacts automatically:

| Artefact | Location | Purpose |
|---|---|---|
| Blockly block definitions | `static/page/blocks/blocks/*_dsl.js` | Visual shape of each block in the editor |
| Python code generators | `static/page/blocks/pythonic/*_dsl.js` | JavaScript that converts a placed block back to Python code |
| Toolbox definition | `templates/page/blocks/definitions/*_dsl.md` | XML fragment that places blocks in the sidebar toolbox |

---

## 2. Grammar

File: `server/block_dsl/block_grammar.tx`

This is a [textX](https://textx.github.io/textX/) PEG grammar. textX reads the grammar
once and auto-generates a Python parser and a set of metamodel classes from it.

```
BlockdefFile:
    'module' name=/[_a-zA-Z]\w*/
    imports*=ImportDecl
    ('url' url=STRING)?
    categories*=CategoryDef
;

ImportDecl:
    'import' name=STRING
;

CategoryDef:
    'category' name=STRING ('color' '=' color=INT)?
    '{' entries*=CategoryEntry '}'
;

CategoryEntry: ClassDef | FunctionBlock;

ClassDef:
    'class' class_name=/[_a-zA-Z]\w*/
    'as' instance_mode=/singleton|multiple/
    ('named' instance_name=STRING)?
    ('ref' method_ref=/key_input|object_input/)?
    '{' blocks*=FunctionBlock '}'
;

FunctionBlock:
    'block' fn_name=/[_a-zA-Z]\w*/
    ('label'   '=' label=STRING)?
    ('kind'    '=' kind=/value|statement|hat/)?
    ('inline'  '=' inline=BOOL)?
    ('tooltip' '=' tooltip=STRING)?
    ('{' params*=ParamDef '}')?
;

ParamDef:
    'param' name=/[_a-zA-Z]\w*/
    ('type'    '=' type_name=/Number|String|Boolean|Any/)?
    ('default' '=' default=ParamDefault)?
    (is_pin?='pin')?
    ('options' '[' options+=DropdownOpt[','] ']')?
;

ParamDefault:
    SeqDefault | BoolDefault | FloatDefault | IntDefault | StrDefault
;

SeqDefault:
    '[' items*=ScalarDefault[','] ']'
;

ScalarDefault:
    BoolDefault | FloatDefault | IntDefault | StrDefault
;

FloatDefault: val=FLOAT;
IntDefault:   val=INT;
BoolDefault:  val=BOOL;
StrDefault:   val=STRING;

DropdownOpt:
    '(' label=STRING ',' val=STRING ')'
;

// textX skips any rule named "Comment" automatically during parsing.
Comment:
    /\/\/.*/
;
```

### Grammar operator reference

| Operator | Meaning | Python type on the object |
|---|---|---|
| `attr=Rule` | Exactly one match | Single object or `''` / `0` / `False` when optional and absent |
| `attrs*=Rule` | Zero or more | `list` |
| `attrs+=Rule` | One or more | `list` |
| `flag?='kw'` | Boolean keyword flag | `bool` — `True` if the keyword is present |
| `(…)?` | Optional group | All assignments inside default to absent values |
| `A \| B` | Ordered choice (PEG) | First alternative that matches wins |
| `/regex/` | Regex terminal | `str` — bypasses keyword checking |
| `STRING` | Quoted string literal | `str` (quotes stripped) |
| `INT` | Integer literal | `int` |
| `FLOAT` | Float literal (requires `.`) | `float` |
| `BOOL` | `true` or `false` | `bool` |

### Attribute ordering constraint

Because the grammar uses PEG ordered optionals, **attributes within a `block` or `param`
declaration must appear in the order they are listed in the grammar rule**.
Any subset is valid; skipped attributes simply take their default value.

For `FunctionBlock` the order is: `label` → `kind` → `inline` → `tooltip`

For `ParamDef` the order is: `type` → `default` → `pin` → `options`

---

## 3. Metamodel

When textX loads the grammar it creates one Python class per rule. Parsing a `.blockdef`
file produces an **object graph** of instances of these classes. Every instance also
receives a `.parent` back-reference to the object that contains it.

### Object graph shape

```
BlockdefFile
 ├─ .name          str                         module identifier
 ├─ .url           str                         help URL ('' if absent)
 ├─ .imports       list[ImportDecl]
 │    └─ .name     str                         Python import name
 └─ .categories   list[CategoryDef]
      ├─ .name     str
      ├─ .color    int                         0 if absent
      └─ .entries  list[ClassDef | FunctionBlock]
           │
           ├── ClassDef
           │    ├─ .class_name      str
           │    ├─ .instance_mode   str        "singleton" | "multiple"
           │    ├─ .instance_name   str        '' if absent
           │    ├─ .method_ref      str        '' if absent
           │    └─ .blocks          list[FunctionBlock]
           │
           └── FunctionBlock
                ├─ .fn_name    str
                ├─ .label      str             '' if absent
                ├─ .kind       str             '' | "value" | "statement" | "hat"
                ├─ .inline     bool            False if absent
                ├─ .tooltip    str             '' if absent
                └─ .params     list[ParamDef]
                      ├─ .name       str
                      ├─ .type_name  str       '' | "Number" | "String" | "Boolean" | "Any"
                      ├─ .default    ParamDefault | None
                      ├─ .is_pin     bool
                      └─ .options    list[DropdownOpt]
                               ├─ .label  str  (display text)
                               └─ .val    str  (code value)
```

### `ParamDefault` hierarchy

`param.default` is `None` when no default is written. Otherwise it is one of:

| Class | `.val` type | Example in .blockdef |
|---|---|---|
| `BoolDefault` | `bool` | `default=true` |
| `IntDefault` | `int` | `default=42` |
| `FloatDefault` | `float` | `default=3.14` |
| `StrDefault` | `str` | `default="hello"` |
| `SeqDefault` | — | `default=[0, 2, 4]` |

`SeqDefault` has `.items` — a `list` of the scalar types above — instead of `.val`.

### Absent-value defaults

textX does **not** use `None` for absent string/int matches; it uses the zero-value of the
type (`''` for strings, `0` for ints, `False` for bools). The parser normalises these:

```python
fb.kind or None          # '' → None
fb.label or None         # '' → None
cat.color or None        # 0  → None  (be careful if 0 is a valid color)
```

---

## 4. DSL syntax guide

### Minimal file

```
module my_lib
import "my_lib"

category "My Library" color=120 {
    block do_something tooltip="Does something useful."
}
```

### Module header

```
module <identifier>          // becomes source_module_name on every BlockSpec
import "<python_module>"     // repeat for each dependency
url "<help_url>"             // optional; attached to every block's help button
```

### Standalone function block

```
block <fn_name>
    [label="Human readable label"]
    [kind=value|statement|hat]     // default: statement
    [inline=true|false]            // default: false
    [tooltip="Shown on hover."]
    [{
        param <name> [type=Number|String|Boolean|Any] [default=<value>] [pin]
                     [options[("Label","code"), ...]]
    }]
```

### Class block (singleton)

A singleton class creates exactly one instance in the generated code under a fixed name.
`__init__` becomes the constructor block; every other declared method becomes a method block.

```
class <ClassName> as singleton named "<instance_name>" {
    block __init__ tooltip="Create the instance." {
        param <pin>  type=Number  pin
    }
    block <method>  kind=value  tooltip="Returns a value."
    block <method2> tooltip="Does something." {
        param <arg>  type=Number
    }
}
```

Generated code template examples:
- Constructor: `<instance_name> = <Module>.<ClassName>(<args>)`
- Method:      `<instance_name>.<method_name>(<args>)`

### Class block (multiple instances)

Multiple-instance classes track objects in a dict keyed by a numeric `id`.
Each method block automatically receives an `id` input that selects which instance to call.

```
class <ClassName> as multiple [ref key_input|object_input] {
    block __init__ {
        param id     type=Number    // required — used as the dict key
        param <pin>  type=Number  pin
    }
    block <method>  kind=value
}
```

Generated code template examples:
- Constructor: `<class_name>_instances[{id}] = <Module>.<ClassName>(<args>)`
- Method:      `<class_name>_instances[{id}].<method_name>(<args>)`

### Parameter types

| `type=` value | Blockly check type | Shadow block |
|---|---|---|
| `Number` | `"Number"` | `math_number` |
| `String` | `"String"` | `text` |
| `Boolean` | `"Boolean"` | `logic_boolean` |
| `Any` | `null` (no check) | `math_number` |
| *(absent)* | `null` | depends on default value |

### `pin` flag

Adding `pin` to a param marks it as a hardware pin input. The emitter renders a `pinout`
shadow block as the default, and the check type defaults to `Number` if not explicitly set.

### Dropdown options

```
param mode options[("Fast", "fast"), ("Slow", "slow"), ("Off", "off")]
```

Renders as a `Blockly.FieldDropdown` instead of a value input connector.

### Default values

```
param count   type=Number   default=10
param enabled type=Boolean  default=true
param label   type=String   default="hello"
param pins    type=Number   default=[0, 2, 4, 6]   // renders as lists_create_with
```

---

## 5. Implementation

### File map

```
server/block_dsl/
  block_grammar.tx       textX grammar (source of truth for the DSL syntax)
  blockdef_parser.py     Parses .blockdef → ParseResult
  integrate.py           Registers targets; wires both pipelines into one call
  emitters.py            Renders BlockSpec → JS / MD text (shared with old pipeline)
  python_generator.py    Builds GeneratorSpec from BlockSpec (shared)
  toolbox_builder.py     Groups BlockSpec into ToolboxCategory (shared)
  model.py               Shared dataclasses: BlockSpec, InputSpec, ParseResult, …
  builder.py             humanize_identifier(), snake_case() helpers (shared)

static/page/blocks/libraries/
  ds1302.blockdef        Example definition file
```

### Pipeline — step by step

```
.blockdef file
     │
     ▼
[1] textX metamodel_from_file("block_grammar.tx")
     │  Compiles the grammar into a PEG parser (done once at BlockdefParser.__init__)
     │
     ▼
[2] mm.model_from_file("ds1302.blockdef")
     │  Parses the file, returns a BlockdefFile object graph
     │
     ▼
[3] BlockdefParser._extract_blocks(model)
     │  Walks the object graph:
     │    • For each CategoryDef
     │        • For each ClassDef  → _blocks_from_class()
     │            • Orders constructor first
     │            • Calls _block_spec() for each FunctionBlock
     │        • For each top-level FunctionBlock → _block_spec()
     │  Returns list[BlockSpec]
     │
     ▼
[4] SimpleToolboxBuilder.build_toolbox(blocks)
     │  Groups BlockSpec by category name → list[ToolboxCategory]
     │
     ▼
[5] PythonGeneratorBuilder.build_generators(blocks)
     │  Derives a code template string for each block:
     │    Singleton constructor:  "ds1302 = ds1302.DS1302({clk_pin}, …)"
     │    Singleton method:       "ds1302.get_time()"
     │    Multiple constructor:   "motor_instances[{id}] = motor.Motor({pin}, …)"
     │    Multiple method:        "motor_instances[{id}].set_speed({speed})"
     │  Returns list[GeneratorSpec]
     │
     ▼
[6] Emitters (shared with the Python-annotation pipeline)
     │
     ├─ emit_blockly_blocks_js(blocks)
     │     Renders each BlockSpec as a Blockly.Blocks["type"] = { init: … } JS object.
     │     Handles label placeholders like "Set {id} speed" → inline value inputs.
     │
     ├─ emit_python_generators_js(generators, blocks_by_type)
     │     Renders each GeneratorSpec as a Blockly.Python["type"] = function(block) { … }.
     │     Reads each input with valueToCode / getFieldValue depending on InputKind.
     │
     └─ emit_definition_markdown(category, library, blocks)
           Renders the toolbox XML fragment with shadow (default) values per input.
```

### How _block_spec() builds a BlockSpec

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
    inputs       = [InputSpec(…), …]        # built by _build_inputs()
    source_module_name   = "ds1302"          # from BlockdefFile.name
    source_function_name = "get_time_text"   # from FunctionBlock.fn_name
    source_class_name    = "DS1302"          # from ClassDef.class_name
    instance_ref         = InstanceReferenceSpec(
                               mode=FIXED_NAME,
                               fixed_instance_name="ds1302"
                           )
)
```

### How _input_from_param() builds an InputSpec

```
ParamDef in .blockdef            →   InputSpec
─────────────────────────────────────────────────────────────
options=[…]                      →   FIELD_DROPDOWN + options list
is_pin=True, type absent         →   INPUT_VALUE, check_type="Number"
type=Number                      →   INPUT_VALUE, check_type="Number"
type=Boolean, default=true       →   INPUT_VALUE, check_type="Boolean", default_value=True
type=Any / absent                →   INPUT_VALUE, check_type=None
```

### Instance reference modes

| `.blockdef` declaration | InstanceReferenceSpec produced | Generated code pattern |
|---|---|---|
| `as singleton named "x"` | `FIXED_NAME, fixed="x"` | `x.method(…)` |
| `as singleton` (no name) | `FIXED_NAME, fixed=None` | `<class_name>.method(…)` |
| `as multiple` | `KEY_INPUT, key="id"` | `<cls>_instances[{id}].method(…)` |
| `as multiple ref object_input` | `OBJECT_INPUT` | object passed as input connector |

### Registering a new .blockdef target

In `server/block_dsl/integrate.py`, add an entry to `DEFAULT_BLOCKDEF_TARGETS`:

```python
BlockdefTarget(
    blockdef          = "static/page/blocks/libraries/<name>.blockdef",
    library_name      = "<import_name>",
    output_block_js   = "static/page/blocks/blocks/<name>_dsl.js",
    output_generator_js = "static/page/blocks/pythonic/<name>_dsl.js",
    output_definition_md = "templates/page/blocks/definitions/<name>_dsl.md",
    extra_library_names = ("dep1", "dep2"),   # optional
)
```

`generate_default_artifacts()` (called from `app.py` at startup) runs both the old
Python-annotation pipeline and the `.blockdef` pipeline automatically.

---

## 6. Complete example — ds1302.blockdef

```
// Block definitions for the DS1302 real-time clock driver.

module ds1302
import "ds1302"
url "https://github.com/micropython/micropython"

category "DS1302 DSL" color=35 {

    class DS1302 as singleton named "ds1302" {

        block __init__ tooltip="Create a DS1302 RTC instance." {
            param clk_pin type=Number pin
            param dat_pin type=Number pin
            param rst_pin type=Number pin
        }

        block get_time      kind=value tooltip="Read the current time tuple from the RTC."
        block get_year      kind=value tooltip="Read the current year from the RTC."
        block get_month     kind=value tooltip="Read the current month from the RTC."
        block get_day       kind=value tooltip="Read the current day from the RTC."
        block get_hour      kind=value tooltip="Read the current hour from the RTC."
        block get_minute    kind=value tooltip="Read the current minute from the RTC."
        block get_second    kind=value tooltip="Read the current second from the RTC."

        block get_time_text kind=value tooltip="Format the current time as text." {
            param show_seconds type=Boolean default=true
        }

        block get_date_text kind=value tooltip="Format the current date as text."

        block set_time tooltip="Set the RTC date and time." {
            param year   type=Number
            param month  type=Number
            param day    type=Number
            param hour   type=Number
            param minute type=Number
            param second type=Number
        }
    }
}
```

This single file produces:

- **11 Blockly blocks** (1 constructor + 10 methods)
- **11 Python code generators** with correct singleton instance references
- **1 toolbox markdown** with `pinout` shadows on pin inputs and typed shadows elsewhere
- **Identical output** to the previous Python-annotation pipeline for the same library
