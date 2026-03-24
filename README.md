# Syntaxtree

基于 Web 的句法树生成器，输入括号表达式即可生成可选中文本的 SVG 句法树。

## Git

```bash
# 克隆
git clone https://github.com/MatsubaraSoda/Syntaxtree.git
cd Syntaxtree
```

## Docker 镜像

```bash
# 构建镜像
docker build -t syntaxtree:latest .

# 删除镜像
docker rmi syntaxtree:latest
```

## 容器

```bash
# 创建并运行（开发模式，挂载 app 目录）
docker run -it --name syntaxtree-run -p 8000:8000 -v ${PWD}/app:/app/app syntaxtree:latest

# 启动
docker start syntaxtree-run

# 停止
docker stop syntaxtree-run

# 删除
docker rm -f syntaxtree-run

# 查看日志
docker logs -f syntaxtree-run
```

## 访问

```
http://localhost:8000
```
