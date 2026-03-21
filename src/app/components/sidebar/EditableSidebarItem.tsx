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
        className={`group w-full flex items-center justify-between rounded-2xl border px-3.5 py-3 text-[13px] sm:text-sm transition-all cursor-pointer ${
          active
            ? 'border-[rgba(var(--theme-accent),0.28)] bg-[rgba(var(--theme-accent),0.14)] text-white shadow-[0_12px_30px_rgba(0,0,0,0.16)]'
            : 'border-[color:var(--ui-border-soft)] bg-[rgba(255,255,255,0.015)] text-[#969fb2] hover:border-[color:var(--ui-border-strong)] hover:bg-[rgba(255,255,255,0.045)] hover:text-white'
        }`}
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <div className={`flex h-9 w-9 items-center justify-center rounded-xl border transition-all ${active ? 'border-[rgba(var(--theme-accent),0.22)] bg-[rgba(var(--theme-accent),0.12)]' : 'border-[color:var(--ui-border-soft)] bg-[rgba(255,255,255,0.02)] group-hover:border-[color:var(--ui-border-strong)] group-hover:bg-[rgba(255,255,255,0.05)]'}`}>
            <Icon className="w-4 h-4" />
          </div>
          <span className={`truncate font-medium ${active ? 'text-white' : 'text-[#c8cfdd]'}`}>{label}</span>
        </div>
        <div className="flex items-center gap-2">
          {count > 0 && <span className={`rounded-full px-2 py-0.5 text-[11px] ${active ? 'bg-white/10 text-white/80' : 'bg-black/20 text-[#7f8796]'}`}>{count}</span>}
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onEdit?.();
            }}
            className="opacity-0 group-hover:opacity-100 rounded-lg p-1 text-[#6f7785] hover:bg-white/5 hover:text-[#d9dfeb] transition-all"
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
              className="opacity-0 group-hover:opacity-100 rounded-lg p-1 text-[#6f7785] hover:bg-red-500/10 hover:text-red-300 transition-all"
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
            className="fixed z-50 min-w-[140px] rounded-[20px] border border-[var(--ui-border-soft)] bg-[rgba(19,22,28,0.96)] backdrop-blur-xl shadow-[0_22px_48px_rgba(0,0,0,0.32)] overflow-hidden"
            style={{ left: contextMenuPosition.x, top: contextMenuPosition.y }}
          >
            <button
              type="button"
              onClick={handleEdit}
              className="w-full flex items-center gap-2 px-3.5 py-2.5 text-sm text-[#E7ECFB] hover:bg-[rgba(255,255,255,0.05)]"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>重命名</span>
            </button>
            {onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                className="w-full flex items-center gap-2 px-3.5 py-2.5 text-sm text-red-300 hover:bg-[rgba(239,68,68,0.08)]"
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
