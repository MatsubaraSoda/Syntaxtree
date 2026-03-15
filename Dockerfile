# 句法树生成器 - Docker 镜像
# 基于 python:3.12-slim，包含 LaTeX + dvisvgm（XDV→SVG，保留可选文本）

FROM python:3.12-slim

# 设置 Python 环境变量（Docker 最佳实践）
# PYTHONDONTWRITEBYTECODE: 不生成 .pyc 文件，减少体积
# PYTHONUNBUFFERED: 让日志实时输出，不被缓冲拦截
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    # 将 stanza 模型显式指定下载到 app 目录下，方便管理或挂载
    STANZA_RESOURCES_DIR=/app/stanza_resources

# 设置工作目录
WORKDIR /app

# 1. 配置清华 apt 镜像 (针对 Debian 12/13 的 deb822 格式进行极简替换)
RUN sed -i 's/deb.debian.org/mirrors.tuna.tsinghua.edu.cn/g' /etc/apt/sources.list.d/debian.sources

# 2. 安装系统依赖
# 新增 libgomp1: 纯 CPU 版 PyTorch 必需的 C 运行库，防止报错
RUN apt-get update && apt-get install -y --no-install-recommends \
    texlive-latex-base \
    texlive-fonts-recommended \
    texlive-latex-extra \
    texlive-xetex \
    dvisvgm \
    libgomp1 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# 3. 复制 Python 依赖清单
COPY requirements.txt .

# 4. 配置 pip 全局清华镜像
RUN pip config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple

# 5. 【核心优化】强制安装纯 CPU 版 PyTorch，拦截默认的 2.5GB GPU 巨无霸（南京大学镜像）
RUN pip install --no-cache-dir torch --index-url https://mirror.nju.edu.cn/pytorch/whl/cpu

# 6. 安装其余 Python 依赖 (Stanza 等)
RUN pip install --no-cache-dir -r requirements.txt

# 7. 预下载 stanza 英文模型
# 由于配置了环境变量，模型会下载到 /app/stanza_resources
RUN python -c "import stanza; stanza.download('en', model_dir='/app/stanza_resources')"

# 8. 复制应用代码
COPY app/ ./app/

# 暴露端口
EXPOSE 8000

# 启动命令 (开发模式)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]