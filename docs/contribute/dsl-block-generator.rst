.. _dsl-block-generator:

Block Generator DSL
===================

Overview
--------

The **Block Generator DSL** is the preferred way to add new hardware-driver
blocks to BIPES. Instead of manually writing Blockly JS definitions, Python
code generators, toolbox XML, and definitions files — which must stay in sync
across four separate locations — you write a single ``.blockdef.yaml`` file.
The pipeline reads that file and generates all four artefacts automatically.

.. code-block:: text

   server/dsl/definitions/mydevice.blockdef.yaml
         │
         ▼  (BlockdefParser)
   BlockdefFile AST  ──▶  semantic validation
         │
         ▼
   list[BlockSpec]
         │
         ├──▶  emitters.emit_blockly_blocks_js()
         │         → Blockly.Blocks["mydevice__create"] = { init: … }
         │
         ├──▶  emitters.emit_python_generators_js()
         │         → Blockly.Python["mydevice__create"] = function(block) { … }
         │
         └──▶  emitters.emit_definition_markdown()
                   → templates/page/blocks/definitions/mydevice_dsl.md


Anatomy of a ``.blockdef.yaml`` file
-------------------------------------

Here is the complete `ds1302.blockdef.yaml` as an annotated reference:

.. code-block:: yaml

   # yaml-language-server: $schema=./blockdef_schema.json

   module: ds1302            # Python module name (valid identifier)
   imports:
     - from: ds1302
       names: [DS1302]       # generates: from ds1302 import DS1302
   url: "https://github.com/micropython/micropython"

   categories:
     - name: DS1302          # Blockly toolbox category label
       color: 35             # Hue (0–360)
       classes:
         - name: DS1302
           instance_mode: singleton   # one shared instance
           instance_name: ds1302     # Python variable name for that instance
           blocks:
             - fn: __init__
               tooltip: Create a DS1302 RTC instance.
               params:
                 - name: clk_pin
                   pin_mode: output  # wrapped in Pin(n, Pin.OUT)
                 - name: dat_pin
                   pin_mode: any
                 - name: rst_pin
                   pin_mode: output

             - fn: get_time
               kind: value           # returns a value (output block)
               tooltip: Read the current time tuple from the RTC.

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


Core concepts
-------------

Categories and classes
^^^^^^^^^^^^^^^^^^^^^^

A **category** groups related blocks under a Blockly toolbox heading.

A **class** maps directly to a MicroPython class (e.g. ``DS1302``,
``ST7735S``). Every block in a class becomes a method call on an instance of
that class.

Instance modes
^^^^^^^^^^^^^^

A class is either ``singleton`` or ``multiple``:

.. list-table::
   :header-rows: 1
   :widths: 20 40 40

   * - Mode
     - Meaning
     - Example
   * - ``singleton``
     - One shared instance; variable name fixed at author time via
       ``instance_name``.
     - ``ds1302 = DS1302(clk, dat, rst)`` — every method call uses the
       same ``ds1302`` variable.
   * - ``multiple``
     - Many instances; user picks an ID number in the block.
     - ``dfplayer_instances[1] = DFPlayer(uart)`` — the user can create
       instances 1, 2, … and methods target a chosen ID.

Block kinds
^^^^^^^^^^^

Every entry in a ``blocks`` list is one of:

.. list-table::
   :header-rows: 1
   :widths: 15 40 45

   * - Kind
     - Shape in Blockly
     - Use
   * - ``statement`` (default)
     - Puzzle-piece, connects top and bottom
     - Void actions: ``display.fill(color)``, ``motor.on()``
   * - ``value``
     - Rounded, plugs into other blocks
     - Functions that return something: ``ds1302.get_year()``,
       ``color565(r, g, b)``
   * - ``hat``
     - Notched top, starts an event handler
     - Interrupt callbacks, timer handlers

Constructor blocks (``fn: __init__``) are always statements regardless of the
``kind`` field.

Parameter types
^^^^^^^^^^^^^^^

A parameter has exactly one mode — these are **mutually exclusive alternatives**,
each generating a different Blockly input kind:

