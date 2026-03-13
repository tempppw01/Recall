# Docker 发布工作流说明

已添加 GitHub Actions 工作流：`.github/workflows/docker-publish.yml`

## 触发方式

- push 到 `main`
  - 推送 Docker Hub 标签：
    - `latest`
    - `package.json` 中对应的版本号（例如 `0.1.1`）
  - **平台策略（重要）**：
    - 默认仅构建 `linux/amd64`（避免 QEMU 导致 CI 超时）
- push Git tag（如 `v0.1.1`）
  - 推送 semver 标签（例如 `0.1.1`、`0.1`）
  - 平台：`linux/amd64, linux/arm64`
- 手动触发（workflow_dispatch）
  - 平台：`linux/amd64, linux/arm64`

## Docker Hub 仓库

- `34v0wphix/recall`

## 运行端口说明（重要）

本项目的 Docker 镜像 **默认监听端口是 `3789`**（不是 3000）。

原因：`Dockerfile` 中设置了：
- `ENV PORT=3789`
- `EXPOSE 3789`

### 本地运行示例

```bash
# 访问: http://localhost:43100/signin
docker run --rm -p 43100:3789 34v0wphix/recall:latest
```

### NextAuth 环境变量（避免 /api/auth/session 500）

NextAuth 在 `NODE_ENV=production` 下 **必须** 配置 `NEXTAUTH_SECRET`，否则会出现：

- `/api/auth/session` 500
- `[next-auth][error][NO_SECRET]`

示例：

```bash
docker run --rm \
  -p 43100:3789 \
  -e NEXTAUTH_URL=http://localhost:43100 \
  -e NEXTAUTH_SECRET="your-strong-secret" \
  34v0wphix/recall:latest
```

如果你希望对外暴露 3000，也可以这样做：

```bash
# 访问: http://localhost:3000/signin
docker run --rm -p 3000:3789 34v0wphix/recall:latest
```

## 多架构构建

- tag / 手动触发：
  - `linux/amd64`
  - `linux/arm64`

工作流通过以下动作完成：

- `docker/setup-qemu-action@v3`
- `docker/setup-buildx-action@v3`

## 需要配置的 GitHub Secrets

在 GitHub 仓库设置中添加：

- `DOCKERHUB_USERNAME`：Docker Hub 用户名
- `DOCKERHUB_TOKEN`：Docker Hub Access Token

## 当前标签策略

- 默认分支发布：
  - `latest`
  - `${package.json.version}`
- Git tag 发布：
  - `{{version}}`
  - `{{major}}.{{minor}}`

## 说明

如果你希望“只有打 Git tag 才发版本号标签，而 push main 只发 latest”，也可以再改一版。


### Compose 连接远程 PostgreSQL

如果你不想在 Compose 里启动本地 `postgres`，可以直接给 `app` 提供远程库连接：

```bash
export DB_HOST=your-remote-pg-host
export DB_PORT=5432
export DB_NAME=recall
export DB_USER=postgres
export DB_PASSWORD=your-password
export NEXTAUTH_URL=http://localhost:3789
export NEXTAUTH_SECRET=your-strong-secret

docker compose up -d
```

或者直接传完整连接串：

```bash
export DATABASE_URL='postgresql://postgres:your-password@your-remote-pg-host:5432/recall'
docker compose up -d
```
