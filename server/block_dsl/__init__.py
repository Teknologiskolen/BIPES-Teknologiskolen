"""DSL pipeline for generating Blockly blocks from annotated Python or .blockdef files."""

from .pipeline import DefaultPipeline
from .blockdef_parser import BlockdefParser
from .integrate import generate_default_artifacts, BlockdefTarget, DEFAULT_BLOCKDEF_TARGETS

__all__ = [
    "DefaultPipeline",
    "BlockdefParser",
    "generate_default_artifacts",
    "BlockdefTarget",
    "DEFAULT_BLOCKDEF_TARGETS",
]
