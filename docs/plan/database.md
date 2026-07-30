# 数据库（Prisma / MySQL + SQLite）初始化与验证

Recall 的 Docker 部署使用服务端数据库：填写 MySQL/MariaDB 的 `DATABASE_URL` 时连接 MySQL；未填写时，首次访问会要求选择并初始化 SQLite。浏览器 LocalStorage 只保留为离线缓存和旧数据迁移来源。

## 1) 配置 MySQL

```bash
export DATABASE_URL='mysql://recall:recall@localhost:3306/recall'
npm run prebuild
```

生产容器会在第一次访问 `/api/setup` 时创建缺失的表和索引。远程 MySQL 只需要把主机名替换为实际地址；数据库凭据通过服务端环境变量传入，不从浏览器提交。

## 2) 不配置 MySQL，初始化 SQLite

保持 `DATABASE_URL` 为空并启动容器，打开网页后点击“初始化并开始使用”。初始化会：

1. 在 `/app/data/database.json` 写入 SQLite 选择结果；
2. 在 `/app/data/recall.db` 创建数据库文件和表结构；
3. 创建 `local-user`，让自部署实例无需先登录即可使用；
4. 让任务、习惯、倒计时和物品 API 立即切换到 SQLite。

这两个文件必须位于持久化 Volume 中。仓库 Compose 已挂载 `recall_app_data:/app/data`。

## 3) 初始化接口

- `GET /api/setup`：返回当前 provider、是否需要初始化及连接状态。
- `POST /api/setup`，请求体 `{ "provider": "sqlite" }`：创建 SQLite 配置、建表并立即切换到 SQLite。
- `GET /api/health?deep=1`：验证当前数据库是否可用。

## 4) 生成 Prisma Client

项目同时生成 MySQL 和 SQLite 客户端：

```bash
npm run prebuild
```

MySQL 客户端使用默认的 `@prisma/client`，SQLite 客户端生成到 `src/generated/prisma/sqlite`。SQLite 的 JSON 字段以字符串保存，API 层会统一序列化和解析。

## 5) 快速验证

```bash
DATABASE_URL='mysql://...' ./scripts/db-check.sh
curl -fsS http://localhost:3789/api/health
curl -fsS http://localhost:3789/api/health?deep=1
```

如果没有 MySQL，先完成网页初始化，再执行 deep health check。容器重启后会从 `database.json` 读取 SQLite 选择并复用同一个数据库文件。

## 6) 升级说明

数据库连接设置已收敛到服务端：使用 Compose 的 `DATABASE_URL` 配置 MySQL/MariaDB；没有 MySQL 时使用首次初始化页选择 SQLite。浏览器不会再保存或提交数据库连接凭据。
