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
docker build -t syntaxtree-app:latest .

# 删除镜像
docker rmi syntaxtree-app:latest
```

## 容器

```bash
# 创建并运行（开发模式，挂载 app 目录）
docker run -it --name syntaxtree -p 8000:8000 -v ${PWD}/app:/app/app syntaxtree-app:latest

# 启动
docker start syntaxtree

# 停止
docker stop syntaxtree

# 删除
docker rm -f syntaxtree

# 查看日志
docker logs -f syntaxtree
```

## 访问

```
http://localhost:8000
```
