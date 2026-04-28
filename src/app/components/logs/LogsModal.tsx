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
  error: 'border-red-500/25 bg-red-500/12 text-red-200',
  warning: 'border-amber-500/25 bg-amber-500/12 text-amber-200',
  success: 'border-emerald-500/25 bg-emerald-500/12 text-emerald-200',
  info: 'border-blue-500/25 bg-blue-500/12 text-blue-200',
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
    <div className="ui-modal-backdrop" onClick={onClose}>
      <div className="theme-native-surface ui-modal-surface mobile-modal mobile-modal-body w-full max-w-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="ui-modal-title">运行日志</h2>
            <p className="ui-modal-subtitle">查看本地运行状态、接口地址和最近事件记录。</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClear} className="ui-modal-close">
              清空
            </button>
            <button onClick={onClose} className="ui-modal-close" aria-label="关闭运行日志">
              关闭
            </button>
          </div>
        </div>

        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <div className="ui-panel-muted p-3.5 text-xs">
            <div className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--ui-text-secondary)]">数据存储</div>
            <div className="mt-2 text-sm text-[color:var(--ui-text-strong)]">浏览器 localStorage</div>
          </div>
          <div className="ui-panel-muted p-3.5 text-xs">
            <div className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--ui-text-secondary)]">数据库</div>
            <div className="mt-2 text-sm text-[color:var(--ui-text-strong)]">未配置</div>
          </div>
          <div className="ui-panel-muted p-3.5 text-xs">
            <div className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--ui-text-secondary)]">AI 接口</div>
            <div className="mt-2 break-all text-sm text-[color:var(--ui-text-strong)]">{apiBaseUrl || defaultBaseUrl}</div>
          </div>
        </div>

        <div className="mb-3 flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--ui-text-secondary)]">最近日志</span>
          <span className="text-xs text-[color:var(--ui-text-muted)]">共 {logs.length} 条</span>
        </div>

        <div className="mobile-scroll max-h-[50vh] space-y-2.5 overflow-y-auto pr-1">
          {logs.length === 0 ? (
            <div className="ui-panel-muted border-dashed px-4 py-6 text-sm text-[color:var(--ui-text-muted)]">暂无日志</div>
          ) : (
            logs.map((item) => (
              <div key={item.id} className="ui-panel-muted px-3.5 py-3">
                <div className="flex items-center justify-between gap-2 text-[11px] text-[color:var(--ui-text-muted)]">
                  <span>{item.timestamp}</span>
                  <span className={`rounded-full border px-2.5 py-1 ${levelBadgeClass[item.level]}`}>
                    {item.level.toUpperCase()}
                  </span>
                </div>
                <div className="mt-2 text-sm text-[color:var(--ui-text-strong)]">{item.message}</div>
                {item.detail && (
                  <div className="mt-1.5 whitespace-pre-wrap text-xs text-[color:var(--ui-text-secondary)]">{item.detail}</div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
