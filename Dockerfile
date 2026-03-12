# 句法树生成器 - Docker 镜像
# 基于 python:3.12-slim，包含 LaTeX + dvisvgm（XDV→SVG，保留可选文本）

FROM python:3.12-slim

# 设置工作目录
WORKDIR /app

# 使用清华镜像加速 apt
RUN sed -i 's|deb.debian.org|mirrors.tuna.tsinghua.edu.cn|g' /etc/apt/sources.list.d/debian.sources 2>/dev/null || \
    sed -i 's|deb.debian.org|mirrors.tuna.tsinghua.edu.cn|g' /etc/apt/sources.list; \
    sed -i 's|security.debian.org|mirrors.tuna.tsinghua.edu.cn|g' /etc/apt/sources.list.d/debian.sources 2>/dev/null || \
    sed -i 's|security.debian.org|mirrors.tuna.tsinghua.edu.cn|g' /etc/apt/sources.list

# 安装系统依赖
# - texlive: LaTeX 编译能力，支持 forest 等宏包
# - dvisvgm: XDV/DVI 转 SVG（保留可选 <text>）
RUN apt-get update && apt-get install -y --no-install-recommends \
    texlive-latex-base \
    texlive-fonts-recommended \
    texlive-latex-extra \
    texlive-xetex \
    dvisvgm \
    && rm -rf /var/lib/apt/lists/*

# 复制 Python 依赖清单
COPY requirements.txt .

# 安装 Python 依赖
RUN pip install --no-cache-dir -r requirements.txt

# 复制应用代码（这一步在挂载目录后其实会被覆盖，但保留它是好习惯，防止不挂载时无法运行）
COPY app/ ./app/

# 暴露端口
EXPOSE 8000

# 启动命令 (个人开发模式：直接加上 --reload)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]