"""DSL pipeline for generating Blockly blocks from language-agnostic .blockdef files.

Blocks are defined in separate .blockdef files (textX grammar in block_grammar.tx);
the library source files are never annotated.
"""

from .blockdef_parser import BlockdefParser
from .integrate import generate_default_artifacts, BlockdefTarget, DEFAULT_BLOCKDEF_TARGETS

__all__ = [
    "BlockdefParser",
    "generate_default_artifacts",
    "BlockdefTarget",
    "DEFAULT_BLOCKDEF_TARGETS",
]
