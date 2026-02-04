import React from 'react';
import { Pencil } from 'lucide-react';

/**
 * 可编辑侧边栏项：带编辑按钮与计数显示。
 */
type EditableSidebarItemProps = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count?: number;
  active?: boolean;
  onClick?: () => void;
  onEdit?: () => void;
};

const EditableSidebarItem = ({
  icon: Icon,
  label,
  count = 0,
  active = false,
  onClick,
  onEdit,
}: EditableSidebarItemProps) => (
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
          onEdit?.();
        }}
        className="opacity-0 group-hover:opacity-100 text-[#666666] hover:text-[#AAAAAA] transition-opacity"
      >
        <Pencil className="w-3 h-3" />
      </button>
    </div>
  </div>
);

export default EditableSidebarItem;
