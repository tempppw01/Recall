# Recall 架构

## 数据存储路径

```text
Compose DATABASE_URL=mysql://... ──> MySQL Prisma Client ──┐
                                                            ├─> 任务 / 习惯 / 倒计时 / 物品 API
未配置 DATABASE_URL ─> 首次初始化页 ─> /app/data/recall.db ──┘
                                                            └─> 浏览器 LocalStorage 离线缓存
```

- `src/lib/database.ts` 负责识别 provider、保存 SQLite 选择和幂等建表。
- `src/lib/prisma.ts` 同时管理 MySQL 与 SQLite Prisma Client；未选择前业务 API 返回未就绪，不会降级成仅浏览器存储。
- `src/app/api/setup/route.ts` 提供初始化状态和 SQLite 初始化接口。
- `src/app/components/DatabaseSetupGate.tsx` 在首次启动时阻止业务页面，要求用户明确选择 SQLite 或配置 MySQL 后重启。
- `src/lib/store.ts` 先读 LocalStorage 以保证离线首屏，数据库就绪后加载服务端数据；旧缓存仅在远端为空时迁移到服务端。

## 连接与安全边界

数据库凭据只允许通过服务端 `DATABASE_URL` 传入。浏览器不再把数据库密码作为请求头发送；旧版 PostgreSQL 设置字段仅保留在界面和 LocalStorage 中用于兼容升级。

自部署未登录请求使用固定的 `local-user`，登录请求仍按 NextAuth session 的 user id 隔离数据。`/app/data` 必须挂载持久化 Volume，否则 SQLite 文件会随容器删除而丢失。

## 其他服务

- **Redis**：可选同步队列与并发控制。
- **WebDAV**：可选附件存储，不承载业务数据库。
- **AI API**：无状态处理自然语言、任务拆解和检索请求。