.. list-table::
   :header-rows: 1
   :widths: 20 50 30

   * - Mode
     - YAML
     - Generated input
   * - Value input
     - ``type: Number`` / ``type: String`` / ``type: Boolean`` /
       ``type: MyCustomType``
     - ``appendValueInput("x").setCheck("Number")``
   * - GPIO pin
     - ``pin_mode: output`` / ``pin_mode: input`` / ``pin_mode: any``
     - Pinout shadow block; wraps in ``Pin(n, Pin.OUT/IN)``
   * - Dropdown
     - ``options: [{label: "A", value: "a"}, …]``
     - ``FieldDropdown([["A","a"], …])``
   * - Legacy pin
     - ``pin: true``
     - Pinout shadow; passes raw integer (no Pin wrapper). Use
       ``pin_mode`` for new blocks.

Type system
-----------

Built-in types
^^^^^^^^^^^^^^

These are resolved by Blockly directly and need no output block:

- ``Number`` — any numeric value
- ``String`` — text
- ``Boolean`` — true/false
- ``Any`` — untyped; accepts any connected block (same as no check)

Platform types
^^^^^^^^^^^^^^

These have hand-written output blocks in the communication JS files:

- ``SPI`` — SPI bus object
- ``I2C`` — I2C bus object
- ``UART`` — UART bus object

Use these as param types to require a specific bus block to be snapped in:

.. code-block:: yaml

   - name: spi
     type: SPI   # only the SPI block can snap into this slot

Custom types and subtypes
^^^^^^^^^^^^^^^^^^^^^^^^^

Any value block can declare its own output type using ``output_type``. Other
blocks can then require exactly that type:

.. code-block:: yaml

   # Declares that color565() produces a Color565 value
   - fn: color565
     kind: value
     output_type: Color565
     supertype: Number        # Color565 is a 16-bit integer — also satisfies Number
     params:
       - {name: r, type: Number}
       - {name: g, type: Number}
       - {name: b, type: Number}

   # Requires a Color565 value; color565() block can snap in
   - name: color
     type: Color565

With ``supertype: Number`` declared, the generated Blockly block emits:

.. code-block:: javascript

   this.setOutput(true, ["Color565", "Number"]);

This means a ``color565`` block can snap into **both** a ``Color565`` slot
(specific) and a ``Number`` slot (general) — the subtype relation is honoured
at the visual wiring level.

The type checker enforces at parse time:

1. Every ``type`` or ``supertype`` declared on a param/block must refer to a
   known type (built-in, platform, or locally declared via ``output_type``).
2. ``supertype`` is only allowed on ``kind: value`` blocks that also have an
   ``output_type``.
3. A ``supertype`` must be a known type — you cannot declare an unknown
   supertype.


Validation
----------

The DSL runs a **two-phase validation** before emitting any artefacts:

Phase 1 — JSON Schema (structural + context-free semantic)
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

`blockdef_schema.json` is a JSON Schema Draft 7 document. It expresses every
constraint that depends only on the local structure of a single node —
what the theory of formal languages calls *context-free* constraints:

**Mutual exclusion via** ``oneOf``:

- ``ClassDef`` → ``oneOf [SingletonClassDef, MultipleClassDef]``
  Singleton and multiple have different allowed fields (``instance_name`` vs
  ``method_ref``); they cannot coexist.
- ``ParamDef`` → ``oneOf [ValueParamDef, PinParamDef, LegacyPinParamDef, DropdownParamDef]``
  Each param mode has its own allowed fields. Writing both ``options`` and
  ``type`` fails at schema level.

**Cross-field dependencies via** ``if/then``:

- ``output_type`` requires ``kind: value`` — if ``output_type`` is present,
  ``kind`` must be present and must equal ``"value"``.
- ``supertype`` requires both ``output_type`` and ``kind: value``.
- ``default`` type consistency for built-in scalars — if ``type: Number``,
  the default must be a JSON number; if ``type: Boolean``, a boolean; if
  ``type: String``, a string.

**Scope restriction via** ``CategoryFunctionBlock``:

Category-level blocks reference ``CategoryFunctionBlock`` instead of
``FunctionBlock``. ``CategoryFunctionBlock`` extends ``FunctionBlock`` with
one extra constraint: ``fn`` must not be ``"__init__"``. Class-level blocks
still use ``FunctionBlock`` which permits ``__init__``.

Phase 2 — Semantic validation (AST traversal)
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

