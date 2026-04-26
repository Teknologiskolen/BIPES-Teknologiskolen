from __future__ import annotations

import re

from .errors import InstanceConfigError, LabelPlaceholderError, ValidationError
from .model import InstanceMode, InputKind, MethodInstanceMode, ModuleSource

_PLACEHOLDER_RE = re.compile(r"\{([A-Za-z_][A-Za-z0-9_]*)\}")


class ModelValidator:
    def validate_module(self, module: ModuleSource) -> None:
        for cls in module.classes:
            self._validate_class(cls)
            for method in cls.methods:
                self._validate_function(method)

        for fn in module.functions:
            self._validate_function(fn)

    def _validate_class(self, cls) -> None:
        md = cls.metadata
        if not md:
            return

        instance_mode = md.instance_mode or InstanceMode.SINGLETON
        if instance_mode == InstanceMode.MULTIPLE:
            constructor = next((method for method in cls.methods if method.is_constructor), None)
            if constructor is None:
                raise InstanceConfigError(
                    f"Class {cls.name}: instanceMode=multiple requires an annotated __init__ constructor"
                )

            constructor_param_names = {p.name for p in constructor.parameters}
            if "id" not in constructor_param_names:
                raise InstanceConfigError(
                    f"Class {cls.name}: instanceMode=multiple requires constructor parameter 'id'"
                )

    def _validate_function(self, fn) -> None:
        if not fn.is_public_block:
            return

        md = fn.metadata
        if md is None:
            raise ValidationError(f"{fn.name}: public block is missing resolved metadata")

        param_names = {p.name for p in fn.parameters}
        for cfg_name, cfg in md.param_configs.items():
            if cfg_name not in param_names:
                raise ValidationError(
                    f"{fn.name}: param config '{cfg_name}' does not match a function parameter"
                )
            if cfg.input_kind == InputKind.FIELD_DROPDOWN and not cfg.options:
                raise ValidationError(
                    f"{fn.name}: field_dropdown param '{cfg_name}' requires options"
                )
            if cfg.options and cfg.input_kind not in {InputKind.FIELD_DROPDOWN, None}:
                raise ValidationError(
                    f"{fn.name}: options only make sense for field_dropdown params"
                )

        if md.label:
            valid_names = set(param_names)
            if (
                fn.parent_class_name
                and (md.instance_mode or InstanceMode.SINGLETON) == InstanceMode.MULTIPLE
                and md.method_instance_mode == MethodInstanceMode.KEY_INPUT
                and not fn.is_constructor
            ):
                valid_names.add("id")

            for placeholder in _PLACEHOLDER_RE.findall(md.label):
                if placeholder not in valid_names:
                    raise LabelPlaceholderError(
                        f"{fn.name}: label placeholder '{placeholder}' is not a valid input name"
                    )
