from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from .emitters import emit_blockly_blocks_js, emit_definition_markdown, emit_python_generators_js
from .pipeline import DefaultPipeline


@dataclass(slots=True)
class DslTarget:
    source: str
    category_name: str
    library_name: str
    output_block_js: str
    output_generator_js: str
    output_definition_md: str
    extra_library_names: tuple[str, ...] = ()


@dataclass(slots=True)
class BlockdefTarget:
    """A target driven by a language-agnostic .blockdef file (textX pipeline)."""
    blockdef: str
    library_name: str
    output_block_js: str
    output_generator_js: str
    output_definition_md: str
    extra_library_names: tuple[str, ...] = ()


# Python-annotation targets (legacy; kept for libraries not yet converted).
DEFAULT_TARGETS = [
    DslTarget(
        source="static/page/blocks/libraries/PicoRobotics.py",
        category_name="Robotics Board",
        library_name="PicoRobotics",
        extra_library_names=(),
        output_block_js="static/page/blocks/blocks/roboticsboard_dsl.js",
        output_generator_js="static/page/blocks/pythonic/roboticsboard_dsl.js",
        output_definition_md="templates/page/blocks/definitions/roboticsboard_dsl.md",
    ),
    DslTarget(
        source="static/page/blocks/libraries/sand_table_robot.py",
        category_name="Sand Drawing Machine",
        library_name="sandRobot",
        extra_library_names=("stepper",),
        output_block_js="static/page/blocks/blocks/sand_table_robot_dsl.js",
        output_generator_js="static/page/blocks/pythonic/sand_table_robot_dsl.js",
        output_definition_md="templates/page/blocks/definitions/sand_table_robot_dsl.md",
    ),
    DslTarget(
        source="static/page/blocks/libraries/dfplayer.py",
        category_name="DFPlayer",
        library_name="dfplayer",
        output_block_js="static/page/blocks/blocks/dfplayer_dsl.js",
        output_generator_js="static/page/blocks/pythonic/dfplayer_dsl.js",
        output_definition_md="templates/page/blocks/definitions/dfplayer_dsl.md",
    ),
    DslTarget(
        source="static/page/blocks/libraries/st7735s.py",
        category_name="ST7735S",
        library_name="st7735s",
        output_block_js="static/page/blocks/blocks/st7735s_dsl.js",
        output_generator_js="static/page/blocks/pythonic/st7735s_dsl.js",
        output_definition_md="templates/page/blocks/definitions/st7735s_dsl.md",
    ),
    # Deprecated in favor of the shared SPI communication blocks.
    # DslTarget(
    #     source="static/page/blocks/libraries/clock_helpers.py",
    #     category_name="Clock Helpers",
    #     library_name="clock_helpers",
    #     output_block_js="static/page/blocks/blocks/clock_helpers_dsl.js",
    #     output_generator_js="static/page/blocks/pythonic/clock_helpers_dsl.js",
    #     output_definition_md="templates/page/blocks/definitions/clock_helpers_dsl.md",
    # ),
]

# textX .blockdef targets — language-agnostic, no Python source required.
DEFAULT_BLOCKDEF_TARGETS = [
    BlockdefTarget(
        blockdef="static/page/blocks/libraries/ds1302.blockdef",
        library_name="ds1302",
        output_block_js="static/page/blocks/blocks/ds1302_dsl.js",
        output_generator_js="static/page/blocks/pythonic/ds1302_dsl.js",
        output_definition_md="templates/page/blocks/definitions/ds1302_dsl.md",
    ),
]


def generate_default_artifacts(root_path: str | Path) -> None:
    root = Path(root_path)

    # Python-annotation pipeline.
    pipeline = DefaultPipeline()
    for target in DEFAULT_TARGETS:
        source_path = root / target.source
        if not source_path.exists():
            continue

        source = source_path.read_text(encoding="utf-8")
        result = pipeline.parse(source, source_path)
        blocks = result.blocks
        blocks_by_type = {block.type: block for block in blocks}

        _write_if_changed(
            root / target.output_block_js,
            emit_blockly_blocks_js(blocks),
        )
        _write_if_changed(
            root / target.output_generator_js,
            emit_python_generators_js(result.generators, blocks_by_type),
        )
        _write_if_changed(
            root / target.output_definition_md,
            emit_definition_markdown(
                target.category_name,
                target.library_name,
                blocks,
                extra_library_names=target.extra_library_names,
            ),
        )

    # textX .blockdef pipeline.
    _generate_blockdef_artifacts(root, DEFAULT_BLOCKDEF_TARGETS)


def _generate_blockdef_artifacts(root: Path, targets: list[BlockdefTarget]) -> None:
    if not targets:
        return
    from .blockdef_parser import BlockdefParser
    parser = BlockdefParser()

    for target in targets:
        blockdef_path = root / target.blockdef
        if not blockdef_path.exists():
            continue

        result = parser.parse_file(blockdef_path)
        blocks = result.blocks
        blocks_by_type = {block.type: block for block in blocks}
        category_name = blocks[0].category if blocks else target.library_name

        _write_if_changed(
            root / target.output_block_js,
            emit_blockly_blocks_js(blocks),
        )
        _write_if_changed(
            root / target.output_generator_js,
            emit_python_generators_js(result.generators, blocks_by_type),
        )
        _write_if_changed(
            root / target.output_definition_md,
            emit_definition_markdown(
                category_name,
                target.library_name,
                blocks,
                extra_library_names=target.extra_library_names,
            ),
        )


def _write_if_changed(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists() and path.read_text(encoding="utf-8") == content:
        return
    path.write_text(content, encoding="utf-8")
