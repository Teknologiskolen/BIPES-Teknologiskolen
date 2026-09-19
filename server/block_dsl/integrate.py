from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from .emitters import emit_blockly_blocks_js, emit_definition_markdown, emit_python_generators_js
from .library_introspect import load_library_signatures, validate_blocks


@dataclass(slots=True)
class BlockdefTarget:
    """A target driven by a language-agnostic .blockdef file (textX pipeline).

    Block definitions live in their OWN .blockdef file — never as annotations
    inside the library source. The library .py stays a plain, untouched library.
    """
    blockdef: str
    library_name: str
    output_block_js: str
    output_generator_js: str
    output_definition_md: str
    extra_library_names: tuple[str, ...] = ()


# textX .blockdef targets. Block definitions live SERVER-SIDE in
# server/block_dsl/definitions/ (this is a server-only authoring tool); the
# library .py stays a plain, unannotated library. Generation emits the browser
# artifacts into static/ + templates/.
def _target(name: str, *, library: str | None = None) -> "BlockdefTarget":
    """Convention: definitions/<name>.blockdef -> blocks/<name>_dsl.js,
    pythonic/<name>_dsl.js, templates/.../definitions/<name>_dsl.md.
    `library` overrides the install-button library name when it differs from the
    blockdef file name (e.g. roboticsboard.blockdef installs PicoRobotics.py)."""
    return BlockdefTarget(
        blockdef=f"server/block_dsl/definitions/{name}.blockdef",
        library_name=library or name,
        output_block_js=f"static/page/blocks/blocks/{name}_dsl.js",
        output_generator_js=f"static/page/blocks/pythonic/{name}_dsl.js",
        output_definition_md=f"templates/page/blocks/definitions/{name}_dsl.md",
    )


DEFAULT_BLOCKDEF_TARGETS = [
    _target("ds1302"),
    _target("dfplayer"),
    _target("st7735s"),
    _target("roboticsboard", library="PicoRobotics"),
    _target("sand_table_robot"),
    _target("buttons"),
    _target("hcsr04"),
    _target("neopixel"),
    _target("buzzer_music"),
    _target("alarm_clock"),
    _target("app_core"),
    _target("picofly", library="picofly_firmware"),
]


def generate_default_artifacts(root_path: str | Path) -> None:
    """Regenerate Blockly artifacts from every .blockdef target."""
    root = Path(root_path)
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

        _validate_against_library(root, target, blocks)

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


def _validate_against_library(root: Path, target: BlockdefTarget, blocks: list) -> None:
    """Cross-check the parsed .blockdef against the real library .py it describes
    (see library_introspect.py). Problems are printed as warnings -- same
    warn-and-continue convention as app.py's generate_default_artifacts() call and
    the toolbox generator's unknown-block-key handling -- so one drifted .blockdef
    can't take down every device's blocks at server startup."""
    library_path = root / "static/page/blocks/libraries" / f"{target.library_name}.py"
    if not library_path.exists():
        return
    signatures = load_library_signatures(library_path)
    for error in validate_blocks(blocks, signatures):
        print(f" * Block DSL warning [{target.blockdef}]: {error}")


def _write_if_changed(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists() and path.read_text(encoding="utf-8") == content:
        return
    path.write_text(content, encoding="utf-8")
