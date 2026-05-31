"""Parse .blockdef.yaml files into BlockSpec lists.

Pipeline:
  raw YAML dict
    → JSON Schema validation  (_validate_schema)
    → BlockdefFile AST        (_parse_blockdef_file)
    → semantic validation     (_validate_ast)
    → BlockSpec list          (BlockdefParser._extract_blocks)
    → emitters (JS + Python generators)
"""

from __future__ import annotations

import json
import warnings
from pathlib import Path
from typing import Any

import yaml
import jsonschema

from .blockdef_ast import (
    BlockdefFile,
    CategoryDef,
    DropdownOption,
    DropdownParamDef,
    FunctionBlockDef,
    LegacyPinParamDef,
    MultipleClassDef,
    PinParamDef,
    SingletonClassDef,
    ValueParamDef,
)
from .builder import humanize_identifier, snake_case
from .model import (
    BlockKind,
    BlockSpec,
    ImportSpec,
    InputKind,
    InputSpec,
    InstanceReferenceSpec,
    MethodInstanceMode,
    ModuleSource,
    ParseResult,
)
from .python_generator import PythonGeneratorBuilder
from .toolbox_builder import SimpleToolboxBuilder

_SCHEMA_PATH = Path(__file__).parent.parent / "definitions" / "blockdef_schema.json"

# Types built into Blockly — no corresponding output block needed.
_BUILTIN_CHECK_TYPES: frozenset[str] = frozenset({"Number", "String", "Boolean", "Any"})

# Types whose output blocks live in hand-written JS (not in any blockdef YAML).
# Add new platform bus/object types here when a new hand-written block is added.
_PLATFORM_OUTPUT_TYPES: frozenset[str] = frozenset({"SPI", "I2C", "UART"})

KNOWN_TYPES: frozenset[str] = _BUILTIN_CHECK_TYPES | _PLATFORM_OUTPUT_TYPES

_TYPE_PYTHON_KINDS: dict[str, tuple[type, ...]] = {
    "Number": (int, float),
    "Boolean": (bool,),
    "String": (str,),
}


class BlockdefValidationError(ValueError):
    """Raised when a .blockdef.yaml file fails schema or semantic validation."""


# ===========================================================================
# Public API
# ===========================================================================

class BlockdefParser:
    """Parses a .blockdef.yaml file and returns a ParseResult."""

    def __init__(self) -> None:
        schema = json.loads(_SCHEMA_PATH.read_text(encoding="utf-8"))
        self._validator = jsonschema.Draft7Validator(schema)
        self._toolbox = SimpleToolboxBuilder()
        self._generators = PythonGeneratorBuilder()

    def parse_file(self, path: str | Path) -> ParseResult:
        path = Path(path)
        raw = yaml.safe_load(path.read_text(encoding="utf-8"))
        _validate_schema(raw, path, self._validator)

        import_specs = _parse_imports(raw.get("imports", []))
        bdf = _parse_blockdef_file(raw, import_specs)
        _validate_ast(bdf, path)

        blocks = self._extract_blocks(bdf)
        toolbox = self._toolbox.build_toolbox(blocks)
        generators = self._generators.build_generators(blocks)
        module = ModuleSource(name=bdf.module, path=str(path))
        return ParseResult(module=module, blocks=blocks, toolbox=toolbox, generators=generators)

    # ------------------------------------------------------------------
    # Block extraction (AST → BlockSpec)
    # ------------------------------------------------------------------

    def _extract_blocks(self, bdf: BlockdefFile) -> list[BlockSpec]:
        blocks: list[BlockSpec] = []
        direct_names: set[str] = {name for spec in bdf.imports for name in spec.names}

        for cat in bdf.categories:
            for cls in cat.classes:
                blocks.extend(self._blocks_from_class(cls, cat, bdf, direct_names))
            for fb in cat.blocks:
                blocks.append(self._block_from_fn(fb, cat, bdf, class_ctx=None, direct_names=direct_names))

        return blocks

    def _blocks_from_class(
        self,
        cls: SingletonClassDef | MultipleClassDef,
        cat: CategoryDef,
        bdf: BlockdefFile,
        direct_names: set[str],
    ) -> list[BlockSpec]:
        constructor = next((b for b in cls.blocks if b.fn == "__init__"), None)
        ordered = (
            ([constructor] if constructor else [])
            + [b for b in cls.blocks if b.fn != "__init__"]
        )
        return [
            self._block_from_fn(fb, cat, bdf, class_ctx=cls, direct_names=direct_names)
            for fb in ordered
        ]

    def _block_from_fn(
        self,
        fb: FunctionBlockDef,
        cat: CategoryDef,
        bdf: BlockdefFile,
        class_ctx: SingletonClassDef | MultipleClassDef | None,
        direct_names: set[str],
    ) -> BlockSpec:
        fn_name = fb.fn
        is_ctor = fn_name == "__init__"
        class_name = class_ctx.name if class_ctx else None

        label = fb.label or (
            f"Create {humanize_identifier(class_name)}"
            if is_ctor and class_ctx
            else humanize_identifier(fn_name)
        )

        if class_ctx:
            suffix = "create" if is_ctor else snake_case(fn_name)
            block_type = f"{snake_case(class_name)}__{suffix}"
        else:
            block_type = snake_case(fn_name)

        use_direct = (
            class_ctx is not None and class_ctx.name in direct_names
        ) or (
            class_ctx is None and fn_name in direct_names
        )

        return BlockSpec(
            type=block_type,
            label=label,
            category=cat.name,
            color=cat.color,
            tooltip=fb.tooltip,
            help_url=bdf.url or None,
            kind=_block_kind(fb.kind, is_ctor),
            is_constructor_block=is_ctor,
            inputs_inline=bool(fb.inline if fb.inline is not None else len(fb.params) <= 5),
            inputs=_build_inputs_ast(fb, class_ctx, is_ctor),
            source_module_name=bdf.module,
            source_function_name=fn_name,
            source_class_name=class_name,
            instance_ref=_instance_ref_ast(class_ctx) if class_ctx else None,
            import_specs=bdf.imports,
            use_direct_imports=use_direct,
            output_type=fb.output_type or None,
            output_supertypes=[fb.supertype] if fb.supertype else [],
        )


