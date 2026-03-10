# Prisma / 数据库整改方案

## 现状问题

### 1. 数据库方案不一致
- `prisma/schema.prisma` 当前使用 `postgresql`
- `Dockerfile` 默认 `DATABASE_URL=file:./data/recall.db`
- 这会导致开发、构建、部署三条链路认知不一致

### 2. 动态 Prisma Client 风险较高
- 当前会根据请求头动态创建 PrismaClient
- 容易带来连接池压力、实例生命周期复杂、并发不稳定等问题
- 也让安全边界和数据边界变得模糊

### 3. 默认运行模式不清楚
目前项目同时混合：
- 浏览器 LocalStorage
- 服务端 Prisma
- 前端透传 PG 配置
- Docker 内默认 SQLite 风格连接串

这会导致：
- 文档难写
- 部署难懂
- 问题难排查

## 建议目标

在 `0.2.0` 完成以下统一：

1. **明确一个默认数据库方案**
   - 建议二选一：
     - A. 默认 PostgreSQL
     - B. 默认 SQLite
   - 不再允许 schema 与 Docker 各说各话

2. **明确运行模式**
   - 本地模式：默认 LocalStorage / 轻量运行
   - 服务端模式：固定服务端数据库配置
   - 高级模式：可选外接数据库，但不默认暴露给普通用户

3. **降低动态 Prisma 复杂度**
   - 默认不走请求头传数据库配置
   - 将动态连接降为实验 / 高级能力，或者彻底移除

## 推荐执行方案

### 方案一（更稳）
**默认 PostgreSQL，移除 Docker 中的 SQLite 假默认。**

适合：
- 明确要走服务端数据存储
- 后续要走账号、多端同步、权限体系

优点：
- 与当前 Prisma schema 一致
- 后续扩展更自然

缺点：
- 本地轻量部署门槛更高

### 方案二（更轻）
**默认 SQLite，调整 Prisma schema / migration / Docker 全部统一到 SQLite。**

适合：
- 你更强调轻量、自部署、单用户优先

优点：
- 本地体验好
- Docker 部署直观

缺点：
- 如果后续大规模扩展账号、多端、并发，会再次调整

## 我当前建议

结合 Recall 当前定位：
**短期建议优先选“默认 SQLite 或 LocalStorage + 可选 PG”，但必须收边界。**

也就是说：
- 先把轻量体验做好
- 但服务端数据库方案必须写清楚，不要再混搭

## 具体整改项

### P0
- [ ] 确定默认数据库方案（PostgreSQL / SQLite 二选一）
- [ ] 统一 `schema.prisma`、`Dockerfile`、README、环境变量说明
- [ ] 写清“本地模式 / 服务端模式”文档

### P1
- [ ] 审查 `src/lib/prisma.ts` 动态 client 创建策略
- [ ] 决定保留、降级或移除 `x-pg-*` 请求头方案
- [ ] 限制 PrismaClient 实例创建策略

### P2
- [ ] 增加 DB 链路验证脚本
- [ ] 增加最小 migration / 初始化文档
- [ ] 增加常见部署场景说明

## 完成标准

- 新人看 README 能理解默认数据库方案
- Docker 部署与 Prisma schema 不冲突
- 不再出现“构建像 SQLite、Schema 像 PostgreSQL”的混乱状态
- 关键 API 的数据库行为可预测、可描述、可调试
