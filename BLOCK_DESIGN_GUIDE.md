# Block Design Guide

This guide describes how to design blocks for BIPES so they are:

- easy for beginners to use
- close enough to real programming concepts
- a good bridge toward text-based Python

The goal is not to make blocks identical to Python syntax. The goal is to make the transition from blocks to Python feel natural and understandable.

## Core Principle

Hide syntax, not structure.

Blocks should remove punctuation, indentation, tuple unpacking, and other awkward syntax details. But they should still teach:

- variables
- functions
- state
- objects
- control flow
- events
- inputs and outputs

If blocks hide too much structure, learners may succeed in Blockly but struggle when moving to Python.

## What Good Blocks Should Do

Good blocks should be:

- concept-level
- readable
- composable
- predictable
- close to the mental model of the hardware or library

Good blocks should make it easy to answer:

- what does this do?
- what inputs does it need?
- what value does it return?
- what Python idea does it map to?

## What Good Blocks Should Not Do

Avoid blocks that are:

- too low-level for beginners
- too magical
- too broad
- too unlike the generated Python

Bad examples:

- `Make Alarm Clock Work`
- `Handle Robot Automatically`
- `Run Full Device Setup`

These may feel convenient, but they hide too much logic and do not teach reusable programming structure.

## Recommended Granularity

Use this rule of thumb:

- one block should represent one meaningful concept
- not one line of syntax
- and not one entire application

### Too Low-Level

These are often too close to raw syntax:

- tuple unpacking
- dict mutation
- callback parameter scoping tricks
- hardware protocol boilerplate

These may be real Python concepts, but they are often the wrong level for beginner blocks.

### Good Mid-Level

These are usually the sweet spot:

- `Get Hour`
- `Display Text`
- `Play Track`
- `Move Line`
- `Read Distance`
- `Send Bluetooth Message`

These blocks map to meaningful operations and can still be explained in Python later.

### Too High-Level

These hide too much:

- `Create Full Alarm Clock`
- `Draw Nice Pattern`
- `Connect Everything`

These may be useful as demos, but they should not be the main building blocks of the learning model.

## The BIPES Learning Ladder

Think in three layers.

### Layer 1: Beginner Blocks

These should feel direct and friendly.

Examples:

- `Set Pixel`
- `Get Hour`
- `Play MP3 Track`
- `If Button Pressed`

These blocks should minimize syntax and plumbing.

### Layer 2: Structured Blocks

These should introduce more real programming structure.

Examples:

- `Create DS1302`
- `Create ST7735S`
- `Create Sand Table Robot`
- `Bluetooth Has Message`
- `Bluetooth Pop Message`

These blocks should preserve objects, method calls, and data flow.

### Layer 3: Python Transition

Learners should be able to look at generated Python and recognize familiar ideas.

Examples:

- `Draw Flower` -> `robot.draw_flower(...)`
- `Get Time` wrappers -> `rtc.get_hour()` or similar
- `Send Bluetooth Message` -> `send_message(...)`

This is why names and concepts should stay aligned with Python even if the block is slightly friendlier.

## Wrapper Blocks vs Raw API Blocks

This is one of the most important design choices.

### Use Wrapper Blocks When

Use wrappers when the raw Python API is awkward in blocks.

Good reasons:

- the API returns tuples
- the API expects dicts
- the API relies on local callback variables
- the API requires several setup objects before it becomes useful
- the API uses syntax that Blockly cannot express well

Examples:

- `DS1302.get_time()` returning a tuple is awkward for blocks
- Bluetooth callback locals are awkward for blocks
- passing a raw `SPI` object around can be awkward unless you expose it carefully

In these cases, wrappers are the right choice.

Examples of good wrappers:

- `Get Hour`
- `Get Minute`
- `Get Date Text`
- `Bluetooth Last Message`
- `Bluetooth Has Message`
- `Bluetooth Pop Message`

### Stay Close to the Raw API When

Stay close to the raw API when the library is already block-friendly.

Good signs:

- methods take simple parameters
- methods do one clear thing
- the object model is understandable
- the generated code is readable

Examples:

- `motorOn(motor, direction, speed)`
- `servoWrite(servo, degrees)`
- `move_line(target_x, target_y, segments, speed)`
- `draw_flower(max_radius, petals, speed)`

