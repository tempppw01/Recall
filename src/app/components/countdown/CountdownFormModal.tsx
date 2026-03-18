import React from 'react';

type CountdownFormModalProps = {
  show: boolean;
  editingCountdown: boolean;
  countdownDate: string;
  setCountdownDate: React.Dispatch<React.SetStateAction<string>>;
  onClose: () => void;
  onSave: () => void;
};

export default function CountdownFormModal({
  show,
  editingCountdown,
  countdownDate,
  setCountdownDate,
  onClose,
  onSave,
}: CountdownFormModalProps) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] motion-modal-overlay">
      <div className="absolute inset-0" onClick={onClose} />
      <div
        className="mobile-modal mobile-modal-body glass-panel motion-modal-surface bg-[#262626] w-full max-w-sm rounded-2xl border border-[var(--ui-border-strong)] shadow-2xl p-5 relative"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 className="text-base font-semibold mb-4">{editingCountdown ? '编辑倒数日' : '新建倒数日'}</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-[11px] uppercase text-[#888888] mb-2">目标日期</label>
            <input
              type="date"
              value={countdownDate}
              onChange={(event) => setCountdownDate(event.target.value)}
              className="w-full bg-[#1A1A1A] border border-[#333333] rounded-lg px-3 py-2 text-sm text-[#CCCCCC] focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={onClose}
              className="px-3 py-2 text-sm text-[#AAAAAA] hover:text-white ui-state-hover ui-state-press rounded-lg"
            >
              取消
            </button>
            <button
              onClick={onSave}
              className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-500 ui-state-hover ui-state-press"
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
