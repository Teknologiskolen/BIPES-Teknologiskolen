from __future__ import annotations

from typing import Any

from .errors import UnknownMetadataKeyError
from .model import (
    BlockKind,
    InputKind,
    InstanceMode,
    Metadata,
    MethodInstanceMode,
    ParamConfig,
)


_CLASS_KEYS = {
    "category",
    "color",
    "url",
    "label",
    "kind",
    "inputsInline",
    "instanceMode",
    "instanceName",
    "instanceNameFrom",
    "methodInstanceMode",
}

_FUNCTION_KEYS = {
    "label",
    "category",
    "color",
    "url",
    "kind",
    "inputsInline",
    "params",
}


def metadata_from_dict(raw: dict[str, Any], *, target: str) -> Metadata:
    allowed = _CLASS_KEYS if target == "class" else _FUNCTION_KEYS
    unknown = set(raw) - allowed
    if unknown:
        raise UnknownMetadataKeyError(
            f"Unknown {target} metadata key(s): {', '.join(sorted(unknown))}"
        )

    md = Metadata(
        category=raw.get("category"),
        color=raw.get("color"),
        url=raw.get("url"),
        label=raw.get("label"),
        kind=BlockKind(raw["kind"]) if raw.get("kind") else None,
        inputs_inline=raw.get("inputsInline"),
        instance_mode=InstanceMode(raw["instanceMode"]) if raw.get("instanceMode") else None,
        instance_name=raw.get("instanceName"),
        instance_name_from=raw.get("instanceNameFrom"),
        method_instance_mode=(
            MethodInstanceMode(raw["methodInstanceMode"])
            if raw.get("methodInstanceMode")
            else None
        ),
    )

    if target == "function":
        params_raw = raw.get("params", {})
        md.param_configs = {
            name: ParamConfig(
                name=name,
                input_kind=InputKind(cfg["inputKind"]) if cfg.get("inputKind") else None,
                check_type=cfg.get("checkType"),
                default_value=cfg.get("defaultValue"),
                options=[tuple(opt) for opt in cfg.get("options", [])],
            )
            for name, cfg in params_raw.items()
        }

    if md.instance_mode == InstanceMode.MULTIPLE:
        # v1+ rule: multiple-instance classes always use a numeric `id`.
        md.instance_name_from = "id"
        if md.method_instance_mode is None:
            md.method_instance_mode = MethodInstanceMode.KEY_INPUT

    return md


def merge_metadata(class_md: Metadata | None, method_md: Metadata | None) -> Metadata | None:
    if class_md is None and method_md is None:
        return None
    if class_md is None:
        return method_md
    if method_md is None:
        return class_md

    return Metadata(
        category=method_md.category if method_md.category is not None else class_md.category,
        color=method_md.color if method_md.color is not None else class_md.color,
        url=method_md.url if method_md.url is not None else class_md.url,
        label=method_md.label if method_md.label is not None else class_md.label,
        kind=method_md.kind if method_md.kind is not None else class_md.kind,
        inputs_inline=(
            method_md.inputs_inline
            if method_md.inputs_inline is not None
            else class_md.inputs_inline
        ),
        instance_mode=(
            method_md.instance_mode
            if method_md.instance_mode is not None
            else class_md.instance_mode
        ),
        instance_name=(
            method_md.instance_name
            if method_md.instance_name is not None
            else class_md.instance_name
        ),
        instance_name_from=(
            method_md.instance_name_from
            if method_md.instance_name_from is not None
            else class_md.instance_name_from
        ),
        method_instance_mode=(
            method_md.method_instance_mode
            if method_md.method_instance_mode is not None
            else class_md.method_instance_mode
        ),
        param_configs={**class_md.param_configs, **method_md.param_configs},
    )
