"""从 legacy HTML 生成 app/static/data/document.json。

容器内执行示例：
  docker cp .docs/document-static-legacy.html syntaxtree-run:/tmp/legacy.html
  docker exec syntaxtree-run python -m app.document.seed /tmp/legacy.html
"""

import json
import re
import sys
from pathlib import Path

_APP_DIR = Path(__file__).resolve().parent.parent
_REPO_ROOT = _APP_DIR.parent

INTRO = (
    "本参考手册基于 Penn Treebank (PTB) 标签体系, 用于解析句法树中的各类节点标记. "
    "标记划分为从句级别、短语级别、词汇级别；未归类条目见第四节。"
)

SECTIONS_META = [
    ("clause", "一 从句级别 (Clause Level)", "four_col", ["简称", "全称", "中文", "解释"]),
    ("phrase", "二 短语级别 (Phrase Level)", "four_col", ["简称", "全称", "中文", "解释"]),
    ("word", "三 词汇级别 (Word Level)", "four_col", ["简称", "全称", "中文", "解释"]),
    ("pending", "四 待处理", "two_col", ["简称", "句子"]),
]


def main() -> None:
    src = Path(sys.argv[1]) if len(sys.argv) > 1 else None
    if src is None or not src.is_file():
        repo_docs = _REPO_ROOT / ".docs" / "document-static-legacy.html"
        if repo_docs.is_file():
            src = repo_docs
        else:
            raise SystemExit("用法: python -m app.document.seed <legacy.html 路径>")
    out = _APP_DIR / "static" / "data" / "document.json"

    html = src.read_text(encoding="utf-8")
    title = re.search(r"<title>(.*?)</title>", html, re.DOTALL)
    page_title = title.group(1).strip() if title else "PTB 规则 - Syntaxtree"
    h1m = re.search(r"<h1>(.*?)</h1>", html, re.DOTALL)
    h1_text = h1m.group(1).strip() if h1m else "PTB 句法树规则参考手册"

    main_m = re.search(r'<main class="doc-content">(.*?)</main>', html, re.DOTALL)
    if not main_m:
        raise SystemExit("main not found")
    sections_html = re.findall(
        r'<section class="doc-section">(.*?)</section>', main_m.group(1), re.DOTALL
    )
    if len(sections_html) != 3:
        raise SystemExit(f"expected 3 sections, got {len(sections_html)}")

    out_sections = []
    for i, (sid, heading, table, columns) in enumerate(SECTIONS_META):
        if i < 3:
            tbody_m = re.search(r"<tbody>(.*?)</tbody>", sections_html[i], re.DOTALL)
            rows_out = []
            if tbody_m:
                for a, b, c, d in re.findall(
                    r"<tr><td>([^<]*)</td><td>([^<]*)</td><td>([^<]*)</td><td>([^<]*)</td></tr>",
                    tbody_m.group(1),
                ):
                    rows_out.append(
                        {"abbr": a, "full_en": b, "zh": c, "desc": d}
                    )
        else:
            rows_out = []
        out_sections.append(
            {
                "id": sid,
                "heading": heading,
                "table": table,
                "columns": columns,
                "rows": rows_out,
            }
        )

    doc = {
        "meta": {
            "page_title": page_title,
            "h1": h1_text,
            "intro": INTRO,
        },
        "sections": out_sections,
    }
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(doc, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {out}")


if __name__ == "__main__":
    main()
