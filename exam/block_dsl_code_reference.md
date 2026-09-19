# `server/block_dsl/` — Code Reference

A file-by-file reference for the DSL pipeline that turns hardware libraries into Blockly blocks:
what each script does, what it exposes, and — just as importantly — what it *doesn't* let happen
(the constraints/invariants each one is responsible for). Written against the current state of
the codebase (branch `forth`), after the August 2026 dead-code cleanup.

---

## The shape of the pipeline

Two front-ends build the *same* domain model, which is then handed to one shared set of emitters:

```
   server/block_dsl/definitions/*.blockdef ──┐
                (textX grammar)               │
                                               ├──► BlockSpec / InputSpec / GeneratorSpec ──┐
   internal_dsl.py subclasses ─────────────────┘        (model.py)                          │
   (examples/*.py)                                                                          │
                                                                                              ▼
                                                                                   emitters.py
                                                                    ┌───────────────────┼───────────────────┐
                                                                    ▼                   ▼                   ▼
                                                           blocks/<lib>_dsl.js  pythonic/<lib>_dsl.js  definitions/<lib>_dsl.md
                                                            (Blockly UI)         (Python codegen)      (toolbox XML chunk)
```

A *second*, independent validation pass (`library_introspect.py`) checks the parsed model against
the real `.py` library it claims to wrap, before anything is written. A *third*, unrelated
validation pass lives outside this package entirely, in `app.py`'s `blockly_toolbox_generator()`
— it checks that no two definition files claim the same toolbox key. Both are described below
since they're part of the same overall correctness story, even though only the first is inside
`server/block_dsl/`.

---

## `model.py` — the shared domain model

The dataclasses both front-ends build and both emitters read. This is the *only* file either
front-end or either emitter depends on for shape — nothing else in the package defines a type
that crosses a module boundary.

- `BlockKind` (`STATEMENT`/`VALUE`/`HAT`), `InputKind` (`INPUT_VALUE`/`FIELD_DROPDOWN`/
  `FIELD_INPUT`/`VARIABLE`), `MethodInstanceMode` (`FIXED_NAME`/`KEY_INPUT`/`OBJECT_INPUT`) — the
  three enums actually consumed downstream.
- `InputSpec` — one Param: `name`, `input_kind`, `check_type` (a plain `str | None`, e.g.
  `"Number"` — there is no closed `ParamType` enum in code, unlike the conceptual metamodel in
  the exam write-up), `default_value`, `is_instance_selector` (true only for the synthetic `id`
  input on a `multiple`/`key_input` class), `is_pin`, `options`.
- `InstanceReferenceSpec` — how a method block finds *its* running instance: `mode` plus whichever
  of `fixed_instance_name` / `key_parameter_name` / `key_input_name` that mode needs.
- `BlockSpec` — one Block: `type`, `label`, `category`, `color`, `tooltip`, `help_url`, `kind`,
  `is_constructor_block`, `inputs_inline`, `inputs: list[InputSpec]`, `source_module_name`,
  `source_function_name` (the literal Python identifier the generator will call),
  `source_class_name`, `instance_ref`.
- `GeneratorSpec` — one Block's Python-codegen template: `language`, `template` (a string with
  `{paramName}` placeholders), `block_type`, plus the same source-identity fields as `BlockSpec`.
- `ParseResult` — just `blocks: list[BlockSpec]` and `generators: list[GeneratorSpec]`. Used to
  carry `ModuleSource`/`ToolboxCategory`/`InstanceMode` too; removed in cleanup once grep confirmed
  nothing downstream ever read them (`integrate.py` only ever consumed `.blocks`/`.generators`).

**Constrains:** every Block and Param either front-end can produce is limited to exactly these
fields — there is no way to express, say, a block with a nested statement-body input (a loop, an
`if`), because no such field exists on `BlockSpec`. This is the hard ceiling on what the DSL can
say at all, independent of grammar or Python syntax.

---

## `block_grammar.tx` — the external DSL's grammar (textX)

The concrete syntax for `.blockdef` files: `module` → `import`/`url` → `category { class/block }`.
Key rules: `BlockdefFile`, `CategoryDef`, `ClassDef` (`as singleton|multiple`, optional
`named "..."` / `ref key_input|object_input`), `FunctionBlock` (`block name label=… kind=…
inline=… tooltip=… { param… }`), `ParamDef` (`type=… default=… pin? options[...]`).

