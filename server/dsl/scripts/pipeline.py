from __future__ import annotations

from pathlib import Path

from .builder import BlockModelBuilder
from .extractor import PythonAstSourceExtractor
from .model import ParseResult
from .python_generator import PythonGeneratorBuilder
from .resolver import SourceMetadataResolver
from .scanner import CommentAnnotationScanner
from .toolbox_builder import SimpleToolboxBuilder
from .validation import ModelValidator


class DefaultPipeline:
    def __init__(self) -> None:
        self.scanner = CommentAnnotationScanner()
        self.extractor = PythonAstSourceExtractor()
        self.resolver = SourceMetadataResolver()
        self.validator = ModelValidator()
        self.block_builder = BlockModelBuilder()
        self.toolbox_builder = SimpleToolboxBuilder()
        self.generator_builder = PythonGeneratorBuilder()

    def parse(self, source: str, path: str | Path = "<memory>") -> ParseResult:
        annotations = self.scanner.scan(source)
        module = self.extractor.extract(source, path)
        module = self.resolver.resolve_module(module, annotations)
        self.validator.validate_module(module)
        blocks = self.block_builder.build_blocks(module)
        toolbox = self.toolbox_builder.build_toolbox(blocks)
        generators = self.generator_builder.build_generators(blocks)
        return ParseResult(module=module, blocks=blocks, toolbox=toolbox, generators=generators)
