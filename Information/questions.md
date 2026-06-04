# Open-ended exam preparation document

## Part 0 - The problem to be solved

### Question 1: What is the problem you will use during this exam?

**Title:** A language-agnostic metamodel for generating Blockly blocks

The problem I will use during this exam is the design of a domain-specific language and metamodel for describing how programming libraries can be represented as Blockly blocks.

The existing system already used Blockly as a visual programming environment. However, adding support for new libraries manually required several connected artefacts to be created and kept consistent. These artefacts included Blockly block definitions, toolbox entries, Python generator code, imports, input types, default values, dropdowns, pin handling, and object instance handling. This manual process was repetitive and error-prone because the same information had to be represented in several different places.

The goal of the solution is to use a model-driven software development approach where a compact DSL describes the relevant concepts of a Blockly block library. The metamodel is designed to be language-agnostic, meaning that it is not tied to one specific source programming language. Instead, it captures concepts that are generally needed when turning library functions and classes into visual blocks. These concepts include modules, imports, categories, classes, functions, parameters, block kinds, input types, default values, output types, dropdown options, and instance references.

I chose `.yaml` as the concrete syntax because it is readable, declarative, and works well with JSON Schema validation. JSON Schema makes it possible to catch many structural errors early and potentially provide live feedback while writing the block-definition model. Examples include missing required fields, invalid property names, invalid block kinds, invalid parameter structures, and defaults that do not match declared types.

Another reason for using a separate `.blockdef.yaml` file is separation of concerns. The MicroPython file remains a normal library file that can still be uploaded to and used on the microcontroller. The `.blockdef.yaml` file only describes which parts of that library should be exposed as Blockly blocks and how they should appear in the editor. In this way, the DSL does not replace MicroPython; it describes the interface between MicroPython libraries and Blockly.

Using the course terminology, the M2 level is my metamodel: the structure that defines valid block-definition models. The M1 level is a concrete model written using the DSL, for example a `.blockdef.yaml` file for a sand table robot, a display, or a real-time clock. The parsed in-memory `BlockdefFile` object graph is also M1, because it is the same model represented as abstract syntax instead of concrete syntax. The M0 level is the generated and runtime system, including rendered Blockly blocks, generated Python or MicroPython code, and runtime objects.

The main problem is therefore to reduce manual duplication and inconsistency when creating Blockly support for programming libraries. By modeling the important concepts once and generating the required artefacts from the model, the solution becomes more reusable, consistent, and aligned with model-driven software development.

---

## Part 1 - Possible questions about metamodeling and critical concepts

### Possible question: What are the critical concepts/properties you model from The Problem? Why are they important?

Important concepts to mention:

* `BlockdefFile`

  * Represents one complete block-library description.
  * Contains module name, imports, URL, and categories.
* `ImportSpec` / imports

  * Needed so generated Python/MicroPython code knows which library to import.
* `CategoryDef`

  * Represents a Blockly toolbox category.
  * Important for organizing blocks in the visual editor.
* `ClassDef`

  * Represents a source-library class exposed as Blockly blocks.
  * Has two important variants: singleton and multiple.
* `SingletonClassDef`

  * Used when a library should have one shared instance, such as a clock or robot object.
* `MultipleClassDef`

  * Used when many instances of the same class can exist and must be selected by an ID or object reference.
* `FunctionBlockDef`

  * Represents a function or method that becomes a Blockly block.
  * Important because it connects the library API to the visual block.
* `ParamDef`

  * Represents configurable inputs on a block.
  * Especially important because the same parameter affects the block UI, toolbox shadow, and generated Python code.
* `ValueParamDef`

  * Normal value input, optionally type checked.
  * Has a `keyword` flag: when true, the generated argument uses named syntax such as `sck=Pin(18)` instead of a positional argument. Required for MicroPython bus protocols like SPI and I2C.
