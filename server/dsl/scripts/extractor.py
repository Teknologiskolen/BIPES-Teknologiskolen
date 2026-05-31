from __future__ import annotations

import ast
from pathlib import Path
from typing import Any

from .model import (
    ClassBlockSource,
    FunctionBlockSource,
    ModuleSource,
    ParameterSpec,
    module_name_from_path,
)


def _expr_to_type_name(node: ast.expr | None) -> str | None:
    if node is None:
        return None
    try:
        return ast.unparse(node)
    except Exception:
        return None


def _literal_or_none(node: ast.expr | None) -> Any:
    if node is None:
        return None
    try:
        return ast.literal_eval(node)
    except Exception:
        try:
            return ast.unparse(node)
        except Exception:
            return None


class PythonAstSourceExtractor:
    def extract(self, source: str, path: str | Path = "<memory>") -> ModuleSource:
        tree = ast.parse(source, filename=str(path))
        module_name = module_name_from_path(path)
        module = ModuleSource(name=module_name, path=str(path))

        for node in tree.body:
            if isinstance(node, ast.ClassDef):
                module.classes.append(self._extract_class(node, module_name))
            elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                module.functions.append(
                    self._extract_function(node, parent_class_name=None, module_name=module_name)
                )

        return module

    def _extract_class(self, node: ast.ClassDef, module_name: str) -> ClassBlockSource:
        cls = ClassBlockSource(name=node.name, lineno=node.lineno, source_module_name=module_name)
        for child in node.body:
            if isinstance(child, (ast.FunctionDef, ast.AsyncFunctionDef)):
                cls.methods.append(
                    self._extract_function(child, parent_class_name=node.name, module_name=module_name)
                )
        return cls

    def _extract_function(
        self,
        node: ast.FunctionDef | ast.AsyncFunctionDef,
        parent_class_name: str | None,
        module_name: str,
    ) -> FunctionBlockSource:
        fn = FunctionBlockSource(
            name=node.name,
            is_constructor=(node.name == "__init__"),
            parent_class_name=parent_class_name,
            return_type=_expr_to_type_name(node.returns),
            source_module_name=module_name,
            lineno=node.lineno,
        )
        fn.parameters = self._extract_parameters(node, is_method=parent_class_name is not None)
        return fn

    def _extract_parameters(
        self,
        node: ast.FunctionDef | ast.AsyncFunctionDef,
        is_method: bool,
    ) -> list[ParameterSpec]:
        args = list(node.args.args)
        defaults = list(node.args.defaults)
        default_offset = len(args) - len(defaults)
        default_map: dict[str, Any] = {}

        for idx, arg in enumerate(args):
            if idx >= default_offset:
                default_map[arg.arg] = _literal_or_none(defaults[idx - default_offset])

        params: list[ParameterSpec] = []
        for idx, arg in enumerate(args):
            if is_method and idx == 0 and arg.arg in {"self", "cls"}:
                continue
            params.append(
                ParameterSpec(
                    name=arg.arg,
                    type_hint=_expr_to_type_name(arg.annotation),
                    default_value=default_map.get(arg.arg),
                )
            )
        return params
