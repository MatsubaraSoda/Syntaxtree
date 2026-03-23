"""PTB 手册 document.json 的读取与 pending 合并。"""

import json
from pathlib import Path
from typing import Any

from app.document.json_lock import read_modify_write_json


def document_json_path(static_dir: Path) -> Path:
    return static_dir / "data" / "document.json"


def load_document(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def _all_abbrs(data: dict[str, Any]) -> set[str]:
    known: set[str] = set()
    for sec in data.get("sections", []):
        for row in sec.get("rows", []):
            ab = row.get("abbr")
            if isinstance(ab, str) and ab:
                known.add(ab)
    return known


def append_pending_tags(path: Path, sentence: str, labels: list[str]) -> None:
    """将尚未出现在任一节中的标签追加到 pending（简称唯一，不更新已存在）。"""

    def mutator(data: dict[str, Any]) -> None:
        if "sections" not in data:
            data["sections"] = []
        pending = None
        for sec in data["sections"]:
            if sec.get("id") == "pending":
                pending = sec
                break
        if pending is None:
            pending = {
                "id": "pending",
                "heading": "四 待处理",
                "table": "two_col",
                "columns": ["简称", "句子"],
                "rows": [],
            }
            data["sections"].append(pending)
        if "rows" not in pending:
            pending["rows"] = []
        known = _all_abbrs(data)
        for lab in labels:
            if lab and lab not in known:
                pending["rows"].append({"abbr": lab, "sentence": sentence})
                known.add(lab)

    read_modify_write_json(path, mutator)