* `PinParamDef`

  * Hardware-specific pin input with `pin_mode: input | output | any`.
  * Generates `Pin(n, Pin.OUT)` or `Pin(n, Pin.IN)` — wraps the integer in a MicroPython `Pin` object.
  * Also has a `keyword` flag.
* `LegacyPinParamDef`

  * Like `PinParamDef` but passes the raw integer directly without any `Pin()` wrapping.
  * Exists for older library interfaces that accept a plain pin number.
* `DropdownParamDef`

  * Fixed-choice input rendered as a Blockly dropdown.
  * Contains `DropdownOption*` (label/value pairs).
* `BlockKind`

  * Describes whether a block is a statement, value, or hat block.
* `output_type` and `supertype`

  * Provide type-like compatibility between blocks.
* `instance_mode` and `method_ref`

  * Decide how method blocks call the correct object instance.

Answer idea:

* Start by saying the metamodel captures the interface between a programming library and Blockly.
* Explain that the goal is not to model all of MicroPython, but only the concepts needed to generate Blockly artefacts.
* Emphasize that the parameter concept is central because it appears in all generated artefacts.
* Mention that the metamodel was shaped by representative examples such as DS1302, DFPlayer, PicoRobotics, ST7735S, and the sand table robot.

Strong quote from `blockdef_ast.py` docstring (use this in the exam):

> "Mutually exclusive alternatives (singleton vs multiple, value vs pin vs dropdown) are encoded as separate classes rather than mode flags on a shared struct — following the MDSD principle that alternatives in a rule generate subclasses in the metamodel."

### Possible question: Explain M2, M1, and M0 in your project.

Answer idea:

* M2 is the block-definition metamodel:

  * UML metamodel
  * JSON Schema
  * grammar/EBNF
  * Python dataclass definitions such as `BlockdefFile`, `CategoryDef`, `ClassDef`, `FunctionBlockDef`, and `ParamDef`
* M1 is a concrete block-definition model:

  * a `.blockdef.yaml` file, such as `sand_table_robot.blockdef.yaml`
  * the parsed `BlockdefFile(...)` object graph in memory
  * both are M1 because they are concrete syntax and abstract syntax for the same model
* M0 is the generated/runtime level:

  * rendered Blockly block instances
  * generated MicroPython code
  * runtime objects on the microcontroller

Key sentence:

* Parsing does not change the meta-level. It changes representation from concrete syntax to abstract syntax.

### Possible question: Which representative examples did you use to design the metamodel?

Answer ideas:

* Mention examples:

  * DS1302 real-time clock
  * DFPlayer audio player
  * PicoRobotics board
  * ST7735S display
  * sand table robot
* Explain that they revealed common properties:

  * modules/imports
  * categories
  * classes and functions
  * constructor blocks
  * method blocks
  * parameters
  * pins
  * dropdowns
  * singleton/multiple instances
  * value blocks and statement blocks
* Explain that examples helped keep the DSL scoped:

  * It is not a general programming language.
  * It describes the Blockly interface to libraries.

### Possible question: Draw or describe your metamodel.

Answer structure:

* `BlockdefFile` contains `ImportSpec*` and `CategoryDef*`.
* `CategoryDef` contains `ClassDef*` and top-level `FunctionBlockDef*`.
* `ClassDef` is abstract/supertype for `SingletonClassDef` and `MultipleClassDef`.
* `ClassDef` contains `FunctionBlockDef*`.
* `FunctionBlockDef` contains `ParamDef*`.
* `ParamDef` is abstract/supertype for `ValueParamDef`, `PinParamDef`, `LegacyPinParamDef`, and `DropdownParamDef`.
* `DropdownParamDef` contains `DropdownOption*`.

UML relation ideas:

* Use composition for containment:

  * `BlockdefFile` owns categories.
  * `CategoryDef` owns classes/blocks.
  * `FunctionBlockDef` owns parameters.
* Use generalization for alternatives:

  * `SingletonClassDef` and `MultipleClassDef` inherit from `ClassDef`.
  * parameter variants inherit from `ParamDef`.

---

