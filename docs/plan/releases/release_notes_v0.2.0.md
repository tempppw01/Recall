## v0.2.0

本次版本聚焦两件事：
1) 动态 PG / Prisma 边界收敛（更安全、更一致）
2) 时间轴体验增强（更好扫、更有定位感）

### ✨ 新增 / 改进

- Prisma / 动态 PG
  - 统一 API 路由的 DB context 解析：session 优先，未登录才允许 dynamic PG（避免 DELETE 等路由行为不一致）
  - 动态 PG 连接串增加连接守卫参数（connection_limit / connect_timeout / pool_timeout），降低连接池耗尽风险
  - 新增数据库初始化/迁移文档：`docs/database.md`
  - 新增快速连通性验证脚本：`scripts/db-check.sh`

- 时间轴（Timeline）
  - 日期分组信息层级增强 + sticky header
  - 状态标签更秒懂（图标 + 颜色区分）
  - 卡片可读性与 hover 反馈增强
  - 节点轻量进入动画、轴线视觉引导
  - 展开/收起过渡更顺滑
  - “今天”定位提示增强

### 🛠 修复

- 修复/收敛若干 TypeScript 类型与 lint 问题，确保 `npm run typecheck` / `npm run lint` 通过。

### ⚠️ 已知问题 / 技术债

- Prisma migrations 尚未完全纳入版本控制（当前以 schema 为主）。若要生产可追溯发布，建议固定 migrate 策略并引入 migrations。
