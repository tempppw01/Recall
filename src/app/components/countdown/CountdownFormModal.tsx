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
        className="mobile-modal mobile-modal-body glass-panel motion-modal-surface w-full max-w-md rounded-[32px] border border-[var(--ui-border-strong)] shadow-[0_28px_80px_rgba(0,0,0,0.42)] p-5 sm:p-6 relative"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base sm:text-lg font-semibold tracking-tight text-[#F3F6FF]">{editingCountdown ? '编辑倒数日' : '新建倒数日'}</h3>
            <p className="mt-1 text-xs text-[#7d8595]">选择一个目标日期，用于首页倒数卡片展示</p>
          </div>
          <button
            onClick={onClose}
            className="text-xs text-[#9aa3b5] hover:text-white ui-state-hover ui-state-press rounded-full border border-[var(--ui-border-soft)] bg-[rgba(255,255,255,0.03)] px-2.5 py-1"
          >
            关闭
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <div className="glass-panel-soft rounded-[24px] border border-[var(--ui-border-soft)] p-3.5">
            <label className="block text-[11px] uppercase tracking-[0.14em] text-[#AAB3C6] mb-2">目标日期</label>
            <input
              type="date"
              value={countdownDate}
              onChange={(event) => setCountdownDate(event.target.value)}
              className="w-full bg-[rgba(255,255,255,0.03)] border border-[var(--ui-border-soft)] rounded-2xl px-3 py-2.5 text-sm text-[#E8ECF8] focus:outline-none focus:border-blue-500"
            />
            <p className="mt-2 text-xs text-[#7d8595]">保存后会以倒数日卡片的形式出现在主界面。</p>
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button
              onClick={onClose}
              className="px-3 py-2 text-sm text-[#AAB3C6] hover:text-white ui-state-hover ui-state-press rounded-2xl border border-[var(--ui-border-soft)] bg-[rgba(255,255,255,0.02)]"
            >
              取消
            </button>
            <button
              onClick={onSave}
              className="px-3.5 py-2 text-sm bg-blue-600/85 text-white rounded-2xl hover:bg-blue-500 ui-state-hover ui-state-press shadow-[0_12px_24px_rgba(37,99,235,0.22)]"
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
