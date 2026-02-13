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
    className={`w-full flex items-center justify-between px-3 py-2.5 sm:py-2 rounded-lg text-[13px] sm:text-sm transition-colors ${
      active ? 'bg-[#2C2C2C] text-white' : 'text-[#888888] hover:bg-[#2C2C2C] hover:text-[#CCCCCC]'
    } ${className || ''}`}
    draggable={draggable}
    onDragStart={onDragStart}
    onDragOver={onDragOver}
    onDrop={onDrop}
    onDragEnd={onDragEnd}
  >
    <div className="flex items-center gap-3 min-w-0">
      <div className="relative">
        <Icon className={`w-4 h-4 ${iconColor || ''}`} />
        {badge > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 flex items-center justify-center text-[10px] font-medium text-white bg-red-500 rounded-full">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </div>
      <span className="truncate">{label}</span>
    </div>

    <div className="flex items-center gap-2 shrink-0">
      {count > 0 && <span className="text-xs text-[#666666]">{count}</span>}
      {rightSlot}
    </div>
  </button>
);

export default SidebarItem;