# ===========================================================================
# AST building (raw YAML dict → BlockdefFile)
# ===========================================================================

def _parse_imports(raw_imports: list) -> list[ImportSpec]:
    specs: list[ImportSpec] = []
    for item in raw_imports:
        if isinstance(item, str):
            specs.append(ImportSpec(module=item, names=[]))
        elif isinstance(item, dict):
            specs.append(ImportSpec(module=item["from"], names=list(item["names"])))
    return specs


def _parse_param(param: dict) -> ValueParamDef | PinParamDef | LegacyPinParamDef | DropdownParamDef:
    name = param["name"]
    if "options" in param:
        return DropdownParamDef(
            name=name,
            options=[DropdownOption(label=o["label"], value=o["value"]) for o in param["options"]],
            default=param.get("default"),
        )
    if "pin_mode" in param:
        return PinParamDef(
            name=name,
            pin_mode=param["pin_mode"],
            default=param.get("default"),
            keyword=bool(param.get("keyword", False)),
        )
    if param.get("pin"):
        return LegacyPinParamDef(
            name=name,
            default=param.get("default"),
            keyword=bool(param.get("keyword", False)),
        )
    return ValueParamDef(
        name=name,
        type=param.get("type"),
        default=param.get("default"),
        keyword=bool(param.get("keyword", False)),
    )


def _parse_function_block(block: dict) -> FunctionBlockDef:
    return FunctionBlockDef(
        fn=block["fn"],
        label=block.get("label"),
        kind=block.get("kind"),
        inline=block.get("inline"),
        tooltip=block.get("tooltip", ""),
        output_type=block.get("output_type"),
        supertype=block.get("supertype"),
        params=[_parse_param(p) for p in block.get("params", [])],
    )


def _parse_class(cls: dict) -> SingletonClassDef | MultipleClassDef:
    blocks = [_parse_function_block(b) for b in cls.get("blocks", [])]
    if cls["instance_mode"] == "singleton":
        return SingletonClassDef(
            name=cls["name"],
            blocks=blocks,
            instance_name=cls.get("instance_name"),
        )
    return MultipleClassDef(
        name=cls["name"],
        blocks=blocks,
        method_ref=cls.get("method_ref", "key_input"),
    )


def _parse_category(cat: dict) -> CategoryDef:
    return CategoryDef(
        name=cat["name"],
        color=cat.get("color"),
        classes=[_parse_class(c) for c in cat.get("classes", [])],
        blocks=[_parse_function_block(b) for b in cat.get("blocks", [])],
    )


def _parse_blockdef_file(raw: dict, import_specs: list[ImportSpec]) -> BlockdefFile:
    return BlockdefFile(
        module=raw["module"],
        url=raw.get("url", ""),
        imports=import_specs,
        categories=[_parse_category(c) for c in raw.get("categories", [])],
    )


