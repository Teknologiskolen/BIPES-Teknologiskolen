# Block DSL Rules

This file documents the current Block DSL behavior implemented in `server/block_dsl/`.

## Annotation Format

- Use `# @block { ...json... }` directly above a `class` or `def`.
- JSON may be one-line or multiline commented JSON.
- Comment lines between `# @block` and the target become the tooltip.

Example:

```python
# @block {
#   "category": "Robotics",
#   "color": 45
# }
# Create and control the robotics board.
class KitronikPicoRobotics:
    ...
```

## What Can Be Annotated

- Top-level functions
- Classes
- Methods
- `__init__` for constructor blocks

Only annotated methods/functions become public blocks. Unannotated methods stay internal.

## Supported Metadata Keys

### Class Metadata

- `category`
- `color`
- `url`
- `label`
- `kind`
- `inputsInline`
- `instanceMode`
- `instanceName`
- `instanceNameFrom`
- `methodInstanceMode`

### Function/Method Metadata

- `label`
- `category`
- `color`
- `url`
- `kind`
- `inputsInline`
- `params`

Unknown metadata keys are rejected.

## Supported Param Config

Inside `params.<param_name>`:

- `inputKind`
- `checkType`
- `defaultValue`
- `options`

### Supported `inputKind` Values

- `input_value`
- `field_dropdown`
- `field_input`
- `variable`

## Inheritance Rules

- Method metadata overrides class metadata.
- Param configs merge from class + method, with method config winning.

## Instantiation Rules

### Singleton

- Methods use a fixed instance name.
- Default fixed instance name is `board`.

### Multiple

- Multiple-instance classes always use numeric `id`.
- `id` is the instance selector.
- `id` is always the first input.
- `id` label is rendered as `ID #`.

Current implementation normalizes all multiple-instance classes to use `id`, even if another key is written in metadata.

## Validation Rules

- Unknown metadata keys are invalid.
- `field_dropdown` requires `options`.
- `options` only make sense for `field_dropdown`.
- Multiple-instance classes must have an annotated `__init__`.
- Multiple-instance constructors must include an `id` parameter.
- Label placeholders must match real parameter names.
- For multiple-instance methods, `id` is also a valid placeholder.

## Block Naming Rules

Generated block titles follow these rules:

- Constructor title: `Create <Class Name>`
- Method title: humanized method name
- CamelCase is split into words
- `_` and `-` become spaces
- Words start with capitals

Examples:

- `servoWrite` -> `Servo Write`
- `move_line` -> `Move Line`
- `run_gcode_file` -> `Run Gcode File`

Note:

- `label` metadata is still parsed and validated.
- Current implementation generates titles from function/class names rather than using custom labels for the visible block name.

## Input Rules

- Every Python parameter becomes a block input, except `self` and `cls`.
- For multiple-instance methods, `id` is injected automatically.
- Constructor `id` also stays first.
- Python default values are used as block defaults.
- `params.<name>.defaultValue` overrides the Python default value.

## Type Inference Rules

- `int` / `float` -> `Number`
- `str` -> `String`
- `bool` -> `Boolean`
- parameter name `id` -> `Number`
- parameter names containing `pin` but not `pins` -> `Number`

## Pin Rules

- Single `pin` parameters get `pinout` shadows.
- `pins` parameters get `lists_create_with` shadows made of `pinout` blocks.
- If a pin parameter has a default value, that value is used in the `pinout` shadow.
- If a pin-list parameter has defaults, those values populate the generated list shadow.

## Generator Rules

### Singleton

Generated code uses a fixed instance name, for example:

```python
board.motorOn(motor, direction, speed)
```

### Multiple

Generated code uses a registry dictionary keyed by numeric `id`, for example:

```python
sand_table_robot_instances[id] = SandTableRobot(...)
sand_table_robot_instances[id].home()
```

This is a dictionary-based registry, not a list, so ids are user-facing instance identifiers rather than zero-based array indexes.

## Practical Authoring Rules

- Annotate every method you want exposed as a block.
- Annotate `__init__` if you want a constructor block.
- Use `id` for multiple-instance classes.
- Put defaults in Python signatures whenever possible.
- Use `params` for UI overrides such as:
  - dropdowns
  - variable inputs
  - explicit default overrides
- Use `pin` / `pins` in parameter names if you want pin-aware Blockly input behavior.

## Known Limitations

- Custom `label` metadata is still parsed and validated, but the visible block title is currently generated from the class or method name.
- Multiple-instance classes are always normalized to numeric `id`, even if another instance key is provided in metadata.
- Multiple-instance generators currently use a dictionary registry keyed by `id`; there is no alternative built-in storage strategy.
- `object_input` exists in the schema, but current behavior is centered on `fixed_name` and `key_input`.
- Type inference is intentionally simple and mostly limited to `int`, `float`, `str`, `bool`, `id`, `pin`, and `pins`.
- Parameter names strongly affect block behavior. For example, `pin` and `pins` trigger special Blockly shadow handling.
- Some labels for acronyms or compact names may still be imperfect, for example `Sda`, `Scl`, or mixed alphanumeric names like `M1`.
- Value inputs that represent complex runtime objects, such as `spi`, may still need explicit `params` configuration like `inputKind: "variable"` to generate usable blocks.
- The DSL currently focuses on block generation, toolbox generation, and Python generator templates; it does not infer richer semantics from function bodies.
- Tooltip text comes only from comment lines immediately between `# @block` and the next `class` or `def`.

## Example

```python
# @block {
#   "category": "DFPlayer DSL",
#   "color": 300,
#   "instanceMode": "multiple",
#   "methodInstanceMode": "key_input"
# }
class DFPlayer:

    # @block {
    #   "params": {
    #     "id": {"checkType": "Number", "defaultValue": 1},
    #     "uart_id": {"checkType": "Number", "defaultValue": 1},
    #     "tx_pin": {"checkType": "Number", "defaultValue": 4},
    #     "rx_pin": {"checkType": "Number", "defaultValue": 5}
    #   }
    # }
    def __init__(self, uart_id=1, tx_pin=4, rx_pin=5, id=1):
        ...

    # @block {
    #   "params": {
    #     "track": {"checkType": "Number", "defaultValue": 1}
    #   }
    # }
    def play(self, track=1):
        ...
```
