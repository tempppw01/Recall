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
    className={`group/sidebar-item w-full flex items-center justify-between rounded-2xl border px-3.5 py-3 text-[13px] sm:text-sm transition-all duration-200 ${
      active
        ? 'border-[rgba(var(--theme-accent),0.28)] bg-[rgba(var(--theme-accent),0.14)] text-white shadow-[0_12px_30px_rgba(0,0,0,0.16)]'
        : 'border-[color:var(--ui-border-soft)] bg-[rgba(255,255,255,0.015)] text-[#969fb2] hover:border-[color:var(--ui-border-strong)] hover:bg-[rgba(255,255,255,0.045)] hover:text-white'
    } ${className || ''}`}
    draggable={draggable}
    onDragStart={onDragStart}
    onDragOver={onDragOver}
    onDrop={onDrop}
    onDragEnd={onDragEnd}
  >
    <div className="flex items-center gap-3.5 min-w-0">
      <div className={`relative flex h-9 w-9 items-center justify-center rounded-xl border transition-all ${active ? 'border-[rgba(var(--theme-accent),0.22)] bg-[rgba(var(--theme-accent),0.12)]' : 'border-[color:var(--ui-border-soft)] bg-[rgba(255,255,255,0.02)] group-hover/sidebar-item:border-[color:var(--ui-border-strong)] group-hover/sidebar-item:bg-[rgba(255,255,255,0.05)]'}`}>
        <Icon className={`w-4 h-4 ${iconColor || ''}`} />
        {badge > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 flex items-center justify-center text-[10px] font-medium text-white bg-red-500 rounded-full">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </div>
      <span className={`truncate font-medium ${active ? 'text-white' : 'text-[#c8cfdd]'}`}>{label}</span>
    </div>

    <div className="flex items-center gap-2 shrink-0">
      {count > 0 && <span className={`rounded-full px-2 py-0.5 text-[11px] ${active ? 'bg-white/10 text-white/80' : 'bg-black/20 text-[#7f8796]'}`}>{count}</span>}
      {rightSlot}
    </div>
  </button>
);

export default SidebarItem;