# ===========================================================================
# Input builders (AST → InputSpec)
# ===========================================================================

def _build_inputs_ast(
    fb: FunctionBlockDef,
    class_ctx: SingletonClassDef | MultipleClassDef | None,
    is_ctor: bool,
) -> list[InputSpec]:
    inputs: list[InputSpec] = []

    if (
        isinstance(class_ctx, MultipleClassDef)
        and not is_ctor
        and class_ctx.method_ref == "key_input"
    ):
        inputs.append(InputSpec(
            name="id",
            input_kind=InputKind.INPUT_VALUE,
            check_type="Number",
            default_value=1,
            is_instance_selector=True,
        ))

    for param in fb.params:
        inputs.append(_input_from_param_ast(param))

    return inputs


def _input_from_param_ast(
    param: ValueParamDef | PinParamDef | LegacyPinParamDef | DropdownParamDef,
) -> InputSpec:
    if isinstance(param, DropdownParamDef):
        return InputSpec(
            name=param.name,
            input_kind=InputKind.FIELD_DROPDOWN,
            check_type=None,
            default_value=param.default,
            is_instance_selector=False,
            options=[(opt.label, opt.value) for opt in param.options],
        )

    if isinstance(param, PinParamDef):
        return InputSpec(
            name=param.name,
            input_kind=InputKind.INPUT_VALUE,
            check_type="Number",
            default_value=param.default,
            is_instance_selector=False,
            options=[],
            pin_mode=param.pin_mode,
            keyword=param.keyword,
        )

    if isinstance(param, LegacyPinParamDef):
        return InputSpec(
            name=param.name,
            input_kind=InputKind.INPUT_VALUE,
            check_type="Number",
            default_value=param.default,
            is_instance_selector=False,
            options=[],
            keyword=param.keyword,
        )

    # ValueParamDef
    raw_type = param.type
    if isinstance(raw_type, list):
        check_type: str | list[str] | None = [t for t in raw_type if t != "Any"] or None
    else:
        check_type = raw_type if raw_type and raw_type != "Any" else None

    return InputSpec(
        name=param.name,
        input_kind=InputKind.INPUT_VALUE,
        check_type=check_type,
        default_value=param.default,
        is_instance_selector=False,
        options=[],
        keyword=param.keyword,
    )


def _block_kind(kind_str: str | None, is_constructor: bool) -> BlockKind:
    if is_constructor:
        return BlockKind.STATEMENT
    return {"value": BlockKind.VALUE, "hat": BlockKind.HAT}.get(
        kind_str or "", BlockKind.STATEMENT
    )


def _instance_ref_ast(
    class_ctx: SingletonClassDef | MultipleClassDef,
) -> InstanceReferenceSpec:
    if isinstance(class_ctx, SingletonClassDef):
        return InstanceReferenceSpec(
            mode=MethodInstanceMode.FIXED_NAME,
            fixed_instance_name=class_ctx.instance_name,
        )
    if class_ctx.method_ref == "key_input":
        return InstanceReferenceSpec(
            mode=MethodInstanceMode.KEY_INPUT,
            key_parameter_name="id",
            key_input_name="id",
        )
    return InstanceReferenceSpec(mode=MethodInstanceMode.OBJECT_INPUT)


# ===========================================================================
# Schema validation
# ===========================================================================

def _validate_schema(raw: Any, path: Path, validator: jsonschema.Draft7Validator) -> None:
    errors = sorted(validator.iter_errors(raw), key=lambda e: list(e.absolute_path))
    if errors:
        msgs = "\n".join(
            f"  [{'.'.join(str(p) for p in e.absolute_path)}] {e.message}"
            for e in errors
        )
        raise BlockdefValidationError(f"{path}: schema validation failed:\n{msgs}")


# ===========================================================================
# Semantic validation (operates on typed AST)
# ===========================================================================

