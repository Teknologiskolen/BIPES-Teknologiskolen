# Model-based Software Development — Written Exam, Spring 2026

Metamodel diagram (Part 1, Q1 & Q2): https://claude.ai/code/artifact/5f93db4e-a493-4239-a572-0a6f003a3169

Source code appendices (repo `BIPES-Teknologiskolen`, branch `forth`; all under `server/block_dsl/`
unless noted): `model.py`, `internal_dsl.py`, `examples/buttons_internal.py`,
`examples/hcsr04_internal.py`, `block_grammar.tx`, `blockdef_parser.py`, `python_generator.py`,
`emitters.py`, `library_introspect.py`, `integrate.py`, `definitions/buttons.blockdef`,
`definitions/hcsr04.blockdef`, and `app.py`'s `blockly_toolbox_generator()` (repo root, Part 4).

---

## Part 0 — The problem to be solved

**Title: Blockly Block Definitions for BIPES**

BIPES is a browser-based Blockly environment that teaches MicroPython to secondary-school
students by letting them program Raspberry Pi Pico W robotics kits (buttons, an ultrasonic
sensor, an RTC clock, a sand-drawing SCARA robot, …) by dragging visual blocks instead of
typing code. Every hardware capability needs a Blockly *block*: a UI shape (fields, sockets,
colour, tooltip), a Python-code generator (what MicroPython source the block expands to), and
a toolbox entry that makes it appear under the right category for the right device. These three
concerns used to be hand-written independently for each of twelve hardware libraries, and drifted
from each other — and from the MicroPython library they wrapped — whenever one was edited
without the others. **The Problem** is: model *"a hardware library exposed as Blockly blocks"*
as one domain concept, so every block artifact for a library is generated from a single
authoritative description instead of being maintained by hand in parallel.

---

## Part 1 — Meta-modeling

### Question 1 — Properties

See the class diagram linked at the top of this document — the amber note attached to each class
is this question's answer, placed directly against the property list it explains.

The properties come directly from what already varies across the twelve real hardware libraries
this problem was built against (buttons, RTC clock, ultrasonic sensor, sand-table robot, …):

- **Category** — `name`, `color`. Groups blocks under one flyout in the Blockly toolbox
  (e.g. "Buttons", "Ultrasonic").
- **Class** — `className`, `instanceMode` (*singleton*: one hidden global instance, e.g. one
  button manager; or *multiple*: many independently addressed instances, e.g. several ultrasonic
  sensors), and, for `multiple`, `methodRef` (how a method block finds *its* instance — by an
  explicit `id` input, or by an object reference). A Class groups the Blocks that are methods of
  one Python class.
- **Block** — `fnName` (the literal Python function/method identifier the block calls — not
  merely a label), `label` (block text, may embed `{param}` placeholders), `kind` (*statement*,
  *value*, or *hat*), `tooltip`, `inline` (lay sockets out horizontally or stacked),
  `isConstructor`. One Block wraps exactly one exposed function or method.
- **Param** — `name` (a Blockly-socket label, independent of the real Python parameter name),
  `type` (`Number`/`String`/`Boolean`/`Any`), `default` (pre-fills a shadow block), `isPin`
  (renders a device-pin picker instead of a plain number), `options` (a fixed dropdown of
  `(label, value)` pairs instead of a free socket). One Param is one input on a Block.

Together: Category answers *where in the toolbox does this appear*; Class answers *which running
object does a call target, and how many can exist*; Block answers *what does dragging this shape
into a program actually call, and how does it look/act*; Param answers *what can the student fill
in, and how is the editor constrained*. A library is fully described once every public,
student-facing method/function has a Block, and every exposed argument has a Param.

One property the course's running example uses that this domain deliberately does **not** model
explicitly is *requirement* (an Attribute being mandatory vs. optional). A Param has no such flag
— every Param is always presented pre-filled with a default. The analogue — "is this argument
actually mandatory in the wrapped Python function" — lives entirely in the *source* being
wrapped, outside this metamodel, and is only recovered by cross-referencing the real function
signature (Part 4).

### Question 2 — Metamodel

See the class diagram linked above. `Category 1 -- 0..* Class`; `Category 1 -- 0..* Block`
(module-level, class-less functions); `Class 1 -- 1..* Block` (its methods, the first of which
may be the constructor); `Block 1 -- 0..* Param`. `Class.instanceMode`, `Block.kind`, and
`Param.type` are typed by enumerations (`InstanceMode{SINGLETON,MULTIPLE}`,
`BlockKind{STATEMENT,VALUE,HAT}`, `ParamType{NUMBER,STRING,BOOLEAN,ANY}`); `Class.methodRef` is
`MethodInstanceMode{FIXED_NAME,KEY_INPUT,OBJECT_INPUT}`.

This is a *conceptual* metamodel, not a name-for-name transcription of `model.py` — worth being
precise about, since a recent cleanup pass removed the one dataclass (`ToolboxCategory`) and enum
(`InstanceMode`) that had been carrying a literal 1:1 mapping but were never actually read by
anything downstream (`integrate.py` only ever consumes `BlockSpec`/`GeneratorSpec` lists). What
survives in code is `BlockSpec` (Block), `InputSpec` (Param — `check_type: str | None` standing in
for the `ParamType` enum above, since the real value space is open-ended, not a closed set) and
`MethodInstanceMode`/`InstanceReferenceSpec` (how a Class's instancing is *resolved*, downstream of
the choice `InstanceMode` represents). `Category` and `Class` are not reified as their own runtime
types at all: a parsed `.blockdef` is already fully-typed data, so the pipeline only carries
forward the two things its two consumers (`emitters.py`, `library_introspect.py`) actually read —
`category` is just a string field on `BlockSpec`, and "is this class singleton or multiple" only
exists as the *derived* `InstanceReferenceSpec` on each of its blocks, never as a standalone
`Class` object. That gap between the clean conceptual metamodel and the leaner runtime types is
itself a small, honest example of Part 4's subject: nothing here is *wrong*, but a validator
checking "does the code match the design" would have nothing to check `Category`/`Class` against,
because they don't exist as code — only as a modeling convenience for this diagram.

