# Release Notes — v0.2.1

本次为 v0.2 系列的稳定性/体验增强小版本，重点在「时间轴 Phase 3」与「部署安全」。

## ✅ 主要更新

### 时间轴 Phase 3（视觉与反馈）
- 新增本周/本月阶段总结（完成数/完成率/Top 类目）
- 新增完成密度热力格（近 28 天）
- 主题色/渐变联动：时间轴关键视觉元素跟随全局 theme token
- 瀑布流布局（masonry-ish）：大屏双列、小屏单列，保持交互稳定

### 工程与可部署性
- Prisma migrations 纳入版本控制：新增初始迁移 `20260317_init`
- 增加健康检查端点：`GET /api/health`

### 安全修复（重要）
- 修复 Docker 默认弱 `NEXTAUTH_SECRET`：
  - 移除 Dockerfile 默认值
  - 生产环境启动时若未设置/仍为默认值将拒绝启动
  - compose 示例改为强制要求显式传入

## ⚠️ 兼容性说明

- 完成密度统计口径当前使用 completed 任务的 `updatedAt` 近似“完成时间”，后续如需更精确可引入 `completedAt` 字段。
- 瀑布流使用 CSS columns，视觉顺序为“先上后下再换列”，属于可接受取舍（未改变数据顺序）。

## 相关文档

- 计划/审计/发布记录：`docs/plan/`
- 数据库文档：`docs/plan/database.md`
- CHANGELOG：`docs/plan/releases/CHANGELOG.md`
