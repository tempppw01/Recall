# Release Notes — v0.3.0

v0.3 聚焦“同步可靠性与可观测性”。这不是花活版本，重点是让同步链路更可解释、更容易排障。

## ✅ 主要更新

### 同步模型与冲突策略文档化
- 新增 `docs/plan/sync.md`
- 明确当前 Redis 队列同步模型：
  - 任务入队 → 轮询触发处理 → 分布式锁串行处理
  - tasks / habits / countdowns 按 `id + updatedAt` 做 LWW 合并
  - deletions 使用 tombstone map
  - settings / secrets 由 `lastLocalChange` 决定优先方

### 冲突可观测性（最小实现）
- 服务端同步结果新增 `conflicts` 摘要：
  - `tasks`
  - `habits`
  - `countdowns`
  - `settings`
  - `secrets`

### 错误码与结构化日志
- `/api/sync` 统一错误结构：
  - `ok`
  - `code`
  - `message`
  - `requestId`
- 增加结构化日志字段：
  - `scope`
  - `event`
  - `requestId`
  - `jobId` / `syncKey`

### 深度健康检查
- `/api/health` 支持：
  - 默认浅检查
  - `?deep=1` 执行 DB 探测
- 更适合区分：
  - 容器活着没
  - 服务真的健康没

## ⚠️ 已知说明

- `conflicts` 当前是摘要级，不是逐条冲突明细；
- 完整冲突解释 / 逐字段冲突分析还没做；
- deep health 当前只检查 DB，后续可扩展 Redis / 外部依赖。

## 相关文档

- 计划/审计/发布记录：`docs/plan/`
- 同步文档：`docs/plan/sync.md`
- 发布历史：`docs/plan/releases/CHANGELOG.md`