After building the typed AST, ``_validate_ast()`` traverses the full
``BlockdefFile`` tree and checks the constraints that JSON Schema cannot
express — not because they are impossible to check, but because JSON Schema is
a **declarative, stateless grammar**: it validates each node in isolation and
has no way to build a symbol table, count across sibling items, or follow
references.

Imperative AST traversal code has none of those limits:

- **Duplicate names** — ``_check_duplicates()`` iterates over ``bdf.categories``,
  ``cls.blocks``, ``fb.params`` etc. collecting names into a ``set``. JSON
  Schema's ``uniqueItems`` only detects fully identical objects; it cannot
  check uniqueness of a specific field (e.g. ``fn``) across heterogeneous items.

- **Type reference resolution** — ``_validate_type_references_ast()`` first
  collects every ``output_type`` declared in the file into ``local_output_types``,
  then walks every ``ValueParamDef.type`` and checks membership in
  ``KNOWN_TYPES | local_output_types``. This is a mini symbol table — two
  passes over the tree — which requires state that JSON Schema cannot maintain.

- **Circular shadow reference** — ``_validate_block_ast()`` compares
  ``block.output_type`` against the ``type`` field of every ``ValueParamDef``
  on the same block. Detecting this cross-field reference within a single block
  is now also expressible in the JSON Schema (it is a local constraint), but
  the AST check remains for clear error messages.

- **Orphan output_type** — ``_validate_type_references_ast()`` computes the
  set difference between ``local_output_types`` and all referenced param types.
  This is inherently a cross-block, whole-file computation.

The boundary is between what a **declarative schema grammar** can express
(single-node structure) and what **imperative code traversing a typed tree**
can express (any constraint, including cross-node, stateful, graph-based).
The grammar catches violations early with structural errors; the AST traversal
provides precise, domain-specific error messages for everything else.


Architecture — the four-layer model
-------------------------------------

The system follows the Model-Driven Software Development (MDSD) principle of
separating concerns into distinct layers:

.. code-block:: text

   ┌─────────────────────────────────────────────────────────────────┐
   │  Surface syntax  │  .blockdef.yaml  (YAML + JSON Schema)        │
   ├─────────────────────────────────────────────────────────────────┤
   │  Abstract syntax │  BlockdefFile AST  (blockdef_ast.py)         │
   │  (input model)   │  CategoryDef, SingletonClassDef,             │
   │                  │  MultipleClassDef, FunctionBlockDef,         │
   │                  │  ValueParamDef, PinParamDef, …               │
   ├─────────────────────────────────────────────────────────────────┤
   │  Semantic model  │  list[BlockSpec]  (model.py)                 │
   │  (output model)  │  BlockSpec, InputSpec, InstanceReferenceSpec │
   ├─────────────────────────────────────────────────────────────────┤
   │  Target artefacts│  emitters.py                                 │
   │                  │  • Blockly.Blocks[…] JS definition           │
   │                  │  • Blockly.Python[…] code generator JS       │
   │                  │  • toolbox XML (definition markdown)         │
   └─────────────────────────────────────────────────────────────────┘

**Surface syntax → Abstract syntax** (parsing)
  ``yaml.safe_load()`` reads the file. JSON Schema validates the structure.
  ``_parse_blockdef_file()`` in ``blockdef_parser.py`` walks the validated
  dict and constructs a ``BlockdefFile`` object — a fully typed tree where
  every node is a Python dataclass. Raw dicts do not survive past this point.

  The MDSD concept of *alternatives → subclasses* is applied at two levels:

  - ``SingletonClassDef`` vs ``MultipleClassDef`` (instead of one ``ClassDef``
    with an ``instance_mode`` flag).
  - ``ValueParamDef`` / ``PinParamDef`` / ``LegacyPinParamDef`` /
    ``DropdownParamDef`` (instead of one ``ParamDef`` with four optional,
    mutually exclusive fields).

  The resulting tree is the *abstract syntax* of the DSL program.

**Abstract syntax → Semantic model** (name resolution + transformation)
  ``_validate_ast()`` runs semantic checks on the typed tree (duplicate
  names, type consistency, circular references, etc.).

  ``BlockdefParser._extract_blocks()`` transforms the typed tree into a flat
  ``list[BlockSpec]`` — the runtime representation. Each ``BlockSpec`` is
  self-contained: it knows its Blockly type string, label, colour, all input
  specs, the Python import it needs, and the code generation template.

  This step resolves cross-references: ``output_type: Color565`` declared on
  one block is linked to ``type: Color565`` usage on other blocks through the
  ``type_registry`` in the emitter — analogous to a *name resolver* in a
  traditional compiler.

