from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
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


class InstanceMode(str, Enum):
    SINGLETON = "singleton"
    MULTIPLE = "multiple"


class MethodInstanceMode(str, Enum):
    FIXED_NAME = "fixed_name"
    KEY_INPUT = "key_input"
    OBJECT_INPUT = "object_input"


@dataclass(slots=True)
class ParamConfig:
    name: str
    input_kind: InputKind | None = None
    check_type: str | None = None
    default_value: Any = None
    options: list[tuple[str, str]] = field(default_factory=list)


@dataclass(slots=True)
class Metadata:
    category: str | None = None
    color: int | None = None
    url: str | None = None
    label: str | None = None
    kind: BlockKind | None = None
    inputs_inline: bool | None = None
    instance_mode: InstanceMode | None = None
    instance_name: str | None = None
    instance_name_from: str | None = None
    method_instance_mode: MethodInstanceMode | None = None
    param_configs: dict[str, ParamConfig] = field(default_factory=dict)


@dataclass(slots=True)
class ParameterSpec:
    name: str
    type_hint: str | None = None
    default_value: Any = None


@dataclass(slots=True)
class AnnotatedElement:
    tooltip: str = ""
    is_block_annotated: bool = False
    metadata: Metadata | None = None


@dataclass(slots=True)
class FunctionBlockSource(AnnotatedElement):
    name: str = ""
    is_public_block: bool = False
    is_constructor: bool = False
    return_type: str | None = None
    parameters: list[ParameterSpec] = field(default_factory=list)
    parent_class_name: str | None = None
    source_module_name: str | None = None
    lineno: int | None = None


@dataclass(slots=True)
class ClassBlockSource(AnnotatedElement):
    name: str = ""
    methods: list[FunctionBlockSource] = field(default_factory=list)
    source_module_name: str | None = None
    lineno: int | None = None


@dataclass(slots=True)
class ModuleSource:
    name: str
    path: str
    classes: list[ClassBlockSource] = field(default_factory=list)
    functions: list[FunctionBlockSource] = field(default_factory=list)


@dataclass(slots=True)
class InputSpec:
    name: str
    input_kind: InputKind = InputKind.INPUT_VALUE
    check_type: str | None = None
    default_value: Any = None
    is_instance_selector: bool = False
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
class ToolboxCategory:
    name: str
    color: int | None = None
    blocks: list[BlockSpec] = field(default_factory=list)


@dataclass(slots=True)
class GeneratorSpec:
    language: str
    template: str
    block_type: str
    source_module_name: str
    source_function_name: str
    source_class_name: str | None = None


@dataclass(slots=True)
class AnnotationRecord:
    metadata_dict: dict[str, Any]
    tooltip: str
    annotation_line: int
    target_line: int


@dataclass(slots=True)
class ParseResult:
    module: ModuleSource
    blocks: list[BlockSpec] = field(default_factory=list)
    toolbox: list[ToolboxCategory] = field(default_factory=list)
    generators: list[GeneratorSpec] = field(default_factory=list)


def module_name_from_path(path: str | Path) -> str:
    return Path(path).stem
