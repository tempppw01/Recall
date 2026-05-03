import React from 'react';

/**
 * Sidebar 单项：用于展示入口、带图标与计数。
 * - 支持角标 badge
 * - 支持 iconColor 颜色类名
 * - 支持自定义右侧插槽（例如拖拽手柄）
 */
type SidebarItemProps = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count?: number;
  active?: boolean;
  onClick?: () => void;
  iconColor?: string;
  accentRgb?: string;
  badge?: number;
  className?: string;
  rightSlot?: React.ReactNode;
  draggable?: boolean;
  onDragStart?: React.DragEventHandler<HTMLButtonElement>;
  onDragOver?: React.DragEventHandler<HTMLButtonElement>;
  onDrop?: React.DragEventHandler<HTMLButtonElement>;
  onDragEnd?: React.DragEventHandler<HTMLButtonElement>;
};

const SidebarItem = ({
  icon: Icon,
  label,
  count = 0,
  active = false,
  onClick,
  iconColor,
  accentRgb = 'var(--theme-accent)',
  badge = 0,
  className,
  rightSlot,
  draggable,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: SidebarItemProps) => (
  <button
    onClick={onClick}
    style={{ '--sidebar-item-accent': accentRgb } as React.CSSProperties}
    className={`group/sidebar-item sidebar-nav-item relative flex w-full items-center justify-between overflow-hidden rounded-[18px] border px-3 py-2.5 text-[13px] sm:text-sm transition-all duration-200 ${
      active
        ? 'is-active border-[rgba(var(--sidebar-item-accent),0.28)] bg-[rgba(var(--sidebar-item-accent),0.12)] text-[color:var(--ui-text-strong)] shadow-[0_14px_34px_rgba(0,0,0,0.12)]'
        : 'border-transparent bg-transparent text-[color:var(--ui-text-secondary)] hover:border-[color:var(--ui-border-soft)] hover:bg-[color:var(--ui-card-hover-bg)] hover:text-[color:var(--ui-text-strong)]'
    } ${className || ''}`}
    draggable={draggable}
    onDragStart={onDragStart}
    onDragOver={onDragOver}
    onDrop={onDrop}
    onDragEnd={onDragEnd}
  >
    <div className="flex items-center gap-3.5 min-w-0">
      <div className={`relative flex h-8 w-8 items-center justify-center rounded-xl border transition-all ${active ? 'border-[rgba(var(--sidebar-item-accent),0.28)] bg-[rgba(var(--sidebar-item-accent),0.12)]' : 'border-[color:var(--ui-border-soft)]/70 bg-[color:var(--ui-card-bg)]/60 group-hover/sidebar-item:border-[color:var(--ui-border-strong)] group-hover/sidebar-item:bg-[color:var(--ui-card-hover-bg)]'}`}>
        <Icon className={`w-4 h-4 ${iconColor || ''}`} />
        {badge > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 flex items-center justify-center text-[10px] font-medium text-white bg-red-500 rounded-full">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </div>
      <span className={`truncate font-medium ${active ? 'text-[color:var(--ui-text-strong)]' : 'text-[color:var(--ui-text-primary)]'}`}>{label}</span>
    </div>

    <div className="flex items-center gap-2 shrink-0">
      {count > 0 && <span className={`rounded-full px-2 py-0.5 text-[11px] ${active ? 'bg-[rgba(var(--sidebar-item-accent),0.12)] text-[color:var(--ui-text-secondary)]' : 'bg-[color:var(--ui-card-bg)] text-[color:var(--ui-text-muted)]'}`}>{count}</span>}
      {rightSlot}
    </div>
  </button>
);

export default SidebarItem;
