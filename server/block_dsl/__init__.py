"""DSL pipeline for generating Blockly blocks from annotated Python."""

from .pipeline import DefaultPipeline
from .integrate import generate_default_artifacts

__all__ = ["DefaultPipeline", "generate_default_artifacts"]
