"""
句子解析模块 - 使用 Stanza 将自然语言句子转为 LaTeX forest 括号表达式
"""

import stanza

# 懒加载的 Pipeline 实例
_nlp = None


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


def parse_sentence(sentence: str) -> str:
    """
    解析英文句子，返回括号表达式。

    Args:
        sentence: 英文句子

    Returns:
        如 "[ROOT [S [NP ...]]]" 的括号表达式

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

    # 取第一个句子的 constituency 树
    constituency_tree = doc.sentences[0].constituency
    return tree_to_forest(constituency_tree)
