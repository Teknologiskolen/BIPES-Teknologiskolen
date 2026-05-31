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
* `PinParamDef`

  * Hardware-specific pin input, useful for MicroPython GPIO behavior.
* `DropdownParamDef`

  * Fixed-choice input rendered as a Blockly dropdown.
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

### Possible question: Why did you choose YAML?

Answer ideas:

* YAML is readable and compact.
* YAML is declarative and works well as a configuration/model format.
* JSON Schema can validate YAML once parsed as structured data.
* JSON Schema enables live feedback:

  * missing required fields
  * wrong property names
  * invalid block kinds
  * invalid parameter modes
  * incompatible default values
* YAML separates block description from MicroPython implementation.
* The MicroPython file can still be uploaded to the microcontroller.
* The YAML file only says which functions/classes should become Blockly blocks.

Strong sentence:

* The YAML model describes the Blockly interface to the MicroPython library, while the MicroPython file remains the executable implementation.

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

* Blockly block definition JavaScript

  * visual shape of each block
  * labels, inputs, colors, tooltips
  * statement/value/hat behavior
* Python generator JavaScript

  * how placed Blockly blocks become Python/MicroPython code
* Toolbox definition Markdown/XML

  * where blocks appear in Blockly
  * default shadow blocks
  * install-library buttons if needed

Answer idea:

* The same model information is reused in several outputs.
* This avoids manual duplication.
* A parameter is modeled once but appears in:

  * Blockly input
  * toolbox shadow block
  * generated Python argument

### Possible question: Explain the transformation from model to output.

Answer structure:

* Input:

  * M1 model, either YAML or parsed object graph.
* Step 1:

  * Validate schema/structure.
* Step 2:

  * Build typed AST objects such as `BlockdefFile`, `CategoryDef`, `FunctionBlockDef`, and `ParamDef`.
* Step 3:

  * Semantic validation.
* Step 4:

  * Transform AST into generation model:

    * `BlockSpec`
    * `InputSpec`
    * `ToolboxCategory`
    * `GeneratorSpec`
* Step 5:

  * Emit textual artefacts:

    * Blockly JS
    * Python generator JS
    * toolbox Markdown/XML

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

**The Topic:** Implementation of converting Python/MicroPython library descriptions into Blockly blocks

For Part 4, I will focus on the implementation of my DSL pipeline for converting Python/MicroPython library descriptions into Blockly blocks. This is my individual extension.

The implementation takes a block-definition model and transforms it into the artefacts needed by the existing Blockly system. The pipeline parses the DSL model, validates it, transforms it into an internal semantic generation model, and then emits Blockly block definitions, Python generator JavaScript, and toolbox definitions.

This topic allows me to discuss several concepts from the second half of the semester. First, I can discuss validation, because not every rule should be encoded directly in the grammar or schema. Some rules are semantic and should be checked after parsing. For example, a multiple-instance class should have a valid instance identifier, label placeholders should refer to existing parameters, default values should match declared types, output types should only be used where they make sense, and `__init__` should only be used as a constructor inside classes.

Second, I can discuss scope and reference handling. My DSL does not have complex lexical scope like a general-purpose programming language, but it still has reference problems. A method block must know which object instance it should call. For singleton classes, this can be resolved to a fixed instance name. For multiple-instance classes, the method block needs an instance selector such as an ID, so the generated code can call the correct object.

Third, I can discuss type-like checking. The DSL supports input types such as `Number`, `String`, `Boolean`, and `Any`, and it also supports custom output types. This is not a full type system, but it uses type-system ideas to restrict which Blockly blocks can connect and to prevent invalid generated code.

Fourth, I can discuss testing. The implementation can be tested at several levels: valid DSL models should parse successfully, invalid models should be rejected by validation, generated artefacts can be compared with expected output, and generated Blockly/Python behavior can be tested using representative examples.

Finally, I can discuss programming experience. The implementation improves the developer experience for adding new Blockly libraries. Instead of manually editing several connected files, a developer can describe the library once in a compact DSL model and generate the required artefacts automatically. It also improves the end-user experience because generated blocks can have consistent categories, labels, tooltips, default values, and type restrictions.

### Possible Part 4 question: How do you use validation?

Answer ideas:

* Validation happens after parsing.
* It checks semantic correctness.
* Examples:

  * duplicate category names
  * duplicate class names
  * duplicate function names
  * duplicate parameter names
  * invalid `__init__` placement
  * default values incompatible with declared type
  * unknown custom types
  * invalid output type/supertype combinations
  * invalid placeholder references
* Explain:

  * grammar/schema defines what can be parsed
  * validation defines what makes sense

### Possible Part 4 question: How do scope and references appear?

Answer ideas:

* Singleton classes:

  * fixed instance name
  * generated code calls `robot.method(...)` or `ds1302.method(...)`
* Multiple classes:

  * ID input selects instance
  * generated code can use a registry/dictionary
* Custom types:

  * input type must match a block output type
* Strong phrase:

  * In my DSL, scope is mostly about resolving model references, not lexical variable lookup.

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
