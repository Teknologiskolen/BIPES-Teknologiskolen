"""Parse .blockdef files (textX-based) into BlockSpec lists.

A .blockdef file is a language-agnostic description of how functions and
classes in *any* source file map to Blockly blocks.  The Python AST is not
involved at all — the .blockdef is the single source of truth.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

from textx import metamodel_from_file

from .builder import humanize_identifier, snake_case
from .model import (
    BlockKind,
    BlockSpec,
    InputKind,
    InputSpec,
    InstanceReferenceSpec,
    MethodInstanceMode,
    ModuleSource,
    ParseResult,
)
from .python_generator import PythonGeneratorBuilder
from .toolbox_builder import SimpleToolboxBuilder

_GRAMMAR_PATH = Path(__file__).parent / "block_grammar.tx"


def _load_metamodel():
    return metamodel_from_file(str(_GRAMMAR_PATH))


# ---------------------------------------------------------------------------
# Value helpers
# ---------------------------------------------------------------------------

def _default_to_python(node) -> Any:
    if node is None:
        return None
    cls = type(node).__name__
    if cls == "SeqDefault":
        return [_scalar_to_python(item) for item in node.items]
    return _scalar_to_python(node)


def _scalar_to_python(node) -> Any:
    if node is None:
        return None
    return node.val  # BoolDefault / IntDefault / FloatDefault / StrDefault


def _type_to_check(type_name: str | None) -> str | None:
    if not type_name or type_name == "Any":
        return None
    return type_name  # "Number" | "String" | "Boolean" pass through


def _kind(kind_str: str | None, is_constructor: bool) -> BlockKind:
    if is_constructor:
        return BlockKind.STATEMENT
    return {"value": BlockKind.VALUE, "hat": BlockKind.HAT}.get(
        kind_str or "", BlockKind.STATEMENT
    )


# ---------------------------------------------------------------------------
# Main parser
# ---------------------------------------------------------------------------

class BlockdefParser:
    """Parses a .blockdef file and returns a ParseResult."""

    def __init__(self) -> None:
        self._mm = _load_metamodel()
        self._toolbox = SimpleToolboxBuilder()
        self._generators = PythonGeneratorBuilder()

    def parse_file(self, path: str | Path) -> ParseResult:
        path = Path(path)
        model = self._mm.model_from_file(str(path))
        blocks = self._extract_blocks(model)
        toolbox = self._toolbox.build_toolbox(blocks)
        generators = self._generators.build_generators(blocks)
        # Provide a minimal ModuleSource so ParseResult stays fully typed.
        module = ModuleSource(name=model.name, path=str(path))
        return ParseResult(module=module, blocks=blocks, toolbox=toolbox, generators=generators)

    # ------------------------------------------------------------------
    # Block extraction
    # ------------------------------------------------------------------

    def _extract_blocks(self, model) -> list[BlockSpec]:
        blocks: list[BlockSpec] = []
        url = model.url or ""
        for cat in model.categories:
            color = cat.color if cat.color is not None else None
            for entry in cat.entries:
                if type(entry).__name__ == "ClassDef":
                    blocks.extend(
                        self._blocks_from_class(entry, cat.name, color, model.name, url)
                    )
                else:  # FunctionBlock
                    blocks.append(
                        self._block_spec(entry, cat.name, color, model.name, url, class_ctx=None)
                    )
        return blocks

    def _blocks_from_class(
        self,
        cls,
        category: str,
        color: int | None,
        module_name: str,
        url: str,
    ) -> list[BlockSpec]:
        constructor = next((b for b in cls.blocks if b.fn_name == "__init__"), None)
        ordered = (
            ([constructor] if constructor else [])
            + [b for b in cls.blocks if b.fn_name != "__init__"]
        )
        return [
            self._block_spec(fb, category, color, module_name, url, class_ctx=cls)
            for fb in ordered
        ]

    def _block_spec(self, fb, category: str, color: int | None, module_name: str, url: str, class_ctx) -> BlockSpec:
        fn_name = fb.fn_name
        is_ctor = fn_name == "__init__"

        inputs = self._build_inputs(fb, class_ctx, is_ctor)

        label = fb.label or (
            f"Create {humanize_identifier(class_ctx.class_name)}"
            if is_ctor and class_ctx
            else humanize_identifier(fn_name)
        )

        if class_ctx:
            suffix = "create" if is_ctor else snake_case(fn_name)
            block_type = f"{snake_case(class_ctx.class_name)}__{suffix}"
        else:
            block_type = snake_case(fn_name)

        return BlockSpec(
            type=block_type,
            label=label,
            category=category,
            color=color,
            tooltip=fb.tooltip or "",
            help_url=url or None,
            kind=_kind(fb.kind or None, is_ctor),
            is_constructor_block=is_ctor,
            inputs_inline=bool(fb.inline) if fb.inline is not None else False,
            inputs=inputs,
            source_module_name=module_name,
            source_function_name=fn_name,
            source_class_name=class_ctx.class_name if class_ctx else None,
            instance_ref=self._instance_ref(class_ctx) if class_ctx else None,
        )

    # ------------------------------------------------------------------
    # Input building
    # ------------------------------------------------------------------

    def _build_inputs(self, fb, class_ctx, is_ctor: bool) -> list[InputSpec]:
        inputs: list[InputSpec] = []

        # For multiple-instance classes using key_input, methods get an ID selector.
        if (
            class_ctx
            and not is_ctor
            and class_ctx.instance_mode == "multiple"
            and (class_ctx.method_ref or "key_input") == "key_input"
        ):
            inputs.append(InputSpec(
                name="id",
                input_kind=InputKind.INPUT_VALUE,
                check_type="Number",
                default_value=1,
                is_instance_selector=True,
            ))

        for param in fb.params:
            inputs.append(self._input_from_param(param))

        return inputs

    def _input_from_param(self, param) -> InputSpec:
        check_type = _type_to_check(param.type_name or None)
        default = _default_to_python(param.default)

        if param.options:
            return InputSpec(
                name=param.name,
                input_kind=InputKind.FIELD_DROPDOWN,
                check_type=check_type,
                default_value=default,
                is_instance_selector=False,
                options=[(opt.label, opt.val) for opt in param.options],
            )

        # Pin names carry an implicit Number type when not specified.
        if param.is_pin and not check_type:
            check_type = "Number"

        return InputSpec(
            name=param.name,
            input_kind=InputKind.INPUT_VALUE,
            check_type=check_type,
            default_value=default,
            is_instance_selector=False,
            options=[],
        )

    # ------------------------------------------------------------------
    # Instance reference
    # ------------------------------------------------------------------

    def _instance_ref(self, class_ctx) -> InstanceReferenceSpec | None:
        if class_ctx is None:
            return None
        if class_ctx.instance_mode == "singleton":
            return InstanceReferenceSpec(
                mode=MethodInstanceMode.FIXED_NAME,
                fixed_instance_name=class_ctx.instance_name or None,
            )
        # multiple
        method_ref = class_ctx.method_ref or "key_input"
        if method_ref == "key_input":
            return InstanceReferenceSpec(
                mode=MethodInstanceMode.KEY_INPUT,
                key_parameter_name="id",
                key_input_name="id",
            )
        return InstanceReferenceSpec(mode=MethodInstanceMode.OBJECT_INPUT)
