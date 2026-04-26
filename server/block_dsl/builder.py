from __future__ import annotations

from .model import (
    BlockKind,
    BlockSpec,
    InputKind,
    InputSpec,
    InstanceMode,
    InstanceReferenceSpec,
    MethodInstanceMode,
    ModuleSource,
)


def snake_case(name: str) -> str:
    out: list[str] = []
    for i, ch in enumerate(name):
        if i > 0 and ch.isupper() and not name[i - 1].isupper():
            out.append("_")
        out.append(ch.lower())
    return "".join(out)


def humanize_identifier(name: str) -> str:
    acronym_words = {
        "adc": "ADC",
        "clk": "CLK",
        "cs": "CS",
        "dat": "DAT",
        "dc": "DC",
        "i2c": "I2C",
        "id": "ID",
        "led": "LED",
        "miso": "MISO",
        "mosi": "MOSI",
        "pwm": "PWM",
        "rgb": "RGB",
        "rst": "RST",
        "rtc": "RTC",
        "scl": "SCL",
        "sck": "SCK",
        "sda": "SDA",
        "spi": "SPI",
        "tx": "TX",
        "rx": "RX",
        "uart": "UART",
    }
    normalized = name.replace("_", " ").replace("-", " ")
    out: list[str] = []
    for i, ch in enumerate(normalized):
        next_ch = normalized[i + 1] if i + 1 < len(normalized) else ""
        if (
            i > 0
            and ch.isupper()
            and not normalized[i - 1].isspace()
            and (
                normalized[i - 1].islower()
                or (normalized[i - 1].isupper() and next_ch.islower())
            )
        ):
            out.append(" ")
        elif i > 0 and ch.isdigit() and normalized[i - 1].isalpha() and normalized[i - 1].islower():
            out.append(" ")
        out.append(ch)

    words = "".join(out).split()
    result_words: list[str] = []
    for word in words:
        mapped = acronym_words.get(word.lower())
        if mapped is not None:
            result_words.append(mapped)
        else:
            result_words.append(word[:1].upper() + word[1:])
    return " ".join(result_words)


class BlockModelBuilder:
    def build_blocks(self, module: ModuleSource) -> list[BlockSpec]:
        blocks: list[BlockSpec] = []

        for fn in module.functions:
            if fn.is_public_block:
                blocks.append(self._build_block(fn))

        for cls in module.classes:
            constructor = next((m for m in cls.methods if m.is_constructor), None)
            ordered_methods = []
            if constructor is not None:
                ordered_methods.append(constructor)
            ordered_methods.extend(m for m in cls.methods if not m.is_constructor)
            for method in ordered_methods:
                if method.is_public_block:
                    blocks.append(self._build_block(method, constructor=constructor))

        return blocks

    def _build_block(self, fn, constructor=None) -> BlockSpec:
        md = fn.metadata
        assert md is not None

        inputs: list[InputSpec] = []

        if (
            fn.parent_class_name
            and (md.instance_mode or InstanceMode.SINGLETON) == InstanceMode.MULTIPLE
            and md.method_instance_mode == MethodInstanceMode.KEY_INPUT
            and not fn.is_constructor
        ):
            key_name = "id"
            key_param = None
            key_cfg = None
            if constructor is not None:
                key_param = next((p for p in constructor.parameters if p.name == key_name), None)
                if constructor.metadata is not None:
                    key_cfg = constructor.metadata.param_configs.get(key_name)
            inputs.append(
                InputSpec(
                    name=key_name,
                    input_kind=(
                        key_cfg.input_kind
                        if key_cfg and key_cfg.input_kind
                        else InputKind.INPUT_VALUE
                    ),
                    check_type=(
                        key_cfg.check_type
                        if key_cfg and key_cfg.check_type
                        else self._infer_check_type(key_param.type_hint if key_param else None, key_name)
                    ),
                    default_value=(
                        key_cfg.default_value
                        if key_cfg and key_cfg.default_value is not None
                        else key_param.default_value if key_param else 1
                    ),
                    is_instance_selector=True,
                    options=key_cfg.options if key_cfg else [],
                )
            )

        for p in fn.parameters:
            cfg = md.param_configs.get(p.name)
            inputs.append(
                InputSpec(
                    name=p.name,
                    input_kind=cfg.input_kind if cfg and cfg.input_kind else InputKind.INPUT_VALUE,
                    check_type=(
                        cfg.check_type
                        if cfg and cfg.check_type
                        else self._infer_check_type(p.type_hint, p.name)
                    ),
                    default_value=(
                        cfg.default_value
                        if cfg and cfg.default_value is not None
                        else p.default_value
                    ),
                    options=cfg.options if cfg else [],
                )
            )

        inputs = self._order_inputs(inputs)

        kind = BlockKind.STATEMENT if fn.is_constructor else (md.kind or BlockKind.STATEMENT)
        return BlockSpec(
            type=self._block_type(fn),
            label=self._label_for(fn, inputs),
            category=md.category or "Uncategorized",
            color=md.color,
            tooltip=fn.tooltip,
            help_url=md.url,
            kind=kind,
            is_constructor_block=fn.is_constructor,
            inputs_inline=bool(md.inputs_inline) if md.inputs_inline is not None else False,
            inputs=inputs,
            source_module_name=fn.source_module_name or "library",
            source_function_name=fn.name,
            source_class_name=fn.parent_class_name,
            instance_ref=self._build_instance_ref(fn),
        )

    def _order_inputs(self, inputs: list[InputSpec]) -> list[InputSpec]:
        id_inputs = [inp for inp in inputs if inp.name == "id"]
        other_inputs = [inp for inp in inputs if inp.name != "id"]
        return id_inputs + other_inputs

    def _block_type(self, fn) -> str:
        if fn.parent_class_name:
            suffix = "create" if fn.is_constructor else snake_case(fn.name)
            return f"{snake_case(fn.parent_class_name)}__{suffix}"
        return snake_case(fn.name)

    def _label_for(self, fn, inputs: list[InputSpec]) -> str:
        if fn.is_constructor and fn.parent_class_name:
            return f"Create {humanize_identifier(fn.parent_class_name)}"
        return humanize_identifier(fn.name)

    def _infer_check_type(self, type_hint: str | None, param_name: str | None = None) -> str | None:
        if param_name:
            lower_name = param_name.lower()
            if lower_name == "id":
                return "Number"
            if "pin" in lower_name and "pins" not in lower_name:
                return "Number"
        if type_hint in {"int", "float"}:
            return "Number"
        if type_hint == "str":
            return "String"
        if type_hint == "bool":
            return "Boolean"
        return None

    def _build_instance_ref(self, fn) -> InstanceReferenceSpec | None:
        md = fn.metadata
        assert md is not None

        if not fn.parent_class_name:
            return None

        instance_mode = md.instance_mode or InstanceMode.SINGLETON
        if instance_mode == InstanceMode.SINGLETON:
            return InstanceReferenceSpec(
                mode=MethodInstanceMode.FIXED_NAME,
                fixed_instance_name=md.instance_name or "board",
            )

        if md.method_instance_mode == MethodInstanceMode.KEY_INPUT:
            return InstanceReferenceSpec(
                mode=MethodInstanceMode.KEY_INPUT,
                key_parameter_name="id",
                key_input_name="id",
            )

        if md.method_instance_mode == MethodInstanceMode.OBJECT_INPUT:
            return InstanceReferenceSpec(mode=MethodInstanceMode.OBJECT_INPUT)

        return None
