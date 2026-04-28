import React from 'react';

type AboutModalProps = {
  show: boolean;
  onClose: () => void;
  appVersion: string;
};

export default function AboutModal({ show, onClose, appVersion }: AboutModalProps) {
  if (!show) return null;

  return (
    <div className="ui-modal-backdrop" onClick={onClose}>
      <div className="theme-native-surface ui-modal-surface mobile-modal mobile-modal-body w-full max-w-md" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="ui-modal-title">关于 Recall</h2>
            <p className="ui-modal-subtitle">查看当前版本、项目地址和维护信息。</p>
          </div>
          <button onClick={onClose} className="ui-modal-close" aria-label="关闭关于窗口">
            关闭
          </button>
        </div>

        <div className="mt-4 space-y-3 text-sm text-[color:var(--ui-text-primary)]">
          <div className="ui-panel-muted p-3.5">
            <div className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--ui-text-secondary)]">版本信息</div>
            <div className="mt-2 text-[15px] font-medium text-[color:var(--ui-text-strong)]">v{appVersion}</div>
            <div className="mt-1 text-xs text-[color:var(--ui-text-muted)]">当前正在运行的 Recall 客户端版本。</div>
          </div>

          <div className="ui-panel-muted space-y-2 p-3.5">
            <div>
              <div className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--ui-text-secondary)]">项目主页</div>
              <a
                className="mt-1 inline-block break-all text-sm text-[rgb(var(--theme-accent))] hover:brightness-110"
                href="https://github.com/tempppw01/Recall"
                target="_blank"
                rel="noopener noreferrer"
              >
                https://github.com/tempppw01/Recall
              </a>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--ui-text-secondary)]">联系信息</div>
              <div className="mt-1 text-sm text-[color:var(--ui-text-primary)]">微信 Ethan_BravoEcho</div>
            </div>
          </div>

          <div className="ui-panel-muted px-3.5 py-3 text-xs text-[color:var(--ui-text-muted)]">
            Recall 用于聚合任务、时间与回顾，帮助你更稳定地整理个人工作流。
          </div>
        </div>
      </div>
    </div>
  );
}
