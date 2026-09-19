from __future__ import annotations

from abc import ABC, abstractmethod

from .builder import humanize_identifier, snake_case
from .model import (
    BlockKind,
    BlockSpec,
    InputKind,
    InputSpec,
    InstanceReferenceSpec,
    MethodInstanceMode,
)


class Param:
    def __init__(
        self,
        name: str,
        *,
        type: str | None = None,
        default=None,
        pin: bool = False,
        options: list[tuple[str, str]] | None = None,
    ):
        self.name = name
        self.type = type
        self.default = default
        self.pin = pin
        self.options = options or []

    def to_input_spec(self) -> InputSpec:
        if self.options:
            return InputSpec(
                name=self.name,
                input_kind=InputKind.FIELD_DROPDOWN,
                check_type=self.type,
                default_value=self.default,
                options=self.options,
            )
        check_type = self.type or ("Number" if self.pin else None)
        return InputSpec(
            name=self.name,
            input_kind=InputKind.INPUT_VALUE,
            check_type=check_type,
            default_value=self.default,
            is_pin=self.pin,
        )


class Block:
    def __init__(
        self,
        fn_name: str,
        *,
        label: str | None = None,
        kind: BlockKind = BlockKind.STATEMENT,
        tooltip: str = "",
        inline: bool = True,
    ):
        self.fn_name = fn_name
        self.label = label
        self.kind = kind
        self.tooltip = tooltip
        self.inline = inline
        self.params: list[Param] = []

    def param(self, name: str, **kwargs) -> "Block":
        self.params.append(Param(name, **kwargs))
        return self


class BlockClass:
    def __init__(
        self,
        class_name: str,
        *,
        singleton: bool = True,
        instance_name: str | None = None,
        key_input: bool = True,
    ):
        self.class_name = class_name
        self.singleton = singleton
        self.instance_name = instance_name
        self.key_input = key_input
        self.blocks: list[Block] = []

    def block(self, fn_name: str, **kwargs) -> Block:
        b = Block(fn_name, **kwargs)
        self.blocks.append(b)
        return b


class Category:
    """A toolbox category -- equivalent of `category "..." { ... }`."""

    def __init__(self, name: str, *, color: int | None = None):
        self.name = name
        self.color = color
        self.classes: list[BlockClass] = []
        self.functions: list[Block] = []

    def singleton_class(self, class_name: str, *, instance_name: str | None = None) -> BlockClass:
        c = BlockClass(class_name, singleton=True, instance_name=instance_name)
        self.classes.append(c)
        return c

    def multiple_class(self, class_name: str, *, key_input: bool = True) -> BlockClass:
        c = BlockClass(class_name, singleton=False, key_input=key_input)
        self.classes.append(c)
        return c

    def function(self, fn_name: str, **kwargs) -> Block:
        b = Block(fn_name, **kwargs)
        self.functions.append(b)
        return b


class BlockInternalDSL(ABC):
    def __init__(self, module_name: str, *, url: str | None = None):
        self.module_name = module_name
        self.url = url
        self.categories: list[Category] = []
        self.build()

    @abstractmethod
    def build(self) -> None:
        ...

    def category(self, name: str, *, color: int | None = None) -> Category:
        c = Category(name, color=color)
        self.categories.append(c)
        return c

    def to_block_specs(self) -> list[BlockSpec]:
        specs: list[BlockSpec] = []
        for cat in self.categories:
            for cls in cat.classes:
                specs.extend(self._class_specs(cls, cat))
            for fn in cat.functions:
                specs.append(self._block_spec(fn, cat, class_ctx=None))
        return specs

    def _class_specs(self, cls: BlockClass, cat: Category) -> list[BlockSpec]:
        ctor = next((b for b in cls.blocks if b.fn_name == "__init__"), None)
        ordered = ([ctor] if ctor else []) + [b for b in cls.blocks if b.fn_name != "__init__"]
        return [self._block_spec(b, cat, class_ctx=cls) for b in ordered]

    def _block_spec(self, block: Block, cat: Category, class_ctx: BlockClass | None) -> BlockSpec:
        is_ctor = block.fn_name == "__init__"
        inputs = self._inputs(block, class_ctx)

        label = block.label or (
            f"Create {humanize_identifier(class_ctx.class_name)}"
            if is_ctor and class_ctx
            else humanize_identifier(block.fn_name)
        )
        if class_ctx:
            suffix = "create" if is_ctor else snake_case(block.fn_name)
            block_type = f"{snake_case(class_ctx.class_name)}__{suffix}"
        else:
            block_type = snake_case(block.fn_name)

        return BlockSpec(
            type=block_type,
            label=label,
            category=cat.name,
            color=cat.color,
            tooltip=block.tooltip,
            help_url=self.url,
            kind=BlockKind.STATEMENT if is_ctor else block.kind,
            is_constructor_block=is_ctor,
            inputs_inline=block.inline,
            inputs=inputs,
            source_module_name=self.module_name,
            source_function_name=block.fn_name,
            source_class_name=class_ctx.class_name if class_ctx else None,
            instance_ref=self._instance_ref(class_ctx) if class_ctx else None,
        )

    def _inputs(self, block: Block, class_ctx: BlockClass | None) -> list[InputSpec]:
        inputs: list[InputSpec] = []
        if class_ctx and not class_ctx.singleton and class_ctx.key_input:
            inputs.append(
                InputSpec(
                    name="id",
                    input_kind=InputKind.INPUT_VALUE,
                    check_type="Number",
                    default_value=1,
                    is_instance_selector=True,
                )
            )
        inputs.extend(p.to_input_spec() for p in block.params)
        return inputs

    def _instance_ref(self, class_ctx: BlockClass) -> InstanceReferenceSpec | None:
        if class_ctx.singleton:
            return InstanceReferenceSpec(
                mode=MethodInstanceMode.FIXED_NAME, fixed_instance_name=class_ctx.instance_name
            )
        if class_ctx.key_input:
            return InstanceReferenceSpec(
                mode=MethodInstanceMode.KEY_INPUT, key_parameter_name="id", key_input_name="id"
            )
        return InstanceReferenceSpec(mode=MethodInstanceMode.OBJECT_INPUT)

    def __str__(self) -> str:
        lines = [f"BlockLibrary '{self.module_name}'"]
        for cat in self.categories:
            lines.append(f"  category {cat.name!r} (color={cat.color})")
            for cls in cat.classes:
                mode = "singleton" if cls.singleton else "multiple"
                lines.append(f"    class {cls.class_name} ({mode})")
                for b in cls.blocks:
                    params = ", ".join(p.name for p in b.params)
                    lines.append(f"      block {b.fn_name}({params})")
            for fn in cat.functions:
                params = ", ".join(p.name for p in fn.params)
                lines.append(f"    block {fn.fn_name}({params})")
        return "\n".join(lines)
