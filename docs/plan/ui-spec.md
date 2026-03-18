# UI 规范（正式版）

> 本文档是 Recall 的 UI 规范“执行标准”。
> 新增功能或界面改造时，必须先复用本规范中的 token / 组件原语，再考虑新增样式。

## 1. 设计 Token 规范

### 1.1 颜色与主题

- 主题主色：`--theme-accent`
- 主色浅阶：`--theme-accent-soft`
- 渐变起点：`--theme-grad-start`
- 渐变终点：`--theme-grad-end`

语义层（推荐）：
- 前景文本：`--foreground`
- 背景：`--background`
- 分割线：`--border`
- 次要文本：`--muted`

### 1.2 语义 Surface（本轮新增）

- `--ui-surface-0`: 页面底层背景
- `--ui-surface-1`: 常规面板
- `--ui-surface-2`: 软面板 / 次级区域
- `--ui-border-strong`: 强边框
- `--ui-border-soft`: 弱边框

### 1.3 间距 / 圆角 / 阴影

- 间距优先使用：`section-gap` / `stack-gap`
- 圆角优先级：`rounded-xl` / `rounded-2xl` / `rounded-[28px]`
- 玻璃面板优先：`glass-panel` / `glass-panel-soft`

### 1.4 动效

- 列表进入动效：`fadeInUp`
- 按钮反馈统一通过 `.btn` 系列

### 1.5 Motion Tokens / 规范

当前判断：现有动画“能用”，但还不够高级。

后续统一要求：
- 区分 `enter` / `exit` / `emphasis` / `reorder` / `expand` 五类动效
- 页面动效优先表达层级与状态变化，不只是淡入淡出
- hover / active / focus / selected 需要有一致反馈语言
- 弹窗、详情区、时间轴展开等场景应有成体系的过渡
- 动效时长建议分层（统一 token）：
  - `--motion-fast`: 140ms
  - `--motion-base`: 200ms
  - `--motion-slow`: 300ms
- 缓动建议（统一 token）：
  - `--ease-standard`: cubic-bezier(0.2, 0, 0, 1)
  - `--ease-emphasis`: cubic-bezier(0.22, 1, 0.36, 1)
- 避免：
  - 只靠 opacity
  - 每个模块各写一套节奏
  - 视觉很重但交互信息量很低的“假高级动画”
- 可访问性要求：
  - 必须支持 `prefers-reduced-motion`
  - 降级后应保留状态表达，但去掉非必要位移 / 缩放 / 连续动画

---

## 2. 组件原语规范

### 2.1 面板体系

- 主面板：`glass-panel`
- 次级面板：`glass-panel-soft`
- 卡片：`glass-card`

### 2.2 按钮体系

- 基础：`.btn`
- 类型：`.btn-primary` / `.btn-secondary` / `.btn-ghost` / `.btn-danger`
- 尺寸：`.btn-sm` / `.btn-md`

### 2.3 状态展示

- 状态 badge 统一使用：
  - 文案 + 图标 + 颜色三元组
  - 禁止仅靠颜色表达状态

### 2.4 空态 / 错态 / 加载态

- 空态：边框虚线 + 次要文案
- 错态：红系语义 + 可重试入口
- 加载态：骨架或轻量 spinner，不阻断主布局

---

## 3. 页面层级规范

### 3.1 页面结构

1. Page Header（标题 / 概览 / 快捷操作）
2. Summary（统计卡 / 聚合信息）
3. Controls（筛选、排序、搜索）
4. Content（列表/时间轴/看板主体）

### 3.2 响应式

- 移动端优先单列
- `sm` 开始可双栏
- `xl` 才启用高密度布局（如时间轴 masonry-ish）

---

## 4. 新功能接入流程（强制）

新增功能前必须按顺序：

1. 选择现有 token（颜色 / 间距 / 圆角 / 动效）
2. 复用现有组件原语（panel / card / button / badge）
3. 套用页面层级结构
4. 若确实不够，再新增原语并同步更新本规范文档

PR 描述必须包含：
- 复用了哪些 token
- 复用了哪些组件原语
- 是否新增原语（若有，为什么）

---

## 5. 禁止项

- 禁止在核心页面直接散落“硬编码色值”作为新模式（修复遗留除外）
- 禁止新增与 `.btn` / `glass-panel` 平行但无文档说明的组件样式
- 禁止先写 UI 后补规范
