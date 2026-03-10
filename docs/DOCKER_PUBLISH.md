# Docker 发布工作流说明

已添加 GitHub Actions 工作流：`.github/workflows/docker-publish.yml`

## 触发方式

- push 到 `main`
  - 推送 Docker Hub 标签：
    - `latest`
    - `package.json` 中对应的版本号（例如 `0.1.1`）
- push Git tag（如 `v0.1.1`）
  - 推送 semver 标签（例如 `0.1.1`、`0.1`）
- 手动触发（workflow_dispatch）

## Docker Hub 仓库

- `34v0wphix/recall`

## 多架构构建

当前工作流已启用多架构构建，输出：

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
