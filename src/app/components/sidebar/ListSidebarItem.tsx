import React from 'react';
import { Pencil, Plus } from 'lucide-react';

/**
 * 列表侧边栏项：支持编辑与快速新增任务。
 */
type ListSidebarItemProps = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count?: number;
  active?: boolean;
  onClick?: () => void;
  onEdit?: () => void;
  onAddTask?: () => void;
};

const ListSidebarItem = ({
  icon: Icon,
  label,
  count = 0,
  active = false,
  onClick,
  onEdit,
  onAddTask,
}: ListSidebarItemProps) => (
  <div
    onClick={onClick}
    className={`group w-full flex items-center justify-between px-3 py-2.5 sm:py-2 rounded-lg text-[13px] sm:text-sm transition-colors cursor-pointer ${
      active ? 'bg-[#2C2C2C] text-white' : 'text-[#888888] hover:bg-[#2C2C2C] hover:text-[#CCCCCC]'
    }`}
  >
    <div className="flex items-center gap-3">
      <Icon className="w-4 h-4" />
      <span>{label}</span>
    </div>
    <div className="flex items-center gap-2">
      {count > 0 && <span className="text-xs text-[#666666]">{count}</span>}
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onAddTask?.();
        }}
        className="opacity-0 group-hover:opacity-100 text-[#666666] hover:text-[#AAAAAA] transition-opacity"
        aria-label={`在${label}中新建任务`}
      >
        <Plus className="w-3 h-3" />
      </button>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onEdit?.();
        }}
        className="opacity-0 group-hover:opacity-100 text-[#666666] hover:text-[#AAAAAA] transition-opacity"
        aria-label={`编辑${label}`}
      >
        <Pencil className="w-3 h-3" />
      </button>
    </div>
  </div>
);

export default ListSidebarItem;
