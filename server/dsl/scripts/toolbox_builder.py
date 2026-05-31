from __future__ import annotations

from .model import BlockSpec, ToolboxCategory


class SimpleToolboxBuilder:
    def build_toolbox(self, blocks: list[BlockSpec]) -> list[ToolboxCategory]:
        categories: dict[str, ToolboxCategory] = {}

        for block in blocks:
            category = categories.get(block.category)
            if category is None:
                category = ToolboxCategory(name=block.category, color=block.color)
                categories[block.category] = category
            category.blocks.append(block)

        return list(categories.values())
