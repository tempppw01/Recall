# 数据库（Prisma / PostgreSQL）初始化与验证

本项目默认可仅用浏览器 LocalStorage；当你需要服务端持久化（任务/习惯/倒计时）时，可启用 PostgreSQL + Prisma。

> 说明：仓库内存在“动态 PG（x-pg-* header）模式”，用于自部署/受信网络下由前端把 PG 连接信息传给后端。
> 该模式默认关闭（`ENABLE_DYNAMIC_PG_HEADERS` 不是 true 时不会生效）。

## 1) 配置环境变量

最小必需：

- `DATABASE_URL`：服务端 Prisma 使用的数据库连接串

示例：

```bash
export DATABASE_URL='postgresql://postgres:postgres@localhost:5432/recall'
```

## 2) 生成 Prisma Client

```bash
npx prisma generate
```

## 3) 初始化数据库（创建表）

仓库已纳入初始 migrations（见 `prisma/migrations/`），你可以选择两种方式之一：

### 方案 A：开发环境（快速）

```bash
npx prisma db push
```

### 方案 B：生产/可追溯迁移（推荐）

1. 生成迁移：

```bash
npx prisma migrate dev --name init
```

2. 部署时执行：

```bash
npx prisma migrate deploy
```

> 如果你决定走方案 B，我们后续会把 migrations 纳入版本控制，并在发布流程里固定下来。

## 4) 快速验证数据库连通性

仓库提供脚本：

```bash
DATABASE_URL='postgresql://...' ./scripts/db-check.sh
```

它会：
- 检查 prisma client 是否生成
- 使用 Prisma 执行 `SELECT 1`

## 5) 动态 PG（x-pg-*）模式开关（可选，高级）

仅在自部署/内网下建议开启。

- `ENABLE_DYNAMIC_PG_HEADERS=true`：开启后端解析 `x-pg-*` 请求头
- `PG_HEADERS_TOKEN=...`：可选，要求请求携带 `x-pg-token` 且匹配
- `PG_HEADERS_HOST_ALLOWLIST=host1,host2`：可选，限制可连接的 host

相关代码：`src/lib/prisma.ts`。

#### 已有数据库如何接入 migrations（基线）

如果你之前已经用 `prisma db push` 建过表，再切到 migrations 流程，可能会遇到“迁移已存在但数据库也已存在”的状态不一致。

推荐做法（谨慎操作）：
1) 确保当前数据库结构与 `prisma/schema.prisma` 一致（最好在空库上重建验证一遍）；
2) 使用 Prisma 将初始迁移标记为已应用（避免重复建表）：

```bash
npx prisma migrate resolve --applied 20260317_init
```

然后后续使用：

```bash
npx prisma migrate deploy
```
