import React, { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';

/**
 * 可编辑侧边栏项：带编辑按钮、右键菜单删除与计数显示。
 */
type EditableSidebarItemProps = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count?: number;
  active?: boolean;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
};

const EditableSidebarItem = ({
  icon: Icon,
  label,
  count = 0,
  active = false,
  onClick,
  onEdit,
  onDelete,
}: EditableSidebarItemProps) => {
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });

  const handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenuPosition({ x: event.clientX, y: event.clientY });
    setShowContextMenu(true);
  };

  const handleCloseContextMenu = () => {
    setShowContextMenu(false);
  };

  const handleEdit = () => {
    setShowContextMenu(false);
    onEdit?.();
  };

  const handleDelete = () => {
    setShowContextMenu(false);
    if (window.confirm(`确定要删除列表「${label}」吗？`)) {
      onDelete?.();
    }
  };

  return (
    <>
      <div
        onClick={onClick}
        onContextMenu={handleContextMenu}
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
            title="重命名"
          >
            <Pencil className="w-3 h-3" />
          </button>
          {onDelete && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                handleDelete();
              }}
              className="opacity-0 group-hover:opacity-100 text-[#666666] hover:text-red-400 transition-opacity"
              title="删除"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* 右键菜单 */}
      {showContextMenu && (
        <>
          <div
            className="fixed inset-0 z-50"
            onClick={handleCloseContextMenu}
          />
          <div
            className="fixed z-50 min-w-[120px] rounded-lg border border-[#333333] bg-[#1F1F1F] shadow-2xl overflow-hidden"
            style={{ left: contextMenuPosition.x, top: contextMenuPosition.y }}
          >
            <button
              type="button"
              onClick={handleEdit}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#DDDDDD] hover:bg-[#2A2A2A]"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>重命名</span>
            </button>
            {onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-[#2A2A2A]"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>删除</span>
              </button>
            )}
          </div>
        </>
      )}
    </>
  );
};

export default EditableSidebarItem;