This metamodel is still the one model both DSLs in Parts 2–3 build, in the sense of
[Stahl and Völter]'s separation of the
domain model from any one concrete syntax: the same metamodel is meant to be producible by more
than one notation. In [Fowler+]'s vocabulary (Ch. 11) this is exactly a **Semantic Model** — "the
model that's populated by a DSL" — with two distinct interfaces: an *operational* interface
(`emitters.py` reading `BlockSpec`/`InputSpec` to generate output) and a *population* interface
(the fluent builder methods in `internal_dsl.py`, which either DSL front-end calls to construct
it).

---

## Part 2 — Internal DSL

### Question 1 — Example programs

Two programs, each a subclass of `BlockInternalDSL` (Appendix: `internal_dsl.py`), together
covering every property from Part 1:

**Program A — `ButtonsInternal`** (Category, singleton Class, statement + value Blocks, pin
Param, dropdown Param, defaulted Param):

```python
class ButtonsInternal(BlockInternalDSL):
    def build(self):
        hub = self.category("Buttons", color=20).singleton_class(
            "ButtonHub", instance_name="buttons_hub")

        hub.block("__init__", tooltip="Create the button manager.")

        hub.block("add", tooltip="Add a button on a pin.") \
            .param("pin", type="Number", pin=True) \
            .param("pull", options=[("pull-down", "down"), ("pull-up", "up")]) \
            .param("debounce_ms", type="Number", default=130)

        hub.block("was_pressed", kind=BlockKind.VALUE,
                   tooltip="True once when pressed.") \
            .param("pin", type="Number", pin=True)
```

**Program B — `HCSR04Internal`** (`multiple` Class + `key_input` method reference — the one
property Program A does not exercise):

```python
class HCSR04Internal(BlockInternalDSL):
    def build(self):
        sensor = self.category("Ultrasonic", color=330).multiple_class(
            "HCSR04", key_input=True)

        sensor.block("__init__", tooltip="Create a sensor.") \
            .param("trigger_pin", type="Number", pin=True) \
            .param("echo_pin", type="Number", pin=True)

        sensor.block("distance_cm", kind=BlockKind.VALUE,
                      tooltip="Measure distance in cm.")
```

Program A exercises `singleton` instancing, dropdown options and defaults; Program B exercises
`multiple`/`key_input` instancing (the base class inserts an implicit `id` Param on every
non-constructor Block of a `multiple` Class automatically). Together they cover every property
from Part 1. (Both were run and produce output byte-identical to the equivalent hand-written
external-DSL file, `definitions/buttons.blockdef` / `definitions/hcsr04.blockdef` — see Part 2 Q3.)

### Question 2 — Host-language mechanism

The host language is Python; the DSL is ordinary classes with chainable methods — no parser, no
reflection tricks. `category()`/`singleton_class()`/`multiple_class()`/`block()`/`param()`
construct and register a child object, then return either that child (so the caller nests into
it — `.singleton_class(...)` returns the `BlockClass` to call `.block()` on) or `self` (so
`.param()` calls chain onto the same `Block`: `hub.block("add").param(...).param(...)`). Python's
keyword arguments give named, optional attributes for free (`type=`, `default=`, `pin=`,
`options=`) with no grammar to design for them — a Param's constructor signature *is* its concrete
syntax. `BlockInternalDSL.__init__` calls `self.build()` immediately, so a subclass overriding
`build()` (Programs A/B) *is* the whole program — constructing it fully populates the model,
mirroring the classic `EntityRelationInternalDSL`/`University` shape from the course example. This
is exactly the embedding technique [Hudak: ACM CSUR 1996] describes for building a DSL "on top
of" a host language rather than beside it, and the same construction style [Cunningham:08] uses
for a small internal survey DSL in Ruby: the DSL's whole "grammar" is just ordinary method
signatures and chaining, with no separate parser to write. It is also precisely what [Fowler+]
(Ch. 11) requires of a proper Semantic Model — "you should be able to populate a Semantic Model
through a command-query interface" — `BlockInternalDSL` *is* that command-query interface, with
no DSL machinery (grammar, parser) involved at all.

