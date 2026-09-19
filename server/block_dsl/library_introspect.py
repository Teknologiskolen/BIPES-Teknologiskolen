from __future__ import annotations

import ast
from dataclasses import dataclass
from pathlib import Path

from .model import BlockSpec


@dataclass(slots=True)
class CallableSignature:
    min_required: int  # positional params with no default (excl. self/cls)
    max_total: int | None  # None = unbounded (*args present)


@dataclass(slots=True)
class LibrarySignatures:
    path: Path
    functions: dict[str, CallableSignature]
    classes: dict[str, dict[str, CallableSignature]]  # class_name -> {method_name: sig}


@dataclass(slots=True)
class ValidationError:
    block_type: str
    message: str

    def __str__(self) -> str:
        return f"{self.block_type}: {self.message}"


def load_library_signatures(py_path: str | Path) -> LibrarySignatures:
    path = Path(py_path)
    tree = ast.parse(path.read_text(encoding="utf-8"), filename=str(path))

    functions: dict[str, CallableSignature] = {}
    classes: dict[str, dict[str, CallableSignature]] = {}

    for node in tree.body:
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            functions[node.name] = _signature(node, is_method=False)
        elif isinstance(node, ast.ClassDef):
            classes[node.name] = {
                item.name: _signature(item, is_method=True)
                for item in node.body
                if isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef))
            }

    return LibrarySignatures(path=path, functions=functions, classes=classes)


def _signature(node, *, is_method: bool) -> CallableSignature:
    # node.args.defaults are right-aligned against node.args.args (positional-or-
    # keyword params); strip the leading self/cls for methods before counting.
    positional = node.args.args[1:] if is_method and node.args.args else node.args.args
    required = max(len(positional) - len(node.args.defaults), 0)
    max_total = None if node.args.vararg else len(positional)
    return CallableSignature(min_required=required, max_total=max_total)


def validate_blocks(blocks: list[BlockSpec], signatures: LibrarySignatures) -> list[ValidationError]:
    errors: list[ValidationError] = []
    for block in blocks:
        declared = sum(1 for inp in block.inputs if not inp.is_instance_selector)

        if block.source_class_name:
            methods = signatures.classes.get(block.source_class_name)
            if methods is None:
                errors.append(ValidationError(
                    block.type,
                    f"class '{block.source_class_name}' not found in {signatures.path}",
                ))
                continue
            fn_name = block.source_function_name
            sig = methods.get(fn_name)
            if sig is None and fn_name == "__init__":
                sig = CallableSignature(min_required=0, max_total=0)  # implicit no-arg ctor
            if sig is None:
                errors.append(ValidationError(
                    block.type,
                    f"method '{block.source_class_name}.{fn_name}' not found in {signatures.path}",
                ))
                continue
        else:
            sig = signatures.functions.get(block.source_function_name)
            if sig is None:
                errors.append(ValidationError(
                    block.type,
                    f"function '{block.source_function_name}' not found in {signatures.path}",
                ))
                continue

        if declared < sig.min_required:
            errors.append(ValidationError(
                block.type,
                f"declares {declared} param(s) but the real signature requires at least "
                f"{sig.min_required} (positional, no default) -- the generated call would raise "
                f"a missing-argument error",
            ))
        elif sig.max_total is not None and declared > sig.max_total:
            errors.append(ValidationError(
                block.type,
                f"declares {declared} param(s) but the real signature accepts at most "
                f"{sig.max_total} -- the generated call would raise a too-many-arguments error",
            ))
    return errors
