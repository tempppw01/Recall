# 云同步模型与冲突策略（v0.3 基线）

## 当前模型

Recall 当前的 Redis 云同步是“任务队列 + 服务端合并”的模型：

1. 客户端向 `/api/sync` 提交 `push` / `pull` / `sync` 任务；
2. 服务端把任务写入 Redis 队列；
3. 轮询 `GET /api/sync?jobId=...` 时触发处理；
4. 同一 `syncKey` 通过 Redis 分布式锁串行处理，避免并发覆盖。

## 当前冲突策略

### 1) tasks / habits / countdowns
- 以 `id` 作为主键
- 以 `updatedAt` 做 **last-write-wins**（LWW）
- 若两边都有同一 `id`，取 `updatedAt` 较新的版本

### 2) deletions（删除墓碑）
- `tasks` / `countdowns` 使用删除时间表（tombstone map）
- 同一 id 若“删除时间 > 数据更新时间”，则该数据被过滤
- 若“数据更新时间 > 删除时间”，视为删除后重建，保留并清除删除标记

### 3) settings / secrets
- 依据 `meta.lastLocalChange` 判断哪一方优先

## 当前可观测性（本轮新增）

服务端同步结果中新增 `conflicts` 摘要：

```json
{
  "conflicts": {
    "tasks": 1,
    "habits": 0,
    "countdowns": 2,
    "settings": false,
    "secrets": false
  }
}
```

说明：
- 这不是逐条冲突明细，而是最小可观测摘要；
- 用于判断这次 merge 是否发生“同 id 双方都改过”的情况；
- 后续可以继续扩展为细项明细或日志埋点。

## 已知限制

- 完成时间等业务语义仍依赖现有字段，未引入专门的同步版本号/向量时钟；
- 当前策略偏向“简单可用”，而不是“严格冲突可解释”；
- 若未来出现多人/多端高频并发编辑，需要引入更细粒度冲突模型。

## v0.3 下一步建议

1. 在前端同步日志中展示 `conflicts` 摘要；
2. 为关键资源引入统一错误码；
3. 评估是否需要 `completedAt`、`version` 或更明确的冲突字段。


## 错误码与日志字段（v0.3）

`/api/sync` 目前采用统一错误响应结构：

```json
{
  "ok": false,
  "code": "SYNC_INVALID_ACTION",
  "error": "Unknown action",
  "message": "Unknown action",
  "requestId": "uuid"
}
```

已定义错误码：

- `SYNC_INVALID_JSON`
- `SYNC_INVALID_ACTION`
- `SYNC_REDIS_CONFIG_MISSING`
- `SYNC_JOB_ID_REQUIRED`
- `SYNC_JOB_NOT_FOUND`
- `SYNC_QUEUE_PROCESS_ERROR`
- `SYNC_INTERNAL_ERROR`

日志字段（结构化）：
- `scope`（固定 `sync-api`）
- `event`（如 `job-enqueued`、`queue-process-failed`）
- `requestId`（关联请求）
- `jobId` / `syncKey`（当可用时）
- `error`（错误简述）