In [Fowler+]'s own pattern vocabulary (Ch. 4, 32–33) this is a small, named combination, not an
ad hoc design. `.param(...).param(...)` chaining is **Method Chaining** (p.373) — "make modifier
methods return the host object, so that multiple modifiers can be invoked in a single
expression"; the sequence of `hub.block(...)` statements inside `build()` is a **Function
Sequence** (p.351) — "a combination of function calls as a sequence of statements." Fowler's
stated risk with Function Sequence is that its calls are usually *bare* global functions, forcing
"a lot of Context Variables" to track parse state and leaking that state globally; the reason
this does not apply here is **Object Scoping** (p.385) — `build()` is a method on a
`BlockInternalDSL` subclass, so `self.category(...)` and `hub.block(...)` resolve against
`self`/`hub`, never against module-level globals — Fowler's own stated verdict on this pattern is
unreserved: "I find these advantages quite compelling, and thus would always suggest using
Object Scoping if you can" (p.386). The `Category`/`BlockClass`/`Block`/`Param` classes in
`internal_dsl.py` are themselves an **Expression Builder** (p.343) — "an object, or family of
objects, that provides a fluent interface over a normal command-query API" — kept as a *separate
layer* from the Semantic Model (`BlockSpec`/`InputSpec`), matching Ch. 35's own stated preference
for keeping Method Chaining "to Expression Builders... since that reduces the confusion between
conventions of fluent and command-query APIs" (never chaining directly on the model itself), and
exactly per
Fowler's own guideline to "ensure you have a well-defined Semantic Model... with command-query
interfaces that can be manipulated without any fluent constructs," with the Expression Builder
doing nothing but the population-time translation into it. (One deliberate deviation: Fowler's
own BNF-to-construct table in Ch. 4.5 maps a "homogeneous bag" grammar shape like `params*=
ParamDef` to *Literal List* or *Function Sequence* by default, suggesting `.param(a).param(b)`
should perhaps have been `.params([a, b])` instead — Method Chaining was chosen anyway because it
reads better for a small, usually-short list, which the table itself treats as guidance, not a
rule.)

**Naming the principle Method Chaining deliberately breaks.** "Command-query interface" above is
not a loose description — it names **Command-Query Separation** (CQS): every method should either
*return* a value (a query) or *change state* (a command), never both. `.param(name, **kwargs)`
does both — it mutates `Block.params` *and* returns `self` — which is exactly what makes the
chain possible. [Fowler+] (Ch. 4.1) is explicit that fluent interfaces are a deliberate, scoped
exception to CQS, not an oversight: *"Method Chaining violates [command-query separation]... I
have used many decibels disparaging people who don't follow command-query separation... But
fluent interfaces follow a different set of rules, so I'm happy to allow it there."* The scoping
matters: violating CQS on `Category`/`BlockClass`/`Block`/`Param` (the Expression Builder) is
fine because nothing outside `internal_dsl.py` ever calls their methods expecting a query;
violating it on `BlockSpec`/`InputSpec` (the Semantic Model) would be the actual mistake, which is
the other half of why the two layers stay separate.

### Question 3 — Internal or external?

For this domain, **external** is the better single choice, for reasons specific to this problem
rather than to DSL design in general:

1. **`fnName`/`className` are not mere labels — they are the literal Python identifiers the
   generator (`python_generator.py`) calls verbatim** (`sand_table_robot.SandTableRobot(...)`,
   `buttons_hub.was_pressed(...)`). Every definition file therefore has exactly one thing it must
   stay faithful to: the actual MicroPython library it wraps — which is the whole reason it needs
   checking against ground truth at all (Part 4).
2. **Parsing text into pure data is what makes that checking safe to automate.** An external
   grammar is parsed, once, offline, into a value that is *just data* — no Python object identity,
   no accidental coupling to whatever internal-DSL classes happen to be importable in the same
   process — which is exactly what makes an AST-based validity check against the real `.py`
   source (Part 4) possible to run safely at every server start. The internal DSL, by contrast,
   requires importing and *executing* an arbitrary Python module to discover its blocks
   (instantiating `ButtonsInternal()` runs Python code as a side effect of "reading" the
   definition) — heavier and less safe to run automatically and repeatedly than parsing a small
   declarative text file.
3. **The internal DSL's real advantage isn't needed here.** That advantage — full access to the
   host language's control flow to generate many similar blocks programmatically — only pays off
   when the domain benefits from it. This one is deliberately flat (Category→Class→Block→Param,
   no recursion, no cross-references), so the external DSL's isolation outweighs the internal
   DSL's expressiveness for this specific problem.
4. **[Fowler+] Ch. 6's verdict is "no general advantage either way" — and that isn't a dodge, it's
   the actual answer, worth taking seriously rather than arguing around:** *"My conclusion is that
   there is no conclusion. I don't see a clear, general advantage for internal or external
   DSLs."* Two of its specific
criteria do favor external here regardless: *"Internal DSLs are always tied to the syntax of the
host language... I'd be inclined to push that bit harder and use an external DSL if it looks like
it could make the difference"* for communicating with the non-programmer maintaining a
`.blockdef` file, and *"External DSLs allow you to [alter execution context from compile time to
runtime]... parse them at runtime, translate into a Semantic Model, and then execute that
model"* — exactly what `generate_default_artifacts()` does at every server start. But the chapter's
real payoff is methodological, not a verdict: *"Since you can use the same Semantic Model... for
both, the incremental cost of building two DSLs isn't really that great"* — which is why building
both here (Part 2 Q1) cost so little, and why they could be checked against each other at all:
Fowler+ describes testing exactly this way — *"I had multiple parsers with both internal and
external DSLs. I could test them by ensuring they create equivalent populations of the Semantic
Model"* — which is precisely how `examples/buttons_internal.py` was verified (byte-identical
`blocks.js`/`pythonic.js`/`definition.md` output against the real `.blockdef`), not a coincidence
of this write-up but the book's own recommended check.

Together, these follow the decision criteria [Marjan et al] lay out for choosing whether (and
which kind of) DSL to build: the choice should follow from the domain's own risk profile, not a
general preference for one DSL style over the other.

---

## Part 3 — External DSL

### Question 1 — EBNF