Two things worth remembering about it:
- **No recursion of any kind.** Every non-terminal is either a leaf or contains a `*`-repeated
  list of a *different* non-terminal — there's no rule that can nest inside itself, so left
  recursion (the topic that dominates Part 3 Q2 of the exam) never actually arises in this grammar
  as written; it's a real risk only if `ParamDefault` were extended to computed expressions.
- **Custom regex-based default literals** (`BoolDefault`/`FloatDefault`/`IntDefault`/`StrDefault`),
  not textX's built-in `BOOL`/`FLOAT` base rules — deliberately, because those built-ins parse
  `default=0`/`default=1` as booleans and `default=8` as `8.0`, which broke `pinout` dropdown
  shadows in production before this fix (see `project_block_dsl_textx` memory).

**Constrains:** what a `.blockdef` file is syntactically allowed to say. A block can only ever be
"call this function/method with these params, in this order" — no computed values, no
conditionals, no loops, no cross-referencing another block from within a `.blockdef`.

---

## `blockdef_parser.py` — external DSL front-end

`BlockdefParser.parse_file(path)`: loads the textX metamodel from `block_grammar.tx`, parses one
`.blockdef` file, and walks the resulting parse tree into `BlockSpec`/`GeneratorSpec` objects.

- `_extract_blocks` / `_blocks_from_class` / `_block_spec` — walk categories → classes/module-level
  blocks → params, building one `BlockSpec` per `block` entry. The constructor (`__init__`, if
  present) is always ordered first within its class.
- `_build_inputs` — for a `multiple`/`key_input` class, prepends a synthetic `id` `InputSpec`
  (`is_instance_selector=True`) to *every* block in that class, constructor included — this is
  what lets the generated call read `instances[{id}] = Class(...)` / `instances[{id}].method(...)`.
- `_input_from_param` — a param with `options[...]` becomes `FIELD_DROPDOWN`; a param marked `pin`
  (or matching the tight name pattern in `emitters._is_pin_input`, applied later) gets
  `check_type="Number"` implicitly if none was given.
- `_instance_ref` — turns `singleton`/`multiple` + `named`/`ref` into the `InstanceReferenceSpec`
  that `python_generator.py` will use to decide how the generated call finds its instance.

**Constrains:** `fnName`/`className` in the `.blockdef` become `source_function_name`/
`source_class_name` on the `BlockSpec` *unchanged* — this parser does zero validation that they
correspond to anything real. That gap is deliberately left for `library_introspect.py`, not
duplicated here.

---

## `internal_dsl.py` — internal DSL front-end

This one file plays *both* roles the external side splits across two files: it is simultaneously
the concrete syntax (the fluent API a subclass's `build()` writes against — the counterpart of
`block_grammar.tx`) and the walker that converts a populated object graph into `BlockSpec`s (the
counterpart of `blockdef_parser.py`). Two layers inside it, kept deliberately apart:

**The fluent builder layer** (Fowler+'s *Expression Builder* — never made fluent itself is
`model.py`; this is a separate façade over it):

- **`Param(name, *, type=None, default=None, pin=False, options=None)`** — one block parameter.
  `to_input_spec()` converts it to a real `InputSpec`: an `options` list always wins and produces
  `FIELD_DROPDOWN`; otherwise it's `INPUT_VALUE`, and `check_type` defaults to `"Number"` if
  `pin=True` and no explicit `type` was given (the same implicit-Number-for-pins rule
  `blockdef_parser._input_from_param` applies on the external side).
- **`Block(fn_name, *, label=None, kind=STATEMENT, tooltip="", inline=True)`** — one block.
  `.param(name, **kwargs)` appends a `Param` and returns `self` — this is *Method Chaining*,
  letting `hub.block("add").param("pin", pin=True).param("pull", options=[...])` read as one
  fluent statement.
- **`BlockClass(class_name, *, singleton=True, instance_name=None, key_input=True)`** — one
  exposed class. `.block(fn_name, **kwargs)` appends and returns a `Block` (not `self` — the
  chain moves *down* a level here, from class to block).
- **`Category(name, *, color=None)`** — one toolbox category. `.singleton_class(...)` /
  `.multiple_class(..., key_input=True)` append and return a `BlockClass`; `.function(fn_name,
  **kwargs)` appends and returns a `Block` directly on the category, for module-level (class-less)
  functions.