## Part 2 - Possible questions about DSL syntax, grammar, AST, and representation

### Possible question: Describe your DSL syntax and how it maps to the metamodel.

Answer ideas:

* The concrete syntax is YAML.
* The YAML file is declarative: it describes what blocks should exist, not how to generate them step by step.
* Map syntax to metamodel:

  * `module` → `BlockdefFile.module`
  * `imports` → `ImportSpec`
  * `categories` → `CategoryDef`
  * `classes` → `ClassDef`
  * `blocks` → `FunctionBlockDef`
  * `params` → `ParamDef`
  * `type` → input type/check type
  * `kind` → statement/value/hat
  * `instance_mode` → singleton/multiple behavior

Example answer:

* The concrete `.blockdef.yaml` file is M1 concrete syntax.
* The parsed `BlockdefFile` object graph is M1 abstract syntax.
* Both represent the same model.

### Possible question: Why did you choose YAML? / Why did you switch to YAML and JSON Schema?

This is an important design decision with two parts: technical fit and the live-feedback motivation.

**The earlier approach and why we moved away from it:**

Before the YAML DSL, the system had an annotation-based pipeline (`DefaultPipeline`) that scanned Python source files directly using `CommentAnnotationScanner` and `PythonAstSourceExtractor`. Block definitions were embedded as comments or metadata inside the MicroPython library files.

This approach had several problems:

* Block interface descriptions were mixed with MicroPython implementation code.
* There was no schema — structural errors were only discovered when the pipeline ran, not while writing.
* No live feedback in the editor: typos in annotation keys, wrong block kinds, or missing fields were invisible until runtime.
* The Python source file became harder to read and upload as a standalone library.

**Why YAML + JSON Schema was the right switch:**

* YAML is readable and declarative. It describes what should exist, not how to create it step by step.
* JSON Schema can validate the YAML file's structure. Editors such as VSCode with the YAML extension can show inline red underlines, completion suggestions, and error messages in real time as the developer types the block-definition model.
* This is the live-feedback argument: by connecting JSON Schema to the `.blockdef.yaml` file, errors are caught as early as possible — before the pipeline even runs.
* Examples of errors caught at authoring time: missing required `fn` field, invalid `kind` value, wrong parameter structure, default value that doesn't match the declared type.

**The separation of concerns argument:**

* The `.blockdef.yaml` file is separate from the MicroPython library file.
* The MicroPython file remains a clean, standalone library that can be uploaded to the microcontroller.
* The YAML file only describes which parts of that library should appear as Blockly blocks and how they should look.
* The DSL does not replace MicroPython — it describes the interface between MicroPython libraries and Blockly.

Strong sentence:

* The YAML model describes the Blockly interface to the MicroPython library, while the MicroPython file remains the executable implementation used on the microcontroller.

Strong exam argument:

* The switch from annotation scanning to YAML + JSON Schema was driven by the desire for early error detection and live authoring feedback. This directly improved the programming experience for developers who add new block libraries.

### Possible question: What is the AST for a concrete example?

Answer ideas:

Use a sand table robot example:

* `blockdef1 : BlockdefFile`

  * `module = "sand_table_robot"`
* `category1 : CategoryDef`

  * `name = "Sand Table Robot"`
* `class1 : SingletonClassDef`

  * `name = "SandTableRobot"`
  * `instance_name = "robot"`
* `block1 : FunctionBlockDef`

  * `fn = "__init__"`
* `block2 : FunctionBlockDef`

  * `fn = "line"`
* `param1 : ValueParamDef`

  * `name = "x"`
  * `type = "Number"`
* `param2 : ValueParamDef`

  * `name = "y"`
  * `type = "Number"`

Important point:

* This is an object diagram, not a class diagram.
* It shows one concrete M1 model as instances of the M2 metamodel classes.

### Possible question: Where do EBNF, grammar, and schema belong?

Answer ideas:

