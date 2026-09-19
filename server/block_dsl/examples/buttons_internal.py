"""Internal-DSL rebuild of definitions/buttons.blockdef, for comparison.

Same buttons.py library, same eight blocks, built with plain Python method
calls instead of a parsed grammar. Run this module directly to prove both
front-ends produce byte-identical Blockly JS from the same domain:

    python -m server.block_dsl.examples.buttons_internal
"""

from __future__ import annotations

from ..internal_dsl import BlockInternalDSL
from ..model import BlockKind


class ButtonsInternal(BlockInternalDSL):
    def __init__(self):
        super().__init__("buttons", url="https://github.com/bipes")

    def build(self) -> None:
        hub = self.category("Buttons", color=20).singleton_class(
            "ButtonHub", instance_name="buttons_hub"
        )

        hub.block("__init__", tooltip="Create the button manager (once, before adding buttons).")

        hub.block(
            "add",
            tooltip="Add a button on a pin. Pull-down = wired to 3V3; pull-up = wired to GND.",
        ).param("pin", type="Number", pin=True).param(
            "pull", options=[("pull-down", "down"), ("pull-up", "up"), ("none", "none")]
        ).param(
            "debounce_ms", type="Number", default=130
        ).param(
            "hold_ms", type="Number", default=500
        ).param(
            "repeat_ms", type="Number", default=120
        ).param(
            "double_ms", type="Number", default=400
        )

        value_blocks = [
            ("was_pressed", "True ONCE each time the button on this pin is pressed."),
            (
                "was_double_clicked",
                "True ONCE when the button on this pin is pressed twice quickly (within double_ms).",
            ),
            (
                "was_clicked",
                "True ONCE for a confirmed SINGLE click (a lone press with no quick second press). "
                "Pairs with 'was double clicked'.",
            ),
            ("was_released", "True ONCE each time the button on this pin is released."),
            ("is_down", "True while the button on this pin is held down."),
            ("is_held", "True once the button has been held past its hold threshold."),
            ("repeated", "Auto-repeat: fires repeatedly while the button is held (after the hold threshold)."),
        ]
        for fn_name, tooltip in value_blocks:
            hub.block(fn_name, kind=BlockKind.VALUE, tooltip=tooltip).param(
                "pin", type="Number", pin=True
            )


if __name__ == "__main__":
    from pathlib import Path

    from ..blockdef_parser import BlockdefParser
    from ..emitters import emit_blockly_blocks_js, emit_definition_markdown, emit_python_generators_js
    from ..python_generator import PythonGeneratorBuilder

    internal = ButtonsInternal()
    internal_specs = internal.to_block_specs()

    blockdef_path = Path(__file__).resolve().parents[1] / "definitions" / "buttons.blockdef"
    external_specs = BlockdefParser().parse_file(blockdef_path).blocks

    internal_blocks_js = emit_blockly_blocks_js(internal_specs)
    external_blocks_js = emit_blockly_blocks_js(external_specs)

    internal_generators = PythonGeneratorBuilder().build_generators(internal_specs)
    external_generators = PythonGeneratorBuilder().build_generators(external_specs)
    internal_by_type = {b.type: b for b in internal_specs}
    external_by_type = {b.type: b for b in external_specs}
    internal_py_js = emit_python_generators_js(internal_generators, internal_by_type)
    external_py_js = emit_python_generators_js(external_generators, external_by_type)

    internal_md = emit_definition_markdown("Buttons", "buttons", internal_specs)
    external_md = emit_definition_markdown("Buttons", "buttons", external_specs)

    print(internal)
    print()
    print("blocks.js match:     ", internal_blocks_js == external_blocks_js)
    print("pythonic.js match:   ", internal_py_js == external_py_js)
    print("definition.md match: ", internal_md == external_md)
