"""Internal-DSL rebuild of definitions/hcsr04.blockdef, for comparison.

Demonstrates the `multiple` instance mode (as opposed to buttons_internal.py's
`singleton`): each HCSR04 sensor is addressed by an `id` param that the base
class inserts automatically on every non-constructor block.

    python -m server.block_dsl.examples.hcsr04_internal
"""

from __future__ import annotations

from ..internal_dsl import BlockInternalDSL
from ..model import BlockKind


class HCSR04Internal(BlockInternalDSL):
    def __init__(self):
        super().__init__("hcsr04", url="https://github.com/rsc1975/micropython-hcsr04")

    def build(self) -> None:
        sensor = self.category("Ultrasonic", color=330).multiple_class(
            "HCSR04", key_input=True
        )

        sensor.block(
            "__init__", tooltip="Create an HC-SR04 sensor (trigger + echo pins)."
        ).param("trigger_pin", type="Number", pin=True).param(
            "echo_pin", type="Number", pin=True
        ).param("echo_timeout_us", type="Number", default=30000)

        sensor.block(
            "distance_cm", kind=BlockKind.VALUE, tooltip="Measure the distance in centimetres."
        )
        sensor.block(
            "distance_mm", kind=BlockKind.VALUE, tooltip="Measure the distance in millimetres."
        )


if __name__ == "__main__":
    from pathlib import Path

    from ..blockdef_parser import BlockdefParser
    from ..emitters import emit_blockly_blocks_js, emit_definition_markdown, emit_python_generators_js
    from ..python_generator import PythonGeneratorBuilder

    internal = HCSR04Internal()
    internal_specs = internal.to_block_specs()

    blockdef_path = Path(__file__).resolve().parents[1] / "definitions" / "hcsr04.blockdef"
    external_specs = BlockdefParser().parse_file(blockdef_path).blocks

    internal_blocks_js = emit_blockly_blocks_js(internal_specs)
    external_blocks_js = emit_blockly_blocks_js(external_specs)

    internal_generators = PythonGeneratorBuilder().build_generators(internal_specs)
    external_generators = PythonGeneratorBuilder().build_generators(external_specs)
    internal_by_type = {b.type: b for b in internal_specs}
    external_by_type = {b.type: b for b in external_specs}
    internal_py_js = emit_python_generators_js(internal_generators, internal_by_type)
    external_py_js = emit_python_generators_js(external_generators, external_by_type)

    internal_md = emit_definition_markdown("Ultrasonic", "hcsr04", internal_specs)
    external_md = emit_definition_markdown("Ultrasonic", "hcsr04", external_specs)

    print(internal)
    print()
    print("blocks.js match:     ", internal_blocks_js == external_blocks_js)
    print("pythonic.js match:   ", internal_py_js == external_py_js)
    print("definition.md match: ", internal_md == external_md)