* They belong to M2 from the perspective of the block-definition DSL.
* They define rules for valid models.
* A concrete `.blockdef.yaml` belongs to M1.
* The parsed object graph also belongs to M1.
* The parser/generator pipeline is implementation, not M1 itself.

### Possible question: How does textX differ from Xtext?

Answer ideas:

* Xtext:

  * Java/Eclipse/EMF ecosystem.
  * Can infer Ecore/EMF metamodel from grammar.
  * Strong IDE/editor tooling.
  * Used in the course examples.
* textX:

  * Python ecosystem.
  * Grammar produces Python parser and Python object graph.
  * Fits better with Python/Flask backend.
* Why textX/Python-style tooling made sense:

  * The existing system was already Python/Flask-based.
  * Avoided introducing Java/Eclipse infrastructure.
  * Still followed the same conceptual pipeline:

    * grammar/schema
    * parsing
    * model/AST
    * validation
    * model transformation
    * code generation

### Possible question: Internal vs external DSL.

Answer ideas:

* Internal DSL:

  * embedded in a host language
  * can use fluent API or builder pattern
  * easy to integrate but limited by host syntax
* External DSL:

  * separate representation
  * parsed into model
  * better fit for validation and generation
* Your current DSL is external:

  * `.blockdef.yaml` is separate from the MicroPython source file
  * parsed/validated before generation
  * declarative and language-agnostic

---

## Part 3 - Possible questions about code generation and transformation

### Possible question: What does your generator produce?

Answer:

From one M1 `.blockdef.yaml` model, the implementation generates:

* Blockly block definition JavaScript (`emit_blockly_blocks_js`)

  * visual shape of each block
  * labels, inputs, colors, tooltips
  * statement/value/hat behavior
  * for value blocks with `supertype`: emits `setOutput(true, ["Color565", "Number"])` — this means the block satisfies both types in Blockly, implementing a simple subtype relationship
* Python generator JavaScript (`emit_python_generators_js`)

  * how placed Blockly blocks become Python/MicroPython code
  * imports, pin setup, and instance registries are hoisted to `Blockly.Python.definitions_[key]` so they appear exactly once at the top of the generated file, regardless of how many blocks use them
  * pin parameters generate `Pin(n, Pin.OUT)` or `Pin(n, Pin.IN)` automatically
  * keyword parameters generate `name=value` syntax, required for bus protocols like SPI/I2C
* Toolbox definition (Markdown file with embedded XML) (`emit_definition_markdown`)

  * a `.md` file containing XML entries for each block
  * pre-filled shadow blocks are generated automatically from the declared parameter types: `Number` → `math_number` shadow, `Boolean` → `logic_boolean`, `SPI`/`I2C` → complex hardware shadow blocks
  * install-library buttons if needed

Answer idea:

* The same model information is reused in several outputs.
* This avoids manual duplication.
* A parameter is modeled once but appears in:

  * Blockly input
  * toolbox shadow block (pre-filled default value)
  * generated Python argument

### Possible question: Explain the transformation from model to output.

Answer structure:

* Input:

  * M1 model: the raw `.blockdef.yaml` file.
* Step 1 — JSON Schema validation:

  * Validates structure: required fields, allowed values, `oneOf` alternatives, compatible defaults.
  * Catches errors before any AST is built.
* Step 2 — Parse to typed AST:

  * Builds `BlockdefFile`, `CategoryDef`, `SingletonClassDef`/`MultipleClassDef`, `FunctionBlockDef`, and `ParamDef` variants.
  * This is still M1 — the AST is the abstract syntax of the same model.