A subclass's `build()` method is then a **Function Sequence** of calls like
`self.category(...)` and `hub.block(...)` — normally risky (Fowler+'s stated failure mode: bare
calls need either global functions or global parsing state) — made safe here by **Object
Scoping**: `build()` runs as a method on a `BlockInternalDSL` subclass, so every bare call
resolves against `self` or a locally-held reference (`hub`), never a module-level global.

**The `BlockSpec`-conversion layer**, on `BlockInternalDSL` itself:

- `__init__(module_name, *, url=None)` stores `module_name`/`url`, then immediately calls
  `self.build()` — construction *is* running the program, exactly the
  `EntityRelationInternalDSL`/`University` shape from the course example.
- `category(name, *, color=None)` — the one factory method available directly on `self`; every
  other fluent call chains off whatever it returns.
- `to_block_specs()` walks every category → class (`_class_specs`) → block (`_block_spec`),
  producing a flat `list[BlockSpec]` — the same shape `BlockdefParser.parse_file(...).blocks` has.
- `_class_specs(cls, cat)` finds `__init__` if present and orders it first, exactly mirroring
  `blockdef_parser._blocks_from_class`'s constructor-first ordering.
- `_block_spec(block, cat, class_ctx)` derives the block type (`snake_case(className)__suffix`,
  `"create"` for the constructor) and default label (`"Create {ClassName}"` for a constructor,
  `humanize_identifier(fn_name)` otherwise) — the *identical* rules `blockdef_parser._block_spec`
  uses, field for field.
- `_inputs(block, class_ctx)` prepends the synthetic `id` `InputSpec` (`is_instance_selector=True`)
  for every block of a `multiple`+`key_input` class, constructor included — the same rule
  `blockdef_parser._build_inputs` applies on the external side.
- `_instance_ref(class_ctx)` — `singleton` → `FIXED_NAME`; `multiple`+`key_input` → `KEY_INPUT`;
  `multiple` without `key_input` → `OBJECT_INPUT`. Same three-way mapping as
  `blockdef_parser._instance_ref`.
- `__str__` — a plain-text tree dump (category → class → block(params)) for debugging/printing,
  with no equivalent on the external side since a `.blockdef` file already *is* human-readable
  text.

This field-for-field mirroring is *why* the two front-ends can produce byte-identical output for
the same domain — not a coincidence, a deliberate design constraint on this file.

**Constrains:** exactly the same shape as the external grammar — a `Block` can express a
call-with-params and nothing more. There's no extra expressiveness smuggled in via Python, by
design; the point of `examples/*.py` is to prove the two front-ends are equivalent, not that the
internal one can do more.

---

## `builder.py` — shared naming utilities

Two pure functions, used by both front-ends and `emitters.py`:

- `snake_case(name)` — `"SandTableRobot"` → `"sand_table_robot"`. Used to build block-type
  identifiers (`{ClassName}__{method}`).
- `humanize_identifier(name)` — `"trigger_pin"` → `"Trigger Pin"`, with a fixed table of
  acronyms (`ADC`, `CLK`, `I2C`, `PWM`, `RTC`, `SPI`, …) kept upper-case. Used for default block
  labels and unplaced-input field labels.

This file used to also hold `BlockModelBuilder`, a whole second block-construction pipeline left
over from an annotation-scanning front-end removed months earlier; deleted in the cleanup once
grep confirmed it was never instantiated anywhere.

**Constrains:** nothing structural — this is pure string formatting, no model knowledge, no
validation. It's the one file in the package with zero dependency on `model.py`.

---

## `python_generator.py` — Python-codegen template builder

`PythonGeneratorBuilder.build_generators(blocks)` — for every `BlockSpec`, produces one
`GeneratorSpec` whose `template` is a string with `{paramName}` placeholders, *not* real
generated code yet (that substitution happens later, in `emitters.py`, at the JS layer).

- `_constructor_template` — `"{instanceName} = {module}.{Class}({args})"` for `FIXED_NAME`, or
  `"{registry}[{key}] = {module}.{Class}({args})"` for `KEY_INPUT`.
- `_method_template` — same idea for a method call: `"{instance}.{method}({args})"`, or
  `"{module}.{function}({args})"` for a standalone (class-less) function.
