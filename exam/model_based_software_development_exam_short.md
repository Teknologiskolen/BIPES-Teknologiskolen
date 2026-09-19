# Model-based Software Development — Written Exam, Spring 2026 (short form)

Same questions and answers as `model_based_software_development_exam.md`, compressed to at most
10 lines each. Full citations, code, and worked examples are in that version — this one keeps
only each answer's core claim and its strongest supporting evidence.

Metamodel diagram: https://claude.ai/code/artifact/5f93db4e-a493-4239-a572-0a6f003a3169

---

## Part 0 — The problem

BIPES turns MicroPython hardware libraries into Blockly blocks for teaching. Four artifacts (UI,
Python generator, toolbox entry, and the real library) used to be hand-kept in sync per block and
would drift. The Problem: model "a library exposed as blocks" as one domain concept so every
artifact is generated from one authoritative description.

---

## Part 1 — Meta-modeling

### Q1 — Properties

Category(name, color) — where in the toolbox. Class(className, instanceMode, instanceName,
methodRef) — which running object a call targets, and how many can exist (singleton vs. multiple,
addressed by id/ref). Block(fnName, label, kind, tooltip, inline, isConstructor) — what dragging
this shape calls and how it looks; fnName is the literal Python identifier called, not a label.
Param(name, type, default, isPin, options) — what a student can fill in and how the editor is
constrained. Unlike the course's Attribute.requirement, Param has no mandatory/optional flag —
every Param is pre-filled with a default; whether the wrapped argument is actually required lives
outside this metamodel, in the Python source, recovered only by Part 4's validator.

### Q2 — Metamodel

Category 1--0..*Class; Category 1--0..*Block (module-level); Class   1--1..*Block; Block
1--0..*Param. Class.instanceMode/Block.kind/Param.type are enums (InstanceMode, BlockKind,
ParamType); Class.methodRef is MethodInstanceMode. This is a conceptual metamodel, not a literal
transcription of `model.py` — a recent cleanup removed `ToolboxCategory`/`InstanceMode` since
nothing downstream read them; `Category`/`Class` aren't reified as code at all, only `BlockSpec`/
`InputSpec` survive. In Fowler+'s terms this is a Semantic Model, with a population interface
(the fluent builder) and an operational interface (`emitters.py`).

---

## Part 2 — Internal DSL

### Q1 — Example programs

`ButtonsInternal` (singleton class, statement+value blocks, pin param, dropdown, default) and
`HCSR04Internal` (multiple/key_input instancing, the one property Program A doesn't exercise).
Together they cover every Part 1 property. Both were run and produce output byte-identical to the
real `.blockdef` files — Fowler+'s own recommended way to test two DSLs sharing one Semantic
Model, by checking they populate it equivalently.

### Q2 — Host-language mechanism

Three named Fowler+ patterns, not an ad hoc design. `.param().param()` chaining is Method
Chaining. The sequence of `hub.block(...)` calls in `build()` is a Function Sequence — normally
risky (needs global functions/state), but `BlockInternalDSL` subclassing is Object Scoping,
resolving calls against `self`/`hub` instead of globals, exactly Fowler's fix for that risk. The
fluent builder classes are an Expression Builder kept deliberately separate from the Semantic
Model (`BlockSpec`/`InputSpec`), per Fowler's own guideline for the two.

### Q3 — Internal or external?

External, for a reason specific to this problem: `fnName`/`className` are literal Python
identifiers the generator calls verbatim, so a definition file has exactly one thing to stay
faithful to — the library. Parsing text into pure data (no executed code, no host-DSL object
identity) is what lets the AST validator (Part 4) run safely at every server start; the internal
DSL would need to import and execute arbitrary Python just to read its blocks. Fowler+'s own
conclusion is "no general advantage either way" — but sharing one Semantic Model made building
both cost very little here, which is the real reason both exist.

---

## Part 3 — External DSL

### Q1 — EBNF

```
BlockdefFile  ::= "module" IDENT CategoryDef*
CategoryDef   ::= "category" STRING "{" (ClassDef | FunctionBlock)* "}"
ClassDef      ::= "class" IDENT "as" ("singleton"|"multiple") "{" FunctionBlock* "}"
FunctionBlock ::= "block" IDENT ("kind""="...)? ("{" ParamDef* "}")?
ParamDef      ::= "param" IDENT ("type""="...)? ("default""="...)? "pin"?
```
Each rule is exactly one Part 1 class; nesting mirrors containment. In Xtext this correspondence
is literal — the metamodel is inferred from the grammar, not designed separately.

### Q2 — Left recursion

A rule expands back into itself as the first symbol (`Expr::=Expr'+'Term|Term`). Xtext's
ANTLR/LL(*) top-down parser can't accept this — it recurses forever without consuming input, so
Xtext rejects it at grammar-build time. This matters here because letting a Param's `default` be
a computed expression (not just a literal) would need exactly this shape. Fix: left-factor into
`Term (({Add.left=current}'+'|{Sub.left=current}'-') right=Term)*` — `current` wraps the
already-parsed subtree, rebuilding the left-associative tree by hand. `*` gives left-associativity,
`?` would give right (Bettini's own SJAssignment uses `?` for exactly this reason). Precedence
comes from which rule wraps which, not from any priority number.

### Q3 — Code generation

Xtext's generator (`IGenerator2.doGenerate`) is invoked by the framework, not called directly —
the "Hollywood Principle" — and only once a model has no validation errors. Xtend templates
interleave literal text and computed values; this mirrors `python_generator.py`'s template
strings with `{param}` placeholders, substituted by `emitters.py`. Generated language is
MicroPython, fixed by the hardware regardless of which tool builds the DSL. Production uses textX
over Xtext because the surrounding system is already Python — a JVM toolchain would add a second
runtime for no benefit here, since no IDE plugin is needed. Xtext would be more idiomatic for
Part 4's topic specifically, since cross-references are first-class there.

---

## Part 4 — Chosen topic: Validation

Validation checks what a grammar's syntax can't: whether things are *meaningful*, not just
well-formed. `.blockdef` accepts `block get_year` whether or not `get_year` exists on the class —
syntax and semantics are different questions. `ds1302.blockdef` had six blocks for methods that no
longer existed, live in two toolboxes and six student examples; running the check found this
immediately. This follows Bettini's "loose grammar, strict validation" principle exactly.

### Q2 — Implementation

`library_introspect.py` parses the library with `ast` (never imports it) and checks existence +
arity, not param-name equality — `sand_table_robot.blockdef`'s `motor_shoulder` maps positionally
to the real `motor_shoulder_pins`, so names are just labels. Wired in as a warning, not a hard
failure. Found the ds1302 bug; fixed by restoring the six methods. A second validator
(`blockly_toolbox_generator` in `app.py`) checks for duplicate toolbox keys across files, the same
multimap pattern as Bettini's `NamesAreUniqueValidator`; it found eight real collisions, including
two fully dead legacy files (`roboticsboard.md`, `alarmclock.md`) silently shadowing their live
replacements — deleted after confirming zero remaining references.

### Q3 — Challenges

Recognising arity, not name equality, is the only sound check — the obvious first design (assert
names match) would reject correct, already-shipping definitions. The check stays deliberately
incomplete: positional binding means a definition author could swap two params in the wrong order
and nothing would catch it, short of a metamodel change adding an explicit `from=` binding. The
second validator's harder problem was different: detecting a collision is easy, deciding which
side is stale isn't — it only acts when an independent check (nothing else references this file)
comes back one-sided, and stays diagnostic-only otherwise.
