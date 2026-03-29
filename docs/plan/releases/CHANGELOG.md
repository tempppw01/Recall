# CHANGELOG

> 发布历史（与 GitHub Releases 对应）。

## 历史发布事实

当前仓库已存在以下历史 tag / Release：
- `v0.2.0`
- `v0.2.1`
- `v0.3.0`
- `v0.3.1`
- `v0.3.2`

这些属于既有发布事实，不在未获明确授权的情况下回滚、删 tag 或重写历史。

## 当前计划状态

- 当前工作版本：`v0.1`
- 当前还未进入新的发版动作
- 下一个允许发版的版本，必须先按规则检查：
  - `git tag --list "v*" --sort=-v:refname | head -n 1`
  - 若无 tag：首个版本只能是 `v0.1.0`
  - 若已有历史 tag：必须结合当前治理规则与现有历史状态单独判断，不允许跳过检查直接发版

## v0.3.2

- GitHub Release: https://github.com/tempppw01/Recall/releases/tag/v0.3.2
- 重点：Review / 检查页工作流正式收口（左右对照、今天已检查、恢复入口、批量处理、检查总结、智能推进、时区对齐）
- Release Notes：`docs/plan/releases/release_notes_v0.3.2.md`

## v0.3.1

- GitHub Release: https://github.com/tempppw01/Recall/releases/tag/v0.3.1
- 重点：部署兼容性热修（NEXTAUTH_SECRET 改为可选兜底生成）
- Release Notes：`docs/plan/releases/release_notes_v0.3.1.md`

## v0.3.0

- GitHub Release: https://github.com/tempppw01/Recall/releases/tag/v0.3.0
- 重点：同步可靠性与可观测性（sync 文档 / conflicts 摘要 / 错误码与 requestId / deep health）
- Release Notes：`docs/plan/releases/release_notes_v0.3.0.md`

## v0.2.1

- GitHub Release: https://github.com/tempppw01/Recall/releases/tag/v0.2.1
- 重点：时间轴 Phase 3（总结/热力/瀑布流）+ 部署安全修复（NEXTAUTH_SECRET fail-fast）
- Release Notes：`docs/plan/releases/release_notes_v0.2.1.md`

## v0.2.0

- GitHub Release: https://github.com/tempppw01/Recall/releases/tag/v0.2.0
- Docker:
  - `34v0wphix/recall:0.2.0`
  - `34v0wphix/recall:latest`
- 变更概览：
  - 动态 PG / Prisma 边界收敛（默认关闭、仅未登录生效，连接参数守卫）
  - 时间轴体验增强（sticky 日期、状态更秒懂、动效与定位提示）
- Release Notes：`docs/plan/releases/release_notes_v0.2.0.md`
