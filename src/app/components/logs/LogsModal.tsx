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
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center px-4 pt-6 pb-[calc(1rem+env(safe-area-inset-bottom))]"
      onClick={onClose}
    >
      <div
        className="mobile-modal mobile-modal-body bg-[#262626] w-full max-w-md rounded-xl border border-[#333333] shadow-2xl p-5 sm:p-6 relative"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-base sm:text-lg font-semibold">运行日志（系统碎碎念）</h2>
          <button
            onClick={onClose}
            className="text-xs text-[#888888] hover:text-[#CCCCCC]"
          >
            关闭
          </button>
        </div>
        <div className="space-y-2 text-xs text-[#777777] mb-4">
          <div>数据存储：浏览器 localStorage</div>
          <div>数据库：未配置</div>
          <div>AI 接口：{apiBaseUrl || defaultBaseUrl}</div>
        </div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs uppercase text-[#666666]">最近日志</span>
          <button
            onClick={onClear}
            className="text-xs text-[#888888] hover:text-[#CCCCCC]"
          >
            清空
          </button>
        </div>
        <div className="max-h-[50vh] overflow-y-auto mobile-scroll space-y-2 pr-1">
          {logs.length === 0 ? (
            <div className="text-sm text-[#555555]">暂无日志</div>
          ) : (
            logs.map((item) => (
              <div
                key={item.id}
                className="border border-[#333333] rounded-lg px-3 py-2 bg-[#1F1F1F]"
              >
                <div className="flex items-center justify-between gap-2 text-[11px] text-[#666666]">
                  <span>{item.timestamp}</span>
                  <span
                    className={
                      item.level === 'error'
                        ? 'text-red-400'
                        : item.level === 'warning'
                        ? 'text-yellow-400'
                        : item.level === 'success'
                        ? 'text-emerald-400'
                        : 'text-blue-400'
                    }
                  >
                    {item.level.toUpperCase()}
                  </span>
                </div>
                <div className="text-sm text-[#DDDDDD] mt-1">{item.message}</div>
                {item.detail && (
                  <div className="text-xs text-[#777777] mt-1 whitespace-pre-wrap">{item.detail}</div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
