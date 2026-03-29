# 计划总览（docs/plan）

## 当前版本

- 当前工作版本：**v0.1**
- 当前规则：只有在 `docs/plan/versions/v0.1.md` 全部 ✅、最近一轮审计无未处理高危问题、`CHANGELOG` 与 Release notes 一致之后，才允许推进到 `v0.2`
- 最新历史 tag：**v0.3.1**

> 说明：仓库历史上已经存在 `v0.2.x / v0.3.x` 标签与 Release，这是既有发布事实，不做删除或重写。
> 当前 `v0.1 / v0.2 / v0.3 / v1.0` 是新的计划治理主线，用于后续执行顺序与文档管理。

## 进度统计

- v0.1：**4/4 已完成**
- v0.2：**0/8 未开始（仅规划）**
- v0.3：**0/6 未开始（仅规划）**
- v1.0：**0/5 未开始（仅规划）**

## 导航

- 路线图：`docs/plan/roadmap.md`
- 当前执行版本（唯一事实来源）：`docs/plan/versions/v0.1.md`
- 后续版本规划：`docs/plan/versions/v0.2.md` / `docs/plan/versions/v0.3.md` / `docs/plan/versions/v1.0.md`
- 审计报告：`docs/plan/audits/`
- 发布记录：`docs/plan/releases/CHANGELOG.md`
- UI 正式规范：`docs/plan/ui-spec.md`
- UI 改版清单：`docs/plan/ui-refactor-checklist.md`
- 多 agent 协作流程：`docs/plan/collaboration-workflow.md`
- Agent 产品迭代工作流：`docs/plan/product-iteration-workflow.md`
- 历史计划归档：`docs/plan/archive/`

## 约束

- 所有任务 / 计划 / 审计 / 发布记录只允许放在 `docs/plan/` 下
- 仓库根目录与 `docs/` 根目录不再散落新增 TODO / PLAN 文件
- 每次计划结构调整后，必须同步更新本文件导航
- 每轮 git 修改完成后，必须新增一份审计报告
