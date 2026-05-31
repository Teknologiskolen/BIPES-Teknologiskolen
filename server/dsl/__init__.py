"""DSL pipeline for generating Blockly blocks from annotated Python or .blockdef files."""

from .scripts.pipeline import DefaultPipeline
from .scripts.blockdef_parser import BlockdefParser
from .scripts.integrate import generate_default_artifacts, BlockdefTarget, DEFAULT_BLOCKDEF_TARGETS

__all__ = [
    "DefaultPipeline",
    "BlockdefParser",
    "generate_default_artifacts",
    "BlockdefTarget",
    "DEFAULT_BLOCKDEF_TARGETS",
]
