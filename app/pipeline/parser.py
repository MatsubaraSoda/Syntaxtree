"""
句子解析模块 - 使用 Stanza 将自然语言句子转为 LaTeX forest 括号表达式。
解析主产物为括号串；labels 为成分树结点标签列表（辅助元数据，供手册等使用）。
"""

from dataclasses import dataclass

import stanza

# 懒加载的 Pipeline 实例
_nlp = None


@dataclass(frozen=True)
class ParseResult:
    """括号表达式 code 为解析主产物；labels 为全部结点 label 去重后字母升序。
    pending_labels 仅含内部短语标签（非叶），且排除 ROOT，供 document 待处理节追加。"""

    code: str
    labels: list[str]
    pending_labels: list[str]


def _get_pipeline():
    """延迟加载 Stanza Pipeline，首次请求时初始化"""
    global _nlp
    if _nlp is None:
        _nlp = stanza.Pipeline(
            lang="en",
            processors="tokenize,pos,constituency",
            use_gpu=False,
        )
    return _nlp


def tree_to_forest(tree) -> str:
    """将 Stanza 的 Tree 转为 LaTeX forest 括号表达式"""
    if tree.is_leaf():
        return f"[{tree.label}]"
    children_str = " ".join(tree_to_forest(child) for child in tree.children)
    return f"[{tree.label} {children_str}]"


def tree_iter_labels(tree) -> list[str]:
    """深度优先收集所有结点 label，去重后按字母升序。"""
    seen: set[str] = set()

    def walk(t) -> None:
        lab = getattr(t, "label", None)
        if lab is not None:
            seen.add(str(lab))
        if not t.is_leaf():
            for ch in t.children:
                walk(ch)

    walk(tree)
    return sorted(seen)


def tree_iter_phrase_labels_for_pending(tree) -> list[str]:
    """仅内部结点（非终端词/整句等叶结点）的 label；排除 ROOT。用于写入 document.json pending。"""
    seen: set[str] = set()

    def walk(t) -> None:
        if t.is_leaf():
            return
        lab = getattr(t, "label", None)
        if lab is not None:
            s = str(lab)
            if s and s != "ROOT":
                seen.add(s)
        for ch in t.children:
            walk(ch)

    walk(tree)
    return sorted(seen)


def parse_sentence(sentence: str) -> ParseResult:
    """
    解析英文句子，返回括号表达式与标签列表。

    Args:
        sentence: 英文句子

    Returns:
        ParseResult(code=..., labels=..., pending_labels=...)

    Raises:
        ValueError: 句子为空或解析失败时
    """
    sentence = sentence.strip()
    if not sentence:
        raise ValueError("句子不能为空")

    nlp = _get_pipeline()
    doc = nlp(sentence)

    if not doc.sentences:
        raise ValueError("未能解析出句子")

    constituency_tree = doc.sentences[0].constituency
    code = tree_to_forest(constituency_tree)
    labels = tree_iter_labels(constituency_tree)
    pending_labels = tree_iter_phrase_labels_for_pending(constituency_tree)
    return ParseResult(code=code, labels=labels, pending_labels=pending_labels)
