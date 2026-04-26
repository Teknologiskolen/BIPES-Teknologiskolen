from __future__ import annotations

from .metadata import merge_metadata, metadata_from_dict
from .model import AnnotationRecord, ModuleSource


class SourceMetadataResolver:
    def resolve_module(
        self,
        module: ModuleSource,
        annotations: dict[int, AnnotationRecord],
    ) -> ModuleSource:
        for cls in module.classes:
            if cls.lineno in annotations:
                record = annotations[cls.lineno]
                cls.is_block_annotated = True
                cls.tooltip = record.tooltip
                cls.metadata = metadata_from_dict(record.metadata_dict, target="class")

            for method in cls.methods:
                if method.lineno in annotations:
                    record = annotations[method.lineno]
                    method.is_block_annotated = True
                    method.is_public_block = True
                    method.tooltip = record.tooltip
                    method.metadata = metadata_from_dict(record.metadata_dict, target="function")
                else:
                    method.is_public_block = False

                method.metadata = merge_metadata(cls.metadata, method.metadata)

        for fn in module.functions:
            if fn.lineno in annotations:
                record = annotations[fn.lineno]
                fn.is_block_annotated = True
                fn.is_public_block = True
                fn.tooltip = record.tooltip
                fn.metadata = metadata_from_dict(record.metadata_dict, target="function")
            else:
                fn.is_public_block = False

        return module
