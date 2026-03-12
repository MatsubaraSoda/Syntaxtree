"""
句法树生成核心逻辑
负责：LaTeX 模板渲染、编译 XDV、dvisvgm 转 SVG、清理临时文件

临时文件统一存放在 build/{request_id}/ 下，支持并发请求互不干扰。
流程：xelatex -no-pdf → XDV → dvisvgm → SVG（保留可选文本）
"""

import os
import shutil
import subprocess
import uuid
from pathlib import Path

# LaTeX 编译与 PDF→SVG 的中间文件目录，每个请求使用独立子目录 build/{request_id}/
BUILD_DIR = Path(__file__).resolve().parent / "build"
TEMPLATES_DIR = Path(__file__).resolve().parent / "templates"
TEMPLATE_TEX = TEMPLATES_DIR / "template.tex"

# 输出文件名（不含扩展名）
OUT_BASENAME = "out"


def generate_svg(bracket_expr: str) -> str:
    """
    将括号表达式转换为 SVG 内容。

    Args:
        bracket_expr: 如 "[S [NP A dog]]" 的括号表达式

    Returns:
        SVG 文件的原始文本

    Raises:
        ValueError: 当 LaTeX 编译失败或转换失败时
    """
    bracket_expr = bracket_expr.strip()
    if not bracket_expr:
        raise ValueError("括号表达式不能为空")

    request_id = str(uuid.uuid4())
    work_dir = BUILD_DIR / request_id
    work_dir.mkdir(parents=True, exist_ok=True)

    try:
        tex_content = _render_tex(bracket_expr)
        tex_path = work_dir / f"{OUT_BASENAME}.tex"
        tex_path.write_text(tex_content, encoding="utf-8")

        xdv_path = _compile_xdv(tex_path, work_dir)
        svg_path = work_dir / f"{OUT_BASENAME}.svg"
        _xdv_to_svg(xdv_path, svg_path)

        if not svg_path.exists():
            raise ValueError("SVG 生成失败")

        return svg_path.read_text(encoding="utf-8")
    finally:
        _cleanup(work_dir)


def _escape_comma_for_forest(expr: str) -> str:
    """将 `,` 转为 `{,}` 格式，避免 forest 中逗号消失。例如 [,] -> [{,}]，[, [,]] -> [{,} [{,}]]"""
    s = expr.replace("[, ", "[{,} ")
    s = s.replace(",]", "{,}]")
    return s


def _sanitize_for_latex(expr: str) -> str:
    """转义反斜杠，阻止 \\input、\\include 等 LaTeX 命令执行，防止读取系统文件。"""
    return expr.replace("\\", "\\textbackslash ")


def _render_tex(bracket_expr: str) -> str:
    """将表达式注入 LaTeX 模板，返回 .tex 内容"""
    if not TEMPLATE_TEX.exists():
        raise ValueError(f"模板文件不存在: {TEMPLATE_TEX}")

    tree = _escape_comma_for_forest(bracket_expr)
    template = TEMPLATE_TEX.read_text(encoding="utf-8")
    return template.replace("{{ TREE }}", tree)


def _compile_xdv(tex_path: Path, work_dir: Path) -> Path:
    """调用 xelatex -no-pdf 编译，返回 .xdv 路径"""
    result = subprocess.run(
        ["xelatex", "-no-pdf", "-interaction=nonstopmode", str(tex_path.name)],
        cwd=str(work_dir),
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=120,
    )

    xdv_path = work_dir / tex_path.with_suffix(".xdv").name
    if result.returncode != 0:
        err = (result.stderr or result.stdout or "").strip()
        last_lines = "\n".join(err.split("\n")[-20:]) if err else "未知错误"
        raise ValueError(f"LaTeX 编译失败:\n{last_lines}")

    if not xdv_path.exists():
        raise ValueError("未生成 XDV 文件")

    return xdv_path


def _xdv_to_svg(xdv_path: Path, svg_path: Path) -> None:
    """调用 dvisvgm 将 XDV 转为 SVG（保留可选文本）"""
    result = subprocess.run(
        [
            "dvisvgm",
            "--font-format=woff2",
            "--exact",
            "--bbox=min",
            str(xdv_path),
            "-o",
            str(svg_path),
        ],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=60,
    )

    if result.returncode != 0:
        err = (result.stderr or result.stdout or "").strip()
        raise ValueError(f"XDV 转 SVG 失败:\n{err}")


def _cleanup(work_dir: Path) -> None:
    """删除临时目录"""
    if work_dir.exists():
        try:
            shutil.rmtree(work_dir)
        except OSError:
            pass