These are excellent candidates for direct DSL-generated blocks.

## A Good Rule For Wrappers

Wrap awkward shapes, not core ideas.

Good wrappers:

- replace tuple returns with single-purpose getters
- replace message queue internals with simple message blocks
- replace setup boilerplate with small constructors

Bad wrappers:

- replace all object behavior with giant “do everything” blocks
- remove all sense of methods, instances, and state

## Objects and State

BIPES should preserve object thinking where possible.

That means blocks like:

- `Create Robot`
- `Create RTC`
- `Create Display`
- `Create DFPlayer`

are good because they teach:

- this thing has state
- methods belong to objects
- objects can be created and used

For multiple instances, the current `ID #` approach is reasonable because it preserves instance identity without requiring advanced language features.

## Return Values

Return values in blocks should be simple whenever possible.

Best:

- number
- string
- boolean
- color value
- list, when necessary

Avoid exposing tuple-heavy or dict-heavy APIs directly unless you intentionally want to teach those concepts and have the right supporting blocks.

## Events and Callbacks

Events should be block-friendly, not Python-awkward.

Good event design:

- `On Connect`
- `On Disconnect`
- `On Message Received`

But event data should usually be accessed through helper blocks instead of fake local callback variables.

Good pattern:

- event block for control flow
- separate getter block for event data

Example:

- `On Message Received`
- `Bluetooth Last Message`
- `Bluetooth Pop Message`

This is clearer than trying to simulate Python callback local variables in Blockly.

## Naming Rules

Block names should:

- start with a capital letter
- use readable words
- split CamelCase
- turn `_` and `-` into spaces

Examples:

- `servoWrite` -> `Servo Write`
- `move_line` -> `Move Line`
- `run_gcode_file` -> `Run Gcode File`

Names should feel natural in blocks, but still stay close to the Python method/function name.

## Parameter Rules

Parameter labels should be:

- short
- clear
- technically meaningful

Examples:

- `Speed`
- `Degrees`
- `Target X`
- `Target Y`
- `Color`
- `ID #`

Avoid labels that are too raw if they confuse beginners, but do not rename them so much that they no longer match the Python concept.

## Defaults

Use defaults aggressively where they help beginners.

Defaults should come from:

- Python parameter defaults first
- DSL param overrides when needed

Good defaults reduce friction and make the first successful run easier.

Examples:

- default `ID # = 1`
- default pins for known boards
- default width/height for a display
- default track number or volume for audio

## Pins and Hardware Inputs

Whenever possible, hardware-facing inputs should be represented with friendly, hardware-aware blocks.

Examples:

- `pinout` dropdown for single pins
- list-of-pins defaults for motor pin groups

This is better than making users type raw numbers everywhere.

## Recommended Decisions For BIPES

For the current direction of the project, these are good rules:

- use direct DSL-generated blocks when the API is already simple
- use wrapper APIs when the raw API relies on tuples, dicts, or awkward callback state
- keep object concepts visible
- keep names close to Python
- prefer many small meaningful blocks over huge “magic” blocks
- avoid adding full tuple/dict language support until there is a strong learning reason

## Questions To Ask Before Adding A Block

Before adding a new block, ask:

1. Does this represent a meaningful concept a learner can name?
2. Is this easier than Python for the beginner without hiding the core idea?
3. Will the generated Python still make sense if shown beside the block?
4. Is this better as a wrapper, or should it stay close to the raw API?
5. Would this block help learners build many projects, or only one special demo?

If the answers are good, it is probably a strong block candidate.

## Practical Examples

### Good Direct DSL Blocks

- `Servo Write`
- `Motor On`
- `Motor Off`
- `Move Line`
- `Draw Spiral`
- `Draw Flower`

### Good Wrapper Blocks

- `Get Hour`
- `Get Minute`
- `Get Date Text`
- `Bluetooth Last Message`
- `Bluetooth Has Message`
- `Bluetooth Pop Message`

### Blocks To Avoid For Now

- full tuple manipulation blocks
- dict mutation blocks
- fake local callback variable blocks
- giant app-level automation blocks

## Design Goal

The design goal for BIPES should be:

- easy enough for beginners
- structured enough to teach real programming
- close enough to Python that the transition feels natural

The best blocks are not fake programming.

They are real programming ideas presented at the right level.