def _validate_ast(bdf: BlockdefFile, path: Path) -> None:
    errs: list[str] = []

    _check_duplicates([cat.name for cat in bdf.categories], "category name", errs)

    local_output_types: set[str] = set()

    for cat in bdf.categories:
        _check_duplicates(
            [cls.name for cls in cat.classes],
            f"class name in category '{cat.name}'",
            errs,
        )

        for cls in cat.classes:
            _check_duplicates(
                [b.fn for b in cls.blocks],
                f"fn in class '{cls.name}'",
                errs,
            )
            for block in cls.blocks:
                _validate_block_ast(block, f"{cls.name}.{block.fn}", errs)
                if block.kind == "value" and block.output_type:
                    local_output_types.add(block.output_type)

        _check_duplicates(
            [b.fn for b in cat.blocks],
            f"fn in category '{cat.name}'",
            errs,
        )
        for block in cat.blocks:
            if block.fn == "__init__":
                errs.append(f"category '{cat.name}': '__init__' is only valid inside a class")
            _validate_block_ast(block, block.fn, errs)
            if block.kind == "value" and block.output_type:
                local_output_types.add(block.output_type)

    if errs:
        raise BlockdefValidationError(
            f"{path}: semantic errors:\n" + "\n".join(f"  - {e}" for e in errs)
        )

    _validate_type_references_ast(bdf, path, local_output_types)


def _validate_block_ast(block: FunctionBlockDef, context: str, errs: list[str]) -> None:
    _check_duplicates([p.name for p in block.params], f"param in '{context}'", errs)

    for param in block.params:
        if isinstance(param, ValueParamDef):
            _validate_value_param_default(param, context, errs)

    # Circular shadow: output_type must not appear as a param type on the same block
    if block.kind == "value" and block.output_type:
        for param in block.params:
            if isinstance(param, ValueParamDef) and param.type:
                types = param.type if isinstance(param.type, list) else [param.type]
                if block.output_type in types:
                    errs.append(
                        f"block '{block.fn}': output_type '{block.output_type}' appears as a "
                        f"param type on '{param.name}' — this would cause infinite shadow recursion"
                    )

    if block.supertype:
        if block.kind != "value":
            errs.append(
                f"block '{block.fn}': 'supertype' is only valid on value blocks "
                f"(current kind: {block.kind or 'statement'})"
            )
        if not block.output_type:
            errs.append(f"block '{block.fn}': 'supertype' requires 'output_type' to be set")


def _validate_value_param_default(
    param: ValueParamDef, context: str, errs: list[str]
) -> None:
    raw_type = param.type
    default = param.default
    if raw_type is None or default is None or isinstance(default, list):
        return
    declared_types = raw_type if isinstance(raw_type, list) else [raw_type]
    built_in = [t for t in declared_types if t in _TYPE_PYTHON_KINDS]
    if not built_in:
        return
    for t in built_in:
        expected = _TYPE_PYTHON_KINDS[t]
        if t == "Number" and isinstance(default, bool):
            continue
        if isinstance(default, expected):
            return
    errs.append(
        f"{context}.{param.name}: default {default!r} is incompatible "
        f"with declared type(s) {declared_types}"
    )


def _validate_type_references_ast(
    bdf: BlockdefFile,
    path: Path,
    local_output_types: set[str],
    extra_known_types: set[str] | None = None,
) -> None:
    known = KNOWN_TYPES | local_output_types | (extra_known_types or set())
    errs: list[str] = []
    used_types: set[str] = set()

    for cat in bdf.categories:
        all_blocks: list[FunctionBlockDef] = list(cat.blocks)
        for cls in cat.classes:
            all_blocks += cls.blocks

        for block in all_blocks:
            for param in block.params:
                if not isinstance(param, ValueParamDef) or not param.type:
                    continue
                types = param.type if isinstance(param.type, list) else [param.type]
                ctx = f"{cat.name}.{block.fn}.{param.name}"
                for t in types:
                    used_types.add(t)
                    if t not in known:
                        errs.append(
                            f"param '{ctx}': type '{t}' has no registered output block "
                            f"(add a value block with output_type: {t}, "
                            f"or register it in _PLATFORM_OUTPUT_TYPES)"
                        )

            if block.supertype and block.supertype not in known:
                errs.append(
                    f"block '{block.fn}': supertype '{block.supertype}' is not a known type "
                    f"(must be a built-in type like Number, String, Boolean, or a platform type)"
                )

    if errs:
        raise BlockdefValidationError(
            f"{path}: unresolved type references:\n" + "\n".join(f"  - {e}" for e in errs)
        )

    orphans = local_output_types - used_types - KNOWN_TYPES
    for t in sorted(orphans):
        warnings.warn(
            f"{path}: output_type '{t}' is declared but never used as a param type in this file",
            stacklevel=4,
        )


# ===========================================================================
# Shared helpers
# ===========================================================================

def _check_duplicates(names: list[str], context: str, errs: list[str]) -> None:
    seen: set[str] = set()
    for name in names:
        if name in seen:
            errs.append(f"duplicate {context}: '{name}'")
        seen.add(name)
