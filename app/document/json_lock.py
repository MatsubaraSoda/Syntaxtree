"""document.json 并发写安全（跨进程文件锁 + 原子替换）。"""

import json
import os
import tempfile
from pathlib import Path
from typing import Any, Callable

from filelock import FileLock


def read_modify_write_json(path: Path, mutator: Callable[[dict], None]) -> None:
    """
    在独占锁下读 JSON、调用 mutator 原地修改 data、再原子写回。
    """
    path = path.resolve()
    path.parent.mkdir(parents=True, exist_ok=True)
    lock_path = str(path) + ".lock"
    lock = FileLock(lock_path, timeout=60)
    with lock:
        if path.exists():
            data: dict[str, Any] = json.loads(path.read_text(encoding="utf-8"))
        else:
            data = {}
        mutator(data)
        fd, tmp_name = tempfile.mkstemp(
            dir=str(path.parent), prefix=".document_", suffix=".json.tmp"
        )
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
                f.write("\n")
            os.replace(tmp_name, path)
        finally:
            if os.path.exists(tmp_name):
                try:
                    os.remove(tmp_name)
                except OSError:
                    pass