- `args` is built by joining `inp.name` for every non-instance-selector input, **in declared
  order** — this is the file that makes positional argument order load-bearing: nothing here
  reorders or name-matches params against the real function signature.

**Constrains:** the shape of every generated call. There is exactly one call-shape per block
(constructor vs. method vs. standalone function), chosen from `BlockKind`/`instance_ref` alone —
no way to express a call needing keyword arguments, varargs, or a return value used inline beyond
the constructor/method distinction already modeled.

---

## `emitters.py` — the three output formats

The only file that turns a `BlockSpec`/`GeneratorSpec` list into actual output text. Three public
functions, one per artifact:

- `emit_blockly_blocks_js(blocks)` — Blockly `init()` bodies: field/input layout parsed out of
  `block.label`'s `{placeholder}` tokens (`_emit_label_inputs`), inline `setColour`/`setTooltip`/
  `setHelpUrl`/`setInputsInline` calls. Labels and tooltips are wrapped in
  `(Blockly.Msg["BLBL_…"]||"English fallback")` / `"BTIP_…"` lookups so translations can be added
  later without regenerating anything.
- `emit_python_generators_js(generators, blocks_by_type)` — turns each `GeneratorSpec.template`
  into a real `Blockly.Python[type] = function(block) {...}` body: reads each input via
  `valueToCode`/`getFieldValue` depending on `InputKind`, string-concatenates the template.
