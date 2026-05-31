"""Input AST for .blockdef.yaml files.

Typed intermediate representation between raw YAML dicts and the BlockSpec runtime
model. Each DSL concept maps to a distinct dataclass; mutually exclusive alternatives
(singleton vs multiple, value vs pin vs dropdown) are encoded as separate classes
rather than mode flags on a shared struct — following the MDSD principle that
alternatives in a rule generate subclasses in the metamodel.

Pipeline:
  raw YAML dict
    → JSON Schema validation (_validate_schema)
    → BlockdefFile AST (_parse_blockdef_file)
    → semantic validation (_validate_ast)
    → BlockSpec list (_extract_blocks)
    → emitters (JS + Python generators)
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from .model import ImportSpec


# ---------------------------------------------------------------------------
# Param alternatives (oneOf in JSON Schema → union of subclasses here)
# ---------------------------------------------------------------------------

@dataclass(slots=True)
class DropdownOption:
    label: str
    value: str


@dataclass(slots=True)
class ValueParamDef:
    """A value input: accepts a connected block, optionally type-checked."""
    name: str
    type: str | list[str] | None = None
    default: Any = None
    keyword: bool = False


@dataclass(slots=True)
class PinParamDef:
    """A GPIO pin input. Wraps the number in Pin(n, Pin.IN/OUT/none)."""
    name: str
    pin_mode: str  # "input" | "output" | "any"
    default: int | None = None
    keyword: bool = False


@dataclass(slots=True)
class LegacyPinParamDef:
    """Legacy raw-pin input: passes the integer directly without Pin() wrapping."""
    name: str
    default: int | None = None
    keyword: bool = False


@dataclass(slots=True)
class DropdownParamDef:
    """A dropdown field: renders as a fixed-choice selector, not a value input."""
    name: str
    options: list[DropdownOption] = field(default_factory=list)
    default: str | None = None


AnyParamDef = ValueParamDef | PinParamDef | LegacyPinParamDef | DropdownParamDef


# ---------------------------------------------------------------------------
# Block definition
# ---------------------------------------------------------------------------

@dataclass(slots=True)
class FunctionBlockDef:
    fn: str
    label: str | None = None
    kind: str | None = None          # "value" | "statement" | "hat" | None → defaults to "statement"
    inline: bool | None = None
    tooltip: str = ""
    output_type: str | None = None
    supertype: str | None = None     # supertype of output_type (e.g. "Number" for "Color565")
    params: list[AnyParamDef] = field(default_factory=list)


# ---------------------------------------------------------------------------
# Class alternatives (singleton vs multiple → separate subclasses)
# ---------------------------------------------------------------------------

@dataclass(slots=True)
class SingletonClassDef:
    """A class with one shared instance; the variable name is fixed at author time."""
    name: str
    blocks: list[FunctionBlockDef] = field(default_factory=list)
    instance_name: str | None = None


@dataclass(slots=True)
class MultipleClassDef:
    """A class where multiple instances exist, identified by a user-provided key."""
    name: str
    blocks: list[FunctionBlockDef] = field(default_factory=list)
    method_ref: str = "key_input"    # "key_input" | "object_input"


# ---------------------------------------------------------------------------
# Category and file root
# ---------------------------------------------------------------------------

@dataclass(slots=True)
class CategoryDef:
    name: str
    color: int | None = None
    classes: list[SingletonClassDef | MultipleClassDef] = field(default_factory=list)
    blocks: list[FunctionBlockDef] = field(default_factory=list)


@dataclass(slots=True)
class BlockdefFile:
    module: str
    url: str = ""
    imports: list[ImportSpec] = field(default_factory=list)
    categories: list[CategoryDef] = field(default_factory=list)