```
BlockdefFile   ::= "module" IDENT ImportDecl* ("url" STRING)? CategoryDef*
ImportDecl     ::= "import" STRING
CategoryDef    ::= "category" STRING ("color" "=" INT)? "{" CategoryEntry* "}"
CategoryEntry  ::= ClassDef | FunctionBlock
ClassDef       ::= "class" IDENT "as" ("singleton" | "multiple")
                    ("named" STRING)? ("ref" ("key_input" | "object_input"))?
                    "{" FunctionBlock* "}"
FunctionBlock  ::= "block" IDENT
                    ("label" "=" STRING)?
                    ("kind" "=" ("value" | "statement" | "hat"))?
                    ("inline" "=" BOOL)?
                    ("tooltip" "=" STRING)?
                    ("{" ParamDef* "}")?
ParamDef       ::= "param" IDENT
                    ("type" "=" ("Number" | "String" | "Boolean" | "Any"))?
                    ("default" "=" ParamDefault)?
                    "pin"?
                    ("options" "[" DropdownOpt ("," DropdownOpt)* "]")?
ParamDefault   ::= "[" ScalarDefault ("," ScalarDefault)* "]" | ScalarDefault
ScalarDefault  ::= BOOL | FLOAT | INT | STRING
DropdownOpt    ::= "(" STRING "," STRING ")"
```

This is a direct transliteration of the grammar actually used in production
(`server/block_dsl/block_grammar.tx`, implemented with textX rather than Xtext for this system —
justified in Q3). Each non-terminal is exactly one metamodel class from Part 1:
`CategoryDef→Category`, `ClassDef→Class`, `FunctionBlock→Block`, `ParamDef→Param`; each
attribute-style clause (`label=`, `type=`, `pin`, `options[...]`) is one field of that class.
Nesting in the EBNF (`CategoryDef` contains `FunctionBlock*`; `ClassDef` contains
`FunctionBlock*`; `FunctionBlock` contains `ParamDef*`) mirrors the containment associations in
the class diagram directly — the grammar has no construct that is not also a metamodel element,
and vice versa, following the same grammar-drives-the-generated-metamodel relationship
[Bettini] describes for Xtext.

### Question 2 — Left recursion

Left recursion is when a grammar rule can, through zero or more derivations, expand back into
itself as the *first* symbol of one of its own alternatives (`Expr ::= Expr "+" Term | Term`). A
recursive-descent parser — which is what Xtext long generated via ANTLR — calls `parseExpr()`,
which immediately calls `parseExpr()` again before consuming any input: it fails not by rejecting
invalid input but by never terminating on *valid* input — the same failure mode [Bettini]
describes for the ANTLR-generated parsers underlying (older) Xtext grammars.

The grammar in Q1 has no left recursion, because this domain's containment structure is a strict
tree with no operator-precedence sub-language. Left recursion would appear the moment the grammar
is extended to let a Param's `default` be a computed *expression* rather than only a literal
(e.g. `default = FRAME_W / 2` instead of a re-typed number) — the natural rule to write is the
classic left-recursive shape:

```
Expr ::= Expr "+" Expr | Expr "-" Expr | Expr "*" Expr | Expr "/" Expr | INT | IDENT
```

This matters for this problem specifically because `.blockdef` defaults already have to be kept
in sync with the wrapped library's real Python defaults by hand (exactly the drift class Part 4
addresses); a *derived* default expressed in terms of another constant removes one more way for
the two to disagree — but only if the grammar can express it. In Xtext the standard fix is to
left-factor the rule into a precedence hierarchy that consumes a token before ever recursing:

```xtext
Expr:    Term (({Add.left=current} '+' | {Sub.left=current} '-') right=Term)*;
Term:    Primary (({Mul.left=current} '*' | {Div.left=current} '/') right=Primary)*;
Primary: {NumberLit} value=INT | {ParamRef} name=ID | '(' Expr ')';
```

Each `(...)*` iteration consumes an operator and a right operand before the action
(`{Add.left=current}`) closes over what was already parsed as `left`, so the parser never
re-enters `Expr` without consuming a token — eliminating the infinite recursion while still
building a left-associative tree; `Term` before `Add`/`Sub` and `Primary` before `Mul`/`Div`
encode standard arithmetic precedence through rule order alone — the exact left-factoring
technique [Bettini] (Ch. 8, *An Expression Language*) builds for its own arithmetic DSL, down to
the `{ClassName.feature=current}` assigned-action idiom.

**Right recursion, the parsing problem, and rebuilding the AST.** Right recursion is the mirror
case: a rule's own name appears as the *last* symbol of an alternative instead of the first
(`Expr ::= Atomic '+' Expr`). Left and right recursion are not two names for the same defect,
because the failure is a property of the *parsing strategy*, not the grammar alone: a top-down,
recursive-descent parser — the strategy [Bettini] confirms Xtext generates via ANTLR's LL(\*)
algorithm — calls `parseExpr()`, which for a left-recursive rule calls `parseExpr()` again
*before* consuming a token and so never reaches a base case, but for a right-recursive rule
consumes `Atomic '+'` first and always makes progress. Xtext therefore only rejects left
recursion at grammar-build time ("The rule 'X' is left recursive"); a bottom-up (LR) parser has
the opposite bias, handling left recursion natively and needing no special treatment for right
recursion. Right recursion is not a free substitute for left recursion on its own, though — used
naively it silently changes *associativity* (below), which is exactly why the rewritten rule above
needs the explicit `{Add.left=current}` action rather than just flipping the recursion direction.

