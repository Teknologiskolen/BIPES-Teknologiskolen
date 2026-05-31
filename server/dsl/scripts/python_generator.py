from __future__ import annotations

from .builder import snake_case
from .model import BlockSpec, GeneratorSpec, InputSpec, MethodInstanceMode


def _arg(inp: InputSpec) -> str:
    """Return the template placeholder for one input.

    Pin wrapping and bus-object hoisting are handled in the JS emitter so that
    generated Python creates named objects (e.g. clk_pin_1 = Pin(1, Pin.OUT))
    before using them in constructor / method calls.
    """
    val = f"{{{inp.name}}}"
    return f"{inp.name}={val}" if inp.keyword else val


class PythonGeneratorBuilder:
    def build_generators(self, blocks: list[BlockSpec]) -> list[GeneratorSpec]:
        return [
            GeneratorSpec(
                language="python",
                template=self._template_for(block),
                block_type=block.type,
                source_module_name=block.source_module_name,
                source_function_name=block.source_function_name,
                source_class_name=block.source_class_name,
            )
            for block in blocks
        ]

    def _template_for(self, block: BlockSpec) -> str:
        if block.is_constructor_block:
            return self._constructor_template(block)
        return self._method_template(block)

    def _constructor_template(self, block: BlockSpec) -> str:
        cls = block.source_class_name or "UnknownClass"
        args = ", ".join(_arg(inp) for inp in block.inputs if not inp.is_instance_selector)
        class_ref = cls if block.use_direct_imports else f"{block.source_module_name}.{cls}"

        if block.instance_ref and block.instance_ref.mode == MethodInstanceMode.FIXED_NAME:
            name = block.instance_ref.fixed_instance_name
            return f"{name} = {class_ref}({args})"

        if block.instance_ref and block.instance_ref.mode == MethodInstanceMode.KEY_INPUT:
            key = block.instance_ref.key_input_name or "key"
            registry = self._registry_name(block)
            return f"{registry}[{{{key}}}] = {class_ref}({args})"

        return f"{class_ref}({args})"

    def _method_template(self, block: BlockSpec) -> str:
        call_args = ", ".join(_arg(inp) for inp in block.inputs if not inp.is_instance_selector)

        if block.instance_ref and block.instance_ref.mode == MethodInstanceMode.FIXED_NAME:
            name = block.instance_ref.fixed_instance_name
            return f"{name}.{block.source_function_name}({call_args})"

        if block.instance_ref and block.instance_ref.mode == MethodInstanceMode.KEY_INPUT:
            key = block.instance_ref.key_input_name or "key"
            registry = self._registry_name(block)
            return f"{registry}[{{{key}}}].{block.source_function_name}({call_args})"

        return f"{block.source_function_name}({call_args})"

    def _registry_name(self, block: BlockSpec) -> str:
        return f"{snake_case(block.source_class_name or 'instance')}_instances"
