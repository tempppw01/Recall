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
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center px-4 pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
      onClick={onClose}
    >
      <div
        className="mobile-modal mobile-modal-body bg-[#262626] w-full max-w-sm rounded-xl border border-[#333333] shadow-2xl p-5 sm:p-6 relative"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-semibold">关于 Recall（幕后花絮）</h2>
            <p className="text-xs text-[#777777] mt-1">轻量待办助手</p>
          </div>
          <button
            onClick={onClose}
            className="text-xs text-[#888888] hover:text-white"
          >
            关闭
          </button>
        </div>
        <div className="mt-4 text-sm text-[#CCCCCC] space-y-2">
          <p>版本：v{appVersion}</p>
          <p>
            项目主页：
            <a
              className="text-blue-300 hover:text-blue-200"
              href="https://github.com/tempppw01/Recall"
              target="_blank"
              rel="noopener noreferrer"
            >
              https://github.com/tempppw01/Recall
            </a>
          </p>
          <p>作者联系：微信 Ethan_BravoEcho</p>
          <p className="text-xs text-[#666666]">版权所有 © Recall Team</p>
          <p className="text-xs text-[#666666]">感谢使用 Recall，祝你高效又轻松 ✨</p>
        </div>
      </div>
    </div>
  );
}