That action is precisely how the tree gets rebuilt. `Expr: Term (({Add.left=current} '+' |
{Sub.left=current} '-') right=Term)*;` is not left-recursive — `Term` is called unconditionally
before the loop ever runs — but `current` refers to whatever this rule has already built *so
far*, so each loop iteration wraps it: create a new `Add`/`Sub` node, set `left` to the
already-parsed subtree (`current`), parse a fresh `right`, and that new node becomes `current`
for the next iteration. This is a manual **AST rewrite**: the rule's surface shape is flat and
iterative, but the action reconstructs the same nested tree a genuinely left-recursive rule would
have produced, one wrap at a time.

**Associativity** falls out of `*` vs. `?` on that same shape. With `*` (repeatable), parsing
`10 + 5 + 1` wraps `10`, then `(10+5)`, then `((10+5)+1)` — left-associative. With `?` (usable
once), the only way to fit `+ 5 + 1` after `10` is for `right` itself to recurse into a fresh
`Expr`, giving `10 + (5 + 1)` — right-associative. `+`/`*` are mathematically associative so either
grouping gives the same value, but `-`/`/` are not (`(3-2)-1 ≠ 3-(2-1)`), so this is a real
semantic choice; genuinely right-associative operators (exponentiation, or assignment — `a = b =
c` parsed as `a = (b = c)`) use `?` deliberately. [Bettini]'s own SmallJava DSL (Ch. 9) hits
exactly this case: its assignment rule is written `({SJAssignment.left=current} '=' right=
SJExpression)?` — `?`, not `*` — with the book's own comment reading "// Right associativity",
contrasted directly against its member-access rule (`a.b().c.d()`), which uses `*` and is
explicitly unit-tested for LEFT associativity. Same mechanism, same assigned chapter, independent
confirmation.

**Precedence** is the orthogonal axis, encoded by layering rules rather than by any explicit
priority number: `Expr` wraps `Term`, `Term` wraps `Primary` (the grammar above), so a `*`/`/` is
always fully consumed as one unit before a `+`/`-` can grab either side of it — parsing
`10 + 5*2 - 5/1` yields `((10 + (5*2)) - (5/1))` purely from the nesting order of the rule
definitions, with no priority value anywhere in the grammar.

*Summary*: left recursion is the one case Xtext's ANTLR-based top-down parser cannot accept at
all (a build-time error, not a runtime failure); right recursion is accepted but changes
associativity if used carelessly; left-factoring (split off `Atomic`/`Primary`, wrap it
iteratively with an assigned action) removes the left recursion while the `current`-based action
manually rebuilds the tree the left-recursive rule would have produced; `*` vs. `?` on that
wrapper then chooses left- vs. right-associativity; and which rule wraps which encodes precedence.
Four independent properties the naive left-recursive rule gave for free, that left-factoring has
to re-earn one at a time.

**A related but distinct grammar-design pitfall: ambiguity resolved by syntactic predicates.**
Left recursion is a case the parser generator *rejects outright*; a genuinely ambiguous grammar is
a case it *silently resolves one way*, which is arguably more dangerous because nothing fails
loudly. [Bettini] (Ch. 9) hits this directly with the classic dangling-else problem: writing
`SJIfStatement: 'if' '(' expr ')' thenBlock=SJIfBlock ('else' elseBlock=SJIfBlock)?;` for nested
`if`s produces the build-time warning *"Decision can match input such as 'else' using multiple
alternatives... alternative(s) 2 were disabled for that input"* — Xtext's ANTLR-generated parser
picks a resolution (binding `else` to the *outer* `if`) without telling you it had a choice to
make. The fix is a **syntactic predicate**, `=>`, placed before the ambiguous token:
`(=>'else' elseBlock=SJIfBlock)?` tells the parser "if you see `else`, commit to this alternative
immediately" — binding it to the *inner* `if`, the behavior every C-like language actually has.
This grammar (Part 3 Q1) never hits this problem, but not by accident: every optional clause in
`FunctionBlock`/`ParamDef` is prefixed by its own distinct keyword (`label`, `kind`, `tooltip`,
`pin`, `options`), so no two optional clauses can ever compete for the same lookahead token the
way two adjacent `if`/`else` clauses do. Keyword-prefixing every optional clause is itself the
general technique for avoiding this class of ambiguity by construction, rather than needing a
predicate to resolve it after the fact — the dangling-else problem is what happens when that
discipline isn't followed.

### Question 3 — Code generation

Code generation walks a validated model instance — here, the parsed definition file resolved
into `Category`/`Class`/`Block`/`Param` objects — and emits *another* language's source text. In
Xtext this is an `IGenerator2.doGenerate()` implementation using Xtend templates
(`'''...«expr»...'''`), run as a compiler pass over the parsed model, not by the running target
program, following the generator pattern set out in [Bettini] and the [Xtend Documentation]:

```xtend
class BlockdefGenerator extends AbstractGenerator {
    override void doGenerate(Resource resource, IFileSystemAccess2 fsa,
                              IGeneratorContext context) {
        for (cat : resource.allContents.toIterable.filter(CategoryDef))
            for (cls : cat.entries.filter(ClassDef))
                for (blk : cls.blocks)
                    fsa.generateFile(blk.fnName + ".py.tmpl", generateCall(cls, blk))
    }

    def String generateCall(ClassDef cls, FunctionBlock blk) {
        val args = blk.params.map[name].join(', ')
        if (blk.fnName == "__init__")
            '''«cls.instanceName» = «cls.moduleName».«cls.className»(«args»)'''
        else
            '''«cls.instanceName».«blk.fnName»(«args»)'''
    }
}
```

