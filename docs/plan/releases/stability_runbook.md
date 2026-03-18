# 稳定发布 Runbook（部署 / 回滚 / 监控 / 文档闭环）

> 目标：把“能发布”升级为“可重复、可回滚、可观测”的稳定发布流程。

## 1) 发布前检查（Preflight）

发布前必须通过：

```bash
npm run typecheck
npm run lint
npm run build
```

基础健康检查（本地/容器内）：

```bash
curl -fsS http://127.0.0.1:3789/api/health
curl -fsS "http://127.0.0.1:3789/api/health?deep=1"
```

环境变量最低要求（生产建议）：
- `NEXTAUTH_SECRET`（强烈建议显式配置，避免重启后 session 失效）
- `NEXTAUTH_URL`（必须为真实访问地址，避免回调与告警问题）
- `DATABASE_URL`（或项目约定的 DB 配置）
- 如使用同步链路：`REDIS_*`

## 2) 发布步骤（GitHub Release）

1. 确认 `docs/plan/versions/<version>.md` 已全部 ✅
2. 更新 `package.json` 版本号（SemVer）
3. 生成/更新发布说明：
   - `docs/plan/releases/release_notes_vX.Y.Z.md`
   - `docs/plan/releases/CHANGELOG.md`
4. 打 tag：`vX.Y.Z`
5. 发布 GitHub Release（tag、说明、链接一致）

## 3) Docker 发布（如使用镜像交付）

建议至少发布两个 tag：
- `34v0wphix/recall:vX.Y.Z`
- `34v0wphix/recall:latest`

发布后需核验：
- 镜像可拉取
- 容器可启动
- `/api/health` 与 `/api/health?deep=1` 正常

## 4) 回滚流程（Rollback）

触发条件（任一满足）：
- 线上关键路径不可用
- 同步/认证出现高频异常
- 健康检查持续失败

回滚步骤：
1. 回退到上一个稳定 tag（代码或镜像）
2. 重启服务
3. 立即执行健康检查
4. 在审计报告中记录：故障现象、回滚版本、恢复时间

## 5) 监控与告警最小集

发布后至少观察：
- 启动日志（是否有 NEXTAUTH / DB / Redis 异常）
- `/api/health` 与 `/api/health?deep=1`
- `/api/sync` 错误率与 requestId 关联日志

建议在发布后 30 分钟、2 小时各做一次复检。

## 6) 文档闭环要求

每轮版本动作必须同步：
1. 代码/配置改动
2. 审计报告（`docs/plan/audits/YYYY-MM-DD_roundNN.md`）
3. 版本任务勾选（`docs/plan/versions/<version>.md`）
4. 总览进度（`docs/plan/README.md`）
5. 发布记录（CHANGELOG + release notes + GitHub Release）

