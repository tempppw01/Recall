import React from 'react';

type AboutModalProps = {
  show: boolean;
  onClose: () => void;
  appVersion: string;
};

export default function AboutModal({ show, onClose, appVersion }: AboutModalProps) {
  if (!show) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center px-4 pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] motion-modal-overlay"
      onClick={onClose}
    >
      <div
        className="mobile-modal mobile-modal-body glass-panel motion-modal-surface w-full max-w-md rounded-[32px] border border-[var(--ui-border-strong)] shadow-[0_28px_80px_rgba(0,0,0,0.42)] p-5 sm:p-6 relative"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-semibold tracking-tight text-[#F3F6FF]">关于 Recall</h2>
            <p className="mt-1 text-xs text-[#7d8595]">轻量待办助手 · 当前版本与项目信息</p>
          </div>
          <button
            onClick={onClose}
            className="text-xs text-[#9aa3b5] hover:text-white ui-state-hover ui-state-press rounded-full border border-[var(--ui-border-soft)] bg-[rgba(255,255,255,0.03)] px-2.5 py-1"
          >
            关闭
          </button>
        </div>

        <div className="mt-4 space-y-3 text-sm text-[#D8DEEF]">
          <div className="glass-panel-soft rounded-[24px] border border-[var(--ui-border-soft)] p-3.5">
            <div className="text-[11px] uppercase tracking-[0.14em] text-[#AAB3C6]">版本信息</div>
            <div className="mt-2 text-[15px] font-medium text-[#F3F6FF]">v{appVersion}</div>
            <div className="mt-1 text-xs text-[#7d8595]">当前正在运行的 Recall 客户端版本</div>
          </div>

          <div className="glass-panel-soft rounded-[24px] border border-[var(--ui-border-soft)] p-3.5 space-y-2">
            <div>
              <div className="text-[11px] uppercase tracking-[0.14em] text-[#AAB3C6]">项目主页</div>
              <a
                className="mt-1 inline-block text-sm text-blue-300 hover:text-blue-200 break-all"
                href="https://github.com/tempppw01/Recall"
                target="_blank"
                rel="noopener noreferrer"
              >
                https://github.com/tempppw01/Recall
              </a>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.14em] text-[#AAB3C6]">作者联系</div>
              <div className="mt-1 text-sm text-[#D8DEEF]">微信 Ethan_BravoEcho</div>
            </div>
          </div>

          <div className="rounded-[24px] border border-[var(--ui-border-soft)] bg-[rgba(255,255,255,0.03)] px-3.5 py-3 text-xs text-[#8b93a4]">
            版权所有 © Recall Team · 感谢使用 Recall，祝你高效又轻松 ✨
          </div>
        </div>
      </div>
    </div>
  );
}