- `emit_definition_markdown(category, library, blocks, ...)` — the toolbox XML chunk: `# heading`
  markers (consumed by `app.py`'s `blockly_toolbox_generator`), `<category>`/`<button>` install
  prompts, one `<block>`/`<shadow>` pair per block.
- `_shadow_for_input` / `_shadow_for_pin` / `_shadow_for_sequence` — decide what default shadow
  block a Param gets: `pinout` for anything `is_pin`, `math_number`/`logic_boolean`/`text`
  otherwise, `lists_create_with` for a sequence default (used by pin-array params like
  `sand_table_robot`'s `motor_shoulder`).
- `_is_pin_input` / `_is_pin_sequence_input` — the exact, *tight* name-matching rule (`pin`/`sda`/
  `scl` or a `*_pin`/`pin_*` boundary, never a bare substring) that decides whether a param
  without an explicit `pin` flag still gets a pin picker. Deliberately narrow after a past bug
  where loose substring matching turned a param literally named `looping` into a broken pin field.

**Constrains:** the actual visual/behavioral shape every block can take in the browser — this is
where `BlockSpec`/`InputSpec` stop being abstract data and become the concrete Blockly/JS API
surface. Any UI capability not implemented here (e.g. a mutator, a context menu) simply isn't
reachable from either front-end no matter what the `.blockdef`/`internal_dsl.py` side says.

---

## `library_introspect.py` — validates a `.blockdef` against its real library

The Part 4 topic's implementation. `load_library_signatures(py_path)` parses a library `.py` file
with Python's `ast` module (**never `import`s it** — these files assume MicroPython and would
crash or misbehave if executed on the server) into a `LibrarySignatures` map of
class/function → `CallableSignature(min_required, max_total)`.

`validate_blocks(blocks, signatures)` then checks, per `BlockSpec`:
1. Does `source_class_name`/`source_function_name` actually exist in the library? (Catches the
   `ds1302.blockdef` incident — six blocks for methods that no longer existed.)
2. Does the declared param count fall within `[min_required, max_total]` for that real signature?

**Deliberately does not check:** param *names* against the real parameter names — a `.blockdef`
param is a free-form Blockly-socket label (`sand_table_robot.blockdef`'s `motor_shoulder` maps
position-for-position to the real `motor_shoulder_pins`), and the generator calls positionally
with no keywords, so only *how many* params are declared has any bearing on correctness. This is
also the file's known incompleteness: it cannot detect two params declared in the *wrong relative
order* — that would still pass both the arity check and Python's own runtime, silently binding the
wrong value to the wrong argument.

---

## `integrate.py` — wires everything together

`BlockdefTarget` — one hardware library's file quartet:
`definitions/<name>.blockdef → blocks/<name>_dsl.js + pythonic/<name>_dsl.js +
definitions/<name>_dsl.md`, plus `library_name` (the install-button label, and — since it's
assumed to equal the `.py` file's stem — also how `_validate_against_library` locates the real
library to check against).

`DEFAULT_BLOCKDEF_TARGETS` — the 12 targets, hand-registered (not auto-discovered from the
`definitions/` directory — a known, explicitly-deferred improvement).

`generate_default_artifacts(root_path)` → `_generate_blockdef_artifacts`: for each target, parse
the `.blockdef`, run `_validate_against_library` (prints warnings, never raises), then
`_write_if_changed` all three output files — only touching disk if content actually changed, so a
clean run doesn't dirty the working tree.

**Constrains:** which 12 libraries get generated at all (anything not in
`DEFAULT_BLOCKDEF_TARGETS` is silently ignored, even if its `.blockdef` file exists), and enforces
the warn-don't-crash policy for the whole pipeline — one bad definition can print a warning but
can never take down the other 11 or fail server startup.

---

## `__init__.py`

Re-exports `BlockdefParser`, `generate_default_artifacts`, `BlockdefTarget`,
`DEFAULT_BLOCKDEF_TARGETS` — the only four names anything outside the package (`app.py`) is meant
to import directly.

---

## `definitions/*.blockdef` — the 12 real hardware definitions

`ds1302`, `dfplayer`, `st7735s`, `roboticsboard` (installs `PicoRobotics`), `sand_table_robot`,
`buttons`, `hcsr04`, `neopixel`, `buzzer_music`, `alarm_clock`, `app_core`, `picofly` (installs
`picofly_firmware`). Each is the single source of truth for one library's blocks — the paired
`.py` library file is never annotated or edited to add blocks.

---

## `examples/*.py` — internal-DSL proof-of-parity

Not part of the production pipeline (not imported by `integrate.py` or `app.py`); a standalone
demonstration that the internal front-end is equivalent to the external one for a real domain.

- `buttons_internal.py` — `ButtonsInternal`, rebuilding `buttons.blockdef` (singleton class,
  dropdown, pin param, defaults).
- `hcsr04_internal.py` — `HCSR04Internal`, rebuilding `hcsr04.blockdef` (`multiple`/`key_input`
  instancing — the one property the buttons example doesn't exercise).

Each file's `if __name__ == "__main__":` block parses the real `.blockdef` with `BlockdefParser`,
builds the internal-DSL version, and asserts the emitted `blocks.js`/`pythonic.js`/`definition.md`
are byte-identical between the two — run via `python -m server.block_dsl.examples.<name>`.

---

## Outside the package: `app.py`'s `blockly_toolbox_generator()`

Not in `server/block_dsl/`, but the pipeline's final, unavoidable step: scans every
`templates/page/blocks/definitions/*.md` (both DSL-generated and hand-written), splitting on
`^# (.*)$` headings into a `definitions_map`, then assembles each device's toolbox by looking up
the keys listed in `templates/page/blocks/devices/*.md`.

Added in this session: a `key_sources` multimap alongside `definitions_map`, reporting (as a
warning, same policy as everywhere else in this pipeline) any key claimed by more than one file —
directly modeled on Bettini's `NamesAreUniqueValidator`. Running it found 8 real collisions,
including two fully-dead legacy files (`roboticsboard.md`, `alarmclock.md`) silently shadowing
their `_dsl.md` replacements depending on filesystem iteration order; both were deleted after
confirming zero remaining references. Three further collisions (`machine.md`/`newMachine.md`,
`sensors.md`/`main.md`, a `lists_create_with` duplicate in `main.md`) are still open, by choice.

**Constrains:** every block/category key across the *entire* toolbox — DSL-generated and
hand-written alike — must be globally unique, or one definition silently shadows another with no
error, only a warning after the fact.

---

## Where each kind of correctness actually lives

| Question | Answered by |
|---|---|
| Is this `.blockdef` syntactically valid? | `block_grammar.tx` (textX, at parse time) |
| Does this block correspond to a real method/function? | `library_introspect.py` |
| Does this block declare a plausible number of params? | `library_introspect.py` |
| Are these two params in the *right* relative order? | **Nobody** — the known, open gap |
| Does this block's UI actually render correctly? | `emitters.py` (indirectly — wrong shadow choice is the usual failure mode) |
| Does this toolbox key collide with another file's? | `app.py`'s `blockly_toolbox_generator` |
| Do the internal and external DSLs agree for the same domain? | `examples/*.py`, run manually — not part of CI/startup |
