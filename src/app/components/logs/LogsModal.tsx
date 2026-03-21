import React from 'react';

type LogItem = {
  id: string;
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
  detail?: string;
  timestamp: string;
};

type LogsModalProps = {
  show: boolean;
  onClose: () => void;
  logs: LogItem[];
  onClear: () => void;
  apiBaseUrl: string;
  defaultBaseUrl: string;
};

const levelBadgeClass: Record<LogItem['level'], string> = {
  error: 'text-red-200 bg-red-500/12 border-red-500/25',
  warning: 'text-amber-200 bg-amber-500/12 border-amber-500/25',
  success: 'text-emerald-200 bg-emerald-500/12 border-emerald-500/25',
  info: 'text-blue-200 bg-blue-500/12 border-blue-500/25',
};

export default function LogsModal({
  show,
  onClose,
  logs,
  onClear,
  apiBaseUrl,
  defaultBaseUrl,
}: LogsModalProps) {
  if (!show) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center px-4 pt-6 pb-[calc(1rem+env(safe-area-inset-bottom))] motion-modal-overlay"
      onClick={onClose}
    >
      <div
        className="mobile-modal mobile-modal-body glass-panel motion-modal-surface w-full max-w-2xl rounded-[32px] border border-[var(--ui-border-strong)] shadow-[0_28px_80px_rgba(0,0,0,0.42)] p-5 sm:p-6 relative"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="text-base sm:text-lg font-semibold tracking-tight text-[#F3F6FF]">运行日志</h2>
            <p className="mt-1 text-xs text-[#7d8595]">查看本地运行状态、接口地址和最近事件记录</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClear}
              className="text-xs text-[#9aa3b5] hover:text-white ui-state-hover ui-state-press rounded-full border border-[var(--ui-border-soft)] bg-[rgba(255,255,255,0.03)] px-2.5 py-1"
            >
              清空
            </button>
            <button
              onClick={onClose}
              className="text-xs text-[#9aa3b5] hover:text-white ui-state-hover ui-state-press rounded-full border border-[var(--ui-border-soft)] bg-[rgba(255,255,255,0.03)] px-2.5 py-1"
            >
              关闭
            </button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 mb-4">
          <div className="glass-panel-soft rounded-[24px] border border-[var(--ui-border-soft)] p-3.5 text-xs text-[#8b93a4]">
            <div className="uppercase tracking-[0.14em] text-[#AAB3C6]">数据存储</div>
            <div className="mt-2 text-sm text-[#F3F6FF]">浏览器 localStorage</div>
          </div>
          <div className="glass-panel-soft rounded-[24px] border border-[var(--ui-border-soft)] p-3.5 text-xs text-[#8b93a4]">
            <div className="uppercase tracking-[0.14em] text-[#AAB3C6]">数据库</div>
            <div className="mt-2 text-sm text-[#F3F6FF]">未配置</div>
          </div>
          <div className="glass-panel-soft rounded-[24px] border border-[var(--ui-border-soft)] p-3.5 text-xs text-[#8b93a4]">
            <div className="uppercase tracking-[0.14em] text-[#AAB3C6]">AI 接口</div>
            <div className="mt-2 text-sm text-[#F3F6FF] break-all">{apiBaseUrl || defaultBaseUrl}</div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] uppercase tracking-[0.14em] text-[#AAB3C6]">最近日志</span>
          <span className="text-xs text-[#7d8595]">共 {logs.length} 条</span>
        </div>

        <div className="max-h-[50vh] overflow-y-auto mobile-scroll space-y-2.5 pr-1">
          {logs.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-[var(--ui-border-soft)] bg-[rgba(255,255,255,0.02)] px-4 py-6 text-sm text-[#7d8595]">
              暂无日志
            </div>
          ) : (
            logs.map((item) => (
              <div
                key={item.id}
                className="rounded-[24px] border border-[var(--ui-border-soft)] bg-[rgba(255,255,255,0.03)] px-3.5 py-3"
              >
                <div className="flex items-center justify-between gap-2 text-[11px] text-[#7d8595]">
                  <span>{item.timestamp}</span>
                  <span className={`rounded-full border px-2.5 py-1 ${levelBadgeClass[item.level]}`}>
                    {item.level.toUpperCase()}
                  </span>
                </div>
                <div className="mt-2 text-sm text-[#F3F6FF]">{item.message}</div>
                {item.detail && (
                  <div className="mt-1.5 text-xs text-[#8b93a4] whitespace-pre-wrap">{item.detail}</div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
