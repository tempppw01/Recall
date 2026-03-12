# UI 按钮交互规范（v0.1.x 起步版）

目标：让 Recall 的关键操作按钮在全站拥有一致的“手感”和反馈，避免每个组件各写各的 hover/active/focus。

## 设计原则

- **轻量**：不引入额外 UI 库，先用全局 CSS class（`globals.css`）收敛。
- **一致**：hover / active / focus-visible 的反馈统一。
- **可扩展**：后续如果迁移到 Tailwind `@layer components` 或抽 Button 组件，这套 token 仍然可沿用。

## 当前实现

全局样式位置：`src/app/globals.css`

核心 class：

- 基础：`.btn`
- 尺寸：`.btn-sm` / `.btn-md`
- 语义：`.btn-primary` / `.btn-secondary` / `.btn-ghost` / `.btn-danger`

### 交互行为

- `:active` → 轻微缩放（`scale(0.98)`）
- `:focus-visible` → 统一焦点环（基于 `--theme-accent`）
- `:disabled` → 降低透明度 + 禁用点击

## 使用示例

```tsx
<button className="btn btn-md btn-primary">保存</button>
<button className="btn btn-md btn-secondary">取消</button>
<button className="btn btn-sm btn-ghost">更多</button>
<button className="btn btn-md btn-danger">删除</button>
```

## 后续

- 把页面里分散的 `hover:bg... active:scale... focus-visible:ring...` 逐步替换为 `.btn*` 体系。
- 逐步把“选中态/激活态”收敛成统一的 `btn-selected` 规则（目前仍由局部 tailwind class 控制）。
