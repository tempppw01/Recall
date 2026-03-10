# page.tsx 拆分与整理方案

> 当前文件体量：约 5700+ 行
> 目标：把 `src/app/page.tsx` 从“全功能总控文件”拆成“页面装配层”，降低维护风险。

## 为什么必须拆

当前 `page.tsx` 同时承担了：

- 页面总布局
- 顶部栏控制
- 日历逻辑
- 任务筛选与状态
- 习惯/倒数日逻辑
- AI 助手逻辑
- 同步逻辑
- 设置弹窗状态
- 日志与关于弹窗
- 主题状态
- 大量本地存储读写
- 各类工具函数与派生数据

这会带来几个明显问题：

1. **改一个点容易误伤别处**
2. **很难定位状态属于哪个功能域**
3. **重用困难，测试困难**
4. **后续接入时间轴页会让文件进一步爆炸**

所以这不是“代码洁癖”，而是必须处理的结构性问题。

---

## 拆分目标

把 `page.tsx` 变成：

- 负责页面装配
- 负责主要模块拼装
- 少量跨模块状态协调

而不是继续承担所有业务细节。

目标拆分后：
- `page.tsx` 控制在 **800~1200 行以内**
- 功能逻辑进入 hooks / feature modules
- 大块 UI 进入独立 section / panel 组件

---

## 推荐拆分顺序（按风险从低到高）

### 第一阶段：先拆“明显的 UI 块”
这些相对低风险，先拆最划算。

#### 1. 日志弹窗
- `showLogs`
- 日志列表展示
- 清空日志按钮

建议拆成：
- `components/logs/LogsModal.tsx`

#### 2. 关于弹窗
- `showAbout`
- About 内容展示

建议拆成：
- `components/about/AboutModal.tsx`

#### 3. 倒数日编辑弹窗
- 新建/编辑倒数日表单

建议拆成：
- `components/countdown/CountdownFormModal.tsx`

#### 4. 设置弹窗周边逻辑
虽然 `SettingsModal` 已经单独存在，但 page 里还有很多主题、同步、配置状态耦合，建议后续继续往 hook 收。

---

### 第二阶段：拆“功能域数据与派生逻辑”

#### 5. 日历域
现在日历相关逻辑已经很重，建议单独抽：

- `useCalendarState`
- `useWeatherState`
- `useCalendarNotes`

至少要把这些从 `page.tsx` 里拉出去：
- 日历切换
- 月/周/日/日程派生数据
- 城市搜索与天气请求
- 日历备注加载
- 日期选择/切月切周逻辑

建议目录：
- `src/app/features/calendar/`
- `src/app/hooks/useCalendarState.ts`
- `src/app/hooks/useWeatherState.ts`

#### 6. 任务域
把任务数据处理和页面装配分开：
- `useTaskState`
- `useTaskFilters`
- `useTaskSelection`

包括：
- 列表过滤
- 任务排序
- 批量选择
- 派生任务集合

#### 7. 习惯 / 倒数日域
建议分别抽：
- `useHabitState`
- `useCountdownState`

---

### 第三阶段：拆“副作用和系统能力”

#### 8. 主题系统
目前主题逻辑已经开始增长（系统主题、主色、渐变色）。

建议抽：
- `useThemeSettings`

负责：
- localStorage 持久化
- DOM data-theme / class 注入
- 跟随系统逻辑
- 主题切换 API

#### 9. 同步系统
当前同步逻辑复杂，建议抽：
- `useSyncManager`

负责：
- Redis / WebDAV / PG 同步
- 轮询 job
- push/pull/sync
- 同步日志

#### 10. 通知系统
建议抽：
- `useNotifications`

负责：
- 权限状态
- service worker 检测
- 测试通知
- 任务提醒触发

---

## 推荐目录结构

建议往这个方向靠：

```text
src/app/
  features/
    calendar/
    tasks/
    habits/
    countdown/
    settings/
    timeline/
  hooks/
    useCalendarState.ts
    useWeatherState.ts
    useTaskState.ts
    useThemeSettings.ts
    useSyncManager.ts
    useNotifications.ts
  components/
    logs/LogsModal.tsx
    about/AboutModal.tsx
    countdown/CountdownFormModal.tsx
```

---

## 拆分执行策略

### 原则 1：先抽，不重写
先把逻辑搬出去，不要一边拆一边大改功能。

### 原则 2：每次只拆一个域
不要试图“一次性重构整个 page.tsx”。
那样很容易炸。

### 原则 3：先保行为一致，再优化结构
第一步目标是：
- 功能不变
- 页面不坏
- 行为一致

### 原则 4：拆完一个域就提交
建议粒度：
- 一个 hook / 一个 modal / 一个 feature 一次 commit

---

## 我建议的实际顺序

### 0.3.0-alpha
- 拆 LogsModal
- 拆 AboutModal
- 拆 CountdownFormModal

### 0.3.0-beta
- 抽 `useThemeSettings`
- 抽 `useWeatherState`

### 0.3.0-rc
- 抽 `useCalendarState`
- 抽 `useTaskState`

### 0.3.0 正式版
- page.tsx 只做装配层
- 后续再接时间轴页，不再继续堆进 page.tsx

---

## 完成标准

拆分完成至少要满足：

- `page.tsx` 不再塞满业务细节
- 新增页面（如时间轴）不会继续加重 `page.tsx`
- 主题、天气、同步、通知不再全堆在同一个文件里
- 任何一个功能域都能独立阅读、独立修改

## 一句话结论

`page.tsx` 现在已经大到必须拆，
而且应该 **先拆 UI 块，再拆状态域，再拆副作用系统**。

这是最稳、返工最少的路线。
