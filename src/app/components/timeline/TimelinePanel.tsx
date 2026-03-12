import React from 'react';

export default function TimelinePanel() {
  return (
    <div className="stack-gap flex flex-col">
      <div className="glass-panel rounded-[28px] p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-[#DDDDDD]">时间轴（原型）</div>
            <div className="text-xs text-[#777777] mt-1">按时间回顾任务：已完成 / 未完成 / 过期（v0.3.3 目标）</div>
          </div>
          <span className="text-[10px] text-[#616161]">Timeline</span>
        </div>
        <div className="mt-4 text-sm text-[#CCCCCC] space-y-2">
          <p>当前仅实现入口与页面骨架，后续会补：分组、筛选、折叠、动效。</p>
          <div className="text-xs text-[#777777]">数据：复用现有 Task（不引入新模型）。</div>
        </div>
      </div>
    </div>
  );
}