This mirrors the actual production generator (`python_generator.py`'s `_constructor_template` /
`_method_template`, run by textX/Python rather than Xtext/Xtend here), which emits a *template
string* containing `{paramName}` placeholders; a second pass (`emitters.py`) substitutes each
placeholder with the JS expression that reads that Blockly input at runtime, since the
student-facing generation actually happens in the browser (Blockly's own JS code generators), not
at definition-parse time. [Bettini] (Ch. 5) confirms the same pipeline invariant this system
relies on: `doGenerate` "will only be called when the source program does not have any validation
errors" — generation is gated on validation having already passed, the same order `integrate.py`
assumes when it runs `library_introspect.py`'s checks before emitting anything.

The generated language is **MicroPython**, not Java/C/JS, because the generated code's only
possible execution environment is the Raspberry Pi Pico W the block controls — the *tool*
implementing this DSL can be Xtext/Java or textX/Python, but the *generated* language is fixed
by the hardware ([Tomassetti] lists textX alongside Xtext and ANTLR as one of three standard
textual-DSL toolchains, not a lesser substitute). Production uses textX rather than Xtext
specifically because the surrounding
system (the Flask server, the code-generation glue that turns definition files into JS Blockly
block definitions) is already a Python codebase; a JVM-based Xtext toolchain would add a second
language runtime purely for this one build-time step, for no benefit the domain needs — no IDE
plugin for definition-file authors is required, since they are edited by the course/library
maintainer, not by students.

Xtext would, however, be the more idiomatic tool for exactly the topic chosen in Part 4.
Cross-references are first-class in Xtext's grammar, resolved through a pluggable
`IScopeProvider`. [Bettini] (Ch. 10, *Scoping*) makes exactly this case concretely: the same
forward-reference problem is first solved with a validator check (Ch. 8) and then re-solved by
customizing the scope provider instead — after which an invalid reference simply never resolves
("Couldn't resolve reference to...") rather than being caught after the fact. So "does this
Block's `fnName` resolve to a real method on the wrapped class"
could be a proper linked reference — with IDE-integrated error markers at the exact offending
line — instead of the after-the-fact `ast.parse` plus dictionary lookup that
`library_introspect.py` performs once, at generation time. That is a genuine advantage of
choosing a tool with built-in scoping when a domain's central risk is a dangling reference; it
does not change the recommendation above, because it would only pay off with many, frequent
definition-file authors relying on that live feedback loop — the toolchain, audience, and interop
reasons still dominate for this specific system.

### textX vs. Xtext, systematically

The choice made throughout Part 3 keeps resurfacing the same underlying comparison piecemeal — it
is worth stating once, directly, rather than only through individual trade-offs.

| | **textX** | **Xtext** |
|---|---|---|
| Host platform | Pure Python (`pip install textx`) | Java/JVM, built on Eclipse EMF |
| Grammar → metamodel | Dynamically creates Python classes at metamodel-load time; no static artifact persisted | Statically generates a real Ecore metamodel — Java interfaces + implementation classes on disk |
| IDE tooling | Minimal; a community language-server add-on exists but generates no editor | Xtext *generates* a full editor from the grammar alone — syntax highlighting, content-assist, outline, go-to-definition, live validation |
| Validation | No structured framework — `obj_processors` can raise an error after parsing, with no severities or per-feature attachment | `@Check`-based framework, `error`/`warning`/`info` severities, errors attached to a specific object and feature |
| Cross-references / scoping | Present but comparatively minimal (a global registry by default); this grammar never exercises it — `block_grammar.tx` has zero cross-references | First-class `IScopeProvider`, index-based, customizable per feature, resolved during a dedicated linking phase |
| Code generation | No built-in framework — hand-write Python that walks the parsed model (exactly `python_generator.py`/`emitters.py`) | Integrated with Xtend (`IGenerator2`), gated on validation, hooked into the incremental builder |
| Runtime footprint | Just the Python process already running | A JVM, typically alongside Eclipse/Maven/Gradle tooling |

The pattern underneath all seven rows is the same one: **Xtext is a complete language
workbench** — grammar, metamodel, editor, validator, scope, and generator all come from one
declarative source and stay wired together automatically. **textX is a parser generator with a
metamodel bolted on** — it gives you the grammar-to-object-tree step and stops there; everything
past that (validation, scoping, code generation) is ordinary code you write yourself, in whatever
shape the problem needs. Neither is a strictly better tool; they're sized for different jobs.
[Tomassetti]'s own guide lists both as peer choices for exactly this reason — textX isn't a
lesser Xtext, it's a different point on the same spectrum, and this problem's actual
requirements (Python-native, one author, no IDE needed, validation and codegen small enough to
hand-write) sit closer to textX's end of it than Xtext's.

---

## Part 4 — Chosen topic

### Question 0

Validation.

### Question 1 — What, and why

Validation, in MDSD, is the step that checks a model instance against constraints the
metamodel's structure alone cannot express — well-formedness beyond "is this syntactically valid"
to "is this *meaningful* given everything else it must relate to" ([Stahl and Völter]; [DSL]). The
classic case is a reference: a grammar can require a name be an identifier, but only semantic
validation ([Bettini]'s `@Check` validators, in Xtext's terms) checks that identifier actually
resolves to something real.

I chose it because this problem has exactly that gap, and it had already caused a real, shipped
defect. A definition file's `Block.fnName`/`Class.className` are not checked against anything by
the grammar in Part 3 — textX (like Xtext) accepts `block get_year` whether or not a `get_year`
method exists on the wrapped class, because syntactic validity and semantic correctness are
different questions. `ds1302.blockdef` declared exactly this: six blocks (`get_year`,
`get_month`, `get_day`, `get_hour`, `get_minute`, `get_second`) for methods that, when I ran the
check, no longer existed on `DS1302` — the six blocks were still wired into two device toolboxes
and used in six example student projects, so any of them would generate Python raising
`AttributeError` the moment it ran on the device. Validation is what turns "trust the author to
keep the definition in sync with the library" into a check that runs automatically, every time.

This follows the same design principle [Bettini] names explicitly in Ch. 9 (citing a "Zarnekow
2012" presentation) as **"loose grammar, strict validation"**: when deciding whether to
distinguish field-selection from method-invocation directly in SmallJava's grammar, Bettini
chooses not to, keeping the grammar simple and pushing the distinction into a validator instead —
the same trade-off this problem makes by keeping `.blockdef` structurally permissive (any
`fnName` parses) and pushing library-faithfulness into `library_introspect.py`. Bettini's own
SmallJava validator has direct analogues to this problem's check: a cycle-detection check over
class hierarchies (a visited-set walk, structurally identical to any cycle-safe validator),
a duplicate-name check via a custom multi-map (contrasted with the framework's built-in
`NamesAreUniqueValidator`), and a check that a `return` statement is a block's last statement
("unreachable code") — none of these are expressible in the grammar either, for the same reason
`fnName`/arity checks are not: they depend on relating one part of the model to another, or to
something entirely outside the model. This particular parallel stopped being only conceptual:
building the same multi-map check for real (Q2) immediately found a second live defect in this
system, independent of the `ds1302` one.

**Why this had to be validation, and could not have been scoping.** Xtext offers a third
mechanism for exactly this shape of problem — a custom `IScopeProvider` restricting which
candidates a cross-reference can resolve to, generally *preferred* over validation because it
filters proactively (bad options never even resolve) rather than reactively (a bad choice is
made, then flagged). That option was never available here, for a structural reason: scoping only
applies to a grammar feature that is a genuine **cross-reference** — `feature=[Type]`, resolved
against another object *already inside the same parsed model*. A `.blockdef`'s `Block.fnName` is
not a reference into anything the grammar knows about; it is a bare string that only means
something once compared against a *second, independently-parsed* artifact — the library's AST —
that the `.blockdef` grammar has no concept of at all. Scoping presupposes the target lives in the
same model space; here it deliberately doesn't (Part 2 Q3's whole argument for keeping the
external DSL's parse a pure, isolated value depends on that separation). Validation is the only
mechanism of the three that can reach across model boundaries like this, which is exactly why it,
not scope, is the tool for this specific job.

### Question 2 — Implementation

The core (`library_introspect.py`) never imports the wrapped library — importing it would
execute MicroPython-only code (`machine.Pin`, `time.ticks_ms`) on the server — it parses it with
Python's own `ast` module and only reads structure:

```python
def validate_blocks(blocks, signatures):
    errors = []
    for block in blocks:
        declared = sum(1 for inp in block.inputs if not inp.is_instance_selector)
        methods = signatures.classes.get(block.source_class_name)
        sig = methods.get(block.source_function_name) if methods else None
        if sig is None:
            errors.append(ValidationError(block.type,
                f"'{block.source_class_name}.{block.source_function_name}' not found"))
            continue
        if declared < sig.min_required:
            errors.append(ValidationError(block.type,
                f"needs >= {sig.min_required} params, declares {declared}"))
    return errors
```

`signatures` comes from walking `ast.parse(library_source).body` for top-level
`ClassDef`/`FunctionDef` nodes and, per method, counting `args.args` (minus `self`) against
`len(args.defaults)` to get a required/total arity range. The deliberate design decision is what
is *not* checked: `Param.name` is never compared against the real Python parameter name.
`fnName`/`className` are the identifiers the generator calls, so checking their existence checks
something the generated program actually depends on — but a Param's name is only ever a
Blockly-socket label (confirmed by a real counter-example already in production:
`sand_table_robot.blockdef`'s Param `motor_shoulder` corresponds to the real parameter
`motor_shoulder_pins` — different spelling, same position), and since the generator calls
positionally with no keyword arguments, only *how many* params are declared — never what they are
called — has any bearing on correctness. Validating names anyway would reject an existing,
correct definition.

This is wired into the existing pipeline (`integrate.py`) as a warning, not a hard failure —
printed, then generation continues — matching the codebase's existing policy of never letting one
bad hardware definition take the whole toolbox down at server start. Running it against all
twelve production definition files found the `ds1302` defect above on the very first run; I
restored the six missing methods on `ds1302.py` (as one-line wrappers reading the still-correct
`get_time()` tuple) rather than deleting the blocks, since six real student example projects
already depended on them.

**A second validator, at a different layer.** `library_introspect.py` checks one `.blockdef`
against the one library it claims to wrap. It says nothing about a completely different failure
mode: the toolbox is assembled by `blockly_toolbox_generator()` (`app.py`) scanning *every*
`templates/page/blocks/definitions/*.md` file (both DSL-generated and hand-written) for `# heading`
markers and flattening them into one dictionary keyed by heading text — with no uniqueness check
at all. Two files declaring the same category, or the same block key, silently collide: whichever
file `glob.glob` happens to visit last wins, and `glob.glob`'s order is filesystem-dependent, not
alphabetical. This is exactly Bettini's duplicate-checking shape from Q1, built for real:

```python
key_sources = {}
for d in definitions:
    ...
    for index, match in enumerate(matches):
        key = match.group(1)
        ...
        definitions_map[key] = a[start:end]
        key_sources.setdefault(key, []).append(d)

for key, sources in key_sources.items():
    if key != "-" and len(sources) > 1:
        print(f" * Toolbox: duplicate definition key '{key}' in {sources} — only the last one wins")
```

Running this against the real templates immediately found **eight** live collisions, not a
hypothetical risk: `roboticsboard.md` and `alarmclock.md` were pre-DSL leftovers whose own block
keys were confirmed unreferenced by any device toolbox (via the same kind of cross-reference
check as the `ds1302` case, just against `.md` files instead of a `.py` library), fully superseded
by `roboticsboard_dsl.md`/`alarm_clock_dsl.md` — yet their colliding category heading was flipping
the "Robotics Board"/"Alarm Clock" category between a stale, untranslated version and the current
one depending on directory order. `files.md` had `uos_readblocks`/`uos_writeblocks` each defined
twice, byte-identical both times — pure accidental duplication. Both were fixed (the two stale
files deleted, the redundant duplicate chunks removed); three further collisions
(`machine.md` vs. `newMachine.md`, `sensors.md` vs. `main.md`, and a divergent
`lists_create_with` duplicate inside `main.md` itself) were investigated and characterised but
left unfixed, by explicit choice, pending a decision about which content should survive.

**What plays the role of an Xtext `Validator` class here.** Worth being precise about, since
"validator" in Xtext names a specific artifact: `.xtext` is only the *grammar*'s extension — the
validator itself is a separate `.xtend`/`.java` class with `@Check`-annotated methods (Bettini's
`SmallJavaValidator.xtend`). This project has no such generated class, so the same *role* is split
across the two functions above instead. `library_introspect.py`'s `validate_blocks()` plays the
part of a custom `@Check` method — checking a parsed block against ground truth *outside* the
grammar's own model (the library's `ast`-parsed signatures). The duplicate-key check in
`blockly_toolbox_generator()` plays the part of Xtext's *built-in* `NamesAreUniqueValidator` —
a uniqueness constraint checked across files, not against an external source. Both fall short of
one thing Xtext's validation framework gives for free: attaching an error to a specific model
element and feature so an editor can point at the exact offending line. Both of these only
`print()` a warning string — there is no location-aware reporting here, only a message and a file
path.

### Question 3 — Challenges

The main design challenge was recognising that arity, not name equality, is the only sound check.
The more obvious first design — assert every declared Param name appears in the real signature —
is actively wrong for this domain and would produce false positives on working code, because of
the `motor_shoulder`/`motor_shoulder_pins` gap above; catching this required reading the calling
convention in `python_generator.py`, not just the grammar.

The check is also structurally incomplete on purpose, and I did not try to close the gap: because
arguments are matched by *position*, no static check based on a definition file and the Python
signature alone can verify a Param is bound to the *semantically correct* real argument, only that
*enough* of them are supplied. If a definition author declared two params in the wrong relative
order (say, swapping which literal input maps to `trigger_pin` vs. `echo_pin`), both the arity
check and Python's own runtime would accept it silently — generating a running program that
quietly reads the wrong sensor, not one that crashes. Closing that gap would require the grammar
itself to change — an optional `from=` attribute on `ParamDef` naming which real parameter a
given Param is bound to, so the validator has something to check position *against* — which is a
metamodel change, not just a validation-pass change, and connects back to Part 1's
requirement-analogue discussion: name-based positional correctness is exactly the property this
domain currently leaves implicit.

The second validator (Q2) surfaced a different kind of challenge: deciding *what to do* with a
detected collision is harder than detecting it. The duplicate-key check can only say "these N
files claim the same heading" — it has no way to know which claim is the stale one. Answering
that required a second, independent check per pair (does anything still reference this file's
*other* content?), which is exactly the same "confirm against a ground truth outside the model"
move as Q1's library check, just applied to `.md` toolbox files instead of a `.py` library. Where
that independent check came back completely one-sided (`roboticsboard.md`, `alarmclock.md`: zero
live references anywhere) the fix was safe to make; where it didn't (`machine.md` vs.
`newMachine.md`, `sensors.md` vs. `main.md`) the validator correctly stopped at "collision
detected" and left the resolution to a human, rather than guessing. A duplicate-key validator is
therefore deliberately *diagnostic, not prescriptive* — a different design point on the same
"warn, don't crash" axis as Q2's arity check, but for a problem where automatically picking a
winner would be actively wrong.

---

## References cited

[Stahl and Völter], [DSL] — models as first-class, transformable artifacts; the gap between grammar and validation.
[Fowler+] (Ch. 4, 6, 11, 32–33) — Semantic Model as the shared population/operational target of both DSLs; internal-vs-external decision criteria; Method Chaining, Function Sequence, Object Scoping, and Expression Builder as the named patterns behind `internal_dsl.py`.
[Hudak: ACM CSUR 1996], [Cunningham:08] — internal/embedded DSL construction via host-language method chaining.
[Marjan et al] — criteria for choosing a DSL style to fit a domain's actual risk profile.
[Bettini], [Xtext Documentation], [Xtend Documentation] — Xtext grammar/left-recursion/right-recursion/associativity/ambiguity(dangling-else)/scoping/code-generation mechanics.
[Tomassetti] — textual-DSL tool landscape (ANTLR/Xtext/textX as peer choices).