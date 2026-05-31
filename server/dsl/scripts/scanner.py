from __future__ import annotations

import json
import re

from .errors import AnnotationSyntaxError
from .model import AnnotationRecord


_BLOCK_START_RE = re.compile(r"^\s*#\s*@block(?P<body>.*)$")
_COMMENT_RE = re.compile(r"^\s*#(?P<body>.*)$")
_DEF_OR_CLASS_RE = re.compile(r"^\s*(def|class)\s+\w+")


class CommentAnnotationScanner:
    def scan(self, source: str) -> dict[int, AnnotationRecord]:
        lines = source.splitlines()
        records: dict[int, AnnotationRecord] = {}
        i = 0

        while i < len(lines):
            start_match = _BLOCK_START_RE.match(lines[i])
            if not start_match:
                i += 1
                continue

            metadata_dict, next_index = self._read_metadata(lines, i, start_match.group("body"))
            tooltip_lines: list[str] = []
            j = next_index

            while j < len(lines):
                comment_match = _COMMENT_RE.match(lines[j])
                if comment_match and not _BLOCK_START_RE.match(lines[j]):
                    tooltip_lines.append(comment_match.group("body").lstrip())
                    j += 1
                    continue
                break

            while j < len(lines) and lines[j].strip() == "":
                j += 1

            if j >= len(lines) or not _DEF_OR_CLASS_RE.match(lines[j]):
                raise AnnotationSyntaxError(
                    f"@block annotation on line {i + 1} is not followed by a class or def"
                )

            target_line = j + 1
            records[target_line] = AnnotationRecord(
                metadata_dict=metadata_dict,
                tooltip="\n".join(tooltip_lines).strip(),
                annotation_line=i + 1,
                target_line=target_line,
            )
            i = j + 1

        return records

    def _read_metadata(self, lines: list[str], start_index: int, first_body: str) -> tuple[dict, int]:
        json_lines: list[str] = []
        consumed = start_index

        first_body = first_body.strip()
        if first_body:
            json_lines.append(first_body)

        # Support both one-line JSON and multiline commented JSON.
        while True:
            payload = "\n".join(json_lines).strip()
            if payload:
                try:
                    return json.loads(payload), consumed + 1
                except json.JSONDecodeError:
                    pass

            consumed += 1
            if consumed >= len(lines):
                break

            comment_match = _COMMENT_RE.match(lines[consumed])
            if not comment_match:
                break
            json_lines.append(comment_match.group("body").lstrip())

        raise AnnotationSyntaxError(
            f"Invalid JSON in @block annotation on line {start_index + 1}"
        )