* Step 3 — Semantic validation:

  * Checks rules that require understanding the model, not just its structure.
  * Examples: duplicate names, `__init__` only inside a class, valid type references, circular shadow recursion (a block's `output_type` must not appear as a param type on the same block), supertype only valid on value blocks.
* Step 4 — Model-to-model transformation (AST → generation model):

  * `FunctionBlockDef` + class context → `BlockSpec`
  * `ParamDef` variants → `InputSpec`
  * Class instance mode → `InstanceReferenceSpec`
  * Function + template → `GeneratorSpec`
  * Categories → `ToolboxCategory`
* Step 5 — Model-to-text emission:

  * `BlockSpec` → Blockly block definition JS
  * `GeneratorSpec` + `BlockSpec` → Python generator JS
  * `BlockSpec` + `ToolboxCategory` → toolbox Markdown/XML

The key difference between steps 4 and 5:

* Step 4 is model-to-model: one typed object graph becomes another typed object graph.
* Step 5 is model-to-text: the generation model becomes string output.

### Possible question: Template-based or transformation-based generation?

Answer idea:

* It is a combination.
* First, the implementation performs a model-to-model transformation:

  * `FunctionBlockDef` and `ParamDef` become `BlockSpec`, `InputSpec`, and `GeneratorSpec`.
* Then, the emitters perform template-like text generation:

  * insert model values into JavaScript/XML/Markdown structures.
* Best phrase:

  * model transformation followed by template-like text emission.

### Possible question: Model-aware or model-ignorant generation?

Answer idea:

* Blockly artefacts are mostly model-aware:

  * generated blocks still reflect categories, block types, inputs, and output types.
* Final MicroPython code is more model-ignorant:

  * it becomes ordinary method calls such as `robot.line(x, y)`.
* Strong answer:

  * The generated Blockly layer preserves model concepts, while the final generated MicroPython lowers the model into normal library calls.

### Possible question: Why is code generation useful for your problem?

Answer ideas:

* Manually adding a library requires editing several files.
* These files must agree about:

  * block names
  * parameters
  * imports
  * types
  * generated Python calls
* Generation makes one model the source of truth.
* Reduces inconsistency.
* Makes it easier to add future libraries.
* Fits MDSD because the model becomes an active development artefact.

### Possible question: How do you separate generated and handwritten code?

Answer ideas:

* Handwritten:

  * MicroPython library file
  * existing Blockly/Flask platform
* Generated:

  * block definition JS
  * Python generator JS
  * toolbox definitions
* The generated files should not be manually edited.
* Changes should be made in the `.blockdef.yaml` model and then regenerated.
* This supports maintainability.

---

## Part 4 - Chosen topic

### Question 0: Which topic do you choose to answer this part?

**The Topic:** Live feedback for DSL authors — giving the developer immediate error information while writing block-definition models

For Part 4, I will focus on the live feedback extension of my DSL pipeline. The goal of this individual extension is to give developers writing `.blockdef.yaml` files immediate, actionable feedback rather than waiting until the full pipeline runs.

The original motivation was that the previous annotation-based approach had no feedback at authoring time. Errors in block structure, wrong field names, or invalid values were only discovered when the pipeline ran. The switch to YAML + JSON Schema changed this: by connecting a JSON Schema to the `.blockdef.yaml` format, editors such as VSCode (with the YAML extension) can show inline red underlines, required-field warnings, and completion suggestions in real time as the developer types.

This extension connects to several course topics. First, it raises the question of what can and cannot be validated through a schema alone, which connects to the distinction between well-formedness (context-free, checkable by grammar/schema) and validity (context-sensitive, requires semantic analysis). Second, it involves scope and reference resolution, because the live feedback layer is limited by what the schema can see without running the full semantic pass. Third, it connects to programming experience (PX), because catching errors earlier and in context reduces friction and cognitive load for the developer adding new libraries.

The live feedback works in two layers:

1. **JSON Schema layer** — structural rules checked instantly in the editor while typing
2. **Semantic validation layer** — context-sensitive rules checked when the pipeline runs

### Possible Part 4 question: Describe the live feedback extension. What can be validated live and what cannot?

This is the central question for Part 4.

**What live feedback means:**

When a developer opens a `.blockdef.yaml` file in VSCode with the YAML extension and a JSON Schema linked, the editor validates the file structure in real time. Errors appear as red underlines while the developer is still typing, before any pipeline code runs.

**Layer 1 — What JSON Schema CAN validate (live, in the editor):**

These are context-free structural rules. They can be checked by looking at one field in isolation or within its immediate container:

* Missing required fields — e.g. a block definition without `fn`
* Invalid field names — typos such as `catagory` instead of `category`
* Invalid enum values — e.g. `kind: diagonal` is rejected because only `value`, `statement`, and `hat` are valid
* Invalid `instance_mode` values — only `singleton` and `multiple`
* Invalid `pin_mode` values — only `input`, `output`, and `any`
* Type of `color` — must be an integer, not a string
* `oneOf` alternatives for parameter kinds — exactly one of value/pin/legacy-pin/dropdown must match; having both `pin_mode` and `options` on the same parameter is rejected immediately
* Default value type compatibility — if `type: Number` and `default: "hello"`, JSON Schema can flag the mismatch
* `output_type` and `kind` relationship — the schema uses `if/then` to enforce that `output_type` is only valid on `kind: value` blocks
* `supertype` requires `output_type` — expressed as an `if/then` constraint in the schema

**Layer 2 — What CANNOT be validated live (requires the full semantic pass):**

These are context-sensitive rules. They require understanding the whole model, or multiple parts of it at once:

* **Duplicate names** — JSON Schema cannot check whether two category names, class names, function names, or parameter names are identical within their container. This requires comparing siblings, which is beyond JSON Schema's reach.
* **Cross-block type references** — if a parameter declares `type: Color565`, JSON Schema cannot check whether any other block in the same file or any other file defines `output_type: Color565`. This requires knowing the full set of defined output types.
* **`__init__` placement** — JSON Schema cannot tell whether a function named `__init__` is inside a class or at the top level of a category. The schema allows it syntactically anywhere; the semantic pass rejects it at category level.
* **Circular shadow recursion** — a block's `output_type` must not appear as a param type on the same block, because this would create infinitely nested shadow blocks. This requires comparing the block's output type against its own parameter types — cross-property within one block, not expressible in JSON Schema.
* **Orphaned output types** — a block declares `output_type` but no other parameter in the file references that type. JSON Schema cannot detect this unused declaration.
* **Instance reference correctness** — whether a singleton class has a meaningful `instance_name`, or whether a multiple-instance class method correctly resolves to a real object, requires running the semantic model.
* **Cross-file type resolution** — whether a referenced type (e.g. `SPI`) is actually provided by the Blockly platform or by another `.blockdef.yaml` file requires runtime knowledge of registered types.

**Scope of the live feedback:**

The JSON Schema layer operates on one file at a time and only sees the structure of that file. It cannot:

* See other `.blockdef.yaml` files
* Know which MicroPython modules are installed on the device
* Know which Blockly blocks already exist in the system
* Validate that the generated code will actually run correctly on the microcontroller

**Summary table — what is checked where:**

| Rule | JSON Schema (live) | Semantic pass (pipeline) |
|---|---|---|
| Missing required field | Yes | Yes |
| Invalid enum value | Yes | Yes |
| `oneOf` param alternative | Yes | Yes |
| Default type mismatch | Yes | Yes |
| `output_type` needs `kind: value` | Yes (if/then) | Yes |
| Duplicate names | No | Yes |
| Cross-block type references | No | Yes |
| `__init__` at wrong level | No | Yes |
| Circular shadow recursion | No | Yes |
| Cross-file type references | No | Yes (partially) |
| Generated code correctness | No | No (runtime only) |

**Strong exam answer:**

The live feedback extension shows that not all validation can be done at the grammar or schema level. Well-formedness rules (structure, required fields, allowed values) can be checked live by JSON Schema. Validity rules (semantic correctness, cross-references, context-sensitive constraints) require a semantic pass over the full parsed model. This two-level split is a fundamental idea in DSL design: the grammar defines what can be parsed, but validation defines what makes sense.

---

### Possible Part 4 question: How do you use validation?

Answer ideas:

* Validation happens after parsing.
* It checks semantic correctness.
* Examples:

  * duplicate category names
  * duplicate class names within a category
  * duplicate function names within a class
  * duplicate parameter names within a block
  * `__init__` used outside a class (only valid as a constructor inside a class)
  * default values incompatible with the declared type (e.g. `default: "hello"` on `type: Number`)
  * unknown custom types (a param declares `type: Color565` but no value block with `output_type: Color565` exists)
  * `supertype` used on a non-value block or without `output_type`
  * circular shadow recursion: a block's own `output_type` must not appear as a param type on the same block, because that would create an infinitely nested shadow block
  * orphaned output types: a block declares `output_type` but nothing ever uses it as a param type (warned, not error)
* Explain:

  * JSON Schema/grammar defines what can be parsed (well-formedness)
  * Semantic validation defines what makes sense in context (validity)
  * This two-level split is a key architectural decision: some rules are context-free (schema can check them), others are context-sensitive (require understanding the whole model)

### Possible Part 4 question: How do scope and references appear?

Answer ideas:

* Singleton classes:

  * The `SingletonClassDef.instance_name` is a fixed identifier in the model.
  * Generated code calls `robot.method(...)` or `ds1302.method(...)` using that fixed name.
  * Resolved via `InstanceReferenceSpec` with `mode=FIXED_NAME`.
* Multiple classes:

  * The user provides an ID input at runtime to select which instance to call.
  * Generated code uses a dictionary/registry: `instances[id].method(...)`.
  * The dictionary is hoisted to `Blockly.Python.definitions_` so it is initialized once.
  * Resolved via `InstanceReferenceSpec` with `mode=KEY_INPUT`.
* Type references:

  * An input parameter declares `type: SPI`.
  * A value block must declare `output_type: SPI` to match.
  * The semantic validation phase checks that every referenced type has a corresponding output block, or is a known platform type (SPI, I2C, UART) or built-in type (Number, String, Boolean).
* `InstanceReferenceSpec` is the key model class that captures how method calls resolve their instance. It is built from the class context during the AST→BlockSpec transformation.

Strong phrase:

* In my DSL, scope is mostly about resolving model references — which method belongs to which instance, which ID selects a multiple instance, which output type is valid for a given input — not about lexical variable lookup.

### Possible Part 4 question: How do type-system ideas appear?

Answer ideas:

* Not a full type system.
* Type-like checking:

  * `Number`
  * `String`
  * `Boolean`
  * `Any`
  * custom `output_type`
  * `supertype`
* Benefits:

  * prevents invalid block connections
  * gives better feedback
  * reduces invalid generated code
* Example:

  * a number input should not receive a boolean block unless allowed.

### Possible Part 4 question: How would you test the implementation?

Answer ideas:

* Parser/schema tests:

  * valid models parse
  * invalid structures fail
* Semantic validation tests:

  * duplicate names
  * invalid defaults
  * invalid references
  * invalid constructor usage
* Transformation tests:

  * DSL model produces expected `BlockSpec` and `InputSpec`
* Snapshot tests:

  * generated JS/XML/Markdown matches expected output
* Integration tests:

  * generated blocks load in Blockly
  * generated Python code looks correct
* Representative examples:

  * DS1302
  * DFPlayer
  * PicoRobotics
  * ST7735S
  * sand table robot

### Possible Part 4 question: How does your implementation improve PX?

Answer ideas:

* Developer writes one block-definition model instead of several files.
* Validation gives earlier feedback.
* Less cognitive load.
* The DSL concepts match Blockly concepts:

  * categories
  * blocks
  * inputs
  * labels
  * tooltips
* End users get more consistent visual blocks.

### Possible Part 4 question: Does program analysis appear?

Answer ideas:

* Not full data-flow analysis.
* Validation is a simpler static analysis over the model.
* The model is analyzed before generation.
* Future extensions:

  * detect unused imports
  * check incompatible generated calls
  * optimize toolbox definitions
  * analyze block compatibility
  * detect unreachable/generated-invalid blocks