**Semantic model → Target artefacts** (code generation)
  ``emitters.py`` walks the ``list[BlockSpec]`` and produces three outputs:

  - **Blockly block definitions JS** — calls ``this.appendValueInput()``,
    ``this.appendDummyInput().appendField(…)``, ``this.setOutput()``, etc.
  - **Python code generator JS** — Blockly generator functions that read input
    values and assemble a MicroPython expression from a template string.
  - **Definition markdown** — toolbox XML fragments (``<block type="…">``,
    ``<shadow>`` elements) used by the ``blockly_toolbox_generator()`` in
    ``app.py``.

  This is the *model-to-text* transformation step in MDSD terminology.


Adding a new device — step by step
------------------------------------

1. Create ``server/dsl/definitions/mydevice.blockdef.yaml``.
   Copy the schema header: ``# yaml-language-server: $schema=./blockdef_schema.json``

2. Fill in ``module``, ``imports``, ``url``, and ``categories``.

3. Run the pipeline to generate artefacts:

   .. code-block:: bash

      python3 -m server.dsl.scripts.integrate server/dsl/definitions/mydevice.blockdef.yaml

   This writes:

   - ``static/page/blocks/blocks/mydevice_dsl.js``
   - ``static/page/blocks/pythonic/mydevice_dsl.js``
   - ``templates/page/blocks/definitions/mydevice_dsl.md``

4. Add the generated block IDs to the device toolbox file(s), for example
   ``templates/page/blocks/devices/PicoW.md``, under the appropriate category.

5. Copy your MicroPython library file to
   ``static/page/blocks/libraries/mydevice.py``.


Field reference
---------------

Top-level fields
^^^^^^^^^^^^^^^^

.. list-table::
   :header-rows: 1
   :widths: 20 15 65

   * - Field
     - Required
     - Description
   * - ``module``
     - Yes
     - Python module identifier. Must be a valid Python identifier.
   * - ``imports``
     - No
     - List of Python imports. A plain string → ``import X``. A dict with
       ``from`` and ``names`` → ``from X import A, B``.
   * - ``url``
     - No
     - Help URL applied to all blocks. Shown when the user clicks the help
       icon on a block.
   * - ``categories``
     - Yes
     - List of category definitions (see below).

FunctionBlock fields
^^^^^^^^^^^^^^^^^^^^

.. list-table::
   :header-rows: 1
   :widths: 20 15 65

   * - Field
     - Required
     - Description
   * - ``fn``
     - Yes
     - Python function or method name. Use ``__init__`` for the constructor.
   * - ``label``
     - No
     - Block label shown in Blockly. Auto-derived from ``fn`` if omitted
       (snake_case → "Title Case").
   * - ``kind``
     - No
     - ``value`` / ``statement`` / ``hat``. Defaults to ``statement``.
       Constructors are always ``statement``.
   * - ``inline``
     - No
     - ``true`` → all inputs on one row. Defaults to ``true`` when the block
       has 5 or fewer params.
   * - ``tooltip``
     - No
     - Hover tooltip text.
   * - ``output_type``
     - No
     - Blockly output type for ``kind: value`` blocks. Enables type-checked
       wiring (e.g. ``Color565``, ``SPI``).
   * - ``supertype``
     - No
     - Supertype of ``output_type``. Allows the block to also snap into slots
       typed as the supertype (e.g. ``supertype: Number`` for a 16-bit colour
       value). Requires ``kind: value`` and ``output_type``.
   * - ``params``
     - No
     - List of parameter definitions (see above).

Common param fields (all modes)
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

.. list-table::
   :header-rows: 1
   :widths: 20 65

   * - Field
     - Description
   * - ``name``
     - Python parameter name. Must be a valid Python identifier.
   * - ``default``
     - Default value shown as a pre-filled shadow block. Must be compatible
       with the declared ``type``.
   * - ``keyword``
     - ``true`` → emitted as ``name=value`` in generated Python. Useful for
       bus constructors (``sck=Pin(18)``).

.. seealso::

   :ref:`create-block` — the traditional (manual) way to create blocks without
   the DSL, useful for blocks with complex custom JS logic.
