from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class BlockKind(str, Enum):
    STATEMENT = "statement"
    VALUE = "value"
    HAT = "hat"


class InputKind(str, Enum):
    INPUT_VALUE = "input_value"
    FIELD_DROPDOWN = "field_dropdown"
    FIELD_INPUT = "field_input"
    VARIABLE = "variable"


class MethodInstanceMode(str, Enum):
    FIXED_NAME = "fixed_name"
    KEY_INPUT = "key_input"
    OBJECT_INPUT = "object_input"


@dataclass(slots=True)
class InputSpec:
    name: str
    input_kind: InputKind = InputKind.INPUT_VALUE
    check_type: str | None = None
    default_value: Any = None
    is_instance_selector: bool = False
    is_pin: bool = False
    options: list[tuple[str, str]] = field(default_factory=list)


@dataclass(slots=True)
class InstanceReferenceSpec:
    mode: MethodInstanceMode
    fixed_instance_name: str | None = None
    key_parameter_name: str | None = None
    key_input_name: str | None = None


@dataclass(slots=True)
class BlockSpec:
    type: str
    label: str
    category: str
    color: int | None
    tooltip: str
    help_url: str | None
    kind: BlockKind
    is_constructor_block: bool
    inputs_inline: bool
    inputs: list[InputSpec]
    source_module_name: str
    source_function_name: str
    source_class_name: str | None = None
    instance_ref: InstanceReferenceSpec | None = None


@dataclass(slots=True)
class GeneratorSpec:
    language: str
    template: str
    block_type: str
    source_module_name: str
    source_function_name: str
    source_class_name: str | None = None


@dataclass(slots=True)
class ParseResult:
    blocks: list[BlockSpec] = field(default_factory=list)
    generators: list[GeneratorSpec] = field(default_factory=list)
